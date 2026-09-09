import { expect, it } from "vitest";
import {
  interactionSummary,
  isValidInteractionLog,
  MAX_INTERACTIONS,
  readableInteractions,
  type Interaction,
} from "./interactions";

const event: Interaction = {
  at: "2026-09-09T19:00:00.000Z",
  kind: "popup_opened",
  target: "season:neutral",
};
it("preserves repeated impressions in order with readable content", () => {
  const log = {
    events: [event, { ...event, at: "2026-09-09T19:00:04.000Z" }],
    omitted: 0,
  };
  expect(isValidInteractionLog(log)).toBe(true);
  expect(readableInteractions(log)).toHaveLength(2);
  expect(interactionSummary(log).match(/Ich erinnere mich/g)).toHaveLength(2);
});
it.each([
  { events: [{ ...event, kind: "invented" }], omitted: 0 },
  { events: [{ ...event, target: "__proto__" }], omitted: 0 },
  { events: [{ ...event, at: "not a date" }], omitted: 0 },
  { events: [{ ...event, input: { toString: null } }], omitted: 0 },
  { events: [{ ...event, kind: { toString: null } }], omitted: 0 },
  {
    events: [
      {
        ...event,
        kind: "answer_changed",
        target: "season",
        selected: ["unknown"],
      },
    ],
    omitted: 0,
  },
  {
    events: [
      {
        ...event,
        kind: "answer_changed",
        target: "gift-style",
        selected: ["useful", "surprise"],
      },
    ],
    omitted: 0,
  },
  { events: Array(MAX_INTERACTIONS + 1).fill(event), omitted: 0 },
  { events: [], omitted: -1 },
])("rejects malformed or oversized histories", (log) => {
  expect(isValidInteractionLog(log)).toBe(false);
});
