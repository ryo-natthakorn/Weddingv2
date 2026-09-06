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
  for (const [width, height] of [[320, 896], [414, 896], [503, 1032], [794, 1032], [893, 1032], [1280, 896], [1920, 1080]]) {
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
    const gallery = page.locator('.pw-gallery');
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('.pw-stamp img')].every(img => img.complete && img.naturalWidth > 0));
    for (const photo of await gallery.locator('img').all()) {
      await photo.scrollIntoViewIfNeeded();
      await photo.evaluate(img => img.decode());
    }
    await gallery.scrollIntoViewIfNeeded();
    await gallery.screenshot({ path: join(output, `gallery-${width}.png`), animations: 'disabled' });
    const photos = await gallery.locator('img').evaluateAll(images => images.map(img => ({
      name: new URL(img.src).pathname.split('/').pop(),
      x: img.getBoundingClientRect().x,
      y: img.getBoundingClientRect().y,
    })));
    assert.deepEqual(photos.map(photo => photo.name), [
      '01-ring-box.jpg', '11-suan-ben.jpg', '10-suan-ben.jpg', '09-suan-ben.jpg',
      '08-suan-ben.jpg', '02-rings.jpg', '07-suan-ben.jpg', '03-saphan-phut.jpg',
      '04-saphan-phut.jpg', '05-saphan-phut.jpg', '06-saphan-phut.jpg',
    ]);
    assert.ok(photos[1].x < photos[2].x && Math.abs(photos[1].y - photos[2].y) < 20, 'group 1 must read left to right');
    await gallery.getByRole('button').last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(output, `gallery-bottom-${width}.png`), animations: 'disabled' });
    const first = gallery.getByRole('button').first();
    await first.click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    const mrt = page.getByText('โดย MRT', { exact: true }).locator('..').locator('..').locator('img');
    await mrt.scrollIntoViewIfNeeded();
    await mrt.screenshot({ path: join(output, `mrt-${width}.png`) });
    for (const text of ['การตอบรับของคุณช่วยให้เราเตรียมงานได้พอดี', 'Your reply helps us plan our day.']) {
      if (text.startsWith('Your')) await page.getByRole('button', { name: 'EN', exact: true }).click();
      const message = page.getByText(text, { exact: true });
      await message.scrollIntoViewIfNeeded();
      const lines = await message.evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = [...range.getClientRects()];
        return { count: rects.length, fits: rects.every(rect => rect.left >= 0 && rect.right <= innerWidth) };
      });
      assert.deepEqual(lines, { count: 1, fits: true }, `${width}px RSVP must fit on one readable line`);
      await message.screenshot({ path: join(output, `rsvp-${text.startsWith('Your') ? 'en' : 'th'}-${width}.png`), animations: 'disabled' });
    }
    assert.deepEqual(errors, [], `${width}px browser exceptions`);
    console.log(`PASS ${width}x${height}: hero framing, gallery grouping/navigation, logo rendering, single-line TH/EN RSVP`);
    await page.close();
  }
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
  await server.close();
}
