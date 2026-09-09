import {
  interactionSummary,
  isValidInteractionLog,
  readableInteractions,
} from "../src/interactions";
import { isVisitChoice, type VisitChoice } from "../src/visit-plan";
import {
  buildSubmissionSummary,
  isValidShownPopups,
  readableAnswers,
} from "../src/submission-details";
import type { D1Database, RateLimit } from "@cloudflare/workers-types";
import { apiHeaders as headers } from "./security";
import { isValidAnswers, questionnaireVersion } from "../src/questions";

export type Env = {
  DB?: D1Database;
  INVITE_TOKEN?: string;
  SUBMISSION_LIMITER?: RateLimit;
  WRITE_LIMITER?: RateLimit;
};
const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
export const MAX_BODY_BYTES = 512 * 1024;
const MAX_STORED_BYTES = 1_800_000;

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

async function readBody(request: Request): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError("Too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

export async function handleWishes(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "POST")
    return new Response(null, {
      status: 405,
      headers: { ...headers, Allow: "POST" },
    });
  if (request.headers.get("Origin") !== new URL(request.url).origin)
    return json({ error: "Forbidden" }, 403);
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite && fetchSite !== "same-origin")
    return json({ error: "Forbidden" }, 403);
  if (!env.DB) return json({ error: "Not configured" }, 503);
  const submissionKey = request.headers.get("X-Submission-Key");
  let identity: Uint8Array;
  if (submissionKey !== null) {
    if (!/^[a-f0-9]{64}$/.test(submissionKey))
      return json({ error: "Invalid submission key" }, 400);
    identity = await digest(`submission:${submissionKey}`);
  } else {
    // Accept older invitation-based clients during rollout.
    const token = request.headers.get("X-Invite-Token") ?? "";
    if (!env.INVITE_TOKEN || !/^[a-f0-9]{64}$/.test(token))
      return json({ error: "Unauthorized" }, 401);
    const [expected, received] = await Promise.all([
      digest(env.INVITE_TOKEN),
      digest(token),
    ]);
    let difference = 0;
    for (let index = 0; index < expected.length; index++)
      difference |= expected[index] ^ received[index];
    if (difference !== 0) return json({ error: "Unauthorized" }, 401);
    identity = expected;
  }
  if (
    request.headers.get("Content-Type")?.split(";")[0].trim() !==
    "application/json"
  )
    return json({ error: "Expected JSON" }, 415);
  if (Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES)
    return json({ error: "Too large" }, 413);

  // Both limits are required: rotating client keys must not bypass the write budget.
  if (!env.SUBMISSION_LIMITER || !env.WRITE_LIMITER)
    return json({ error: "Not configured" }, 503);
  try {
    const key = Array.from(identity, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const client = await env.SUBMISSION_LIMITER.limit({
      key: `wunsch:client:${key}`,
    });
    const budget = client.success
      ? await env.WRITE_LIMITER.limit({ key: "wunsch:all-submissions" })
      : { success: false };
    if (!client.success || !budget.success)
      return new Response(JSON.stringify({ error: "Too many submissions" }), {
        status: 429,
        headers: { ...headers, "Retry-After": "60" },
      });
  } catch {
    return json({ error: "Temporarily unavailable" }, 503);
  }

  let body: unknown;
  try {
    body = await readBody(request);
  } catch (error) {
    return json(
      { error: "Invalid body" },
      error instanceof RangeError ? 413 : 400,
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return json({ error: "Invalid answers" }, 400);
  const payload = body as Record<string, unknown>;
  if (
    payload.version !== questionnaireVersion ||
    !isValidAnswers(payload.answers, true) ||
    typeof payload.note !== "string" ||
    payload.note.length > 500 ||
    (payload.interactionLog !== undefined &&
      !isValidInteractionLog(payload.interactionLog)) ||
    (payload.visitChoice !== undefined &&
      !isVisitChoice(payload.visitChoice)) ||
    (payload.shownPopups !== undefined &&
      !isValidShownPopups(payload.shownPopups))
  )
    return json({ error: "Invalid answers" }, 400);

  const interactionLog = isValidInteractionLog(payload.interactionLog)
    ? payload.interactionLog
    : undefined;

  // One row per browser submission (or legacy invitation), including retries and edits.
  const invitationId = Array.from(identity, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const values = [
    invitationId,
    JSON.stringify(
      readableAnswers(
        payload.answers,
        payload.shownPopups as string[] | undefined,
        payload.visitChoice as VisitChoice | undefined,
      ),
    ),
    payload.note.trim(),
    buildSubmissionSummary(
      payload.answers,
      payload.note,
      payload.shownPopups as string[] | undefined,
      payload.visitChoice as VisitChoice | undefined,
    ),
    new Date().toISOString(),
    interactionLog
      ? JSON.stringify({
          Ereignisse: readableInteractions(interactionLog),
          Nicht_aufgezeichnet: interactionLog.omitted,
        })
      : null,
    interactionLog
      ? interactionSummary(interactionLog)
      : "Nicht erfasst (ältere Version).",
  ];
  if (
    values.reduce(
      (total, value) =>
        total + new TextEncoder().encode(value ?? "").byteLength,
      0,
    ) > MAX_STORED_BYTES
  )
    return json({ error: "Submission too large" }, 413);
  try {
    await env.DB.prepare(
      `INSERT INTO wishes (invitation_id, answers_json, note, summary, updated_at, interaction_log_json, interaction_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(invitation_id) DO UPDATE SET answers_json = excluded.answers_json,
        note = excluded.note, summary = excluded.summary, updated_at = excluded.updated_at,
        interaction_log_json = excluded.interaction_log_json, interaction_summary = excluded.interaction_summary`,
    )
      .bind(...values)
      .run();
    return json({ saved: true });
  } catch (error) {
    if (
      error instanceof Error &&
      /no column named interaction_(?:log_json|summary)/i.test(error.message)
    )
      return new Response(
        JSON.stringify({
          error: "Storage unavailable",
          code: "SCHEMA_OUTDATED",
        }),
        { status: 503, headers },
      );
    return json({ error: "Storage unavailable" }, 503);
  }
}
