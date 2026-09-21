import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host:'127.0.0.1', port:0 } });
await server.listen();
const browser = await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:414,height:896},reducedMotion:'reduce'});
 await page.route(/^https:\/\//,r=>r.abort());
 await page.goto(server.resolvedUrls.local[0]);
 await page.getByRole('slider').press('Enter');
 await page.getByRole('slider').waitFor({state:'detached'});
 await page.evaluate(()=>document.fonts.ready);
 for(const width of [320,375,414,719,768,1024,1401]) {
  await page.setViewportSize({width,height:896});
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const result=await page.locator('footer [data-fit-text]').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,overflow:n.scrollWidth-n.clientWidth,font:getComputedStyle(n).fontSize})));
  assert.ok(result.every(n=>n.overflow<=1),JSON.stringify({width,result}));
  assert.ok(result.some(n=>n.text.includes('ความรักที่ท่านได้รับ')));
  assert.equal(await page.getByText('เพื่อเซอร์ไพรส์ตอนขอแต่งงาน',{exact:true}).count(),0);
  console.log('Quote fits',width,result.map(n=>n.font).join(','));
 }
 await page.setViewportSize({width:414,height:896});
 await page.locator('footer').scrollIntoViewIfNeeded();
 await page.screenshot({path:join(tmpdir(), 'wedding-quote-review.png')});
} finally {await browser.close();await server.close();}
