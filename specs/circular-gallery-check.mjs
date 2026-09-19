import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server:{host:'127.0.0.1',port:0} });
await server.listen();
const browser=await chromium.launch();
try {
  for(const [width,height] of [[320,896],[366,1030],[413,1032],[681,1032],[1049,1032],[1401,1032],[844,390]]){
    const page=await browser.newPage({viewport:{width,height}});
    await page.route(/^https:\/\//,r=>r.abort());
    await page.goto(server.resolvedUrls.local[0]);
    await page.getByRole('slider').press('Enter');
    // The invitation is open once the ring has been handed over by the slider.
    // (It is not a button until it reaches the corner, so the old
    // "Open music player" probe no longer marks this moment.)
    await page.waitForFunction(() => document.querySelector('[data-ring-home]'));
    const gallery=page.locator('.pw-orbit');
    await gallery.scrollIntoViewIfNeeded();
    await gallery.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
    await page.waitForFunction(()=>document.querySelector('[data-gallery-ready="true"]'));
    assert.equal(await page.locator('[data-gallery-hint]').evaluate(el=>getComputedStyle(el).opacity),'1','hint visible before use');
    await page.mouse.move(0,0);
    const card=gallery.getByRole('button').first();
    const read=()=>card.evaluate(el=>getComputedStyle(el).transform);
    const before=await read();await page.waitForTimeout(600);assert.notEqual(await read(),before,'autorotation');
    await gallery.hover();
    const stopped=await read();await page.waitForTimeout(500);assert.equal(await read(),stopped,'hover pauses');
    await card.focus();await page.mouse.move(0,0);
    const focused=await read();await page.waitForTimeout(300);assert.equal(await read(),focused,'focus pauses');
    // Home snaps the ring to print 0, so the front print sits exactly on centre.
    await card.press('Home');
    await page.waitForTimeout(150);
    const box=await card.boundingBox(), stage=await gallery.boundingBox();
    assert.ok(box.width>80,'front print is large');
    assert.ok(Math.abs(box.x+box.width/2-(stage.x+stage.width/2))<12,'front print centred');
    assert.ok(box.x>=stage.x-1 && box.x+box.width<=stage.x+stage.width+1,'front print fits across the stage');
    assert.ok(box.y>=stage.y-1 && box.y+box.height<=stage.y+stage.height+1,'front print fits down the stage');
    assert.ok(stage.height<=height*.7+1);
    await gallery.screenshot({path:join(tmpdir(),`circular-${width}.png`)});
    await card.press('Enter');await page.getByRole('dialog').waitFor();
    assert.match(await gallery.evaluate(el=>getComputedStyle(el).filter),/blur/,'ring recedes behind viewer');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({state:'detached'});
    assert.equal(await card.evaluate(el=>el===document.activeElement),true);
    assert.equal(await gallery.locator('.pw-orbit-card[tabindex="0"]').count(),1,'one tabbable print');
    const depth=await gallery.locator('.pw-orbit-card').evaluateAll(els=>els.map(el=>({z:+el.style.zIndex,veil:+getComputedStyle(el.querySelector('.pw-veil')).opacity,opacity:+getComputedStyle(el).opacity,blur:getComputedStyle(el).filter})).sort((a,b)=>b.z-a.z));
    assert.ok(depth[0].veil<depth.at(-1).veil,'front print clearer than back print');
    assert.ok(depth.every(d=>d.opacity>=.49),'no print fades out while turning');
    assert.match(depth.at(-1).blur,/blur/,'back print still falls out of focus');
    assert.equal(depth[0].blur,'none','front print is sharp');
    /* Without a soft ramp the gradient mask stair-steps and the perforations
       speckle with half-lit paper pixels. */
    const feather=await gallery.locator('.pw-stamp').first().evaluate(el=>{
      const probe=document.createElement('div');
      probe.style.cssText='position:absolute;visibility:hidden;height:0';
      el.appendChild(probe);
      const read=v=>{probe.style.width=v;return parseFloat(getComputedStyle(probe).width);};
      const edge=read('var(--stamp-edge)'), notch=read('var(--stamp-notch)');
      probe.remove();
      return edge-notch;
    });
    assert.ok(feather>=.8,`perforation edge needs an anti-aliasing ramp, got ${feather}px`);
    /* The print keeps a shadow, and it is cast under the print rather than
       traced around it: a filter over the perforated mask cost the frame budget,
       and a box-shadow traces the border box, which disagrees with the notched
       silhouette and reads as a second layer. */
    const shade=await gallery.locator('.pw-orbit-card').first().evaluate(el=>{
      const s=getComputedStyle(el,'::before');
      return { image:s.backgroundImage, box:s.boxShadow };
    });
    assert.match(shade.image,/gradient/,'print keeps a cast shadow');
    assert.equal(shade.box,'none','the shadow must not trace the border box');
    const counter=page.locator('[data-gallery-counter]'), hint=page.locator('[data-gallery-hint]');
    const dialogs=()=>page.getByRole('dialog').count();
    const label=await counter.textContent();
    await page.getByRole('button',{name:/^(Next photo|รูปถัดไป)$/}).click();
    await page.waitForTimeout(750);
    assert.notEqual(await counter.textContent(),label,'next arrow turns ring');
    assert.equal(await dialogs(),0,'arrow does not open viewer');
    await page.waitForTimeout(450);
    assert.equal(await hint.evaluate(el=>getComputedStyle(el).opacity),'0','hint fades after use');
    const target=await gallery.locator('.pw-orbit-card').evaluateAll(els=>{const f=els.findIndex(el=>el.tabIndex===0);return (f+3)%els.length;});
    await gallery.locator('.pw-orbit-card').nth(target).evaluate(el=>el.click());
    await page.waitForTimeout(750);
    assert.equal(await dialogs(),0,'back print does not open viewer');
    assert.equal((await counter.textContent()).replace(/\s/g,''),`${target+1}/11`,'back print turns to front');
    const sb=await gallery.boundingBox();
    await page.mouse.move(sb.x+sb.width*.3,sb.y+sb.height*.5);await page.mouse.down();
    const dragStart=await read();
    await page.mouse.move(sb.x+sb.width*.3+120,sb.y+sb.height*.5,{steps:6});await page.mouse.up();
    const thrown=await read();assert.notEqual(thrown,dragStart,'drag spins ring');
    await page.waitForTimeout(120);assert.notEqual(await read(),thrown,'release keeps momentum');
    assert.equal(await dialogs(),0,'drag does not open viewer');
    await page.mouse.move(0,0);await page.waitForTimeout(2000);
    await page.getByRole('button',{name:'TH',exact:true}).focus();
    await page.evaluate(()=>scrollTo(0,0));
    await page.waitForTimeout(300);const offscreen=await read();await page.waitForTimeout(300);assert.equal(await read(),offscreen);
    await gallery.scrollIntoViewIfNeeded();assert.equal(await gallery.getAttribute('data-gallery-ready'),'true');
    await page.mouse.move(0,0);
    await gallery.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:7});
    await page.waitForTimeout(100);
    const touch=await read();await page.waitForTimeout(250);assert.equal(await read(),touch,'touch pauses');
    await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:7})));
    await page.waitForTimeout(250);assert.notEqual(await read(),touch,'touch release resumes');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForTimeout(100);
    const hidden=await read();await page.waitForTimeout(250);assert.equal(await read(),hidden,'hidden tab pauses');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForTimeout(250);assert.notEqual(await read(),hidden,'visible tab resumes');
    await page.setViewportSize({width:width+10,height});
    await page.waitForTimeout(200);
    assert.equal(await gallery.getAttribute('data-gallery-ready'),'true','resize does not replay unfold');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
    const reduced=await read();await page.waitForTimeout(300);assert.equal(await read(),reduced);
    console.log(`PASS ${width}x${height}: rotation, drag+throw, depth of field, front-only open, arrows, hint, pauses, geometry, viewer`);
    await page.close();
  }
} finally {await browser.close();await server.close();}
