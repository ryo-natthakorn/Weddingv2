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
    /* Leg one: the ring leaves the slider and floats down through the page to
       wait between the names. The thing that must not happen — and the bug Ryo
       reported — is the ring REVERSING: descending the viewport and then coming
       back up, which is what a wrong scroll correction produced. So the gap
       between the ring and its slot must only ever shrink. */
    await page.waitForFunction(() => document.querySelector('[data-ring-home="names"]'));
    await page.getByRole('slider', { name: 'Slide to open the invitation' }).waitFor({ state: 'detached' });
    const gaps = [];
    for (let i = 0; i < 60; i += 1) {
      await page.mouse.wheel(0, 18);
      await page.waitForTimeout(25);
      gaps.push(await page.evaluate(() => {
        const a = document.querySelector('[data-ring-home]').getBoundingClientRect();
        const b = document.querySelector('[data-ring-slot]').getBoundingClientRect();
        return (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2;
      }));
    }
    for (let i = 1; i < gaps.length; i += 1) {
      assert.ok(Math.abs(gaps[i]) <= Math.abs(gaps[i - 1]) + 0.5,
        `the ring closes on its slot without ever backing off (${gaps[i - 1].toFixed(1)} -> ${gaps[i].toFixed(1)})`);
      assert.ok(!(gaps[i] > 0.5 && gaps[i - 1] < -0.5) && !(gaps[i] < -0.5 && gaps[i - 1] > 0.5),
        'the ring never overshoots past its slot');
    }
    /* It rides with the page rather than being pinned to the glass: scrolling
       must change where it is on screen. */
    const before = await page.evaluate(() => document.querySelector('[data-ring-home]').getBoundingClientRect().top);
    await page.mouse.wheel(0, 140);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.querySelector('[data-ring-home]').getBoundingClientRect().top);
    assert.ok(Math.abs(before - after) > 60, 'the ring travels with the page, it does not follow the viewport');
    await page.evaluate(() => document.querySelector('[data-ring-slot]').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() => {
      const a = document.querySelector('[data-ring-home]').getBoundingClientRect();
      const b = document.querySelector('[data-ring-slot]').getBoundingClientRect();
      return Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 0.5;
    }, null, { timeout: 15000 });
    assert.equal(await page.getByRole('button', { name: 'Open music player' }).count(), 0,
      'the ring between the names is not a button');

    /* The guard that matters, and the one this harness can actually make:
       while the ring is parked, scrolling must cause NO work. It used to be
       `position: fixed` with its transform rewritten from the slot's viewport
       rect on every animation frame, which lags any page that scrolls on the
       compositor thread — iOS Safari always, and trackpad/touch momentum on
       desktop. Headless Chromium scrolls on the main thread, in lockstep with
       JS, so a position assertion here reads a flat 0px either way and proves
       nothing. Counting the style writes tests the mechanism directly. */
    /* Parked is a state, not a moment: the leg's tween can be within half a
       pixel of the slot while still running. The layer switching to `absolute`
       is the arrival itself, so wait for that rather than for a duration. */
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector('[data-music-layer]')).position === 'absolute',
      null, { timeout: 15000 });
    await page.evaluate(() => {
      window.__ringWrites = 0;
      new MutationObserver(m => { window.__ringWrites += m.length; })
        .observe(document.querySelector('[data-music-layer]'), { attributes: true, attributeFilter: ['style'] });
    });
    for (const dir of [1, -1]) {
      for (let i = 0; i < 12; i += 1) await page.mouse.wheel(0, 8 * dir);
      await page.waitForTimeout(300);
    }
    assert.equal(await page.evaluate(() => window.__ringWrites), 0,
      'scrolling does no work on the parked ring: the compositor carries it');

    /* Once home it is completely still: scrolling must not shift it one pixel
       relative to the slot. This is the guard for the stutter Ryo reported. */
    const ringOffset = () => page.evaluate(() => {
      const a = document.querySelector('[data-ring-home]').getBoundingClientRect();
      const b = document.querySelector('[data-ring-slot]').getBoundingClientRect();
      return Math.round((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
    });
    const restOffsets = [await ringOffset()];
    for (let i = 0; i < 12; i += 1) { await page.mouse.wheel(0, 10); await page.waitForTimeout(40); restOffsets.push(await ringOffset()); }
    assert.equal(new Set(restOffsets).size, 1, `the ring is still while the page scrolls under it (saw ${[...new Set(restOffsets)].join(',')})`);
    assert.equal(await page.getByRole('button', { name: 'Open music player' }).count(), 0,
      'the ring between the names is not a button');
    assert.equal(
      await page.evaluate(() => document.querySelector('[data-music-layer]').contains(document.querySelector('[data-ring-home]'))),
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
    // Autoplay may have started at unlock; explicitly pause for this scenario.
    await page.evaluate(() => window.musicTest.players[0].emit(2));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-music-notes] > [data-music-note]')]
      .every(note => Number(getComputedStyle(note).opacity) < 0.05));
    // Paused notes remain hidden, including before docking.
    assert.equal(await page.locator('[data-music-notes] > [data-music-note]').evaluateAll(
      notes => notes.filter(note => Number(getComputedStyle(note).opacity) > 0.05).length,
    ), 0, 'the staff is empty before the song plays');
    /* Leg two has already happened by now — scrolling to the gallery took the
       names off the top of the screen — so the ring is the control in the
       corner, and it is a button again. */
    /* Scrolled explicitly rather than relying on the gallery having done it:
       the stillness check above leaves the page part way through the names, so
       scrollIntoViewIfNeeded can be a no-op. */
    await page.evaluate(() => {
      const slot = document.querySelector('[data-ring-slot]');
      window.scrollTo(0, window.scrollY + slot.getBoundingClientRect().bottom + 500);
    });
    await page.waitForFunction(() => document.querySelector('[data-ring-home="corner"]'));
    await page.waitForTimeout(2500);
    assert.equal(await page.getByRole('button', { name: 'Open music player' }).count(), 1,
      'the ring is the player once it reaches the corner');

    /* The orbit, which nothing asserted until the notes went missing in every
       state at once. Playing, in the corner, the notes must be on screen and
       visible — and must SURVIVE a re-render, because an opacity cached in JS
       and never re-validated goes stale the moment React hands back a fresh
       node with the style prop's opacity: 0 on it. */
    await page.evaluate(() => window.musicTest.players[0].emit(1));
    const orbiting = async () => page.evaluate(() => {
      const view = { w: innerWidth, h: innerHeight };
      return [...document.querySelectorAll('[data-music-note]')].filter(note => {
        const box = note.getBoundingClientRect();
        return Number(getComputedStyle(note).opacity) > 0.7
          && box.right > 0 && box.left < view.w && box.bottom > 0 && box.top < view.h;
      }).length;
    });
    await page.waitForFunction(() => [...document.querySelectorAll('[data-music-note]')]
      .every(note => Number(getComputedStyle(note).opacity) > 0.7), null, { timeout: 10000 });
    assert.equal(await orbiting(), 5, 'the notes orbit the ring in the corner, on screen and visible');
    // Force React to re-render the player and re-attach every note ref.
    await page.setViewportSize({ width: width - 1, height: 1032 });
    await page.waitForTimeout(600);
    await page.setViewportSize({ width, height: 1032 });
    await page.waitForTimeout(600);
    assert.equal(await orbiting(), 5, 'the orbiting notes survive a re-render');
    // Put playback back where the rest of this walk expects to find it.
    await page.evaluate(() => window.musicTest.players[0].emit(2));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-music-note]')]
      .every(note => Number(getComputedStyle(note).opacity) < 0.05));

    /* Leg three: into the song section. Sampled throughout for the three things
       this pass is about — it must not spin, it must not be squashed, its
       shadow must not swell, and it must arc rather than slide. */
    await page.waitForTimeout(3200);
    await page.evaluate(() => window.musicTest.players[0].emit(1));
    await page.waitForTimeout(300);
    const start = Date.now();
    const depart = await page.locator('[aria-label="Open music player"]').boundingBox();
    await slot.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-music-docking="true"]'));
    assert.equal(await page.locator('[data-music-docked="true"]').count(), 0, 'the flight is visible, not a cut');
    const air = [];
    for (let frame = 0; frame < 125; frame += 1) {
      air.push(await page.evaluate(() => {
        const art = document.querySelector('[data-ring-art]');
        const button = document.querySelector('[aria-label="Open music player"]');
        if (!art || !button) return null;
        const box = button.getBoundingClientRect();
        return {
          note: (() => {
            const n = document.querySelector("[data-music-notes] > [data-music-note]");
            const m = n.getScreenCTM();
            return { x: m.e, y: m.f, opacity: Number(getComputedStyle(n).opacity), parked: n.parentElement.dataset.musicNotesParked === "true" };
          })(),
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
    assert.ok(Date.now() - start >= 2800, 'the flight is slow enough to watch');
    const sampled = air.filter(Boolean);
    assert.ok(sampled.length > 0, 'the ring was sampled in flight');
    assert.ok(sampled.every(s => s.note.opacity > 0.7), 'playing notes stay visible throughout the flight');
    const landing = sampled.findIndex(s => s.note.parked);
    assert.ok(landing > 0, 'sample both sides of the note landing');
    const beforeNote = sampled[landing - 1].note, afterNote = sampled[landing].note;
    assert.ok(Math.hypot(afterNote.x - beforeNote.x, afterNote.y - beforeNote.y) < 3, 'notes settle on the staff without a last-frame jump: ' + JSON.stringify({beforeNote, afterNote}));
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
    const staffNotes = () => page.evaluate(() => [...document.querySelectorAll('[data-music-notes] > [data-music-note]')]
      .filter(note => Number(getComputedStyle(note).opacity) > 0.7).length);
    await page.evaluate(() => window.musicTest.players[0].emit(2));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-music-notes] > [data-music-note]')]
      .every(note => Number(getComputedStyle(note).opacity) < 0.05));
    assert.equal(await staffNotes(), 0, 'the staff stays empty until the song plays');
    await page.evaluate(() => window.musicTest.players[0].emit(1));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-music-notes] > [data-music-note]')]
      .filter(note => Number(getComputedStyle(note).opacity) > 0.7).length === 5);
    /* The same guard the parked ring gets, for the same bug, on the notes Ryo
       reported next: at rest on the staff they must cost the page nothing.
       The loop used to re-pin all five to the staff circles' live VIEWPORT
       rects every frame, forever, which lags any page scrolling on the
       compositor thread. Position cannot be asserted here — headless Chromium
       scrolls on the main thread, in lockstep with JS, so it reads a flat 0px
       whether the bug is present or not. Counting the writes tests the
       mechanism itself. */
    await page.waitForFunction(() => document.querySelector('[data-music-notes-parked="true"]'));
    assert.equal(
      await page.evaluate(() => getComputedStyle(document.querySelector('[data-music-notes]')).position),
      'absolute', 'the parked notes are anchored in the page, not to the glass');
    await page.evaluate(() => {
      window.__noteWrites = 0;
      const observer = new MutationObserver(m => { window.__noteWrites += m.length; });
      for (const note of document.querySelectorAll('[data-music-note]'))
        observer.observe(note, { attributes: true, attributeFilter: ['transform', 'style'] });
      observer.observe(document.querySelector('[data-music-notes]'), { attributes: true, attributeFilter: ['style'] });
    });
    for (const dir of [1, -1]) {
      for (let i = 0; i < 12; i += 1) await page.mouse.wheel(0, 8 * dir);
      await page.waitForTimeout(300);
    }
    assert.equal(await page.evaluate(() => window.__noteWrites), 0,
      'scrolling does no work on the notes resting on the staff: the compositor carries them');
    /* Measuring right is not painting. A root <svg> clips to its own viewport,
       so a zero-sized host renders nothing while every rect and CTM below still
       reads perfectly - which is exactly how this shipped broken once. Assert
       the notes are inside the box that paints them. */
    const contained = await page.evaluate(() => {
      const host = document.querySelector('[data-music-notes]').getBoundingClientRect();
      return [...document.querySelectorAll('[data-music-note]')].every(note => {
        const box = note.getBoundingClientRect();
        return box.left >= host.left - 0.5 && box.right <= host.right + 0.5
          && box.top >= host.top - 0.5 && box.bottom <= host.bottom + 0.5;
      });
    });
    assert.equal(contained, true, 'the parked notes are inside their host, so they actually paint');

    /* ...and the host that paints them stays small. Covering the whole document
       also makes the notes scroll-invariant, and it is what made them vanish on
       a real phone: 414x6942 here is ~100 megapixels at 3x, which a mobile
       compositor refuses to rasterize. Headless desktop renders it happily, so
       only a size assertion can see this. */
    const hostArea = await page.evaluate(() => {
      const r = document.querySelector('[data-music-notes]').getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height),
        ratio: +(r.width * r.height / (innerWidth * innerHeight)).toFixed(2) };
    });
    assert.ok(hostArea.ratio <= 2,
      `the parked note layer stays small (${hostArea.w}x${hostArea.h} = ${hostArea.ratio} viewports)`);

    /* And they are still exactly on their lines afterwards. */
    const noteGaps = await page.evaluate(() => [...document.querySelectorAll('[data-music-note]')].map((note, i) => {
      const m = note.getScreenCTM();
      const r = document.querySelector(`[data-music-note-target="${i}"]`).getBoundingClientRect();
      return Math.hypot(m.e - r.left - r.width / 2, m.f - r.top - r.height / 2);
    }));
    assert.ok(noteGaps.every(gap => gap < 1), `the notes stay on the staff while the page scrolls (${noteGaps})`);

    await page.evaluate(() => window.musicTest.players[0].emit(2));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-music-notes] > [data-music-note]')]
      .every(note => Number(getComputedStyle(note).opacity) < 0.05));
    assert.equal(
      await page.evaluate(() => document.querySelector('[data-music-layer]').contains(document.querySelector('[data-music-docked="true"]'))),
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
        return dock.getBoundingClientRect().height > 200 && !!document.querySelector('[data-music-layer] [aria-label="Close"]');
      }),
      true,
      'the card opens inside the slot and pushes the page down',
    );
    assert.equal(
      await page.evaluate(() => [...document.querySelector('[data-music-layer]').querySelectorAll('*')]
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
    // Reopening can resume playback: notes return to the ring, not disappear.
    await page.waitForTimeout(3200);
    assert.equal(await page.locator('[data-music-notes] > [data-music-note]').count(), 5);
    console.log(`PASS ${width}px: circular gallery, the ring's journey, no spin, notes follow playback`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
