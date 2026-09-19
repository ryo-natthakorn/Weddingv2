import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ headless: true });
const html = `<div id="root"></div><script type="module">
import React, {useState} from 'react'; import {createRoot} from 'react-dom/client';
import {MusicPlayer} from '/src/app/components/wedding/MusicPlayer.tsx';
import {SongSection} from '/src/app/components/wedding/SongSection.tsx';
import {LangProvider} from '/src/app/components/wedding/wedding-context.tsx';
import '/src/styles/index.css';
function App(){const [anchor,setAnchor]=useState(null);return React.createElement(LangProvider,null,
React.createElement(MusicPlayer,{dockTarget:anchor}),React.createElement('div',{style:{height:1400}}),
React.createElement(SongSection,{onAnchor:setAnchor,onPlay:()=>{}}),React.createElement('div',{style:{height:500}}));}
createRoot(document.getElementById('root')).render(React.createElement(App));</script>`;
try {
  for (const [width, reducedMotion] of [[414,'no-preference'],[1280,'no-preference'],[414,'reduce']]) {
    const page = await browser.newPage({ viewport:{width,height:896}, reducedMotion });
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.addInitScript(()=>{ window.YT={Player:class {
      constructor(host,options){this.options=options;window.testPlayer=this;setTimeout(()=>options.events.onReady({target:this}),0);}
      setVolume(){} unMute(){} getDuration(){return 200;} getPlayerState(){return 1;}
      playVideo(){} pauseVideo(){} destroy(){}
    }}; });
    await page.route(/^https:\/\//,r=>r.abort());
    await page.route('**/__handoff', async r=>r.fulfill({contentType:'text/html',body:await server.transformIndexHtml('/__handoff',html)}));
    await page.goto(new URL('/__handoff', server.resolvedUrls.local[0]).href);
    await page.waitForFunction(()=>window.testPlayer);
    await page.evaluate(()=>window.testPlayer.options.events.onStateChange({data:1}));
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-music-note]').count(),5);
    await page.evaluate(()=>{window.originalNotes=[...document.querySelectorAll('[data-music-note]')];});
    assert.equal(await page.evaluate(()=>document.getAnimations().some(a=>a.animationName==='pulse-ring')),false);
    await page.screenshot({path:join(tmpdir(),`music-orbit-${width}-${reducedMotion}.png`)});
    const start=Date.now();
    await page.locator('#song-play-button').evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-620,behavior:'instant'}));
    await page.waitForFunction(()=>document.querySelector('[data-music-docking="true"]'));
    if(reducedMotion==='no-preference') {
      await page.waitForTimeout(1600);
      assert.equal(await page.locator('[data-music-docked="true"]').count(),0,'handoff remains visible after 1.6s');
      await page.screenshot({path:join(tmpdir(),`music-transfer-${width}.png`)});
    }
    await page.waitForFunction(()=>document.querySelector('[data-music-docked="true"]'));
    if(reducedMotion==='no-preference') assert.ok(Date.now()-start>=2800);
    await page.waitForTimeout(500);
    const alignment=await page.evaluate(()=>[...document.querySelectorAll('[data-music-note]')].map((n,i)=>{
      const m=n.transform.baseVal.consolidate().matrix;
      const r=document.querySelector(`[data-music-note-target="${i}"]`).getBoundingClientRect();
      return Math.hypot(m.e-r.left-r.width/2,m.f-r.top-r.height/2);
    }));
    assert.ok(alignment.every(d=>d<1),`notes land on staff: ${alignment}`);
    assert.equal(await page.evaluate(()=>window.originalNotes.every((n,i)=>n===document.querySelectorAll('[data-music-note]')[i])),true);
    await page.screenshot({path:join(tmpdir(),`music-staff-${width}-${reducedMotion}.png`)});
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.waitForFunction(()=>document.querySelector('[data-music-docking="false"]'));
    if(reducedMotion==='no-preference') {
      await page.waitForTimeout(1500);
      assert.notEqual(await page.locator('[data-music-docking]').evaluate(el=>getComputedStyle(el).transform),'none');
      // Reverse the transfer before it finishes; the same notes must survive.
      await page.locator('#song-play-button').evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-620,behavior:'instant'}));
      await page.waitForFunction(()=>document.querySelector('[data-music-docked="true"]'));
      assert.equal(await page.evaluate(()=>window.originalNotes.every(n=>n.isConnected)),true);
    }
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px ${reducedMotion}: no ripple, persistent notes, 3s handoff, staff alignment, reversal`);
    await page.close();
  }
} finally {await browser.close();await server.close();}
