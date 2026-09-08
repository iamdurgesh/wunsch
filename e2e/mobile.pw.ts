import { expect, test } from '@playwright/test';
import { questions } from '../src/questions';

for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
  test(`questionnaire fits ${viewport.width} × ${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await noOverflow();
    if (viewport.width === 390) await page.screenshot({ path: testInfo.outputPath('mobile-intro.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Na dann, los geht’s' }).click();
    await page.getByRole('button', { name: 'Ich bin bereit' }).click();
    await noOverflow();
    const next = page.getByRole('button', { name: 'Nächste Frage' });
    await expect(next).toBeDisabled();
    const choice = page.getByRole('radio', { name: /Vielleicht/ });
    await choice.check();
    await page.reload();
    await expect(choice).toBeChecked();
    if (viewport.width <= 700) {
      expect(await page.locator('.option-copy strong').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
      expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    }
    if (viewport.width === 390) await page.screenshot({ path: testInfo.outputPath('mobile-question.png'), fullPage: true, animations: 'disabled' });
    await next.click();
    for (let index = 1; index < questions.length; index++) {
      await page.getByRole('radio').first().check();
      await page.getByRole('button', { name: index === questions.length - 1 ? 'Zu meinen Wünschen' : 'Nächste Frage' }).click();
    }
    await page.getByRole('textbox', { name: /Herzenswunsch/ }).fill('Ein gemeinsamer Ausflug.');
    await noOverflow();
    await page.reload();
    await expect(page.getByRole('textbox', { name: /Herzenswunsch/ })).toHaveValue('Ein gemeinsamer Ausflug.');
    if (viewport.width === 390) await page.screenshot({ path: testInfo.outputPath('mobile-summary.png'), fullPage: true, animations: 'disabled' });
    expect(errors).toEqual([]);
  });
}
