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
  for (const width of [414, 1401]) {
    const page = await browser.newPage({ viewport: { width, height: 1032 }, reducedMotion: 'no-preference' });
    await page.route(/^https:\/\//, route => route.abort());
    await page.goto(server.resolvedUrls.local[0]);
    await page.getByRole('slider', { name: 'Slide to open the invitation' }).press('Enter');
    await page.getByRole('button', { name: 'Open music player' }).click({ trial: true });
    const gallery = page.locator('.pw-orbit');
    const section = page.locator('#gallery-section');
    await section.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * 0.2));
    await page.waitForTimeout(1100);
    const early = await gallery.locator('.pw-orbit-card').nth(3).locator('..').evaluate(el => getComputedStyle(el).transform);
    await section.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * 0.68));
    await page.waitForTimeout(800);
    const late = await gallery.locator('.pw-orbit-card').nth(3).locator('..').evaluate(el => getComputedStyle(el).transform);
    assert.notEqual(early, late, 'gallery morph follows scroll position');
    await gallery.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
    await page.screenshot({ path: join(output, `morph-settled-${width}.png`) });
    const song = page.getByRole('button', { name: 'ฟังเพลง', exact: true });
    const start = Date.now();
    await song.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-music-docking="true"]'));
    await page.waitForTimeout(650);
    assert.equal(await page.locator('[data-music-docked="true"]').count(), 0, 'merge stays visible long enough to notice');
    await page.screenshot({ path: join(output, `music-merging-${width}.png`) });
    await page.waitForFunction(() => document.querySelector('[data-music-docked="true"]'));
    assert.ok(Date.now() - start >= 1500, 'merge is not instantaneous');
    await song.click();
    const youtube = page.locator('a[href="https://www.youtube.com/watch?v=p8iVeHphD3c"]');
    await youtube.locator('img').evaluate(img => img.decode());
    assert.ok((await youtube.locator('img').getAttribute('src')).includes('youtube-icon'));
    await youtube.screenshot({ path: join(output, `youtube-official-${width}.png`) });
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await section.evaluate(el => el.scrollIntoView());
    await page.getByRole('button', { name: 'Open music player' }).click({ trial: true });
    await page.waitForFunction(() => !document.querySelector('[data-music-docking="true"]'));
    console.log(`PASS ${width}px: scroll morph, visible merge duration, song control, floating return`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
