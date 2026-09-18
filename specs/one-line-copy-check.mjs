/* One-line copy check.

   The client tested on an iPhone 13 (390px) and an iPhone 11 (414px) and saw
   Thai sentences wrapping. Every sentence that must hold one line now renders
   through FitLine (src/app/components/wedding/shared.tsx), which scales the
   text to its container and only ever folds at a break point authored in the
   copy. This walks the whole card at every phone/tablet width in both
   languages and asserts that:

     • each FitLine renders exactly the number of lines it claims
       (data-lines: 1 normally, 2 where an authored break point fired),
     • the page never scrolls sideways,
     • the closing date block stays smaller than the couple's names.

   No RSVP is ever submitted: every https request is aborted, and fetch to any
   cross-origin URL (the real Apps Script URL lives in .env) is stubbed out. */
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const WIDTHS = [320, 360, 375, 390, 412, 414, 430, 540, 600, 768, 820, 1000];
const LANGS = ['TH', 'EN'];

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ headless: true });

/* Counts rendered lines the way measure.mjs did: group the text's client rects
   by their vertical midpoint, with a tolerance of roughly half a line. Only the
   visible line spans are measured — FitLine's hidden 100px measurers are inside
   a 0x0 clipped box and are skipped by selector. */
const countLines = () => {
  const groupsOf = (node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const size = parseFloat(getComputedStyle(node).fontSize);
    const tops = [];
    for (const rect of range.getClientRects()) {
      if (rect.width <= 0 || rect.height <= 0) continue;
      const mid = rect.top + rect.height / 2;
      if (!tops.some((t) => Math.abs(t - mid) < Math.max(4, size * 0.6))) tops.push(mid);
    }
    return tops.length;
  };
  return [...document.querySelectorAll('[data-fit-line]')].map((host) => {
    const texts = [...host.querySelectorAll('[data-fit-text]')];
    const rect = host.getBoundingClientRect();
    return {
      text: host.innerText.replace(/\s+/g, ' ').trim().slice(0, 60),
      claimed: Number(host.dataset.lines),
      rendered: texts.reduce((sum, node) => sum + groupsOf(node), 0),
      size: Math.round(parseFloat(getComputedStyle(texts[0]).fontSize) * 10) / 10,
      hidden: rect.width === 0 && rect.height === 0,
      overflows: texts.some((node) => {
        const box = node.getBoundingClientRect();
        return box.left < -0.5 || box.right > innerWidth + 0.5;
      }),
    };
  });
};

const settle = async (page) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = innerHeight * 0.6;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await page.waitForTimeout(250);
};

const assertFits = async (page, label) => {
  await settle(page);
  const blocks = await page.evaluate(countLines);
  assert.ok(blocks.length > 0, `${label}: no FitLine blocks found`);
  for (const block of blocks) {
    if (block.hidden) continue;
    assert.equal(
      block.rendered,
      block.claimed,
      `${label}: "${block.text}" renders ${block.rendered} line(s), claims ${block.claimed} (at ${block.size}px)`,
    );
    assert.equal(block.overflows, false, `${label}: "${block.text}" runs past the viewport`);
    assert.ok(block.size >= 12.9, `${label}: "${block.text}" fell to ${block.size}px, under the 13px floor`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 0.5);
  assert.equal(overflow, false, `${label}: horizontal page overflow`);
  return blocks.length;
};

try {
  for (const width of WIDTHS) {
    for (const lang of LANGS) {
      const page = await browser.newPage({ viewport: { width, height: 896 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route(/^https:\/\//, (route) => route.abort());
      // Belt and braces: the RSVP POST must never leave this process.
      await page.addInitScript(() => {
        const inner = window.fetch;
        window.fetch = (input, init) => {
          const url = String(typeof input === 'string' ? input : input.url);
          if (/^https?:\/\//.test(url) && !url.startsWith(location.origin)) {
            return Promise.resolve(new Response('', { status: 200 }));
          }
          return inner(input, init);
        };
      });
      await page.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded' });
      await page.getByRole('slider', { name: 'Slide to open the invitation' }).press('Enter');
      // The intro overlay locks scrolling until it finishes; wait it out.
      await page.getByRole('slider', { name: 'Slide to open the invitation' }).waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Open music player' }).click({ trial: true });
      if (lang === 'EN') await page.getByRole('button', { name: 'EN', exact: true }).click();

      const t = (th, en) => (lang === 'TH' ? th : en);
      const blocks = await assertFits(page, `${width}px ${lang} idle`);

      // Date block must stay smaller than the names it closes.
      const sizes = await page.evaluate(() => {
        const px = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : NaN);
        const name = px(document.querySelector('[data-name-line] span'));
        const line = (key) => px(document.querySelector(`[data-date-line="${key}"] [data-fit-text]`));
        return { name, sunday: line('sunday'), date: line('date'), venue: line('venue') };
      });
      for (const key of ['sunday', 'date', 'venue']) {
        assert.ok(
          sizes[key] < sizes.name,
          `${width}px ${lang}: ${key} is ${sizes[key]}px against ${sizes.name}px names`,
        );
      }

      // RSVP: choose, submit, and check the confirmation copy too.
      await page.getByRole('button', { name: t('ยินดีร่วมงาน', 'Joyfully Accept'), exact: true }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: t('ยินดีร่วมงาน', 'Joyfully Accept'), exact: true }).click();
      await page.fill('#rsvp-name', t('ทดสอบ', 'Test Guest'));
      await assertFits(page, `${width}px ${lang} rsvp form`);
      await page.getByRole('button', { name: t('ส่งการตอบรับ', 'Send RSVP'), exact: true }).click();
      await page.getByText(t('ขอบคุณที่ตอบรับ', 'Thank you!')).first().waitFor();
      await assertFits(page, `${width}px ${lang} rsvp thanks`);

      // Gift envelope open — the save hint only exists once it is open.
      await page.getByRole('button', { name: t('แตะเพื่อร่วมใส่ซอง', 'Tap to give a gift'), exact: true }).click();
      await page.waitForTimeout(400);
      await assertFits(page, `${width}px ${lang} gift open`);

      assert.deepEqual(errors, [], `${width}px ${lang}: browser exceptions`);
      console.log(`PASS ${width}px ${lang}: ${blocks} fitted blocks, names ${sizes.name}px > date ${sizes.date}px`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
