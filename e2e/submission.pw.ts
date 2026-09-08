import { expect, test } from "@playwright/test";
import { questions } from "../src/questions";

// Optional local integration check. Start npm run dev:full before enabling it.
test("local Cloudflare saves wishes and acknowledges receipt on mobile", async ({
  page,
}) => {
  test.skip(
    process.env.TEST_LOCAL_API !== "1",
    "Run with TEST_LOCAL_API=1 and npm run dev:full",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8788/");
  await page.getByRole("button", { name: "Na dann, los geht’s" }).click();
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  for (let index = 0; index < questions.length; index++) {
    await page
      .getByRole(questions[index].additionalChoiceWith ? "checkbox" : "radio")
      .first()
      .check();
    await page
      .getByRole("button", {
        name:
          index === questions.length - 1
            ? "Zu meinen Wünschen"
            : "Nächste Frage",
      })
      .click();
  }
  await page
    .getByRole("textbox", { name: /Herzenswunsch/ })
    .fill("LOCAL TEST: Ein gemeinsamer Ausflug.");
  await page
    .getByRole("button", { name: "Ab die Post, Wunschzettel!", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Wünsche sind angekommen" }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: /Herzenswunsch/ })
    .fill("LOCAL TEST: Aktualisierter Wunsch.");
  await page.getByRole("button", { name: "Nachschlag für die Geschenkabteilung!" }).click();
  await expect(
    page.getByRole("button", { name: "Wünsche sind angekommen" }),
  ).toBeDisabled();
});
