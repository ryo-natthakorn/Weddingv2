import assert from 'node:assert/strict';
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

async function openInvitation(page) {
  await page.getByRole('slider', { name: 'Slide to open the invitation' }).press('Enter');
  await page.getByRole('button', { name: 'Open music player' }).click();
}

async function check(name, run) {
  if (process.argv[2] && !name.includes(process.argv[2])) return;
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}

try {
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

  await check('slow API does not start music unexpectedly after opening', async () => {
    const page = await setup({ delayed: true });
    try {
      await openInvitation(page);
      await page.evaluate(() => window.musicTest.players[0].ready());
      assert.equal(await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'play').length), 0);
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      assert.equal(await page.evaluate(() => window.musicTest.calls.filter(([type]) => type === 'play').length), 1);
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
