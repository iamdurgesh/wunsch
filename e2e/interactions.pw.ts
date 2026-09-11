import { expect, test } from "@playwright/test";
import { questions, questionnaireVersion } from "../src/questions";
import type { InteractionLog } from "../src/interactions";

test("touch selections, repeated popups, changed finale and final-send history survive reload", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const sent: { interactionLog: InteractionLog; visitChoice: string }[] = [];
  await page.route("**/api/wishes", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: { saved: true } });
  });
  await page.goto("/");
  await page.evaluate(
    (draft) =>
      sessionStorage.setItem("inge-wishes-draft-v1", JSON.stringify(draft)),
    {
      version: questionnaireVersion,
      savedAt: Date.now(),
      step: questions.findIndex((q) => q.id === "season") + 2,
      answers: Object.fromEntries(
        questions.map((q) => [q.id, q.options[0].id]),
      ),
      note: "",
      sentSummary: "",
      shownPopups: [],
    },
  );
  await page.reload();
  const neutral = page
    .locator("label")
    .filter({ hasText: "Ich stehe den Jahreszeiten" });
  await neutral.tap();
  await expect(
    page.getByText("Ich erinnere mich, das haben Sie einmal gesagt."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hinweis schließen" }).tap();
  await neutral.tap(); // A repeated tap is recorded even though the radio is already selected.
  await page
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: /^Frühling/ }) })
    .tap();
  await neutral.tap();
  await page.getByRole("button", { name: "Hinweis schließen" }).tap();
  const readLog = () =>
    page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("inge-wishes-draft-v1")!)
          .interactionLog as InteractionLog,
    );
  const before = await readLog();
  expect(
    before.events.filter(
      (event) =>
        event.kind === "popup_opened" && event.target === "season:neutral",
    ),
  ).toHaveLength(2);
  expect(
    before.events.filter(
      (event) =>
        event.kind === "option_activated" && event.target === "season:neutral",
    ),
  ).toHaveLength(3);
  expect(
    before.events.find((event) => event.kind === "option_activated")?.input,
  ).toBe("touch");
  expect(sent).toHaveLength(0);
  await page.reload();
  await page.getByRole("button", { name: "Hinweis schließen" }).tap();
  expect(
    (await readLog()).events.filter(
      (event) =>
        event.kind === "popup_opened" && event.target === "season:neutral",
    ),
  ).toHaveLength(3);
  while (
    await page
      .getByRole("button", { name: "Nächste Frage", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Nächste Frage", exact: true })
      .tap();
  await page.getByRole("button", { name: "Zu meinen Wünschen" }).tap();
  await page.getByRole("button", { name: "Ab die Post, Wunschzettel!" }).tap();
  await page.getByRole("button", { name: /Ja!/ }).tap();
  await page.getByRole("button", { name: "Besuchswunsch ändern" }).tap();
  await page.getByRole("button", { name: /Ein anderes Wochenende/ }).tap();
  expect(sent).toHaveLength(1);
  await page.getByRole("button", { name: "Besuchsantwort senden" }).tap();
  await expect(
    page.getByRole("button", { name: "Wünsche sind angekommen" }),
  ).toBeDisabled();
  expect(sent).toHaveLength(2);
  const events = sent[1].interactionLog.events;
  expect(
    events.filter(
      (event) =>
        event.kind === "popup_opened" && event.target === "visit:invitation",
    ),
  ).toHaveLength(2);
  expect(
    events.some(
      (event) => event.kind === "popup_opened" && event.target === "visit:yes",
    ),
  ).toBe(true);
  expect(
    events.some(
      (event) =>
        event.kind === "popup_opened" && event.target === "visit:later",
    ),
  ).toBe(true);
  expect(events.at(-1)).toMatchObject({
    kind: "button_activated",
    target: "send",
    input: "touch",
  });
  expect(sent[1].visitChoice).toBe("later");
  await context.close();
});
