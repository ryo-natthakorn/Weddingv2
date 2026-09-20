/* The ring's journey, and moving house.

   One ring travels the whole invitation: the slider thumb you drag to open the
   card, then the focal point between the two names, then the music control in
   the corner, then docked into "Our Song" and back again. This checks every
   leg, in both directions, with the card collapsed and expanded, and with
   reduced motion off and on — the two take different paths through the FLIP.

   The card-open cases are the ones the other specs do not reach, and they are
   where this used to go wrong: a move decided while the card is open is
   deferred until the card has finished closing, and if that hand-off drops the
   decision the ring is stranded in a slot the guest has already scrolled past.
   The card cannot be open on the first two legs at all — the ring is not a
   control there — and that is asserted rather than assumed. */
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ headless: true });

const rings = page => page.locator('[data-ring-home]').count();
const buttons = page => page.getByRole('button', { name: 'Open music player' }).count();
const cards = page => page.getByRole('button', { name: 'Close', exact: true }).count();
const docked = page => page.locator('[data-music-docked="true"]').count();
const home = page => page.locator('[data-ring-home]').getAttribute('data-ring-home');

try {
  for (const reduced of ['no-preference', 'reduce']) {
    const page = await browser.newPage({ viewport: { width: 414, height: 896 }, reducedMotion: reduced });
    await page.route(/^https:\/\//, r => r.abort());
    await page.goto(server.resolvedUrls.local[0]);

    // ── leg one: the slider hands the ring to the page ──
    assert.equal(await rings(page), 0, 'the intro owns the ring until it is done');
    await page.getByRole('slider', { name: 'Slide to open the invitation' }).press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-ring-home="names"]'), null, { timeout: 15000 });
    assert.equal(await rings(page), 1, 'exactly one ring after the hand-over');
    await page.waitForFunction(() => {
      const ring = document.querySelector('[data-ring-home]');
      const slot = document.querySelector('[data-ring-slot]');
      const a = ring.getBoundingClientRect(), b = slot.getBoundingClientRect();
      return Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 2;
    }, null, { timeout: 15000 });

    // Between the names it is a wedding ring, not a control: nothing opens.
    assert.equal(await buttons(page), 0, 'no button between the names');
    await page.locator('[data-ring-home]').click({ force: true });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    assert.equal(await cards(page), 0, 'tapping the ring between the names opens nothing');
    assert.equal(await home(page), 'names', 'and it does not move house either');

    // The names do not shift by a pixel whether the ring is home or away.
    const slotBefore = await page.locator('[data-ring-slot]').boundingBox();

    // ── leg two: the names are read, the ring becomes the player ──
    await page.evaluate(() => window.scrollBy({ top: 1600 }));
    await page.waitForFunction(() => document.querySelector('[data-ring-home="corner"]'), null, { timeout: 15000 });
    await page.waitForTimeout(3200);
    assert.equal(await buttons(page), 1, 'the ring is the player at the corner');
    const corner = await page.evaluate(() => {
      const r = document.querySelector('[data-ring-home]').getBoundingClientRect();
      return { right: innerWidth - r.right, bottom: innerHeight - r.bottom };
    });
    assert.ok(corner.right < 60 && corner.bottom < 60, `the ring reaches the corner (${JSON.stringify(corner)})`);
    const slotAfter = await page.locator('[data-ring-slot]').boundingBox();
    assert.deepEqual(
      { w: Math.round(slotAfter.width), h: Math.round(slotAfter.height) },
      { w: Math.round(slotBefore.width), h: Math.round(slotBefore.height) },
      'the names keep their gap whether the ring is home or away',
    );

    // Scrolling back to the names must not dismiss the floating card.
    await page.getByRole('button', { name: 'Open music player' }).click();
    await page.waitForTimeout(700);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(700);
    assert.equal(await cards(page), 1, 'the floating card stays open near the names');
    assert.equal(await rings(page), 0, 'no ring replaces the open card');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-ring-home="names"]'));
    await page.waitForTimeout(3200);
    await page.evaluate(() => window.scrollBy({ top: 1600 }));
    await page.waitForFunction(() => document.querySelector('[data-ring-home="corner"]'));
    await page.waitForTimeout(3200);

    // ── leg three: card OPEN, scrolling down into the song section ──
    await page.getByRole('button', { name: 'Open music player' }).click();
    await page.waitForTimeout(700);
    assert.equal(await cards(page), 1, 'the card opens at the corner');
    const slot = page.locator('[data-music-dock-slot]');
    await slot.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-music-docked="true"]'), null, { timeout: 15000 });
    await page.waitForTimeout(400);
    assert.equal(await cards(page), 0, 'the card folded rather than travelling');
    assert.equal(await rings(page), 1, 'exactly one ring after docking');
    assert.equal(await page.evaluate(() => document.querySelector('[data-music-dock-slot]')
      .contains(document.querySelector('[data-music-docked="true"]'))), true, 'the ring landed in the slot');

    // ── leg four: card OPEN in the slot, scrolling back up out of it ──
    await page.getByRole('button', { name: 'Open music player' }).click();
    await page.waitForTimeout(800);
    assert.equal(await cards(page), 1, 'the card opens in the page');
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    /* The ring is only back when it is standing in the corner again: while the
       card is closing there is no ring in the DOM at all, so waiting on the
       absence of a docking flag would resolve instantly. Scrolling to the very
       top also takes the names back into view, so the ring goes home to them. */
    await page.waitForFunction(() => document.querySelector('[data-ring-home="names"]'), null, { timeout: 20000 });
    assert.equal(await docked(page), 0, 'undocked on the way back up');
    assert.equal(await cards(page), 0, 'no orphaned card left behind');
    assert.equal(await buttons(page), 0, 'and it is not a control at home either');

    // ── a fast flick through the whole page leaves one ring and no card ──
    for (let i = 0; i < 6; i += 1) {
      await slot.scrollIntoViewIfNeeded();
      await page.waitForTimeout(90);
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      await page.waitForTimeout(90);
    }
    await slot.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-music-docked="true"]'), null, { timeout: 20000 });
    assert.equal(await rings(page), 1, 'a flick never leaves a second ring');
    assert.equal(await cards(page), 0, 'a flick never leaves a card');
    console.log(`PASS the ring's journey, reducedMotion=${reduced}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
