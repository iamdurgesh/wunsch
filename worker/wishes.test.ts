import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { handleWishes } from "./wishes";
import { questionnaireVersion, questions } from "../src/questions";

const token = "a".repeat(64);
const answers = Object.fromEntries(
  questions.map((question) => [question.id, question.options[0].id]),
);
let sqlite: DatabaseSync;
let DB: D1Database;

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../migrations/0001_wishes.sql", import.meta.url),
      "utf8",
    ),
  );
  DB = {
    prepare: (sql: string) => ({
      bind: (...values: string[]) => ({
        run: async () => sqlite.prepare(sql).run(...values),
      }),
    }),
  } as unknown as D1Database;
});
afterEach(() => sqlite.close());

function request(
  body: unknown = {
    answers,
    note: "Ein Tag am Meer.",
    version: questionnaireVersion,
  },
  headers: Record<string, string> = {},
) {
  return new Request("https://birthday.example/api/wishes", {
    method: "POST",
    headers: {
      Origin: "https://birthday.example",
      "Content-Type": "application/json",
      "X-Invite-Token": token,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("private wish submission", () => {
  it("saves without an invitation, deduplicates retries, and isolates browser submissions", async () => {
    const submit = (key: string) => {
      const incoming = request(undefined, { "X-Submission-Key": key });
      incoming.headers.delete("X-Invite-Token");
      return handleWishes(incoming, { DB });
    };
    expect((await submit("c".repeat(64))).status).toBe(200);
    expect((await submit("c".repeat(64))).status).toBe(200);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(1);
    expect((await submit("d".repeat(64))).status).toBe(200);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(2);
    expect((await submit("invalid")).status).toBe(400);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(2);
  });
  it("stores both gift preferences and the gift-value answer", async () => {
    const selected = {
      ...answers,
      "gift-style": ["together", "useful"],
      "gift-value": "modest",
    };
    expect(
      (
        await handleWishes(
          request({
            answers: selected,
            note: "",
            version: questionnaireVersion,
          }),
          { DB, INVITE_TOKEN: token },
        )
      ).status,
    ).toBe(200);
    const row = sqlite.prepare("SELECT summary FROM wishes").get()!;
    expect(row.summary).toContain(
      "Wenn ich es oft benutzen kann. + Wenn wir Zeit zusammen haben.",
    );
    expect(row.summary).toContain(
      "Lieber etwas Kleines – sonst werde ich verlegen.",
    );
  });
  it("stores a readable result and updates the same row on retry or edit", async () => {
    expect(
      (await handleWishes(request(), { DB, INVITE_TOKEN: token })).status,
    ).toBe(200);
    expect(
      (
        await handleWishes(
          request({
            answers,
            note: "  Ein Ausflug!  ",
            version: questionnaireVersion,
          }),
          { DB, INVITE_TOKEN: token },
        )
      ).status,
    ).toBe(200);
    const rows = sqlite.prepare("SELECT * FROM wishes").all();
    expect(rows).toHaveLength(1);
    expect(rows[0].note).toBe("Ein Ausflug!");
    expect(rows[0].summary).toContain(questions[0].options[0].label);
    expect(rows[0].summary).toContain("Ein Ausflug!");
    expect(rows[0].invitation_id).not.toBe(token);
  });

  it("rejects unauthorized, cross-origin and public read requests", async () => {
    expect(
      (
        await handleWishes(
          request(undefined, { "X-Invite-Token": "b".repeat(64) }),
          { DB, INVITE_TOKEN: token },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await handleWishes(
          request(undefined, { Origin: "https://another.example" }),
          { DB, INVITE_TOKEN: token },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleWishes(new Request("https://birthday.example/api/wishes"), {
          DB,
          INVITE_TOKEN: token,
        })
      ).status,
    ).toBe(405);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(0);
  });

  it.each([
    { answers: {}, note: "", version: questionnaireVersion },
    {
      answers: { ...answers, fitness: "unknown" },
      note: "",
      version: questionnaireVersion,
    },
    { answers, note: "x".repeat(501), version: questionnaireVersion },
    { answers, note: "", version: "old-questionnaire" },
  ])(
    "rejects incomplete, unknown, oversized or stale answers",
    async (body) => {
      expect(
        (await handleWishes(request(body), { DB, INVITE_TOKEN: token })).status,
      ).toBe(400);
      expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(0);
    },
  );

  it("bounds streamed body size and fails closed if storage is not configured", async () => {
    expect(
      (
        await handleWishes(request({ data: "x".repeat(17000) }), {
          DB,
          INVITE_TOKEN: token,
        })
      ).status,
    ).toBe(413);
    expect((await handleWishes(request(), {})).status).toBe(503);
    sqlite.close();
    sqlite = new DatabaseSync(":memory:");
    const response = await handleWishes(request(), { DB, INVITE_TOKEN: token });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("INSERT");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
