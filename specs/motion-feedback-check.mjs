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
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-gallery-ready="true"]'));
    await gallery.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
    await page.screenshot({ path: join(output, `morph-settled-${width}.png`) });
    // The song section holds nothing but an empty slot until the orb flies in.
    const slot = page.locator('[data-music-dock-slot]');
    assert.equal(await page.getByRole('button', { name: 'ฟังเพลง', exact: true }).count(), 0, 'no second play control in the song section');
    const start = Date.now();
    await slot.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-music-docking="true"]'));
    assert.equal(await page.locator('[data-music-docked="true"]').count(), 0, 'the flight is visible, not a cut');
    await page.screenshot({ path: join(output, `music-flying-${width}.png`) });
    await page.waitForFunction(() => document.querySelector('[data-music-docked="true"]'));
    assert.ok(Date.now() - start >= 150, 'the orb travels rather than teleporting');
    assert.equal(
      await page.evaluate(() => document.querySelector('[data-music-dock-slot]').contains(document.querySelector('[data-music-docked="true"]'))),
      true,
      'the orb lands inside the song section, in the page',
    );
    await page.screenshot({ path: join(output, `music-docked-${width}.png`) });
    // Tapping the docked orb opens the card in the page, where it stands.
    await page.getByRole('button', { name: 'Open music player' }).click();
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(() => {
        const dock = document.querySelector('[data-music-dock-slot]');
        return dock.getBoundingClientRect().height > 200 && dock.childElementCount > 0;
      }),
      true,
      'the card opens inside the slot and pushes the page down',
    );
    assert.equal(
      await page.evaluate(() => [...document.querySelector('[data-music-dock-slot]').querySelectorAll('*')]
        .filter((node) => (getComputedStyle(node).backdropFilter || '').includes('blur')).length),
      0,
      'the player card carries no backdrop blur',
    );
    const youtube = page.locator('a[href="https://www.youtube.com/watch?v=p8iVeHphD3c"]');
    await youtube.locator('img').evaluate(img => img.decode());
    assert.ok((await youtube.locator('img').getAttribute('src')).includes('youtube-icon'));
    await youtube.screenshot({ path: join(output, `youtube-official-${width}.png`) });
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await section.evaluate(el => el.scrollIntoView());
    await page.getByRole('button', { name: 'Open music player' }).click({ trial: true });
    await page.waitForFunction(() => !document.querySelector('[data-music-docking="true"]'));
    console.log(`PASS ${width}px: circular gallery, visible flight, in-page card, floating return`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
