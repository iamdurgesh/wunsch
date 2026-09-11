import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { handleWishes, MAX_BODY_BYTES } from "./wishes";
import { questionnaireVersion, questions } from "../src/questions";

const limiters = {
  SUBMISSION_LIMITER: { limit: async () => ({ success: true }) },
  WRITE_LIMITER: { limit: async () => ({ success: true }) },
};
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
  sqlite.exec(
    readFileSync(
      new URL("../migrations/0002_interaction_history.sql", import.meta.url),
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
  it("treats SQL and HTML payloads as literal text", async () => {
    const note = "'); DROP TABLE wishes; -- <script>alert(1)</script>";
    expect(
      (
        await handleWishes(
          request({ answers, note, version: questionnaireVersion }),
          { DB, INVITE_TOKEN: token, ...limiters },
        )
      ).status,
    ).toBe(200);
    expect(sqlite.prepare("SELECT note FROM wishes").get()!.note).toBe(note);
    expect(
      sqlite.prepare("SELECT count(*) AS count FROM wishes").get()!.count,
    ).toBe(1);
  });
  it("rejects excessive submissions before reading the body or touching D1", async () => {
    const response = await handleWishes(request(), {
      DB,
      INVITE_TOKEN: token,
      ...limiters,
      SUBMISSION_LIMITER: { limit: async () => ({ success: false }) },
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(0);
  });
  it("enforces the shared write budget and fails closed when limits are unavailable", async () => {
    const limited = {
      DB,
      INVITE_TOKEN: token,
      ...limiters,
      WRITE_LIMITER: { limit: async () => ({ success: false }) },
    };
    expect((await handleWishes(request(), limited)).status).toBe(429);
    expect(
      (await handleWishes(request(), { DB, INVITE_TOKEN: token })).status,
    ).toBe(503);
    expect(
      (
        await handleWishes(request(), {
          ...limited,
          WRITE_LIMITER: {
            limit: async () => {
              throw new Error("Unavailable");
            },
          },
        })
      ).status,
    ).toBe(503);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(0);
  });
  it("rejects a cross-site browser request even if it claims the expected origin", async () => {
    expect(
      (
        await handleWishes(
          request(undefined, { "Sec-Fetch-Site": "cross-site" }),
          { DB, INVITE_TOKEN: token, ...limiters },
        )
      ).status,
    ).toBe(403);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(0);
  });
  it("reports a missing migration without leaking SQL or data", async () => {
    sqlite.close();
    sqlite = new DatabaseSync(":memory:");
    sqlite.exec(
      readFileSync(
        new URL("../migrations/0001_wishes.sql", import.meta.url),
        "utf8",
      ),
    );
    const response = await handleWishes(request(), {
      DB,
      INVITE_TOKEN: token,
      ...limiters,
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Storage unavailable",
      code: "SCHEMA_OUTDATED",
    });
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(0);
  });
  it("writes repeated impressions and input methods atomically with the answers", async () => {
    const event = {
      at: "2026-09-09T19:00:00.000Z",
      kind: "popup_opened",
      target: "season:neutral",
    };
    const interactionLog = {
      events: [
        event,
        {
          ...event,
          kind: "option_activated",
          target: "season:spring",
          input: "touch",
        },
        event,
      ],
      omitted: 0,
    };
    const response = await handleWishes(
      request({
        answers,
        note: "",
        version: questionnaireVersion,
        interactionLog,
      }),
      { DB, INVITE_TOKEN: token, ...limiters },
    );
    expect(response.status).toBe(200);
    const row = sqlite.prepare("SELECT * FROM wishes").get()!;
    expect(
      JSON.parse(row.interaction_log_json as string).Ereignisse,
    ).toHaveLength(3);
    expect(row.interaction_summary).toContain("Touch");
    expect(
      (row.interaction_summary as string).match(/Ich erinnere mich/g),
    ).toHaveLength(2);
    const retry = await handleWishes(
      request({
        answers,
        note: "",
        version: questionnaireVersion,
        interactionLog,
      }),
      { DB, INVITE_TOKEN: token, ...limiters },
    );
    expect(retry.status).toBe(200);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(1);
  });
  it("adds history columns without changing existing rows", () => {
    const previous = new DatabaseSync(":memory:");
    try {
      previous.exec(
        readFileSync(
          new URL("../migrations/0001_wishes.sql", import.meta.url),
          "utf8",
        ),
      );
      previous
        .prepare("INSERT INTO wishes VALUES (?, ?, ?, ?, ?)")
        .run(
          "existing",
          "{}",
          "Original note",
          "Original summary",
          "2026-09-08",
        );
      previous.exec(
        readFileSync(
          new URL(
            "../migrations/0002_interaction_history.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      expect(previous.prepare("SELECT * FROM wishes").get()).toMatchObject({
        note: "Original note",
        summary: "Original summary",
        interaction_summary: null,
        interaction_log_json: null,
      });
    } finally {
      previous.close();
    }
  });
  it.each(["yes", "big-yes", "later", "open"])(
    "stores the visit choice and finale messages for %s",
    async (visitChoice) => {
      const response = await handleWishes(
        request({
          answers,
          note: "Ein Ausflug",
          shownPopups: [],
          visitChoice,
          version: questionnaireVersion,
        }),
        { DB, INVITE_TOKEN: token, ...limiters },
      );
      expect(response.status).toBe(200);
      const row = sqlite
        .prepare("SELECT answers_json, summary FROM wishes")
        .get()!;
      const saved = JSON.parse(row.answers_json as string);
      expect(saved.at(-1).Frage).toContain("Siegen");
      expect(saved.at(-1)["Angezeigte Popups"]).toHaveLength(2);
      expect(row.summary).toContain(
        visitChoice === "open"
          ? "Das lasse ich noch offen."
          : visitChoice === "later"
            ? "Ein anderes Wochenende passt mir besser."
            : visitChoice === "yes"
              ? "Ja!"
              : "Jaaaa!",
      );
      expect(row.summary).toContain(
        visitChoice === "open"
          ? "Keine Eile"
          : visitChoice === "later"
            ? "Wir lassen den Termin einfach offen."
            : "Deutsche Bahn",
      );
    },
  );
  it("stores readable answers and reported popup history independently of final choices", async () => {
    const incoming = request({
      answers,
      note: "",
      version: questionnaireVersion,
      shownPopups: ["season:neutral", "cleaning:fed-up"],
    });
    expect(
      (await handleWishes(incoming, { DB, INVITE_TOKEN: token, ...limiters }))
        .status,
    ).toBe(200);
    const row = sqlite
      .prepare("SELECT answers_json, summary FROM wishes")
      .get()!;
    const saved = JSON.parse(row.answers_json as string);
    const season = saved.find(
      (entry: { Frage: string }) =>
        entry.Frage === "Welche Jahreszeit mögen Sie am liebsten?",
    );
    expect(season.Antworten).toEqual(["Frühling"]);
    expect(season["Angezeigte Popups"][0].Nachricht).toContain(
      "Ich erinnere mich, das haben Sie einmal gesagt.",
    );
    expect(row.summary).toContain("Da kann ich Ihnen nur zustimmen!");
    expect(row.summary).toContain("auch bei später geänderter Antwort");
  });
  it("distinguishes unrecorded popups from an explicitly empty history", async () => {
    await handleWishes(request(), { DB, INVITE_TOKEN: token, ...limiters });
    expect(
      sqlite.prepare("SELECT summary FROM wishes").get()!.summary,
    ).toContain("Nicht erfasst");
    await handleWishes(
      request({
        answers,
        note: "",
        version: questionnaireVersion,
        shownPopups: [],
      }),
      { DB, INVITE_TOKEN: token, ...limiters },
    );
    expect(
      sqlite.prepare("SELECT summary FROM wishes").get()!.summary,
    ).toContain("Keine Popups angezeigt.");
  });
  it("saves without an invitation, deduplicates retries, and isolates browser submissions", async () => {
    const submit = (key: string) => {
      const incoming = request(undefined, { "X-Submission-Key": key });
      incoming.headers.delete("X-Invite-Token");
      return handleWishes(incoming, { DB, ...limiters });
    };
    expect((await submit("c".repeat(64))).status).toBe(200);
    expect((await submit("c".repeat(64))).status).toBe(200);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(1);
    expect((await submit("d".repeat(64))).status).toBe(200);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(2);
    expect((await submit("invalid")).status).toBe(400);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(2);
  });
  it("stores both gift preferences", async () => {
    const selected = {
      ...answers,
      "gift-style": ["together", "useful"],
    };
    expect(
      (
        await handleWishes(
          request({
            answers: selected,
            note: "",
            version: questionnaireVersion,
          }),
          { DB, INVITE_TOKEN: token, ...limiters },
        )
      ).status,
    ).toBe(200);
    const row = sqlite.prepare("SELECT summary FROM wishes").get()!;
    expect(row.summary).toContain(
      "Wenn ich es oft benutzen kann. + Wenn wir Zeit zusammen haben.",
    );
  });
  it("stores a readable result and updates the same row on retry or edit", async () => {
    expect(
      (await handleWishes(request(), { DB, INVITE_TOKEN: token, ...limiters }))
        .status,
    ).toBe(200);
    expect(
      (
        await handleWishes(
          request({
            answers,
            note: "  Ein Ausflug!  ",
            version: questionnaireVersion,
          }),
          { DB, INVITE_TOKEN: token, ...limiters },
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
          { DB, INVITE_TOKEN: token, ...limiters },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await handleWishes(
          request(undefined, { Origin: "https://another.example" }),
          { DB, INVITE_TOKEN: token, ...limiters },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleWishes(new Request("https://birthday.example/api/wishes"), {
          DB,
          INVITE_TOKEN: token,
          ...limiters,
        })
      ).status,
    ).toBe(405);
    expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(0);
  });

  it.each([
    {
      answers,
      note: "",
      version: questionnaireVersion,
      interactionLog: {
        events: [
          { at: "invalid", kind: "popup_opened", target: "season:neutral" },
        ],
        omitted: 0,
      },
    },
    {
      answers,
      note: "",
      version: questionnaireVersion,
      visitChoice: "unknown",
    },
    {
      answers,
      note: "",
      version: questionnaireVersion,
      shownPopups: ["season:unknown"],
    },
    {
      answers,
      note: "",
      version: questionnaireVersion,
      shownPopups: ["season:neutral", "season:neutral"],
    },
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
        (
          await handleWishes(request(body), {
            DB,
            INVITE_TOKEN: token,
            ...limiters,
          })
        ).status,
      ).toBe(400);
      expect(sqlite.prepare("SELECT * FROM wishes").all()).toHaveLength(0);
    },
  );

  it("bounds streamed body size and fails closed if storage is not configured", async () => {
    expect(
      (
        await handleWishes(request({ data: "x".repeat(MAX_BODY_BYTES + 1) }), {
          DB,
          INVITE_TOKEN: token,
          ...limiters,
        })
      ).status,
    ).toBe(413);
    expect((await handleWishes(request(), {})).status).toBe(503);
    sqlite.close();
    sqlite = new DatabaseSync(":memory:");
    const response = await handleWishes(request(), {
      DB,
      INVITE_TOKEN: token,
      ...limiters,
    });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("INSERT");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
