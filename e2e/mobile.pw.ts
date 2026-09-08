import { expect, test } from "@playwright/test";
import { questions } from "../src/questions";

for (const viewport of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 667, height: 375 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
]) {
  test(`questionnaire fits ${viewport.width} × ${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const noOverflow = async () => {
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) {
        console.log(await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter((element) => element.getBoundingClientRect().right > window.innerWidth).map((element) => ({ tag: element.tagName, className: element.className, width: element.getBoundingClientRect().width, text: element.textContent?.slice(0, 70) })).slice(0, 20)));
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    };
    await noOverflow();
    if (viewport.width === 390)
      await page.screenshot({
        path: testInfo.outputPath("mobile-intro.png"),
        fullPage: true,
        animations: "disabled",
      });
    await page.getByRole("button", { name: "Na dann, los geht’s" }).click();
    await page.getByRole("button", { name: "Ich bin bereit" }).click();
    await noOverflow();
    const next = page.getByRole("button", { name: "Nächste Frage" });
    await expect(next).toBeDisabled();
    const choice = page.getByRole("radio", { name: /Vielleicht/ });
    await choice.check();
    await page.reload();
    await expect(choice).toBeChecked();
    if (viewport.width <= 700) {
      expect(
        await page
          .locator(".option-copy strong")
          .first()
          .evaluate((element) =>
            parseFloat(getComputedStyle(element).fontSize),
          ),
      ).toBeGreaterThanOrEqual(16);
      expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    }
    if (viewport.width === 390)
      await page.screenshot({
        path: testInfo.outputPath("mobile-question.png"),
        fullPage: true,
        animations: "disabled",
      });
    await next.click();
    for (let index = 1; index < questions.length; index++) {
      if (questions[index].id === "season") {
        await page.getByRole("radio", { name: /^Herbst/ }).check();
        await expect(page.getByRole("status")).toContainText("Gleichgesinnte!");
        await noOverflow();
        if (viewport.width === 390)
          await page.screenshot({
            path: testInfo.outputPath("mobile-season-reaction.png"),
            fullPage: true,
            animations: "disabled",
          });
        await page.getByRole("button", { name: "Hinweis schließen" }).click();
        await expect(
          page.getByText("Gleichgesinnte!", { exact: true }),
        ).toHaveCount(0);
      }
      if (
        questions[index].id === "gift-style" ||
        questions[index].id === "cleaning"
      ) {
        const together = questions[index].id === "gift-style";
        await page
          .getByRole(together ? "checkbox" : "radio", {
            name: together
              ? /Wenn wir Zeit zusammen haben/
              : /Vom täglichen Putzen habe ich genug/,
          })
          .check();
        await expect(page.getByRole("status")).toContainText(
          together
            ? "Ja, ich wusste, dass Sie das wählen würden!"
            : "Da kann ich Ihnen nur zustimmen!",
        );
        expect(
          await page
            .locator(".reaction-emoji")
            .evaluate((element) =>
              parseFloat(getComputedStyle(element).fontSize),
            ),
        ).toBeGreaterThanOrEqual(80);
        if (together)
          await expect(page.locator(".reaction-screen-effect")).toBeVisible();
        await noOverflow();
        await page.getByRole("button", { name: "Hinweis schließen" }).click();
        await expect(page.locator(".selection-reaction")).toHaveCount(0);
        await expect(page.locator(".reaction-screen-effect")).toHaveCount(0);
        if (together) {
          await page
            .getByRole("checkbox", { name: /Wenn ich es oft benutzen kann/ })
            .check();
          await expect(
            page.getByRole("checkbox", {
              name: /Wenn wir Zeit zusammen haben/,
            }),
          ).toBeChecked();
          await expect(page.locator(".selection-reaction")).toHaveCount(0);
          await page.reload();
          await expect(
            page.getByRole("checkbox", {
              name: /Wenn wir Zeit zusammen haben/,
            }),
          ).toBeChecked();
          await expect(
            page.getByRole("checkbox", {
              name: /Wenn ich es oft benutzen kann/,
            }),
          ).toBeChecked();
          await page.getByRole("button", { name: "Hinweis schließen" }).click();
        }
      }
      await page
        .getByRole(questions[index].additionalChoiceWith ? "checkbox" : "radio")
        .first()
        .check();
      await expect(
        page.getByText("Gleichgesinnte!", { exact: true }),
      ).toHaveCount(0);
      await noOverflow();
      await page
        .getByRole("button", {
          name:
            index === questions.length - 1
              ? "Zu meinen Wünschen"
              : "Nächste Frage",
        })
        .click();
    }
    if (viewport.width === 390) {
      await expect(page.locator(".celebration-confetti")).toBeVisible();
      // Wait for visible paper to reach the middle of the screen, not a fixed delay.
      await page.waitForFunction(() => {
        const canvas = document.querySelector<HTMLCanvasElement>(
          ".celebration-confetti",
        );
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return false;
        const pixels = context.getImageData(
          0,
          Math.floor(canvas.height * 0.45),
          canvas.width,
          60,
        ).data;
        let painted = 0;
        for (let index = 3; index < pixels.length; index += 4)
          if (pixels[index] > 80) painted++;
        return painted > 100;
      });
      await page.screenshot({
        path: testInfo.outputPath("mobile-confetti.png"),
      });
    }
    await page
      .getByRole("textbox", { name: /Herzenswunsch/ })
      .fill("Ein gemeinsamer Ausflug.");
    await noOverflow();
    await page.reload();
    await expect(
      page.getByRole("textbox", { name: /Herzenswunsch/ }),
    ).toHaveValue("Ein gemeinsamer Ausflug.");
    if (viewport.width === 390)
      await page.screenshot({
        path: testInfo.outputPath("mobile-summary.png"),
        fullPage: true,
        animations: "disabled",
      });
    if (viewport.width === 390) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page
        .getByRole("button", {
          name: `${questions.at(-1)!.category}: Antwort ändern`,
        })
        .click();
      await page.getByRole("button", { name: "Zu meinen Wünschen" }).click();
      await expect(page.locator(".celebration-confetti")).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}
