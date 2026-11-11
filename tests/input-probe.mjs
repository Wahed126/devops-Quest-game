import { chromium } from '@playwright/test';
import { launchOptions } from './browser-config.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch(launchOptions);
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(process.env.QUEST_BASE_URL||'http://localhost:5173');
 await page.locator('#new-game:enabled').waitFor();await page.locator('#new-game').click();await page.locator('#skip-dialogue').click();
 await page.keyboard.down('d');await page.waitForFunction(()=>window.__quest.snapshot().x>=750);await page.keyboard.up('d');await page.waitForTimeout(150);await page.keyboard.press('e');await page.locator('#command-input').waitFor();await page.waitForTimeout(100);
 await page.evaluate(()=>{window.keyReport=[];window.addEventListener('keydown',e=>window.keyReport.push({key:e.key,prevented:e.defaultPrevented}));});
 const before=await page.evaluate(()=>window.__quest.snapshot());
 const report=[];
 for(const command of ['pwd','ls','cd','cat','A D E j / . - + =']) {
  await page.locator('#command-input').fill('');await page.keyboard.type(command,{delay:65});report.push({typed:command,actual:await page.locator('#command-input').inputValue()});
 }
 for(const key of ['ArrowLeft','ArrowRight','Space','ArrowUp','ArrowDown'])await page.keyboard.press(key);
 const after=await page.evaluate(()=>window.__quest.snapshot());
 assert.equal(after.x,before.x);assert.equal(after.y,before.y);
 for(const row of report)assert.equal(row.actual,row.typed);
 const events=await page.evaluate(()=>window.keyReport);const result={report,events,stationary:after.x===before.x&&after.y===before.y};
 fs.writeFileSync('test-results/input-probe.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 await page.screenshot({path:'test-results/input-probe.png'});
 await page.keyboard.press('Escape');await page.screenshot({path:'test-results/world-probe.png'});
}finally{await browser.close();}
