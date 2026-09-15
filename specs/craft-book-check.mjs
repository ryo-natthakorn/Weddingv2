import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch();
try {
  for (const width of [320, 414, 732, 1401]) {
    const page = await browser.newPage({ viewport: { width, height: 896 }, reducedMotion: 'reduce' });
    await page.route(/^https:\/\//, route => route.abort());
    await page.goto(server.resolvedUrls.local[0]);
    await page.getByRole('slider').press('Enter');
    await page.getByRole('button', { name: 'ดูรูปทั้งหมด', exact: true }).click();
    for (const [chapter, count] of [['เขาใหญ่', 1], ['สวนเบญจกิติ', 6], ['สะพานพุทธ', 4]]) {
      await page.getByRole('tab', { name: chapter, exact: true }).click();
      const panel = page.getByRole('tabpanel');
      assert.equal(await panel.locator('img').count(), count);
      await panel.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      const book = page.locator('.pw-book');
      const bounds = await book.boundingBox();
      await book.screenshot({ path: join(tmpdir(), `craft-${width}-${count}.png`) });
      assert.ok(bounds.height < 896 * 0.7);
      assert.equal(await panel.locator('img').evaluateAll(images => images.every(img => {
        const a = img.getBoundingClientRect(), b = img.closest('.pw-book').getBoundingClientRect();
        return a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom;
      })), true, 'prints fit inside book');
      await book.screenshot({ path: join(tmpdir(), `craft-${width}-${count}.png`) });
      await panel.getByRole('button').first().click();
      assert.equal(await page.getByRole('dialog').count(), 1);
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button', { name: 'แตะเพื่อร่วมใส่ซอง', exact: true }).click();
    await page.getByRole('button', { name: 'บันทึก QR', exact: true }).click({ trial: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(`PASS ${width}: compact book, all chapters, photo viewer, gift, no overflow`);
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
