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

it.each(visitOptions)(
  "sends all details only after the final confirmation for $id",
  async (option) => {
    const user = userEvent.setup();
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ saved: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetch);
    const onSent = vi.fn();
    render(
      <SubmitWishes
        answers={answers}
        note="Ein Ausflug"
        shownPopups={["season:neutral"]}
        sentSummary=""
        onSent={onSent}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Ab die Post, Wunschzettel!" }),
    );
    expect(screen.getByRole("heading", { name: "Juhuuu!" })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", {
        name: new RegExp(option.label.replace(/[.!]/g, "\\$&")),
      }),
    );
    expect(
      screen.getByRole("heading", {
        name:
          option.id === "later"
            ? "Vorfreude kennt keinen Fahrplan."
            : "Ich gebe mein Bestes!",
      }),
    ).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Jetzt alles abschicken!" }),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      answers,
      note: "Ein Ausflug",
      shownPopups: ["season:neutral"],
      visitChoice: option.id,
    });
    expect(onSent).toHaveBeenCalledWith(expect.stringContaining(option.label));
    expect(screen.queryByRole("dialog")).toBeNull();
  },
);

it("retains the visit choice on failure and uses the same key on retry", async () => {
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
    <SubmitWishes answers={answers} note="" sentSummary="" onSent={onSent} />,
  );
  await user.click(
    screen.getByRole("button", { name: "Ab die Post, Wunschzettel!" }),
  );
  await user.click(screen.getByRole("button", { name: /Jaaaa!/ }));
  await user.click(
    screen.getByRole("button", { name: "Jetzt alles abschicken!" }),
  );
  expect(screen.getByRole("alert").textContent).toContain(
    "Ihre Antworten sind noch da",
  );
  expect(onSent).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Jetzt alles abschicken!" }),
  );
  expect(onSent).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[1][1].headers["X-Submission-Key"]).toBe(
    fetch.mock.calls[0][1].headers["X-Submission-Key"],
  );
});
