import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ headless: true });
const output = join(tmpdir(), 'wedding-refinement');
await mkdir(output, { recursive: true });

try {
  for (const [width, height] of [[414, 896], [1280, 896], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https:\/\//, route => route.abort());
    await page.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded' });
    await page.getByRole('slider', { name: 'Slide to open the invitation' }).press('Enter');
    await page.getByRole('button', { name: 'Open music player' }).click({ trial: true });
    await page.waitForFunction(() => {
      const hero = document.querySelector('.wedding-hero-art img');
      return hero?.complete && hero.naturalWidth > 0;
    });
    await page.screenshot({ path: join(output, `hero-${width}.png`), animations: 'disabled' });
    const geometry = await page.evaluate(() => {
      const image = document.querySelector('.wedding-hero-art img').getBoundingClientRect();
      const hero = document.querySelector('.wedding-hero').getBoundingClientRect();
      const mark = document.querySelector('.wedding-hero-mark').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, image: { x: image.x, y: image.y, width: image.width, height: image.height }, hero: { height: hero.height }, markBottom: mark.bottom };
    });
    assert.equal(geometry.overflow, false, `${width}px horizontal overflow`);
    if (width >= 900) {
      // Both heads occupy the middle of the supplied portrait at y=48-60%.
      const headsTop = geometry.image.y + geometry.image.height * 0.48;
      const headsBottom = geometry.image.y + geometry.image.height * 0.60;
      assert.ok(headsTop > geometry.markBottom, `${width}px logo overlaps faces`);
      assert.ok(headsBottom < geometry.hero.height, `${width}px faces cropped`);
      assert.ok(Math.abs(geometry.image.x + geometry.image.width / 2 - width / 2) < 2);
    }
    const gallery = page.locator('.pw-mosaic');
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('.pw-stamp img')].every(img => img.complete && img.naturalWidth > 0));
    for (const photo of await gallery.locator('img').all()) {
      await photo.scrollIntoViewIfNeeded();
      await photo.evaluate(img => img.decode());
    }
    await gallery.scrollIntoViewIfNeeded();
    await gallery.screenshot({ path: join(output, `gallery-${width}.png`), animations: 'disabled' });
    await gallery.getByRole('button').last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(output, `gallery-bottom-${width}.png`), animations: 'disabled' });
    const first = gallery.getByRole('button').first();
    await first.click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, [], `${width}px browser exceptions`);
    console.log(`PASS ${width}x${height}: hero framing, image loading, no overflow, gallery opens/navigates/closes`);
    await page.close();
  }
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
  await server.close();
}
