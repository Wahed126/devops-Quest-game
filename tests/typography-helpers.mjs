import assert from 'node:assert/strict';
import fs from 'node:fs';

/** Exercise actual screens at several sizes; only presentation is inspected. */
export async function inspectTypography(page, name, options = {}) {
  fs.mkdirSync('test-results/typography', { recursive: true });
  for (const [width, height, label] of [[1440,900,'desktop'],[390,844,'mobile'],[360,640,'small-mobile'],[844,390,'landscape']]) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(700);
    const report = await page.evaluate(() => {
      const visible = el => el.getClientRects().length > 0;
      const panel = document.querySelector('#modal-layer:not([hidden]) .modal') || document.querySelector('#title:not([hidden])') || document.querySelector('#hud');
      const overflow = [...panel.querySelectorAll('button, p, h1, h2, h3, .terminal-column, .mission-brief, .journal-entry')]
        .filter(visible).filter(el=>el.scrollWidth>el.clientWidth+2 && getComputedStyle(el).overflowX!=='auto')
        .map(el=>`${el.tagName}.${el.className}: ${el.scrollWidth}/${el.clientWidth}`);
      const buttons = [...panel.querySelectorAll('button')].filter(visible).filter(el=>el.scrollHeight>el.clientHeight+2).map(el=>el.textContent);
      const code = [...panel.querySelectorAll('#terminal-output,#command-input,#config-editor,code')].filter(visible).map(el=>{const s=getComputedStyle(el);return {family:s.fontFamily,size:parseFloat(s.fontSize),ligatures:s.fontVariantLigatures,align:s.textAlign};});
      const paragraphs = [...panel.querySelectorAll('.dialogue-copy,.mission-brief p,.hint-text,.journal-entry p,.learned p')].filter(visible).map(el=>{const s=getComputedStyle(el);return {size:parseFloat(s.fontSize),family:s.fontFamily,line:parseFloat(s.lineHeight)/parseFloat(s.fontSize)};});
      const heading = panel.querySelector('h1, h2');
      return {overflow,buttons,code,paragraphs,panelOverflow:panel.scrollWidth>panel.clientWidth+2,heading:heading?getComputedStyle(heading).fontFamily:null,canvasWidth:document.querySelector('canvas').getBoundingClientRect().width};
    });
    const contrasts=await page.evaluate(()=>{
      const rgba=value=>{const n=value.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];return [n[0],n[1],n[2],n[3]??1];};
      const over=(fg,bg)=>fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3]));
      const luminance=rgb=>rgb.map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      const panel=document.querySelector('#modal-layer:not([hidden]) .modal')||document.querySelector('#title:not([hidden])')||document.querySelector('#hud');
      return [...panel.querySelectorAll('*')].filter(el=>el.getClientRects().length&& !el.matches(':disabled') && [...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())).flatMap(el=>{
        const style=getComputedStyle(el);let chain=[],solid=false;
        for(let node=el;node&&node.id!=='ui';node=node.parentElement){const s=getComputedStyle(node),bg=rgba(s.backgroundColor);chain.push(bg);if(bg[3]===1){solid=true;break;}}
        // A white scenery pixel is the worst case under our translucent dark HUD surfaces.
        let bg=[255,255,255];for(const c of chain.reverse())bg=over(c,bg);
        if(!solid&&el.closest('#title'))return []; // The title's spatial gradient is checked visually.
        const fg=over(rgba(style.color),bg),l1=luminance(fg),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
        const large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseFloat(style.fontWeight)>=700);
        return [{text:el.textContent.trim().slice(0,60),ratio,minimum:large?3:4.5}];
      });
    });
    assert.ok(contrasts.length>0,`${name}/${label}: contrast samples exist`);
    assert.deepEqual(contrasts.filter(c=>c.ratio<c.minimum),[],`${name}/${label}: text contrast`);
    fs.writeFileSync(`test-results/typography/${name}-${label}-contrast.json`,JSON.stringify(contrasts,null,2));
    assert.deepEqual(report.overflow,[],`${name}/${label}: horizontal text overflow`);
    assert.deepEqual(report.buttons,[],`${name}/${label}: clipped button text`);
    assert.equal(report.panelOverflow,false,`${name}/${label}: panel overflow`);
    for(const code of report.code){assert.match(code.family,/JetBrains Mono/);assert.ok(code.size>=16);assert.equal(code.ligatures,'none');assert.equal(code.align,'left');}
    for(const p of report.paragraphs){assert.equal(p.size,18);assert.match(p.family,/Exo 2/);assert.equal(p.line,1.5);}
    if(name==='hud')assert.ok(report.canvasWidth>=width*.9,`${label}: canvas fits viewport`);
    if(options.heading)assert.match(report.heading,new RegExp(options.heading));
    if(options.scroll)await page.locator(options.scroll).scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/typography/${name}-${label}.png`});
  }
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(700);
}
