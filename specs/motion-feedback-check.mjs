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
    /* The staff fills only while the song is PLAYING, and YouTube is
       unreachable from here, so playback is mocked exactly as
       music-player-check.mjs does it. */
    await page.addInitScript(() => {
      window.musicTest = { players: [] };
      window.YT = { Player: class {
        constructor(host, options) {
          this.options = options; this.time = 30; this.state = -1;
          const frame = document.createElement('iframe'); host.replaceWith(frame);
          window.musicTest.players.push(this);
          setTimeout(() => options.events.onReady({ target: this }), 0);
        }
        emit(state) { this.state = state; this.options.events.onStateChange({ target: this, data: state }); }
        playVideo() { this.emit(1); }
        pauseVideo() { this.emit(2); }
        seekTo(t) { this.time = t; }
        getCurrentTime() { return this.time; }
        getDuration() { return 200; }
        setVolume() {}
        destroy() { frame?.remove?.(); }
      } };
    });
    await page.route(/youtube\.com\/iframe_api/, route => route.fulfill({ body: '' }));
    await page.route(/^https:\/\//, route => route.abort());
    await page.goto(server.resolvedUrls.local[0]);
    await page.getByRole('slider', { name: 'Slide to open the invitation' }).press('Enter');
    /* Leg one: the ring leaves the slider and settles between the names. It is
       the invitation's own ring there — not a control. */
    await page.waitForFunction(() => document.querySelector('[data-ring-home="names"]'));
    assert.equal(await page.getByRole('button', { name: 'Open music player' }).count(), 0,
      'the ring between the names is not a button');
    assert.equal(
      await page.evaluate(() => document.querySelector('[data-ring-slot]').contains(document.querySelector('[data-ring-home]'))),
      true, 'the ring lands in the names slot');
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
    ), 0, 'the staff is empty before the song plays');
    /* Leg two has already happened by now — scrolling to the gallery took the
       names off the top of the screen — so the ring is the control in the
       corner, and it is a button again. */
    await page.waitForFunction(() => document.querySelector('[data-ring-home="corner"]'));
    assert.equal(await page.getByRole('button', { name: 'Open music player' }).count(), 1,
      'the ring is the player once it reaches the corner');

    /* Leg three: into the song section. Sampled throughout for the three things
       this pass is about — it must not spin, it must not be squashed, its
       shadow must not swell, and it must arc rather than slide. */
    const start = Date.now();
    const depart = await page.locator('[aria-label="Open music player"]').boundingBox();
    await slot.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-music-docking="true"]'));
    assert.equal(await page.locator('[data-music-docked="true"]').count(), 0, 'the flight is visible, not a cut');
    const air = [];
    for (let frame = 0; frame < 30; frame += 1) {
      air.push(await page.evaluate(() => {
        const art = document.querySelector('[data-ring-art]');
        const button = document.querySelector('[aria-label="Open music player"]');
        if (!art || !button) return null;
        const box = button.getBoundingClientRect();
        return {
          transform: getComputedStyle(art).transform,
          shadow: getComputedStyle(art.querySelector('img')).filter,
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
        };
      }));
      await page.waitForTimeout(25);
    }
    await page.screenshot({ path: join(output, `music-flying-${width}.png`) });
    await page.waitForFunction(() => document.querySelector('[data-music-docked="true"]'));
    assert.ok(Date.now() - start >= 700, 'the flight is slow enough to watch');
    const sampled = air.filter(Boolean);
    assert.ok(sampled.length > 0, 'the ring was sampled in flight');
    const atRest = await page.evaluate(() => getComputedStyle(document.querySelector('[data-ring-art] img')).filter);
    assert.equal(new Set([...sampled.map(s => s.shadow), atRest]).size, 1, 'the ring shadow never swells: no lift');
    for (const sample of sampled) {
      // matrix(a, b, c, d, …): a pure scale keeps b and c at zero. Any rotation
      // — the "ควงสว่าน" this pass exists to rule out — shows up in them, and a
      // squash shows as a and d disagreeing.
      if (!sample.transform.startsWith('matrix(')) continue;
      const [a, b, c, d] = sample.transform.slice(7, -1).split(',').map(Number);
      assert.ok(Math.abs(b) < 0.001 && Math.abs(c) < 0.001, `the ring never rotates (got ${sample.transform})`);
      assert.ok(Math.abs(a - d) < 0.01, 'the ring is never squashed');
    }
    const arrive = await page.locator('[aria-label="Open music player"]').boundingBox();
    const from = { x: depart.x + depart.width / 2, y: depart.y + depart.height / 2 };
    const to = { x: arrive.x + arrive.width / 2, y: arrive.y + arrive.height / 2 };
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const bow = Math.max(...sampled.map(s =>
      Math.abs((to.x - from.x) * (from.y - s.y) - (from.x - s.x) * (to.y - from.y)) / (span || 1)));
    assert.ok(bow >= 6, `the flight arcs rather than sliding (bowed ${bow.toFixed(1)}px)`);

    /* The staff belongs to the song, not to the ring's arrival: still empty
       here, filled once the song is playing, empty again when it stops. */
    const staffNotes = () => page.evaluate(() => [...document.querySelectorAll('#song-staff [data-music-note]')]
      .filter(note => Number(getComputedStyle(note.parentElement).opacity) > 0.9).length);
    assert.equal(await staffNotes(), 0, 'the staff stays empty until the song plays');
    await page.evaluate(() => window.musicTest.players[0].emit(1));
    await page.waitForFunction(() => [...document.querySelectorAll('#song-staff [data-music-note]')]
      .filter(note => Number(getComputedStyle(note.parentElement).opacity) > 0.9).length === 5);
    await page.evaluate(() => window.musicTest.players[0].emit(2));
    await page.waitForFunction(() => [...document.querySelectorAll('#song-staff [data-music-note]')]
      .every(note => Number(getComputedStyle(note.parentElement).opacity) < 0.05));
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
    console.log(`PASS ${width}px: circular gallery, the ring's journey, no spin, notes follow playback`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
