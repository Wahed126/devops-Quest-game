import { copy, missions, journalEntries, type Mission, type MissionId } from '../core/content';
import { initialState, save, type State } from '../core/state';
import { Terminal } from '../core/terminal';
import { formatLearningCode } from './inlineCode';
import type { ForestScene, GameBridge } from '../game/ForestScene';
const $=<T extends HTMLElement=HTMLElement>(selector:string,root:ParentNode=document):T=>{const e=root.querySelector<T>(selector);if(!e)throw new Error(`Missing interface element: ${selector}`);return e;};
export class UI {
 private root:HTMLElement; private modal:HTMLElement; private title:HTMLElement; private hud:HTMLElement;
 private terminal:Terminal; private history:string[]=[];private historyIndex=0;private draft='';
 private lines:string[]=[]; private currentMission:Mission=missions[0];private screen='';private previousFocus:HTMLElement|null=null;
 private toastTimer=0;private scene?:ForestScene;private dialogueIndex=0;private saveWarned=false;
 constructor(public bridge:GameBridge){
  this.terminal=new Terminal(bridge.state);this.root=$('#ui');
  this.root.innerHTML=`
   <div id="title" class="title-screen">
    <header class="title-header"><a class="wordmark" href="#" aria-label="DevOps Quest home"><span class="brand-icon">⌘</span> DEVOPS QUEST</a><span class="edition">AN INTERACTIVE LEARNING ADVENTURE</span><button class="icon-button" id="title-settings" aria-label="Settings">⚙</button></header>
    <main class="title-content"><div class="eyebrow"><span></span> YOUR FIRST ADVENTURE AWAITS</div><h1>A quiet world.<br>A new <em>connection.</em></h1><p class="title-description">The forest has lost its signal.<br>Bring it back, one command at a time.</p><div class="title-actions"><button id="new-game" class="primary">Begin your journey <span>↗</span></button><button id="continue-game" class="secondary">Continue adventure <span>→</span></button></div><div class="title-note"><span class="little-terminal">&gt;_</span> <span id="loading-status" role="status">Growing the forest…</span></div></main>
    <div class="chapter-card"><div class="chapter-symbol">⌁</div><div><div class="eyebrow">CHAPTER 01</div><h2>Linux Forest</h2><p>3 connections to restore <span>·</span> At your own pace</p></div><div class="card-arrow">↗</div></div>
    <footer class="title-footer"><span>EXPLORE. UNDERSTAND. RESTORE.</span><span class="status-dot">A small adventure. A real beginning.</span></footer>
   </div>
   <div id="hud" hidden><header class="game-header"><div class="game-brand"><span class="brand-icon">⌘</span><div>DEVOPS QUEST<small>CHAPTER 01 <b>/</b> LINUX FOREST</small></div></div><div class="hud-actions"><button id="journal-button" class="hud-button" aria-label="Open journal">▤ <span>Journal</span><kbd>J</kbd></button><button id="pause-button" class="hud-button" aria-label="Pause game">Ⅱ <span>Pause</span></button></div></header><div class="objective"><div class="eyebrow">YOUR NEXT CONNECTION</div><div id="objective-text"></div><div class="progress-line"><i></i><i></i><i></i><span id="progress-text">0 / 3 RESTORED</span></div></div><div id="interact-prompt" hidden><kbd>E</kbd><span></span></div><footer class="game-footer"><div class="controls"><span><kbd>A</kbd><kbd>D</kbd> Move</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>E</kbd> Interact</span></div><div class="forest-location"><span class="status-dot"></span><span id="location">THE WAKING WOODS</span></div></footer><div id="touch-controls"><div><button data-touch="left" aria-label="Move left">←</button><button data-touch="right" aria-label="Move right">→</button></div><div><button id="touch-interact" aria-label="Interact">E</button><button data-touch="jump" aria-label="Jump">↑</button></div></div></div>
   <div id="modal-layer" hidden></div><div id="toast" role="status" aria-live="polite" hidden></div>`;
  this.modal=$('#modal-layer');this.title=$('#title');this.hud=$('#hud');
  $<HTMLButtonElement>('#new-game').disabled=true;$<HTMLButtonElement>('#continue-game').disabled=true;
  window.addEventListener('quest-loading',e=>{$('#loading-status').textContent=`Growing the forest… ${Math.round((e as CustomEvent<number>).detail*100)}%`;});
  this.bridge.ready=()=>{$('#loading-status').textContent='Learn real Linux skills. Restore a little wonder.';$<HTMLButtonElement>('#new-game').disabled=false;$<HTMLButtonElement>('#continue-game').disabled=false;};
  this.bridge.interact=target=>this.interact(target);this.bridge.prompt=t=>this.prompt(t);this.bridge.toast=t=>this.toast(t);this.bridge.checkpoint=()=>{this.persist();this.toast('Checkpoint reached · progress saved');};
  $('#new-game').onclick=()=>this.requestNew();$('#continue-game').onclick=()=>this.start(false);$('#title-settings').onclick=()=>this.settings();
  $('.wordmark').onclick=e=>e.preventDefault();$('#journal-button').onclick=()=>this.journal();$('#pause-button').onclick=()=>this.pause();
  $('#touch-interact').onclick=()=>this.scene?.interactNearest();
  for(const b of this.root.querySelectorAll<HTMLButtonElement>('[data-touch]')){
   const key=b.dataset.touch as 'left'|'right'|'jump';b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(this.scene)this.scene.touch[key]=true;};
   const release=()=>{if(this.scene)this.scene.touch[key]=false;};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
  }
  document.addEventListener('keydown',e=>this.keydown(e));
  // Also protect text fields added outside a modal, without canceling DOM editing.
  document.addEventListener('focusin',()=>this.syncGameplayInput());
  document.addEventListener('focusout',()=>queueMicrotask(()=>this.syncGameplayInput()));
  window.addEventListener('blur',()=>this.autoPause());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.autoPause();});
  this.updateTitle();this.updateHUD();
 }
 attach(scene:ForestScene){this.scene=scene;}
 private syncGameplayInput(){
  const editing=document.activeElement?.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
  this.scene?.setGameplayInput(this.bridge.active&&!this.bridge.blocked&&!editing);
 }
 private persist(){if(!save(this.bridge.state)&&!this.saveWarned){this.saveWarned=true;this.toast('Browser storage is unavailable. This session will not survive a reload.');}}
 private updateTitle(){$('#continue-game').hidden=!this.bridge.state.started;$('#new-game').textContent=this.bridge.state.started?'Start a new journey ↗':'Begin your journey ↗';}
 private requestNew(){
  if(this.bridge.state.started){this.show('reset','A fresh beginning',`<p>Start over in Linux Forest? This replaces your saved missions, terminal state, and checkpoints.</p><div class="button-row"><button class="secondary" id="cancel-reset">Keep my adventure</button><button class="primary" id="confirm-reset">Start over</button></div>`);$('#cancel-reset').onclick=()=>this.close();$('#confirm-reset').onclick=()=>this.start(true);}
  else this.start(true);
 }
 private start(fresh:boolean){
  if(fresh){const settings=this.bridge.state.settings;this.bridge.state=initialState();this.bridge.state.settings=settings;this.bridge.state.started=true;this.terminal=new Terminal(this.bridge.state);this.history=[];this.lines=[];}
  this.bridge.active=true;this.title.hidden=true;this.hud.hidden=false;this.close();this.scene?.syncWorld();this.scene?.restorePosition();this.updateHUD();this.persist();
  if(fresh){this.dialogueIndex=0;this.dialogue();}else this.toast('Welcome back, engineer. Your forest remembers.');
 }
 private interact(target:MissionId|'drone'|'exit'){
  if(target==='drone'){this.dialogueIndex=0;this.dialogue();}
  else if(target==='exit'){this.bridge.state.finished=true;this.persist();this.complete();}
  else {this.currentMission=missions.find(m=>m.id===target)!;this.openTerminal();}
 }
 private show(kind:string,title:string,body:string,wide=false){
  if(!this.screen)this.previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  this.screen=kind;this.bridge.blocked=true;this.syncGameplayInput();this.modal.hidden=false;
  this.modal.innerHTML=`<section data-screen="${kind}" class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="modal-header"><div><div class="eyebrow">DEVOPS QUEST <span>/</span> LINUX FOREST</div><h2 id="dialog-title">${title}</h2></div><button class="close-button" aria-label="Close dialog">×</button></header><div class="modal-body">${body}</div></section>`;
  formatLearningCode(this.modal);
  $('.close-button',this.modal).onclick=()=>this.close();
  this.modal.querySelector<HTMLElement>('input, textarea, button:not(.close-button)')?.focus();
 }
 private close(){
  if(this.screen==='editor'){this.cancelEditor();return;}
  this.screen='';this.modal.hidden=true;this.modal.replaceChildren();this.bridge.blocked=false;this.scene?.resetInput();this.previousFocus?.focus();this.previousFocus=null;
  if(this.bridge.active){(document.activeElement as HTMLElement|null)?.blur();}
  this.syncGameplayInput();
 }
 private keydown(e:KeyboardEvent){
  if(e.key==='Escape'){e.preventDefault();if(this.screen)this.close();else if(this.bridge.active)this.pause();return;}
  if(this.screen){
   if(e.key==='Tab'){
    const nodes=Array.from(this.modal.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea,summary,[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
    const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
   }
   return;
  }
  if(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable]'))return;
  if(this.bridge.active&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.toLowerCase()==='j')this.journal();
 }
 private autoPause(){if(this.bridge.active&&!this.screen)this.pause();this.scene?.resetInput();}
 private dialogue(){
  this.show('dialogue','A little help from Pip',`<div class="dialogue-content"><img src="${import.meta.env.BASE_URL}assets/pip.svg" class="pip-portrait" alt="Pip, a friendly maintenance drone"><div><div class="eyebrow">PIP · MAINTENANCE DRONE</div><p class="dialogue-copy"></p></div></div><div class="button-row"><button id="skip-dialogue" class="text-button">Skip introduction</button><button id="next-dialogue" class="primary">${this.dialogueIndex===copy.intro.length-1?'Let’s find that beacon':'Keep listening'} →</button></div>`);
  $('.dialogue-copy').textContent=copy.intro[this.dialogueIndex];formatLearningCode($('.dialogue-copy'));$('#skip-dialogue').onclick=()=>this.close();$('#next-dialogue').onclick=()=>{this.dialogueIndex++;if(this.dialogueIndex<copy.intro.length)this.dialogue();else this.close();};
 }
 private openTerminal(){
  const m=this.currentMission,s=this.bridge.state,done=s.completed.includes(m.id);
  this.show('terminal',m.title,`<div class="terminal-layout"><aside class="mission-brief"><div class="eyebrow">CONNECTION ${m.number} <span class="mission-state">${done?'✓ RESTORED':'○ OFFLINE'}</span></div><h3>${m.objective}</h3><p>${m.reason}</p><div class="concept"><span class="eyebrow">FIELD NOTES</span><p>${m.concept}</p></div><p class="task">${m.task}</p><button id="hint-button" class="secondary small">✧ Reveal a hint <span>${s.hints[m.id]} / 3</span></button><div id="hint-text" class="hint-text" aria-live="polite"></div>${m.id==='bridge'?'<details><summary>How do permissions work?</summary><p>'+copy.permissions+'</p></details>':''}</aside><div class="terminal-column"><div class="terminal-window"><div class="terminal-bar"><span class="terminal-dots">● ● ●</span><span>Simulated training terminal</span><span>⌘</span></div><pre id="terminal-output" role="log" aria-live="polite" aria-label="Terminal output" tabindex="0"></pre><form id="terminal-form" autocomplete="off"><label for="command-input" class="sr-only">Terminal command</label><span class="shell-prompt">engineer<span>:</span><b id="cwd-label"></b><span>$</span></span><input id="command-input" name="command" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Type a command…" maxlength="512"><button type="submit" class="run-button" aria-label="Run command">↵</button></form></div>${m.id==='signal'?'<form id="channel-form" class="beacon-control"><label for="channel-input">BEACON CHANNEL</label><div><input id="channel-input" placeholder="Channel from configuration" autocomplete="off" maxlength="40"><button class="primary small" type="submit">Tune beacon</button></div></form>':''}<div id="mission-feedback" class="mission-feedback" role="status"></div><p class="simulation-note">${copy.simulation}</p></div></div>`,true);
  if(!this.lines.length)this.lines=['FOREST NETWORK / secure training link\nWelcome, engineer. Type help to see available commands.\nTry pwd to find your starting point.'];
  this.renderOutput();this.renderHints();
  if(done)this.feedback(m.success,true);
  $('#terminal-form').onsubmit=e=>{e.preventDefault();this.submit();};
  $('#command-input').onkeydown=e=>{
   const input=e.currentTarget as HTMLInputElement;
   if(e.key==='ArrowUp'||e.key==='ArrowDown'){
    e.preventDefault();if(this.historyIndex===this.history.length)this.draft=input.value;
    this.historyIndex=Math.max(0,Math.min(this.history.length,this.historyIndex+(e.key==='ArrowUp'?-1:1)));
    input.value=this.history[this.historyIndex]??this.draft;requestAnimationFrame(()=>input.setSelectionRange(input.value.length,input.value.length));
   }
  };
  $('#hint-button').onclick=()=>{s.hints[m.id]=Math.min(3,s.hints[m.id]+1);this.renderHints();this.persist();};
  if(m.id==='signal')$('#channel-form').onsubmit=e=>{e.preventDefault();const before=s.completed.length;const result=this.terminal.tune($<HTMLInputElement>('#channel-input').value);this.feedback(result.output,s.completed.includes('signal'));this.afterCommand(before);};
  $<HTMLInputElement>('#command-input').focus();
 }
 private submit(){
  const input=$<HTMLInputElement>('#command-input'),cmd=input.value.trim();if(!cmd)return;
  this.lines.push(`engineer:${this.bridge.state.cwd}$ ${cmd}`);this.history.push(cmd);this.history=this.history.slice(-100);this.historyIndex=this.history.length;this.draft='';input.value='';
  const before=this.bridge.state.completed.length,result=this.terminal.run(cmd);
  if(result.clear)this.lines=[];else if(result.output)this.lines.push(result.output);
  this.lines=this.lines.slice(-120);this.renderOutput();this.afterCommand(before);
  if(result.edit)this.editor(result.edit);
 }
 private afterCommand(before:number){
  this.persist();this.updateHUD();this.scene?.syncWorld();
  if(this.bridge.state.completed.length>before){const latest=missions[this.bridge.state.completed.length-1];this.feedback(latest.success,true);$('.mission-state').textContent='✓ RESTORED';this.toast(`Connection ${latest.number} restored · ${latest.area}`);}
 }
 private renderOutput(){const out=$('#terminal-output');out.textContent=this.lines.join('\n\n');out.scrollTop=out.scrollHeight;$('#cwd-label').textContent=this.bridge.state.cwd.replace('/home/engineer','~');}
 private renderHints(){const n=this.bridge.state.hints[this.currentMission.id];$('#hint-text').textContent=n?this.currentMission.hints[n-1]:'';formatLearningCode($('#hint-text'));const b=$<HTMLButtonElement>('#hint-button');b.textContent=n===3?'✧ Complete walkthrough · 3 / 3':`✧ Reveal a hint · ${n} / 3`;b.disabled=n===3;}
 private feedback(text:string,success=false){const e=this.modal.querySelector<HTMLElement>('#mission-feedback');if(e){e.textContent=(success?'✓ Restored: ':'! Check: ')+text;e.classList.toggle('success',success);formatLearningCode(e);}}
 private editor(path:string){
  this.show('editor','Repair the configuration',`<p><code>${path}</code></p><p>This editor is a game-provided shortcut. Set PORT to a whole number from 1 to 65535. Saving changes the file; restart the service to apply it.</p><label for="config-editor" class="eyebrow">FILE CONTENTS</label><textarea id="config-editor" spellcheck="false" aria-describedby="editor-status" maxlength="20000"></textarea><p id="editor-status" class="simulation-note">Your edits stay in the game’s virtual filesystem.</p><div class="button-row"><button class="secondary" id="cancel-editor">Cancel</button><button class="primary" id="save-editor">Save configuration</button></div>`);
  $<HTMLTextAreaElement>('#config-editor').value=this.bridge.state.fs[path].content;
  $('#cancel-editor').onclick=()=>this.cancelEditor();$('#save-editor').onclick=()=>{this.bridge.state.fs[path].content=$<HTMLTextAreaElement>('#config-editor').value;this.persist();this.lines.push(`Saved ${path}. Restart beacon to apply the configuration.`);this.openTerminal();};
 }
 private cancelEditor(){
  const input=this.modal.querySelector<HTMLTextAreaElement>('#config-editor');
  if(input&&input.value!==this.bridge.state.fs['/etc/beacon/beacon.conf'].content){
   $('#editor-status').textContent='Unsaved edits. Select “Discard changes” to return without saving.';const cancel=$<HTMLButtonElement>('#cancel-editor');cancel.textContent='Discard changes';cancel.onclick=()=>this.openTerminal();return;
  }
  this.openTerminal();
 }
 private pause(){
  this.show('pause','Take a breath.',`<p>The forest will be here when you’re ready.</p><div class="menu-buttons"><button class="primary" id="resume">Resume adventure <span>→</span></button><button class="secondary" id="checkpoint">Restart checkpoint</button><button class="secondary" id="pause-settings">Settings</button><button class="text-button" id="return-title">Return to title</button></div>`);
  $('#resume').onclick=()=>this.close();$('#checkpoint').onclick=()=>{this.scene?.restorePosition();this.close();this.toast('Returned to your last checkpoint.');};$('#pause-settings').onclick=()=>this.settings();$('#return-title').onclick=()=>{this.persist();this.close();this.bridge.active=false;$('#toast').hidden=true;window.clearTimeout(this.toastTimer);this.title.hidden=false;this.hud.hidden=true;this.updateTitle();$('#continue-game').focus();};
 }
 private settings(){
  const returnTo=this.screen==='pause'?'pause':'title';
  this.show('settings','Make yourself at home.',`<label class="setting-row" for="reduced-motion"><div><strong>Reduced motion</strong><p>Keep ambient particles and Pip still. Use direct camera tracking.</p></div><input id="reduced-motion" type="checkbox"></label><div class="settings-note"><h3>A quiet adventure</h3><p>This chapter is intentionally silent. There’s no audio to configure.</p></div><div class="settings-note"><h3>Play your way</h3><p>A / D or arrow keys to move · Space to jump · E to interact · J for your journal · Escape to pause or close a panel. Touch controls appear on small screens.</p></div><button class="primary" id="settings-done">Done</button>`);
  const checkbox=$<HTMLInputElement>('#reduced-motion');checkbox.checked=this.bridge.state.settings.reducedMotion;checkbox.onchange=()=>{this.bridge.state.settings.reducedMotion=checkbox.checked;document.documentElement.classList.toggle('reduced-motion',checkbox.checked);this.scene?.cameras?.main.setLerp(checkbox.checked?1:.075,checkbox.checked?1:.08);this.persist();};
  $('#settings-done').onclick=()=>returnTo==='pause'?this.pause():this.close();
 }
 private journal(){
  const s=this.bridge.state;
  this.show('journal','Your field journal',`<p>Little discoveries. Lasting skills. Commands are added after you restore each connection.</p><div class="journal-missions">${missions.map(m=>`<div class="journal-mission"><span>${s.completed.includes(m.id)?'✓':m.number}</span><div><h3>${m.title}</h3><p>${s.completed.includes(m.id)?'Connection restored':m.objective}</p></div></div>`).join('')}</div><div id="journal-entries"></div>`);
  const entries=$('#journal-entries');if(!s.journal.length){const p=document.createElement('p');p.className='empty-note';p.textContent='Your first page is waiting. Restore the sleeping beacon to begin.';entries.append(p);}
  for(const key of s.journal){const data=journalEntries[key];const card=document.createElement('article');card.className='journal-entry';const title=document.createElement('h3');title.textContent=key;const p=document.createElement('p');p.textContent=data.description;const code=document.createElement('code');code.textContent=data.example;card.append(title,p,code);entries.append(card);formatLearningCode(p);}
 }
 private complete(){
  const hintCount=Object.values(this.bridge.state.hints).reduce((a,b)=>a+b,0);
  this.show('complete','Every connection matters.',`<div class="completion-symbol">✧</div><div class="eyebrow centered">CHAPTER 01 COMPLETE</div><p class="completion-intro">The machines hum. The path glows.<br>Linux Forest is connected again, thanks to you.</p><div class="completion-stats"><div><strong>3 / 3</strong><span>CONNECTIONS RESTORED</span></div><div><strong>${hintCount}</strong><span>HINT LEVELS EXPLORED</span></div></div><div class="learned"><h3>You brought these skills to life</h3><p>✓ Navigating directories and reading configuration files</p><p>✓ Understanding permissions and executing scripts</p><p>✓ Diagnosing services with logs, fixing configuration, and restarting</p></div><p class="simulation-note centered">Curiosity counts. Hints are part of learning, never a penalty.</p><div class="button-row"><button class="secondary" id="replay">Replay chapter</button><button class="primary" id="explore">Keep exploring →</button></div>`);
  $('#explore').onclick=()=>this.close();$('#replay').onclick=()=>this.requestNew();
 }
 private updateHUD(){
  const s=this.bridge.state,m=missions.find(m=>!s.completed.includes(m.id));$('#objective-text').textContent=m?.objective??'The forest is online. Ride the canopy lift.';
  $('#progress-text').textContent=`${s.completed.length} / 3 RESTORED`;
  this.root.querySelectorAll('.progress-line i').forEach((e,i)=>e.classList.toggle('filled',i<s.completed.length));
  $('#location').textContent=m?.area.toUpperCase()??'THE RESTORED FOREST';
 }
 private prompt(text:string){const e=$('#interact-prompt');e.hidden=!text;$('span',e).textContent=text;}
 private toast(text:string){const el=$('#toast');el.textContent=text;el.hidden=false;window.clearTimeout(this.toastTimer);this.toastTimer=window.setTimeout(()=>el.hidden=true,4500);}
 get state():State{return this.bridge.state;}
}
