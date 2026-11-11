import { chromium } from '@playwright/test';
import { launchOptions } from './browser-config.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch(launchOptions);
try {
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  window.__canvasFontDraws=[];
  const original=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(...args){
   if(/Exo 2|JetBrains Mono|Cinzel/.test(this.font))window.__canvasFontDraws.push({font:this.font,text:args[0],loaded:[...document.fonts].length===3&&[...document.fonts].every(f=>f.status==='loaded')});
   return original.apply(this,args);
  };
 });
 let release;
 const gate=new Promise(resolve=>release=resolve);
 await page.route('**/assets/fonts/*.woff2',async route=>{await gate;await route.continue();});
 await page.goto(process.env.QUEST_BASE_URL||'http://localhost:5173',{waitUntil:'domcontentloaded'});
 await page.locator('#new-game').waitFor();
 assert.equal(await page.locator('#game canvas').count(),0,'No game canvas before font files load');
 assert.equal(await page.locator('#new-game').isDisabled(),true,'Start remains disabled while fonts load');
 release();
 await page.locator('#new-game:enabled').waitFor();
 const weights=await page.evaluate(()=>[['Cinzel',[600,700]],['Exo 2',[400,500,600]],['JetBrains Mono',[400,500]]].flatMap(([family,weights])=>weights.map(weight=>document.fonts.check(`${weight} 18px "${family}"`))));
 assert.ok(weights.every(Boolean),'All seven requested weights are available');
 const draws=await page.evaluate(()=>window.__canvasFontDraws);
 assert.ok(draws.length>0,'Phaser uses the requested families');
 assert.ok(draws.every(d=>d.loaded),'Fonts loaded before every Phaser text draw');
 assert.ok(draws.some(d=>d.font.includes('Exo 2')));
 assert.ok(draws.some(d=>d.font.includes('JetBrains Mono')));
 for(const [width,height] of [[1440,900],[390,844],[844,390]]) {
  await page.setViewportSize({width,height});await page.waitForTimeout(700);
  const label=await page.evaluate(()=>{const c=document.querySelector('#game canvas');const pip=window.__canvasFontDraws.filter(d=>d.text==='PIP').at(-1);return {font:pip?.font,scale:c.getBoundingClientRect().width/c.width};});
  assert.match(label.font,/Exo 2/);const pixels=Number(label.font.match(/([\d.]+)px/)[1])*label.scale;
  assert.ok(pixels>=14,`Canvas label remains at least 14 CSS px: ${width}x${height}, ${pixels}`);
 }
 assert.deepEqual(errors,[]);
 // A failed local font never causes permanent fallback canvas textures.
 const failed=await browser.newPage();
 await failed.route('**/assets/fonts/*.woff2',route=>route.abort());
 await failed.goto(process.env.QUEST_BASE_URL||'http://localhost:5173');
 await failed.waitForFunction(()=>document.querySelector('#loading-status')?.textContent.includes('could not load'));
 assert.equal(await failed.locator('#game canvas').count(),0);
 assert.equal(await failed.locator('#new-game').isDisabled(),true);
 console.log('PASS: delayed fonts block Phaser initialization; seven weights loaded; canvas text draws only after font readiness; scaled canvas labels stay at least 14 CSS px; failed fonts show a retry message without baking fallback text.');
}finally{await browser.close();}
