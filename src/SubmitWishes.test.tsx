// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmitWishes } from "./SubmitWishes";
import { questions } from "./questions";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("does not allow sending incomplete answers", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<SubmitWishes answers={{}} note="" sentSummary="" onSent={vi.fn()} />);
  const button = screen.getByRole("button", {
    name: "Ab die Post, Wunschzettel!",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  await userEvent.setup().click(button);
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps edits local until the user explicitly sends again", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ saved: true }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetch);
  const props = {
    answers: Object.fromEntries(questions.map((q) => [q.id, q.options[0].id])),
    note: "Ein Ausflug",
    sentSummary: "Previously sent",
    onSent: vi.fn(),
  };
  const { rerender } = render(<SubmitWishes {...props} />);
  rerender(<SubmitWishes {...props} note="Ein Tag am Meer" />);
  expect(fetch).not.toHaveBeenCalled();
  await userEvent
    .setup()
    .click(
      screen.getByRole("button", {
        name: "Nachschlag für die Geschenkabteilung!",
      }),
    );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetch.mock.calls[0][1].body).note).toBe("Ein Tag am Meer");
});

it("does not submit automatically and only confirms an acknowledged save", async () => {
  const user = userEvent.setup();
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ saved: true }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetch);
  const onSent = vi.fn();
  render(
    <SubmitWishes
      answers={Object.fromEntries(
        questions.map((q) => [q.id, q.options[0].id]),
      )}
      note="Ein Ausflug"
      sentSummary=""
      onSent={onSent}
    />,
  );
  expect(fetch).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Ab die Post, Wunschzettel!" }),
  );
  expect(screen.getByRole("alert").textContent).toContain(
    "Ihre Antworten sind noch da",
  );
  expect(onSent).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Ab die Post, Wunschzettel!" }),
  );
  expect(onSent).toHaveBeenCalledWith(expect.stringContaining("Ein Ausflug"));
  expect(fetch.mock.calls[0][1].headers["X-Submission-Key"]).toMatch(
    /^[a-f0-9]{64}$/,
  );
  expect(fetch.mock.calls[1][1].headers["X-Submission-Key"]).toBe(
    fetch.mock.calls[0][1].headers["X-Submission-Key"],
  );
});
