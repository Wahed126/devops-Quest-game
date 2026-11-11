import Phaser from 'phaser';
import { canvasText } from '../ui/typography';
import { drawBuilding, buildingHeight } from './buildings';
import { engineerFrames } from './engineer';
import { missions, type MissionId } from '../core/content';
import type { State } from '../core/state';
export interface GameBridge {
 state:State; active:boolean; blocked:boolean;
 ready:()=>void;
 interact:(target:MissionId|'drone'|'exit')=>void;
 checkpoint:(index:number)=>void; prompt:(text:string)=>void;
 toast:(text:string)=>void;
}
export const checkpointPositions=[260,1380,2540,3210];
export class ForestScene extends Phaser.Scene {
 player!:Phaser.Physics.Arcade.Sprite;
 private platforms!:Phaser.Physics.Arcade.StaticGroup;
 private gate!:Phaser.Physics.Arcade.Image;
 private bridges:Phaser.Physics.Arcade.Image[]=[];
 private bridgeArt:Phaser.GameObjects.Container[]=[];
 private machines=new Map<MissionId,Phaser.GameObjects.Container>();
 private lamps=new Map<MissionId,Phaser.GameObjects.Arc>();
 private keys!:Record<string,Phaser.Input.Keyboard.Key>;
 private drone!:Phaser.GameObjects.Image;
 private toolGlow!:Phaser.GameObjects.Arc;
 private dust:{dot:Phaser.GameObjects.Arc;phase:number;speed:number;baseY:number}[]=[];
 private lift!:Phaser.Physics.Arcade.Image;
 private liftArt!:Phaser.GameObjects.Container;
 private wasGrounded=false;private landingUntil=0;
 private lastGround=-1000; private jumpAt=-1000; private jumpLatch=false;
 private observed=''; private lastPrompt=''; private ride=false; private previousX=260;
 touch={left:false,right:false,jump:false};
 constructor(public bridge:GameBridge){super('Forest');}
 create(){
  this.physics.world.setBounds(0,-200,3600,1100);
  this.cameras.main.setBounds(0,0,3600,720);
  this.add.rectangle(0,0,5000,1000,0x0a242c).setOrigin(0).setScrollFactor(0);
  for(let i=0;i<4;i++)this.add.image(i*1080,0,'forest').setOrigin(0).setDisplaySize(1080,720).setScrollFactor(.22).setAlpha(.85);
  const veil=this.add.graphics().setScrollFactor(0);veil.fillGradientStyle(0x04151f,0x04151f,0x052127,0x052127,.15,.15,.5,.5);veil.fillRect(0,0,1280,720);
  this.drawTrees();
  this.platforms=this.physics.add.staticGroup();
  this.ground(0,1060,570);this.ground(1280,880,570);this.ground(2460,1140,570);
  this.rockPlatform(510,465,115);this.rockPlatform(1530,455,120);this.rockPlatform(1665,395,95);this.rockPlatform(2650,455,110);
  this.createBridge(1060,220,0);this.createBridge(2160,300,1);
  this.gate=this.platforms.create(1050,470,'solid') as Phaser.Physics.Arcade.Image;this.gate.setDisplaySize(20,200).setVisible(false).refreshBody();
  this.drawRuins(850,570);this.drawRuins(2960,570);
  for(const m of missions)this.machine(m.x,m.id,m.number,m.area);
  canvasText(this,170,454,'THE WAKING WOODS','label','#d1dcd7');
  this.drone=this.add.image(410,480,'drone').setDepth(8);
  canvasText(this,410,436,'PIP','label','#d4c29a').setOrigin(.5);
  for(let i=1;i<=3;i++){
   const x=checkpointPositions[i];this.add.rectangle(x,548,5,44,0x9c9870);this.add.triangle(x+10,530,0,0,22,7,0,16,0x78aa8c);this.add.circle(x,574,18,0x95cdb5,.1);
  }
  this.makeLift();
  this.player=this.physics.add.sprite(260,565,'engineer-idle0').setOrigin(.5,.95).setDepth(10);
  this.player.body!.setSize(28,59);this.player.body!.setOffset(18,17);
  this.player.setMaxVelocity(300,800).setCollideWorldBounds(false);
  this.physics.add.collider(this.player,this.platforms);
  this.lift=this.physics.add.image(3310,580,'solid').setImmovable(true).setDisplaySize(160,20).setVisible(false);
  (this.lift.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);this.lift.refreshBody();
  this.physics.add.collider(this.player,this.lift);
  this.toolGlow=this.add.circle(0,0,15,0xe8b86f,.07).setDepth(11);
  for(const [key,frames]of Object.entries(engineerFrames))this.anims.create({key,frames:frames.map(key=>({key})),frameRate:key==='run'?12:key==='interact'?3:2,repeat:-1});
  const keyboard=this.input.keyboard!;
  this.keys=keyboard.addKeys('A,D,LEFT,RIGHT,SPACE,E') as Record<string,Phaser.Input.Keyboard.Key>;
  this.setGameplayInput(false);
  this.keys.SPACE.on('down',()=>{if(this.bridge.active&&!this.bridge.blocked)this.jumpAt=this.time.now;});
  this.keys.E.on('down',(_key:Phaser.Input.Keyboard.Key,event:KeyboardEvent)=>{
   if(!this.bridge.active||this.bridge.blocked||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
   // Opening the overlay disables capture during this very event. Consume the
   // interaction first so immediate input focus cannot insert its opening E.
   event.preventDefault();
   this.interactNearest();
  });
  this.cameras.main.startFollow(this.player,true,.075,.08,0,45);
  this.cameras.main.setDeadzone(180,120);
  const framePlayer=()=>{
   const camera=this.cameras.main;
   camera.setDeadzone(Math.min(180,camera.width*.2),120);
   camera.centerOn(this.player.x,360);
  };
  framePlayer();
  this.scale.on('resize',framePlayer);
  this.events.once('shutdown',()=>this.scale.off('resize',framePlayer));
  if(this.bridge.state.settings.reducedMotion)this.cameras.main.setLerp(1,1);
  for(let i=0;i<38;i++){
   const x=(i*277)%3600,y=210+(i*79)%370;
   if(missions.some(m=>Math.abs(x-m.x)<125&&y>330))continue;
   this.dust.push({dot:this.add.circle(x,y,i%3===0?2:1, i%3===0?0xf3ca77:0xa4d7bd,.55).setDepth(7),phase:i*1.7,speed: .4+(i%4)*.15,baseY:y});
  }
  this.foreground();this.syncWorld();
  this.bridge.ready();
 }
 private ground(x:number,w:number,y:number){
  const body=this.platforms.create(x+w/2,y+90,'solid') as Phaser.Physics.Arcade.Image;body.setDisplaySize(w,180).setVisible(false).refreshBody();
  const g=this.add.graphics().setDepth(3);g.fillStyle(0x102d30);g.fillRect(x,y,w,160);g.fillStyle(0x183f3d);g.fillRect(x,y,w,28);g.fillStyle(0x436a4c);g.fillRoundedRect(x,y,w,12,5);g.fillStyle(0x7d9770,.8);g.fillRect(x+4,y,w-8,3);
  for(let i=0;i<w/15;i++){
   const px=x+i*15;g.lineStyle(1,0x72916a,.65);g.lineBetween(px,y+3,px-5,y-4-(i%4)*2);g.lineBetween(px,y+3,px+5,y-7);
   if(i%5===0){g.lineStyle(3,0x254b3f,.8);g.lineBetween(px,y+12,px+10,y+28+(i%7)*9);}
  }
  for(let i=0;i<w/70;i++){const px=x+i*70+15;if(!missions.some(m=>Math.abs(px-m.x)<170))this.fern(px,y,14+(i%3)*9,0x356649,4);}
 }
 private rockPlatform(x:number,y:number,w:number){
  const b=this.platforms.create(x+w/2,y+9,'solid') as Phaser.Physics.Arcade.Image;b.setDisplaySize(w,18).setVisible(false).refreshBody();
  const g=this.add.graphics().setDepth(4);g.fillStyle(0x29463e);g.fillRoundedRect(x,y,w,23,5);g.fillStyle(0x577950);g.fillRoundedRect(x-3,y-2,w+6,7,3);g.lineStyle(2,0x3c6349);g.lineBetween(x+10,y+17,x+17,y+42);g.lineBetween(x+w-13,y+15,x+w-21,y+34);
 }
 private createBridge(x:number,w:number,index:number){
  const b=this.platforms.create(x+w/2,580,'solid') as Phaser.Physics.Arcade.Image;b.setDisplaySize(w,20).setVisible(false).refreshBody();b.disableBody(true,true);this.bridges.push(b);
  const c=this.add.container(0,0).setDepth(4);const g=this.add.graphics();
  g.lineStyle(2,index===0?0x92edc4:0xab9b6b,.8);g.lineBetween(x,567,x+w,567);g.lineBetween(x,584,x+w,584);
  for(let p=x;p<x+w;p+=18){g.fillStyle(index===0?0x6fc5a7:0x697c59,.75);g.fillRoundedRect(p,570,14,12,2);}
  if(index===1){g.lineStyle(3,0x547268);g.lineBetween(x,520,x+w,520);for(let p=x;p<=x+w;p+=60)g.lineBetween(p,520,p,570);}
  c.add(g).setAlpha(.13);this.bridgeArt.push(c);
 }
 private drawTrees(){
  for(let i=0;i<15;i++){
   const x=i*300-80,w=30+(i%3)*24; const g=this.add.graphics().setScrollFactor(.55).setAlpha(.45).setDepth(1);
   g.fillStyle(i%2?0x143c40:0x0e3038);g.fillTriangle(x-w,640,x+w,640,x+8,-60);g.fillRect(x-w*.4,0,w*.8,500);
   g.lineStyle(10,0x153e3e);g.lineBetween(x,190,x-110,90);g.lineBetween(x,280,x+100,130);
  }
 }
 private fern(x:number,y:number,size:number,color:number,depth:number){
  const g=this.add.graphics().setDepth(depth);g.lineStyle(1.5,color,.9);
  for(let n=-2;n<=2;n++){const endX=x+n*size*.48,endY=y-size+Math.abs(n)*size*.15;g.lineBetween(x,y,endX,endY);for(let j=2;j<6;j++){const t=j/6,px=x+(endX-x)*t,py=y+(endY-y)*t;g.lineBetween(px,py,px-5*(1-t),py-5);g.lineBetween(px,py,px+6*(1-t),py-4);}}
 }
 private drawRuins(x:number,y:number){
  const g=this.add.graphics().setDepth(2);g.fillStyle(0x345353,.7);g.fillRect(x,y-185,35,185);g.fillRect(x+120,y-185,35,185);g.fillRect(x-7,y-200,169,28);g.lineStyle(2,0x58716a,.4);
  for(let j=0;j<6;j++){g.lineBetween(x,y-j*30,x+35,y-j*30);g.lineBetween(x+120,y-j*30,x+155,y-j*30);}
  g.fillStyle(0x436b50);g.fillRoundedRect(x-12,y-206,179,10,4);
 }
 private machine(x:number,id:MissionId,num:string,label:string){
  const c=this.add.container(x,570).setDepth(6);const g=this.add.graphics();
  drawBuilding(g,id);
  const tall=buildingHeight[id];
  const screen=canvasText(this,56,-77,'>_','code','#e2c18b');
  const lamp=this.add.circle(70,-94,5,0xdca75e);
  c.add([g,screen,lamp]);
  const txt=canvasText(this,0,-tall-18,`${num} / ${label.toUpperCase()}`,'label','#e8e5db',220).setOrigin(.5,1);c.add(txt);
  this.machines.set(id,c);this.lamps.set(id,lamp);
 }
 private makeLift(){
  this.liftArt=this.add.container(3310,580).setDepth(5);const g=this.add.graphics();g.fillStyle(0x385e53);g.fillRoundedRect(-80,-10,160,20,5);g.lineStyle(2,0xb4b780);g.strokeRoundedRect(-80,-10,160,20,5);g.fillStyle(0x8dbf93);g.fillRect(-66,-9,132,3);this.liftArt.add(g);
  const rail=this.add.graphics().setDepth(3);rail.lineStyle(5,0x34534e);rail.lineBetween(3240,566,3240,330);rail.lineBetween(3380,566,3380,330);
  canvasText(this,3310,604,'THE CANOPY LIFT','label','#94a897').setOrigin(.5);
  this.rockPlatform(3390,330,210);this.add.circle(3500,281,48,0xa7edbe,.09);canvasText(this,3500,277,'◇','symbol','#bfd9a3').setOrigin(.5);
 }
 private foreground(){
  for(let i=0;i<40;i++)this.fern(i*103,700,60+(i%4)*15,0x071e25,20);
  const g=this.add.graphics().setDepth(20);g.fillStyle(0x061b22,.8);g.fillTriangle(0,720,100,720,0,80);g.fillTriangle(3570,720,3600,720,3600,100);
 }
 /** Phaser's manager captures DOM events even when scene physics is paused.
  * Switch both layers together; keep the registered controls for the next session. */
 setGameplayInput(enabled:boolean){
  const keyboard=this.input.keyboard;
  if(!keyboard)return;
  keyboard.enabled=enabled;
  if(enabled)keyboard.enableGlobalCapture();else keyboard.disableGlobalCapture();
  this.resetInput();
 }
 resetInput(){this.touch={left:false,right:false,jump:false};this.input.keyboard?.resetKeys();this.player?.setVelocity(0,0);this.jumpAt=-1000;this.jumpLatch=false;}
 restorePosition(){this.ride=false;this.lift?.setVelocityY(0);this.lift?.setPosition(3310,580);this.player?.setPosition(checkpointPositions[this.bridge.state.checkpoint],515).setVelocity(0,0);this.cameras.main.resetFX();this.resetInput();}
 syncWorld(){
  const s=this.bridge.state;
  this.bridges.forEach((b,i)=>{const on=s.completed.includes(i===0?'signal':'bridge');b.body!.enable=on;this.bridgeArt[i].setAlpha(on?1:.13);});
  if(this.gate)this.gate.body!.enable=!s.completed.includes('signal');
  for(const [id,lamp]of this.lamps){const on=s.completed.includes(id);lamp.setFillStyle(on?0xb9d4be:0xdca75e);this.machines.get(id)!.list.filter(o=>o instanceof Phaser.GameObjects.Text).forEach(o=>{const t=o as Phaser.GameObjects.Text;if(t.text==='>_'||t.text==='✓')t.setText(on?'✓':'>_').setColor(on?'#c9ddca':'#e2c18b');});}
  this.observed=s.completed.join(',');
 }
 update(time:number){
  if(!this.player)return;
  const s=this.bridge.state;
  if(this.observed!==s.completed.join(','))this.syncWorld();
  const paused=!this.bridge.active||this.bridge.blocked;
  if(paused){this.physics.world.pause();if(this.bridge.active)this.player.play('interact',true);else this.player.play('idle',true);this.updateToolGlow();this.resetInput();this.setPrompt('');return;}
  this.physics.world.resume();
  const body=this.player.body as Phaser.Physics.Arcade.Body;
  const left=this.keys.A.isDown||this.keys.LEFT.isDown||this.touch.left;
  const right=this.keys.D.isDown||this.keys.RIGHT.isDown||this.touch.right;
  this.player.setVelocityX((Number(right)-Number(left))*240);
  if(left!==right)this.player.setFlipX(left);
  if(body.blocked.down||body.touching.down)this.lastGround=time;
  const jump=this.keys.SPACE.isDown||this.touch.jump;
  if(jump&&!this.jumpLatch)this.jumpAt=time;
  this.jumpLatch=jump;
  if(time-this.jumpAt<140&&time-this.lastGround<120){this.player.setVelocityY(-430);this.lastGround=-1000;this.jumpAt=-1000;}
  if(!jump&&body.velocity.y < -180)this.player.setVelocityY(Math.max(body.velocity.y,-240));
  const grounded=body.blocked.down||body.touching.down;
  if(grounded&&!this.wasGrounded)this.landingUntil=time+110;
  this.wasGrounded=grounded;
  if(!grounded)this.player.play(body.velocity.y<0?'jump':'fall',true);
  else if(time<this.landingUntil)this.player.play('land',true);
  else this.player.play(left!==right?'run':'idle',true);
  this.player.x=Phaser.Math.Clamp(this.player.x,35,3560);
  if(this.player.y>820){this.restorePosition();this.bridge.toast('Back at your checkpoint. Keep exploring.');}
  if(!s.settings.reducedMotion){this.drone.y=480+Math.sin(time*.002)*7;for(const d of this.dust){d.dot.y=d.baseY+Math.sin(time*.0007*d.speed+d.phase)*19;d.dot.alpha=.25+(Math.sin(time*.002+d.phase)+1)*.22;}}
  this.updateToolGlow();
  for(let i=1;i<=s.completed.length;i++)if(this.player.x>=checkpointPositions[i]-30 && s.checkpoint<i){s.checkpoint=i;this.bridge.checkpoint(i);}
  let text='';
  if(Math.abs(this.player.x-410)<90)text='Talk to Pip';
  for(const m of missions)if(Math.abs(this.player.x-m.x)<105)text=s.completed.includes(m.id)?'Inspect restored terminal':'Connect to terminal';
  if(this.player.x>3190)text=s.completed.length===3?'Ride the canopy lift':'Lift offline · restore the network';
  this.setPrompt(text);
  if(this.ride){
   if(this.lift.y>345){this.lift.setVelocityY(-85);this.player.setPosition(3310,this.lift.y-40).setVelocity(0);}
   else{this.lift.setVelocityY(0);this.lift.y=345;this.ride=false;this.bridge.interact('exit');}
  }
  this.liftArt.y=this.lift.y;
  this.previousX=this.player.x;
 }
 private updateToolGlow(){this.toolGlow.setPosition(this.player.x+(this.player.flipX?-16:16),this.player.y-(this.bridge.blocked?49:38));}
 interactNearest(){
  if(!this.bridge.active||this.bridge.blocked)return;
  if(this.player.x>3190)this.interactWith('exit');
  else {const m=missions.find(m=>Math.abs(this.player.x-m.x)<105);if(m)this.interactWith(m.id);else if(Math.abs(this.player.x-410)<90)this.interactWith('drone');}
 }
 private interactWith(target:MissionId|'drone'|'exit'){
  if(target==='exit'){
   if(this.bridge.state.completed.length!==3){this.bridge.toast('The lift needs all three network connections.');return;}
   this.player.setPosition(3310,this.lift.y-45).setVelocity(0);this.ride=true;this.bridge.toast('Connection complete. The forest is waking up.');
  }else this.bridge.interact(target);
 }
 private setPrompt(value:string){if(this.lastPrompt!==value){this.lastPrompt=value;this.bridge.prompt(value);}}
 get position(){return this.previousX;}
 get diagnostics(){const body=this.player?.body as Phaser.Physics.Arcade.Body|undefined;const camera=this.cameras?.main;return {keyboardEnabled:this.input.keyboard?.enabled,capturing:this.input.keyboard?.manager.preventDefault,animation:this.player?.anims.currentAnim?.key,body:body?{x:body.x,y:body.y,width:body.width,height:body.height}:null,now:this.time?.now,lastGround:this.lastGround,jumpAt:this.jumpAt,space:this.keys?.SPACE.isDown,blocked:body?.blocked,touching:body?.touching,velocity:body?.velocity.y,paused:this.physics?.world?.isPaused,camera:camera?{width:camera.width,scrollX:camera.scrollX}:null};}
}
