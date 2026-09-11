// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmitWishes } from "./SubmitWishes";
import { questions } from "./questions";
import { visitOptions } from "./visit-plan";

const answers = Object.fromEntries(
  questions.map((q) => [q.id, q.options[0].id]),
);
beforeEach(() => {
  sessionStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("does not allow sending incomplete answers", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<SubmitWishes answers={{}} note="" sentSummary="" onSent={vi.fn()} />);
  expect(
    (
      screen.getByRole("button", {
        name: "Ab die Post, Wunschzettel!",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

const savedResponse = () => new Response(JSON.stringify({ saved: true }));

it.each(visitOptions)("saves the questionnaire first, then optional $id with the same key", async (option) => {
  const user = userEvent.setup();
  const fetch = vi.fn().mockImplementation(async () => savedResponse());
  vi.stubGlobal("fetch", fetch);
  const onSent = vi.fn();
  render(<SubmitWishes answers={answers} note="Ein Ausflug" sentSummary="" onSent={onSent} />);
  expect(fetch).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Ab die Post, Wunschzettel!" }));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ answers, note: "Ein Ausflug" });
  expect(JSON.parse(fetch.mock.calls[0][1].body).visitChoice).toBeUndefined();
  expect(onSent).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: new RegExp(option.label.replace(/[.!]/g, "\\$&")) }));
  expect(fetch).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Besuchsantwort senden" }));
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetch.mock.calls[1][1].body).visitChoice).toBe(option.id);
  expect(fetch.mock.calls[1][1].headers["X-Submission-Key"]).toBe(fetch.mock.calls[0][1].headers["X-Submission-Key"]);
  expect(onSent).toHaveBeenLastCalledWith(expect.stringContaining(option.label));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("opens the invitation only after acknowledgment and allows skipping without another write", async () => {
  const user = userEvent.setup();
  let acknowledge!: (response: Response) => void;
  const fetch = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { acknowledge = resolve; }));
  vi.stubGlobal("fetch", fetch);
  const onSent = vi.fn();
  render(<SubmitWishes answers={answers} note="" sentSummary="" onSent={onSent} />);
  await user.click(screen.getByRole("button", { name: "Ab die Post, Wunschzettel!" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onSent).not.toHaveBeenCalled();
  acknowledge(savedResponse());
  await user.click(await screen.findByRole("button", { name: "Für heute fertig" }));
  expect(onSent).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("does not show the invitation after a failed questionnaire save", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
  const onSent = vi.fn();
  render(<SubmitWishes answers={answers} note="" sentSummary="" onSent={onSent} />);
  await user.click(screen.getByRole("button", { name: "Ab die Post, Wunschzettel!" }));
  expect(screen.getByRole("alert").textContent).toContain("Ihre Antworten sind noch da");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onSent).not.toHaveBeenCalled();
});

it("preserves the acknowledged questionnaire when the optional answer fails, then retries", async () => {
  const user = userEvent.setup();
  const fetch = vi.fn().mockResolvedValueOnce(savedResponse()).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(savedResponse());
  vi.stubGlobal("fetch", fetch);
  const onSent = vi.fn();
  render(<SubmitWishes answers={answers} note="" sentSummary="" onSent={onSent} />);
  await user.click(screen.getByRole("button", { name: "Ab die Post, Wunschzettel!" }));
  await user.click(screen.getByRole("button", { name: /Ja!/ }));
  await user.click(screen.getByRole("button", { name: "Besuchsantwort senden" }));
  expect(onSent).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Besuchsantwort senden" }));
  expect(onSent).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[2][1].headers["X-Submission-Key"]).toBe(fetch.mock.calls[0][1].headers["X-Submission-Key"]);
});
