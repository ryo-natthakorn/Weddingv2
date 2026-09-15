import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch();
try {
  for (const width of [413, 1401]) {
    const page = await browser.newPage({ viewport: { width, height: 1032 } });
    await page.route(/^https:\/\//, route => route.abort());
    await page.goto(server.resolvedUrls.local[0]);
    await page.getByRole('slider').press('Enter');
    await page.getByRole('button', { name: 'Open music player' }).click({ trial: true });
    await page.waitForTimeout(1500);
    const section = page.locator('.pw-orbit').locator('..').locator('..');
    const top = await section.evaluate(el => el.getBoundingClientRect().top + scrollY);
    const range = await section.evaluate(el => el.offsetHeight - innerHeight);
    const transforms = [];
    for (const [name, progress] of [['stack', 0.05], ['line', 0.34], ['ring', 0.71], ['landing', 0.94], ['book', 1]]) {
      await page.evaluate(y => scrollTo(0, y), top + progress * range);
      await page.waitForTimeout(1800);
      await page.screenshot({ path: join(tmpdir(), `pinned-${width}-${name}.png`) });
      if (progress < 0.98) {
        transforms.push(await page.locator('.pw-orbit-card').nth(4).locator('..').evaluate(el => getComputedStyle(el).transform));
        const stage = await page.locator('.pw-orbit').boundingBox();
        assert.ok(stage.y >= 0 && stage.y + stage.height <= 1032, 'stage stays visible while pinned');
      } else {
        assert.equal(await page.getByRole('tabpanel').count(), 1);
        const book = await page.locator('.pw-book').boundingBox();
        assert.ok(book.y >= 0 && book.y + book.height <= 1032, 'final book fits viewport');
      }
    }
    assert.equal(new Set(transforms).size, 4);
    await page.evaluate(y => scrollTo(0, y), top + range * 0.5);
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('.pw-orbit').count(), 1, 'scrolling back restores cards');
    console.log(`PASS ${width}: pinned stack, line, ring, landing, book and reverse scroll`);
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
