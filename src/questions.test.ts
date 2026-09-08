import { describe, expect, it } from "vitest";
import {
  buildSummary,
  getAnswerRows,
  isValidAnswers,
  selectAnswer,
  questions,
} from "./questions";

describe("editable question configuration", () => {
  it("has unique question and option IDs with at least two choices per question", () => {
    expect(questions.length).toBeGreaterThan(0);
    expect(new Set(questions.map(({ id }) => id)).size).toBe(questions.length);
    for (const question of questions) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(question.options.map(({ id }) => id)).size).toBe(
        question.options.length,
      );
      if (question.meme) expect(question.meme.src).toMatch(/^\/memes\//);
    }
  });
});

describe("wish summary", () => {
  it("retains shared time with only one extra choice and validates both for submission", () => {
    const question = questions.find(({ id }) => id === "gift-style")!;
    const paired = selectAnswer(question, "together", "useful");
    expect(paired).toEqual(["together", "useful"]);
    expect(selectAnswer(question, paired, "surprise")).toEqual([
      "together",
      "surprise",
    ]);
    expect(selectAnswer(question, paired, "together")).toEqual(["useful"]);
    const answers = Object.fromEntries(
      questions.map((item) => [item.id, item.options[0].id]),
    );
    expect(isValidAnswers({ ...answers, "gift-style": paired }, true)).toBe(
      true,
    );
    for (const invalid of [
      [],
      ["useful", "surprise"],
      ["together", "together"],
      ["together", "unknown"],
      ["together", "useful", "surprise"],
    ]) {
      expect(isValidAnswers({ ...answers, "gift-style": invalid }, true)).toBe(
        false,
      );
    }
    expect(isValidAnswers({ ...answers, fitness: ["yes"] }, true)).toBe(false);
    const summary = buildSummary({ ...answers, "gift-style": paired }, "");
    expect(summary).toContain(
      "Wenn ich es oft benutzen kann. + Wenn wir Zeit zusammen haben.",
    );
  });
  it("uses selected labels in question order and includes a trimmed personal wish", () => {
    const answers = Object.fromEntries(
      questions.map((question) => [question.id, question.options[1].id]),
    );
    expect(getAnswerRows(answers).map(({ option }) => option?.label)).toEqual(
      questions.map((question) => question.options[1].label),
    );
    const summary = buildSummary(answers, "  Ein Tag am Meer.  ");
    expect(summary).toContain("Mein Wunsch: Ein Tag am Meer.");
    for (const question of questions)
      expect(summary).toContain(
        `${question.title}\n${question.options[1].label}`,
      );
  });

  it("marks missing or obsolete answers as open without inventing a preference", () => {
    const summary = buildSummary({ fitness: "removed-option" }, "   ");
    expect(summary.match(/Noch offen/g)).toHaveLength(questions.length);
    expect(summary).not.toContain("Mein Wunsch:");
  });
});
