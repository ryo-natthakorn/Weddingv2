import assert from 'node:assert/strict';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:681,height:1032}});
 page.on('requestfailed',r=>{if(/youtube|googlevideo/.test(r.url()))console.log('NETWORK',r.url().split('?')[0],r.failure()?.errorText);});
 await page.goto(server.resolvedUrls.local[0]);
 await page.getByRole('slider').press('Enter');
 await page.getByRole('button',{name:'Open music player'}).click();
 await page.waitForTimeout(14000);
 console.log('STATUS',await page.getByRole('status').allTextContents());
 console.log('FRAMES',page.frames().map(f=>f.url()));
 console.log('LYRICS',await page.locator('[data-song-lyrics]').textContent());
 const play=page.getByRole('button',{name:'Play',exact:true});
 if(await play.count() && await play.isEnabled()) {
   await play.click();
   await page.getByText('เชื่อไหม โลกของฉันมันเคยเป็นสีเทา',{exact:true}).waitFor({timeout:30000});
   console.log('REAL CUE 1',await page.locator('[data-song-lyrics]').textContent());
   await page.getByText('จนเกือบจะหมดหวัง',{exact:true}).waitFor({timeout:15000});
   console.log('REAL CUE 2',await page.locator('[data-song-lyrics]').textContent());
   const progress=page.getByRole('slider',{name:'Song progress'});
   const before=Number(await progress.getAttribute('aria-valuenow'));
   await page.getByRole('button',{name:'Forward 10 seconds'}).click();
   await page.waitForTimeout(1500);
   assert.ok(Number(await progress.getAttribute('aria-valuenow'))>before,'real seek advances');
   await page.getByRole('button',{name:'Back 10 seconds'}).click();
   await page.waitForFunction(()=>document.querySelector('[data-song-lyrics]').textContent.trim()==='',{},{timeout:20000});
   console.log('PASS real playback: two timed cues, seeking, instrumental gap');
 }
 console.log('AFTER PLAY',await page.getByRole('status').allTextContents(),await page.locator('[data-song-lyrics]').textContent());
 await page.screenshot({path:'C:/Users/Computer RC Herbal/AppData/Local/Temp/youtube-live.png'});
}finally{await browser.close();await server.close();}
