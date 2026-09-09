import { expect, test } from "@playwright/test";
import { questions, questionnaireVersion } from "../src/questions";
import { visitOptions } from "../src/visit-plan";

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`visit finale fits ${viewport.width} and sends only after confirmation`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const payloads: { visitChoice: string; shownPopups: string[] }[] = [];
    await page.route("**/api/wishes", async (route) => {
      payloads.push(route.request().postDataJSON());
      await route.fulfill({ json: { saved: true } });
    });
    for (const option of visitOptions) {
      await page.goto("/");
      await page.evaluate(
        (draft) =>
          sessionStorage.setItem("inge-wishes-draft-v1", JSON.stringify(draft)),
        {
          version: questionnaireVersion,
          savedAt: Date.now(),
          step: questions.length + 2,
          answers: Object.fromEntries(
            questions.map((q) => [q.id, q.options[0].id]),
          ),
          note: "",
          sentSummary: "",
          shownPopups: ["season:neutral"],
        },
      );
      await page.reload();
      const before = payloads.length;
      await page
        .getByRole("button", { name: "Ab die Post, Wunschzettel!" })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Juhuuu!" }),
      ).toBeFocused();
      expect(payloads.length).toBe(before);
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      if (option.id === "yes")
        await page.screenshot({
          path: testInfo.outputPath("visit-invitation.png"),
          animations: "disabled",
        });
      await dialog
        .getByRole("button", {
          name: new RegExp(option.label.replace(/[.!]/g, "\\$&")),
        })
        .click();
      expect(payloads.length).toBe(before);
      await expect(
        dialog.getByRole("heading", {
          name:
            option.id === "later"
              ? "Vorfreude kennt keinen Fahrplan."
              : "Ich gebe mein Bestes!",
        }),
      ).toBeVisible();
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      if (option.id === "yes")
        await page.screenshot({
          path: testInfo.outputPath("visit-confirmation.png"),
          animations: "disabled",
        });
      await dialog
        .getByRole("button", { name: "Jetzt alles abschicken!" })
        .click();
      await expect(
        page.getByRole("button", { name: "Wünsche sind angekommen" }),
      ).toBeDisabled();
      expect(payloads.length).toBe(before + 1);
      expect(payloads.at(-1)).toMatchObject({
        visitChoice: option.id,
        shownPopups: ["season:neutral"],
      });
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Wünsche sind angekommen" }),
      ).toBeDisabled();
    }
  });
}
