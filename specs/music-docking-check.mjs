/* Moving house — the orb's trip into the song section and back, in both
   directions and with the card both closed and open.

   The card-open cases are the ones the other specs do not reach, and they are
   where this used to go wrong: a dock decision taken while the card is open is
   deferred until the card has finished closing, and if that hand-off drops the
   decision the orb is stranded in a slot the guest has already scrolled past.
   Run with reduced motion on and off, because the two take different paths. */
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ headless: true });

const orbCount = page => page.locator('[aria-label="Open music player"]').count();
const cardCount = page => page.getByRole('button', { name: 'Close', exact: true }).count();
const docked = page => page.locator('[data-music-docked="true"]').count();

for (const reduced of ['no-preference', 'reduce']) {
  const page = await browser.newPage({ viewport: { width: 414, height: 896 }, reducedMotion: reduced });
  await page.route(/^https:\/\//, r => r.abort());
  await page.goto(server.resolvedUrls.local[0]);
  await page.getByRole('slider', { name: 'Slide to open the invitation' }).press('Enter');
  const slot = page.locator('[data-music-dock-slot]');

  // ── 1. card OPEN, scroll DOWN into the section ──
  await page.getByRole('button', { name: 'Open music player' }).click();
  await page.waitForTimeout(600);
  assert.equal(await cardCount(page), 1, 'card opened in the corner');
  await slot.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-music-docked="true"]'), null, { timeout: 15000 });
  await page.waitForTimeout(400);
  assert.equal(await cardCount(page), 0, 'the card folded rather than travelling');
  assert.equal(await orbCount(page), 1, 'exactly one orb after docking');
  assert.equal(await page.evaluate(() => document.querySelector('[data-music-dock-slot]')
    .contains(document.querySelector('[data-music-docked="true"]'))), true, 'orb landed in the slot');

  // ── 2. card OPEN in the slot, scroll back UP out of it ──
  await page.getByRole('button', { name: 'Open music player' }).click();
  await page.waitForTimeout(700);
  assert.equal(await cardCount(page), 1, 'card opened in the page');
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  // The orb is only back when it is standing in the corner again: while the
  // card is closing there is no orb in the DOM at all, so waiting on the
  // absence of [data-music-docking="true"] would resolve instantly.
  await page.waitForFunction(() => {
    const orb = document.querySelector('[data-music-docking="false"]');
    if (!orb) return false;
    const r = orb.getBoundingClientRect();
    return innerHeight - r.bottom < 60 && innerWidth - r.right < 60;
  }, null, { timeout: 15000 });
  assert.equal(await docked(page), 0, 'undocked on the way back up');
  assert.equal(await cardCount(page), 0, 'no orphaned card left behind');
  assert.equal(await orbCount(page), 1, 'exactly one orb after the return');
  const corner = await page.evaluate(() => {
    const r = document.querySelector('[aria-label="Open music player"]').getBoundingClientRect();
    return { right: innerWidth - r.right, bottom: innerHeight - r.bottom, scrollY: Math.round(scrollY) };
  });
  assert.ok(corner.right < 60 && corner.bottom < 60,
    `orb is back in the corner (right ${Math.round(corner.right)}, bottom ${Math.round(corner.bottom)}, scrollY ${corner.scrollY})`);

  // ── 3. fast flick through the section, card closed ──
  for (let i = 0; i < 6; i += 1) {
    await slot.scrollIntoViewIfNeeded();
    await page.waitForTimeout(90);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(90);
  }
  await slot.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-music-docked="true"]'), null, { timeout: 15000 });
  assert.equal(await orbCount(page), 1, 'a flick never leaves a second orb');
  assert.equal(await cardCount(page), 0, 'a flick never leaves a card');
  console.log(`PASS moving house, reducedMotion=${reduced}`);
  await page.close();
}
await browser.close();
await server.close();
