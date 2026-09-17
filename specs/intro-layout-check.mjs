import assert from 'node:assert/strict';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server:{host:'127.0.0.1',port:0}, logLevel:'silent' });
await server.listen();
const browser=await chromium.launch();
try {
  for(const [width,height] of [[414,896],[375,667],[360,640],[414,600],[1280,896],[1280,600]]){
    const page=await browser.newPage({viewport:{width,height}});
    await page.route(/^https:\/\//,r=>r.abort());
    await page.goto(server.resolvedUrls.local[0]);
    const slider=page.getByRole('slider');
    await slider.waitFor();
    await page.waitForTimeout(2600);
    const m=await page.evaluate(()=>{
      const box=el=>el.getBoundingClientRect();
      const logo=document.querySelector('img[alt="PN"]');
      const venue=[...document.querySelectorAll('p')].find(p=>p.textContent.trim()==='SailomSangdad · Bangkok');
      const hint=[...document.querySelectorAll('p')].find(p=>p.textContent.trim()==='Slide to open');
      return {logoTop:box(logo).top, venueBottom:box(venue).bottom, hintTop:box(hint).top,
        sliderBottom:box(document.querySelector('[role=slider]')).bottom, vh:innerHeight};
    });
    assert.ok(m.logoTop>=0, `logo on screen ${JSON.stringify(m)}`);
    assert.ok(m.venueBottom+24<=m.hintTop, `24px gap above hint ${JSON.stringify(m)}`);
    assert.ok(m.sliderBottom<=m.vh, `slider on screen ${JSON.stringify(m)}`);
    await slider.press('Enter');
    await slider.waitFor({state:'detached',timeout:5000});
    console.log(`PASS ${width}x${height}: gap ${Math.round(m.hintTop-m.venueBottom)}px, unlock`);
    await page.close();
  }
} finally {await browser.close();await server.close();}
