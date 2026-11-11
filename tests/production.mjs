import { preview } from 'vite';
import { chromium } from '@playwright/test';
import { launchOptions } from './browser-config.mjs';
import assert from 'node:assert/strict';
const base=process.env.QUEST_BASE_PATH||'/';
const server=await preview({base,preview:{host:'127.0.0.1',port:4173,strictPort:true}});
let browser;
try{
 browser=await chromium.launch(launchOptions);
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const failedRequests=[];page.on('response',response=>{if(response.status()>=400)failedRequests.push(`${response.status()} ${response.url()}`);});
 const response=await page.goto(`http://127.0.0.1:4173${base}`);assert.equal(response.status(),200);
 await page.locator('#new-game:enabled').waitFor();await page.locator('#new-game').click();await page.locator('#skip-dialogue').click();
 await page.keyboard.down('d');await page.waitForTimeout(2050);await page.keyboard.up('d');await page.keyboard.press('e');await page.locator('#command-input').waitFor();
 await page.locator('#command-input').focus();await page.keyboard.type('cat /opt/beacon/config/beacon.conf',{delay:20});assert.equal(await page.locator('#command-input').inputValue(),'cat /opt/beacon/config/beacon.conf');await page.locator('#command-input').press('Enter');
 assert.match(await page.locator('#terminal-output').textContent(),/BEACON_CHANNEL=aurora/);
 await page.locator('#channel-input').fill('aurora');await page.locator('#channel-form button').click();assert.match(await page.locator('#mission-feedback').textContent(),/beacon remembers/);
 assert.equal(await page.evaluate(()=>typeof window.__quest),'undefined','Production omits development instrumentation');assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[],'Production assets load beneath the configured base path');
 console.log('PASS: production artifact returns HTTP 200, loads assets, starts gameplay, reaches and solves first mission, and reports no console errors. Development instrumentation is absent.');
}finally{await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve));}
