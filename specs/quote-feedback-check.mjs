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
 for(const language of ["TH", "EN"]) {
 await page.getByRole("button", {name:language, exact:true}).click();
 for(const width of [320,360,375,414,480,511,540,685,719,768,1024,1401]) {
  await page.setViewportSize({width,height:896});
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const result=await page.locator('footer [data-wedding-quote]').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,overflow:n.scrollWidth-n.clientWidth,font:getComputedStyle(n).fontSize})));
  assert.equal(result.length, 2);
  assert.equal(new Set(result.map(n=>n.font)).size, 1, 'both paragraphs have the same font size at '+width);
  assert.ok(result.every(n=>n.overflow<=1),JSON.stringify({width,result}));
  assert.ok(result.some(n=>n.text.includes(language === 'TH' ? 'ความรักที่ท่านได้รับ' : 'Being deeply loved')));
  assert.equal(await page.getByText('เพื่อเซอร์ไพรส์ตอนขอแต่งงาน',{exact:true}).count(),0);
  console.log('Quote fits',language,width,result.map(n=>n.font).join(','));
 }
 }
 await page.getByRole("button", {name:"TH", exact:true}).click();
 await page.setViewportSize({width:511,height:1032});
 await page.locator('footer').scrollIntoViewIfNeeded();
 await page.screenshot({path:join(tmpdir(), 'wedding-quote-review.png')});
 await page.getByRole('button', {name:'Open music player',exact:true}).click();
 const collapse = page.getByRole('button', {name:'Collapse music player',exact:true});
 await collapse.waitFor();
 assert.equal(await collapse.locator('svg.lucide-chevron-down').count(),1);
 await page.waitForTimeout(400);
 await page.screenshot({path:join(tmpdir(), 'wedding-collapse-review.png')});
 await collapse.click();
 await collapse.waitFor({state:'detached'});
 await page.getByRole('button', {name:'Open music player',exact:true}).waitFor();
 console.log('PASS: down-chevron collapses the player back to its ring');
} finally {await browser.close();await server.close();}
