import Phaser from 'phaser';
import './style.css';
import './ui/typography.css';
import { load } from './core/state';
import { BootScene } from './game/assets';
import { ForestScene, type GameBridge } from './game/ForestScene';
import { UI } from './ui/UI';
import { applyTypographyTokens, loadTypography } from './ui/typography';
applyTypographyTokens();
const bridge:GameBridge={state:load(),active:false,blocked:false,ready:()=>{},interact:()=>{},checkpoint:()=>{},prompt:()=>{},toast:()=>{}};
const ui=new UI(bridge);
async function startGame(): Promise<void> {
await loadTypography();
const forest=new ForestScene(bridge);ui.attach(forest);
const viewportWidth=()=>Math.max(360,Math.min(1920,Math.round(720*window.innerWidth/window.innerHeight)));
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:viewportWidth(),height:720,backgroundColor:'#0a2229',antialias:true,powerPreference:'low-power',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{fixedStep:false,gravity:{x:0,y:1100},debug:false}},scene:[BootScene,forest],input:{keyboard:true,touch:true},render:{roundPixels:true},fps:{target:60,forceSetTimeOut:false}});
window.addEventListener('resize',()=>{
 // FIT must see the new parent bounds before sizing the canvas or its labels.
 game.scale.getParentBounds();
 game.scale.setGameSize(viewportWidth(),720);
});
if(bridge.state.settings.reducedMotion)document.documentElement.classList.add('reduced-motion');
// Read-only instrumentation lets browser tests observe real play without bypassing it.
if(import.meta.env.DEV)Object.defineProperty(window,'__quest',{value:{snapshot:()=>({state:JSON.parse(JSON.stringify(bridge.state)),x:forest.player?.x,y:forest.player?.y,blocked:bridge.blocked,active:bridge.active,scene:game.scene.isActive('Forest'),diagnostics:forest.diagnostics})}});

}
void startGame().catch(() => {
 const status = document.querySelector('#loading-status');
 if (status) status.textContent = 'The fonts could not load. Reload to retry.';
});
