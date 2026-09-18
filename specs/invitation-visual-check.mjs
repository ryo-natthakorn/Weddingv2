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
    const orbit = page.locator('.pw-orbit');
    await orbit.scrollIntoViewIfNeeded();
    await orbit.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
    assert.equal(await orbit.locator('img').count(), 11);
    assert.equal(await page.locator('.pw-book, .pw-book-tabs').count(), 0);
    await orbit.screenshot({ path: join(output, `ring-${width}.png`), animations: 'disabled' });
    const first = orbit.getByRole('button').first();
    await first.focus();
    await first.press('ArrowRight');
    assert.equal(await orbit.getByRole('button').nth(1).evaluate(el => el === document.activeElement), true);
    await orbit.getByRole('button').nth(1).press('Enter');
    assert.equal(await page.getByRole('dialog').count(), 1);
    await page.keyboard.press('Escape');
    assert.equal(await orbit.getByRole('button').nth(1).evaluate(el => el === document.activeElement), true);
    const mrt = page.locator('.direction-row', { hasText: 'โดย MRT' }).locator('img');
    await mrt.scrollIntoViewIfNeeded();
    await mrt.screenshot({ path: join(output, `mrt-${width}.png`) });
    await page.getByRole('button', { name: 'แตะเพื่อร่วมใส่ซอง', exact: true }).scrollIntoViewIfNeeded();
    const giftHeight = await page.locator('#gift-section').evaluate(el => el.getBoundingClientRect().height);
    await page.locator('#gift-section').screenshot({ path: join(output, `envelope-closed-${width}.png`), animations: 'disabled' });
    await page.getByRole('button', { name: 'แตะเพื่อร่วมใส่ซอง', exact: true }).click();
    await page.getByRole('button', { name: 'บันทึก QR', exact: true }).click({ trial: true });
    await page.locator('#gift-section').screenshot({ path: join(output, `envelope-open-${width}.png`), animations: 'disabled' });
    assert.ok(await page.locator('#gift-section').evaluate(el => el.getBoundingClientRect().height) >= giftHeight, 'expanded envelope reserves space for QR');
    // The kicker's size now lives on FitLine's rendered line, not its host.
    const heading = await page.locator('[data-fit-text]', { hasText: /^ฟอร์มตอบรับคำเชิญ$/ }).first().evaluate(el => {
      const style = getComputedStyle(el);
      return { size: style.fontSize, weight: style.fontWeight, spacing: style.letterSpacing, color: style.color };
    });
    assert.deepEqual(heading, { size: '30px', weight: '600', spacing: 'normal', color: 'rgb(27, 74, 92)' });
    await page.getByRole('button', { name: 'ยินดีร่วมงาน', exact: true }).click();
    const guests = page.getByRole('spinbutton');
    await guests.press('End');
    assert.equal(await guests.getAttribute('aria-valuenow'), '5');
    assert.equal(await guests.getAttribute('aria-valuemax'), '5');
    assert.equal(await page.getByText('รวมผู้กรอกแบบฟอร์ม', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'ไม่สะดวกร่วมงาน', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'ไม่สะดวกร่วมงาน', exact: true }).getAttribute('aria-pressed'), 'true');
    const song = page.getByRole('button', { name: 'ฟังเพลง', exact: true });
    await song.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-music-docked="true"]'));
    assert.equal(await page.getByRole('button', { name: 'Open music player' }).count(), 0, 'floating button merges into song CTA');
    await page.screenshot({ path: join(output, `song-docked-${width}.png`), animations: 'disabled' });
    // One line from a tablet up, the two authored lines on a phone.
    const dedication = await page.locator('[data-song-dedication]').evaluate(el =>
      [...el.querySelectorAll('[data-fit-text]')].reduce((count, node) => {
        const range = document.createRange(); range.selectNodeContents(node);
        return count + new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
      }, 0));
    assert.equal(dedication, width >= 768 ? 1 : 2, `${width}px song dedication line count`);
    // The RSVP importance line is a FitLine now: one line, or the two authored
    // lines on the narrowest phones. specs/one-line-copy-check.mjs owns the
    // exhaustive per-width sweep; this keeps the visual record.
    for (const lang of ['th', 'en']) {
      if (lang === 'en') await page.getByRole('button', { name: 'EN', exact: true }).click();
      const message = page.locator('.rsvp-importance');
      await message.scrollIntoViewIfNeeded();
      const lines = await message.evaluate(el => {
        const rects = [...el.querySelectorAll('[data-fit-text]')].flatMap(node => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return [...range.getClientRects()];
        });
        return {
          claimed: Number(el.dataset.lines),
          fits: rects.every(rect => rect.left >= -0.5 && rect.right <= innerWidth + 0.5),
          tops: new Set(rects.map(rect => Math.round(rect.top))).size,
        };
      });
      assert.equal(lines.fits, true, `${width}px RSVP must fit without overflow`);
      assert.equal(lines.tops, lines.claimed, `${width}px RSVP renders the lines it claims`);
      assert.ok(lines.claimed <= 2, `${width}px RSVP breaks at most once`);
      await message.screenshot({ path: join(output, `rsvp-${lang}-${width}.png`), animations: 'disabled' });
    }
    assert.deepEqual(errors, [], `${width}px browser exceptions`);
    console.log(`PASS ${width}x${height}: hero, circular gallery navigation, photo order, envelope, readable TH/EN RSVP`);
    await page.close();
  }
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
  await server.close();
}
