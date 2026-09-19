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
    // The staff holds nothing until the orb brings its notes up onto it.
    assert.equal(await page.locator('#song-staff [data-music-note]').evaluateAll(
      notes => notes.filter(note => Number(getComputedStyle(note.parentElement).opacity) > 0.05).length,
    ), 0, 'the staff is empty before the orb docks');
    // Every note turning around the orb keeps clear of the gold disc itself,
    // at every point of its drift and not merely where it comes to rest.
    const clearances = [];
    for (let frame = 0; frame < 60; frame += 1) {
      clearances.push(...await page.evaluate(() => {
        const button = document.querySelector('[aria-label="Open music player"]');
        const box = button.getBoundingClientRect();
        const centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        return [...document.querySelectorAll('[data-music-note]')]
          // the trail only — the staff's notes are a page away and not the
          // ones that could ever sit on the button
          .filter(note => !note.closest('#song-staff'))
          .filter(note => Number(getComputedStyle(note.closest('div[style]') || note).opacity) > 0.05)
          .map(note => {
            const r = note.getBoundingClientRect();
            // nearest point of the note's own box to the orb's centre
            const dx = Math.max(r.left - centre.x, 0, centre.x - r.right);
            const dy = Math.max(r.top - centre.y, 0, centre.y - r.bottom);
            return Math.hypot(dx, dy);
          });
      }));
      await page.waitForTimeout(40);
    }
    const start = Date.now();
    const depart = await page.locator('[aria-label="Open music player"]').boundingBox();
    await slot.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-music-docking="true"]'));
    assert.equal(await page.locator('[data-music-docked="true"]').count(), 0, 'the flight is visible, not a cut');
    // Mid-flight: no swelling shadow, no squash, and the path bows off the
    // straight line between the two boxes.
    const air = [];
    for (let frame = 0; frame < 24; frame += 1) {
      air.push(await page.evaluate(() => {
        const button = document.querySelector('[aria-label="Open music player"]');
        if (!button) return null;
        const style = getComputedStyle(button);
        const box = button.getBoundingClientRect();
        return { shadow: style.boxShadow, transform: style.transform, x: box.left + box.width / 2, y: box.top + box.height / 2 };
      }));
      await page.waitForTimeout(25);
    }
    await page.screenshot({ path: join(output, `music-flying-${width}.png`) });
    await page.waitForFunction(() => document.querySelector('[data-music-docked="true"]'));
    assert.ok(Date.now() - start >= 700, 'the flight is slow enough to watch');
    const sampled = air.filter(Boolean);
    const rest = await page.evaluate(() => getComputedStyle(document.querySelector('[aria-label="Open music player"]')).boxShadow);
    assert.ok(sampled.length > 0, 'the orb was sampled in flight');
    assert.equal(new Set([...sampled.map(s => s.shadow), rest]).size, 1, 'the orb shadow never swells: no lift');
    for (const sample of sampled) {
      // matrix(a, b, c, d, …) — d is the vertical scale. A squash shows here.
      const parts = sample.transform.startsWith('matrix(') ? sample.transform.slice(7, -1).split(',').map(Number) : null;
      if (parts) assert.ok(Math.abs(parts[3] - 1) < 0.01, 'the orb is never squashed');
    }
    const arrive = await page.locator('[aria-label="Open music player"]').boundingBox();
    const from = { x: depart.x + depart.width / 2, y: depart.y + depart.height / 2 };
    const to = { x: arrive.x + arrive.width / 2, y: arrive.y + arrive.height / 2 };
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const bow = Math.max(...sampled.map(s =>
      Math.abs((to.x - from.x) * (from.y - s.y) - (from.x - s.x) * (to.y - from.y)) / (span || 1)));
    assert.ok(bow >= 8, `the flight arcs rather than sliding (bowed ${bow.toFixed(1)}px)`);
    assert.ok(clearances.length > 0, 'the note trail was running');
    assert.ok(Math.min(...clearances) >= 40, `the notes keep clear of the orb (nearest ${Math.min(...clearances).toFixed(1)}px)`);
    // …and the staff now carries the notes the orb brought with it.
    await page.waitForFunction(() => [...document.querySelectorAll('#song-staff [data-music-note]')]
      .filter(note => Number(getComputedStyle(note.parentElement).opacity) > 0.9).length === 5);
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
    // The notes go back with the orb — the staff is empty again.
    await page.waitForFunction(() => [...document.querySelectorAll('#song-staff [data-music-note]')]
      .every(note => Number(getComputedStyle(note.parentElement).opacity) < 0.05));
    console.log(`PASS ${width}px: circular gallery, arced flight, flat orb, notes on the staff, floating return`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
