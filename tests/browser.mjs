import { chromium } from '@playwright/test';
import { launchOptions } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inspectTypography } from './typography-helpers.mjs';
const typographyChecks=process.env.CHECK_TYPOGRAPHY==='1'||process.argv.includes('--typography');
const inspect=(name,options)=>typographyChecks?inspectTypography(page,name,options):Promise.resolve();
const browser=await chromium.launch(launchOptions);
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',error=>{errors.push(String(error));console.error('PAGE ERROR:',error);});page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
fs.mkdirSync('test-results',{recursive:true});
const snap=()=>page.evaluate(()=>window.__quest.snapshot());
async function typeInto(selector,text){
 const input=page.locator(selector);await input.focus();await page.keyboard.press('ControlOrMeta+a');await page.keyboard.press('Backspace');
 await page.keyboard.type(text,{delay:12});assert.equal(await input.inputValue(),text,`${selector}: every keystroke is preserved`);
}
async function command(text){
 const before=await snap();await typeInto('#command-input',text);
 if(text==='cat /opt/beacon/config/beacon.conf'||text==='chmod +x /opt/bridge/start.sh')await page.screenshot({path:`test-results/typed-${text.startsWith('cat')?'beacon':'bridge'}-${page.viewportSize().width}.png`});
 const after=await snap();assert.equal(after.x,before.x,'Typed commands never move the character');assert.equal(after.y,before.y,'Typed commands never jump');
 assert.equal(after.diagnostics.keyboardEnabled,false);assert.equal(after.diagnostics.capturing,false);
 await page.keyboard.press('Enter');
}
async function textEditing(selector){
 await typeInto(selector,'ADE ade j / . - + =');
 await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Backspace');
 assert.equal(await page.locator(selector).inputValue(),'ADE ade j / . - +=');
 await page.keyboard.press('Shift+ArrowLeft');await page.keyboard.type(' ');assert.equal(await page.locator(selector).inputValue(),'ADE ade j / . -  =');
 await page.keyboard.press('Home');await page.keyboard.press('Delete');assert.equal(await page.locator(selector).inputValue(),'DE ade j / . -  =');
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.evaluate(()=>navigator.clipboard.writeText('paste / . - + = ADE'));
 await page.keyboard.press('ControlOrMeta+a');await page.keyboard.press('ControlOrMeta+v');assert.equal(await page.locator(selector).inputValue(),'paste / . - + = ADE');
 await page.keyboard.press('ControlOrMeta+a');await page.keyboard.press('Backspace');
}
async function landmark(name){
 await page.screenshot({path:`test-results/${name}-desktop.png`});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);const mobile=await snap();const px=mobile.x-mobile.diagnostics.camera.scrollX;assert.ok(px>mobile.diagnostics.camera.width*.2&&px<mobile.diagnostics.camera.width*.8,'Mobile camera frames the engineer and entrance');await page.screenshot({path:`test-results/${name}-mobile.png`});
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(350);
}
async function close(){await page.locator('.close-button').click();await page.waitForTimeout(100);}
async function walkTo(x){
 await page.keyboard.down('d');let previous=0,stuck=0;
 for(let i=0;i<400;i++){
  await page.waitForTimeout(65);const s=await snap();if(s.x>=x)break;
  if(Math.abs(s.x-previous)<1)stuck++;else stuck=0;
  if(stuck>12)throw new Error(`Player stuck at ${s.x}, ${s.y}, target ${x}`);
  previous=s.x;
  if(i===399)throw new Error(`Could not reach ${x}, at ${s.x}`);
 }
 await page.keyboard.up('d');await page.waitForTimeout(100);
}
try{
 await page.goto(process.env.QUEST_BASE_URL||'http://localhost:5173');await page.waitForFunction(()=>window.__quest?.snapshot().scene,{},{timeout:15000});await page.screenshot({path:'test-results/title-desktop.png'});
 if(typographyChecks){const fonts=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));assert.deepEqual(fonts.map(f=>f.family.replaceAll('"','')).sort(),['Cinzel','Exo 2','JetBrains Mono']);assert.ok(fonts.every(f=>f.status==='loaded'));}
 await inspect('title',{heading:'Cinzel'});
 await page.locator('#new-game').click();await inspect('dialogue',{heading:'Exo 2'});await page.locator('#skip-dialogue').click();await page.waitForFunction(()=>window.__quest.snapshot().diagnostics.blocked.down);
 await inspect('hud');
 await page.waitForFunction(()=>window.__quest.snapshot().diagnostics.animation==='idle');
 const initial=await snap();assert.ok(Math.abs(initial.diagnostics.body.y+initial.diagnostics.body.height-initial.y)<1,'Boots align with the collision body');
 assert.equal(initial.diagnostics.animation,'idle');await page.screenshot({path:'test-results/engineer-idle.png'});
 await page.evaluate(()=>{window.__poses=[];const record=()=>{window.__poses.push(window.__quest.snapshot().diagnostics.animation);window.__poseTimer=requestAnimationFrame(record);};record();});
 await page.keyboard.down('Space');await page.waitForTimeout(100);assert.ok((await snap()).y<initial.y,'Jump raises player');assert.equal((await snap()).diagnostics.animation,'jump');await page.screenshot({path:'test-results/engineer-jump.png'});await page.keyboard.up('Space');await page.waitForTimeout(900);
 const poses=await page.evaluate(()=>{cancelAnimationFrame(window.__poseTimer);return [...new Set(window.__poses)];});
 assert.ok(['jump','fall','land','idle'].every(p=>poses.includes(p)),`Actual physics exercises every airborne transition: ${poses}`);
 await walkTo(750);await landmark('beacon-approach');await page.keyboard.press('e');await page.locator('#command-input').waitFor();
 await page.waitForTimeout(100);assert.equal((await snap()).diagnostics.animation,'interact');assert.equal(await page.locator('#command-input').inputValue(),'','Opening E never leaks into the terminal');
 await textEditing('#command-input');
 for(const text of ['pwd','ls','cd','cat'])await command(text);
 await typeInto('#command-input','history draft');await page.keyboard.press('ArrowUp');assert.equal(await page.locator('#command-input').inputValue(),'cat');await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#command-input').inputValue(),'history draft');
 await command('pwd');await command('ls /');await command('cd /opt/beacon/config');await command('cat /opt/beacon/config/beacon.conf');await page.locator('#hint-button').click();
 await textEditing('#channel-input');await typeInto('#channel-input','wrong');await page.locator('#channel-form button').click();assert.match(await page.locator('#mission-feedback').textContent(),/does not match/);
 await page.waitForTimeout(3200);assert.equal((await snap()).blocked,true,'Wrong channel keeps the terminal open');
 await inspect('terminal',{heading:'Cinzel',scroll:'#command-input'});await page.screenshot({path:'test-results/terminal-desktop.png'});
 await typeInto('#channel-input','aurora');await page.locator('#channel-form button').click();assert.deepEqual((await snap()).state.completed,['signal']);
 assert.match(await page.locator('#mission-feedback').textContent(),/Returning to the forest in 3 seconds/);
 const tuning=await snap();await page.waitForTimeout(1000);assert.equal((await snap()).blocked,true,'Confirmation stays visible briefly');assert.equal((await snap()).x,tuning.x,'Player stays still during confirmation');
 await page.locator('#modal-layer').waitFor({state:'hidden',timeout:5000});await page.waitForTimeout(200);await page.screenshot({path:'test-results/game-desktop.png'});
 const closed=await snap();assert.equal(closed.diagnostics.keyboardEnabled,true);assert.equal(closed.diagnostics.capturing,true);
 // A dismissed confirmation must never close a newly reopened terminal.
 await page.keyboard.press('e');await typeInto('#channel-input','aurora');await page.locator('#channel-form button').click();await page.keyboard.press('Escape');
 await page.keyboard.press('e');await typeInto('#channel-input','wrong');await page.locator('#channel-form button').click();await page.waitForTimeout(3200);
 assert.equal((await snap()).blocked,true,'Old timer and incorrect retuning never close the reopened terminal');assert.match(await page.locator('#mission-feedback').textContent(),/does not match/);assert.equal(await page.locator('#mission-feedback').evaluate(el=>el.classList.contains('success')),false);await close();
 await page.keyboard.down('d');await page.waitForTimeout(50);await page.keyboard.press('e');await page.locator('#command-input').waitFor();await page.keyboard.up('d');
 const stopped=await snap();await page.waitForTimeout(200);assert.equal((await snap()).x,stopped.x,'Opening while moving clears held velocity');assert.equal(await page.locator('#command-input').inputValue(),'');
 await page.keyboard.press('Escape');const released=await snap();await page.waitForTimeout(200);assert.equal((await snap()).x,released.x,'Closing clears held movement state');
 await page.keyboard.press('e');await command('pwd');await close();
 await walkTo(1870);assert.equal((await snap()).state.checkpoint,1,'Crossing the restored light path activates checkpoint');await landmark('workshop-approach');await page.keyboard.press('e');
 await command('/opt/bridge/start.sh');assert.match(await page.locator('#terminal-output').textContent(),/Permission denied/);await command('ls -l /opt/bridge/start.sh');await command('chmod +x /opt/bridge/start.sh');await command('cd /opt/bridge');await command('./start.sh');assert.equal((await snap()).state.completed.length,2);await close();
 await walkTo(2850);assert.equal((await snap()).state.checkpoint,2,'Restored bridge is traversable');await landmark('station-approach');await page.keyboard.press('e');
 await command('systemctl status beacon');await command('journalctl -u beacon');await command('systemctl restart beacon');assert.match(await page.locator('#terminal-output').textContent(),/Restart failed/);
 await command('edit /etc/beacon/beacon.conf');await inspect('editor',{heading:'Exo 2'});await textEditing('#config-editor');await typeInto('#config-editor','# repaired ADE / . - + =\nPORT=8080\n');await page.locator('#save-editor').click();await command('systemctl restart beacon');assert.equal((await snap()).state.service,'active');assert.equal((await snap()).state.completed.length,3);
 await close();await walkTo(3290);await page.keyboard.press('e');await page.waitForSelector('#explore',{timeout:10000});assert.equal((await snap()).state.finished,true);console.log('PASS: desktop chapter, real typing, text editing, history, movement reset, and all engineer animations.');await inspect('completion',{heading:'Cinzel'});await page.screenshot({path:'test-results/completion-desktop.png'});await page.locator('#explore').click();
 await page.reload();await page.waitForFunction(()=>window.__quest?.snapshot().scene,{},{timeout:15000});await page.locator('#continue-game').click();const restored=await snap();assert.equal(restored.state.completed.length,3);assert.equal(restored.state.checkpoint,3);assert.equal(restored.state.fs['/opt/bridge/start.sh'].mode,755);assert.equal(restored.state.service,'active');
 await page.locator('#journal-button').click();assert.equal(await page.locator('.journal-entry').count(),11);await inspect('journal',{heading:'Exo 2',scroll:'#journal-entries'});await close();
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.locator('#dialog-title').textContent(),'Take a breath.');await page.locator('#resume').click();
 await page.locator('#pause-button').click();await inspect('pause',{heading:'Exo 2'});await page.locator('#pause-settings').click();await inspect('settings',{heading:'Exo 2'});await page.locator('#reduced-motion').check();await page.locator('#settings-done').click();await page.locator('#return-title').click();await page.locator('#new-game').click();await page.locator('#cancel-reset').click();assert.equal((await snap()).state.completed.length,3,'Cancel reset preserves progress');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/title-mobile.png'});
 await page.locator('#continue-game').click();await page.locator('#touch-interact').click();await page.locator('#explore').click();
 await page.locator('#journal-button').click();assert.ok(await page.locator('.modal').evaluate(el=>el.scrollWidth<=el.clientWidth),'Journal has no horizontal overflow');await page.screenshot({path:'test-results/journal-mobile.png'});await close();
 // Start fresh on touch viewport, then physically travel to the first terminal.
 await page.locator('#pause-button').click();await page.locator('#return-title').click();await page.locator('#new-game').click();await page.locator('#confirm-reset').click();await page.locator('#skip-dialogue').click();
 const b=await page.locator('[data-touch="right"]').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();assert.ok((await snap()).x>300,'Touch button moves player');
 await walkTo(750);await page.locator('#touch-interact').click();await command('cat /opt/beacon/config/beacon.conf');assert.ok(await page.locator('.modal').evaluate(el=>el.scrollWidth<=el.clientWidth),'Terminal has no horizontal overflow');await page.locator('#command-input').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/terminal-mobile.png'});await close();
 await page.waitForTimeout(200);
 const ratio=await page.locator('canvas').evaluate(c=>{const r=c.getBoundingClientRect();return (r.width/r.height)/(c.width/c.height);});assert.ok(Math.abs(ratio-1)<.01,'Canvas keeps its aspect ratio on resize');
 const mobile=await snap();assert.ok(mobile.x-mobile.diagnostics.camera.scrollX>0&&mobile.x-mobile.diagnostics.camera.scrollX<mobile.diagnostics.camera.width,'Player stays inside mobile camera');
 await page.screenshot({path:'test-results/game-mobile.png'});
 // Finish a second, fresh chapter at the mobile viewport using the touch interaction.
 await page.locator('#touch-interact').click();await typeInto('#channel-input','aurora');await page.locator('#channel-form button').click();await page.locator('#modal-layer').waitFor({state:'hidden',timeout:5000});assert.equal((await snap()).blocked,false,'Mobile tuning automatically resumes gameplay');
 await walkTo(1870);await page.locator('#touch-interact').click();await command('ls -l /opt/bridge/start.sh');await command('chmod +x /opt/bridge/start.sh');await command('/opt/bridge/start.sh');await close();
 await walkTo(2850);await page.locator('#touch-interact').click();await command('systemctl status beacon');await command('journalctl -u beacon');await command('edit /etc/beacon/beacon.conf');await typeInto('#config-editor','PORT=8080\n');await page.locator('#save-editor').click();await command('systemctl restart beacon');assert.equal((await snap()).state.completed.length,3);await close();
 await walkTo(3290);await page.locator('#touch-interact').click();await page.locator('#explore').waitFor();assert.equal((await snap()).state.finished,true);await page.screenshot({path:'test-results/completion-mobile.png'});
 assert.deepEqual(errors,[],'No browser runtime or console errors');
 console.log('PASS: complete chapter through physical movement; keyboard isolation; beacon auto-close and timer cancellation; both bridges; lift; reload/continue; journal; blur pause; settings; reset confirmation; touch movement; desktop/mobile overlays; no console errors.');
}catch(error){console.error('Browser errors:',errors);await page.screenshot({path:'test-results/failure.png'});throw error;}finally{await browser.close();}
