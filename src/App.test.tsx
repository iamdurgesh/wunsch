// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { readDraft, saveDraft } from "./draft";
import { questions } from "./questions";

beforeEach(() => {
  sessionStorage.clear();
  // DOM-only tests use reduced motion; the real renderer is checked in Chrome.
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("birthday questionnaire", () => {
  it("requires a choice, retains edited answers, and confirms before restarting", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Na dann, los geht’s" }),
    );
    await user.click(screen.getByRole("button", { name: "Ich bin bereit" }));
    expect(
      (
        screen.getByRole("button", {
          name: "Nächste Frage",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 1 }),
    );

    await user.click(screen.getByRole("radio", { name: /Vielleicht/ }));
    await user.click(screen.getByRole("button", { name: "Nächste Frage" }));
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(
      (screen.getByRole("radio", { name: /Vielleicht/ }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    await user.click(
      screen.getByRole("radio", { name: /Lieber ganz ohne Zahlen/ }),
    );
    await user.click(screen.getByRole("button", { name: "Nächste Frage" }));

    for (let index = 1; index < questions.length; index++) {
      await user.click(
        screen.getAllByRole(
          questions[index].additionalChoiceWith ? "checkbox" : "radio",
        )[0],
      );
      await user.click(
        screen.getByRole("button", {
          name:
            index === questions.length - 1
              ? "Zu meinen Wünschen"
              : "Nächste Frage",
        }),
      );
    }
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "100",
    );
    expect(screen.getByText("Lieber ganz ohne Zahlen.")).toBeTruthy();
    await user.type(
      screen.getByRole("textbox", { name: /Herzenswunsch/ }),
      "Ein Tag am Meer.",
    );

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Neu starten" }));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "100",
    );
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Neu starten" }));
    await user.click(
      screen.getByRole("button", { name: "Na dann, los geht’s" }),
    );
    await user.click(screen.getByRole("button", { name: "Ich bin bereit" }));
    expect(
      screen
        .getAllByRole("radio")
        .some((radio) => (radio as HTMLInputElement).checked),
    ).toBe(false);
  });
});

it("records rendered popups locally even when the final answer changes", async () => {
  const user = userEvent.setup();
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  saveDraft({
    answers: Object.fromEntries(questions.map((q) => [q.id, q.options[0].id])),
    note: "",
    step: questions.findIndex((q) => q.id === "season") + 2,
    sentSummary: "",
  });
  render(<App />);
  await user.click(
    screen.getByRole("radio", { name: /Ich stehe den Jahreszeiten/ }),
  );
  expect(
    screen.getByText("Ich erinnere mich, das haben Sie einmal gesagt."),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Hinweis schließen" }));
  await user.click(screen.getByRole("radio", { name: /^Herbst/ }));
  await user.click(screen.getByRole("button", { name: "Hinweis schließen" }));
  await user.click(screen.getByRole("radio", { name: /^Frühling/ }));
  expect(readDraft().answers.season).toBe("spring");
  expect(readDraft().shownPopups).toEqual(["season:neutral", "season:autumn"]);
  expect(fetch).not.toHaveBeenCalled();
});
