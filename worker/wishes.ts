import type { D1Database } from "@cloudflare/workers-types";
import {
  buildSummary,
  isValidAnswers,
  questionnaireVersion,
} from "../src/questions";

export type Env = { DB?: D1Database; INVITE_TOKEN?: string };
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const MAX_BODY_BYTES = 16_384;

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
    payload.note.length > 500
  )
    return json({ error: "Invalid answers" }, 400);

  // One row per browser submission (or legacy invitation), including retries and edits.
  const invitationId = Array.from(identity, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  try {
    await env.DB.prepare(
      `INSERT INTO wishes (invitation_id, answers_json, note, summary, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(invitation_id) DO UPDATE SET answers_json = excluded.answers_json,
        note = excluded.note, summary = excluded.summary, updated_at = excluded.updated_at`,
    )
      .bind(
        invitationId,
        JSON.stringify(payload.answers),
        payload.note.trim(),
        buildSummary(payload.answers, payload.note),
        new Date().toISOString(),
      )
      .run();
    return json({ saved: true });
  } catch {
    return json({ error: "Storage unavailable" }, 503);
  }
}
