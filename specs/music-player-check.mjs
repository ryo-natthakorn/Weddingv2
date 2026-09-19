import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
const lifecycleHtml = `<div id="root"></div><script type="module">
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MusicPlayer } from '/src/app/components/wedding/MusicPlayer.tsx';
    import { LangProvider } from '/src/app/components/wedding/wedding-context.tsx';
    const root = createRoot(document.getElementById('root'));
    root.render(React.createElement(React.StrictMode, null, React.createElement(LangProvider, null, React.createElement(MusicPlayer))));
    window.unmountMusic = () => root.unmount();
  </script>`;
await server.listen();
const browser = await chromium.launch({ headless: true });
const output = join(tmpdir(), 'wedding-refinement');
const failures = [];

async function setup({ delayed = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 414, height: 896 }, reducedMotion: 'reduce' });
  await page.addInitScript(({ delayed }) => {
    window.musicTest = { calls: [], players: [], delayed };
    window.YT = {
      Player: class {
        constructor(host, options) {
          this.options = options;
          this.time = 30;
          this.state = -1;
          this.frame = document.createElement('iframe');
          host.replaceWith(this.frame);
          window.musicTest.players.push(this);
          if (!delayed) setTimeout(() => this.ready(), 0);
        }
        ready() { this.options.events.onReady({ target: this }); }
        emit(state) { this.state = state; this.options.events.onStateChange({ target: this, data: state }); }
        playVideo() { window.musicTest.calls.push(['play']); }
        pauseVideo() { window.musicTest.calls.push(['pause']); this.emit(2); }
        seekTo(time, ahead) { this.time = time; window.musicTest.calls.push(['seek', time, ahead]); }
        getCurrentTime() { return this.time; }
        getDuration() { return 200; }
        getPlayerState() { return this.state; }
        setVolume() {}
        unMute() {}
        getIframe() { return this.frame; }
        destroy() { window.musicTest.calls.push(['destroy']); this.frame.remove(); }
      },
    };
  }, { delayed });
  await page.route(/youtube\.com\/iframe_api/, route => route.fulfill({ body: '' }));
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.musicTest.players.length === 1);
  return page;
}

/* The ring is not a player until it has travelled: it opens the invitation as
   the slider thumb, then rests between the two names, and only once that block
   has been scrolled past does it become the control in the corner. Every test
   below that wants the card has to take it that far first. */
async function openInvitation(page) {
  await page.getByRole('slider', { name: 'Slide to open the invitation' }).press('Enter');
  await page.waitForSelector('[data-ring-home]');
  await page.evaluate(() => {
    const slot = document.querySelector('[data-ring-slot]');
    window.scrollTo(0, (slot?.getBoundingClientRect().bottom ?? 0) + window.scrollY + 400);
  });
  await page.waitForFunction(() => document.querySelector('[data-ring-home="corner"]'));
  await page.getByRole('button', { name: 'Open music player' }).click();
}

async function check(name, run) {
  if (process.argv[2] && !name.includes(process.argv[2])) return;
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}

try {
  await check('load timeout offers retry without inventing song time', async () => {
    const page = await setup({ delayed: true });
    try {
      await openInvitation(page);
      await page.getByRole('button', { name: 'ลองใหม่', exact: true }).waitFor({ timeout: 15000 });
      assert.equal(await page.locator('[data-song-lyrics]').textContent(), '');
      await page.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
      await page.waitForFunction(() => window.musicTest.players.length === 2);
      await page.evaluate(() => window.musicTest.players[1].ready());
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.evaluate(() => window.musicTest.players[1].emit(1));
      await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
    } finally { await page.close(); }
  });
  await check('start timeout ends indefinite buffering', async () => {
    const page = await setup();
    try {
      await openInvitation(page);
      await page.getByRole('button', { name: 'ลองใหม่', exact: true }).waitFor({ timeout: 15000 });
      assert.equal(await page.getByRole('button', { name: 'Play', exact: true }).getAttribute('aria-busy'), 'false');
      assert.equal(await page.locator('[data-song-lyrics]').textContent(), '');
    } finally { await page.close(); }
  });
  await check('SBV lyrics follow playback, clear in gaps and update after seeking', async () => {
    const page = await setup();
    try {
      await openInvitation(page);
      await page.evaluate(() => { const p = window.musicTest.players[0]; p.time = 12; p.emit(1); });
      await page.getByText('เชื่อไหม โลกของฉันมันเคยเป็นสีเทา', { exact: true }).waitFor();
      await page.evaluate(() => { window.musicTest.players[0].time = 23.5; });
      await page.waitForFunction(() => document.querySelector('[data-song-lyrics]').textContent.trim() === '');
      await page.evaluate(() => { window.musicTest.players[0].time = 16; });
      await page.getByText('จนเกือบจะหมดหวัง', { exact: true }).waitFor();
      // The other specs' output directory. This used to be a hardcoded Windows
      // path, which on any other machine created that whole path as folders
      // inside the repository.
      await mkdir(output, { recursive: true });
      await page.screenshot({ path: join(output, 'pantika-lyrics.png') });
    } finally { await page.close(); }
  });
  await check('StrictMode leaves one connected player and destroys it on unmount', async () => {
    const page = await setup();
    try {
      page.on('pageerror', error => console.error(`Lifecycle browser error: ${error.message}`));
      const html = await server.transformIndexHtml('/__music-lifecycle', lifecycleHtml);
      await page.route('**/__music-lifecycle', route => route.fulfill({ contentType: 'text/html', body: html }));
      await page.goto(new URL('/__music-lifecycle', server.resolvedUrls.local[0]).href);
      await page.waitForFunction(() => window.musicTest.players.length === 2);
      assert.equal(await page.evaluate(() => window.musicTest.players.filter(p => p.frame.isConnected).length), 1);
      await page.evaluate(() => window.unmountMusic());
      assert.equal(await page.evaluate(() => window.musicTest.players.filter(p => p.frame.isConnected).length), 0);
      assert.equal(await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'destroy').length), 2);
    } finally { await page.close(); }
  });

  await check('opening requests playback inside the unlock gesture, only once', async () => {
    const page = await setup();
    try {
      const plays = await page.getByRole('slider', { name: 'Slide to open the invitation' }).evaluate(el => {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        return window.musicTest.calls.filter(([type]) => type === 'play').length;
      });
      assert.equal(plays, 1, 'play must occur before the animation timeout');
      // …and taking the ring to the corner and tapping it does not ask again.
      await page.waitForSelector('[data-ring-home]');
      await page.evaluate(() => {
        const slot = document.querySelector('[data-ring-slot]');
        window.scrollTo(0, (slot?.getBoundingClientRect().bottom ?? 0) + window.scrollY + 400);
      });
      await page.waitForFunction(() => document.querySelector('[data-ring-home="corner"]'));
      await page.getByRole('button', { name: 'Open music player' }).click();
      assert.equal(await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'play').length), 1);
    } finally { await page.close(); }
  });

  await check('buffering retains pause control and can be cancelled', async () => {
    const page = await setup();
    try {
      await openInvitation(page);
      await page.evaluate(() => { const p = window.musicTest.players[0]; p.emit(1); p.emit(3); });
      await page.getByRole('button', { name: 'Pause', exact: true }).click({ timeout: 2500 });
      assert.equal(await page.evaluate(() => window.musicTest.calls.at(-1)[0]), 'pause');
    } finally { await page.close(); }
  });

  await check('scrubbing previews locally and seeks once on release', async () => {
    const page = await setup();
    try {
      await openInvitation(page);
      const track = page.getByRole('slider', { name: 'Song progress' });
      await track.click({ trial: true });
      const box = await track.boundingBox();
      await page.mouse.move(box.x + 5, box.y + 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + 2, { steps: 20 });
      assert.equal(await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'seek').length), 0);
      await page.mouse.up();
      const seeks = await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'seek'));
      assert.equal(seeks.length, 1);
      assert.ok(Math.abs(seeks[0][1] - 150) < 2);
    } finally { await page.close(); }
  });

  await check('blocked autoplay falls back to an explicit play without retry loops', async () => {
    const page = await setup();
    try {
      await openInvitation(page);
      assert.equal(await page.evaluate(() => {
        const p = window.musicTest.players[0];
        if (!p.options.events.onAutoplayBlocked) return false;
        p.options.events.onAutoplayBlocked({ target: p });
        return true;
      }), true, 'blocked autoplay must be handled');
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      assert.equal(await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'play').length), 2);
    } finally { await page.close(); }
  });

  /* Opening the player is itself a request to play — the guest tapped a play
     button — so on a slow API the tap is queued and honoured once the player
     arrives, exactly like the card's own play button. What must never queue is
     entry autoplay, which is covered by the unlock-gesture check above. */
  await check('a slow API honours the tap that opened the player, exactly once', async () => {
    const page = await setup({ delayed: true });
    try {
      await openInvitation(page);
      assert.equal(await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'play').length), 0);
      await page.evaluate(() => window.musicTest.players[0].ready());
      assert.equal(await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'play').length), 1);
      await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
    } finally { await page.close(); }
  });

  await check('a deliberate pause survives closing and re-opening the card', async () => {
    const page = await setup();
    try {
      await openInvitation(page);
      await page.evaluate(() => window.musicTest.players[0].emit(1));
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.evaluate(() => window.musicTest.players[0].emit(2));
      const afterPause = await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'play').length);
      await page.getByRole('button', { name: 'Close' }).click();
      await page.getByRole('button', { name: 'Open music player' }).click();
      await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
      assert.equal(
        await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'play').length),
        afterPause,
        're-opening must not restart a song the guest paused',
      );
    } finally { await page.close(); }
  });

  if (process.env.LIVE_MUSIC === '1') {
    await check('live YouTube playback advances and pauses', async () => {
      const page = await browser.newPage({ viewport: { width: 414, height: 896 } });
      try {
        await page.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded' });
        await openInvitation(page);
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button =>
          ['Play', 'Pause'].includes(button.getAttribute('aria-label')) && button.style.cursor === 'pointer'), { timeout: 25000 });
        const play = page.getByRole('button', { name: 'Play', exact: true });
        if (await play.count()) await play.click();
        const progress = page.getByRole('slider', { name: 'Song progress' });
        await page.waitForFunction(() => Number(document.querySelector('[aria-label="Song progress"]')?.getAttribute('aria-valuenow')) > 0, { timeout: 30000 });
        const first = Number(await progress.getAttribute('aria-valuenow'));
        await page.waitForFunction(first => Number(document.querySelector('[aria-label="Song progress"]')?.getAttribute('aria-valuenow')) >= first + 2, first, { timeout: 25000 });
        await page.getByRole('button', { name: 'Pause', exact: true }).click();
        await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
      } finally { await page.close(); }
    });
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length) process.exitCode = 1;
