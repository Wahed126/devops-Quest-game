import type Phaser from 'phaser';

export const engineerFrames={idle:['engineer-idle0','engineer-idle1'],run:Array.from({length:6},(_,i)=>`engineer-run${i}`),jump:['engineer-jump'],fall:['engineer-fall'],land:['engineer-land'],interact:['engineer-interact0','engineer-interact1']};

/** Original vector sprite art, rasterized by Phaser. Every frame is 64×80,
 * with boots on y=76 and one shared body/origin; cloth never moves the collider. */
export function createEngineer(g:Phaser.GameObjects.Graphics){
 for(const [state,frames]of Object.entries(engineerFrames))for(const [frame,key]of frames.entries()){
  g.clear();
  const run=state==='run',air=state==='jump'||state==='fall',land=state==='land',interact=state==='interact';
  const crouch=land?4:0;
  const swing=run?Math.sin(frame*Math.PI/3):0;
  const cape=run?Math.round(swing*3):state==='fall'?-4:state==='jump'?6:frame;
  const lift=air?5:0;
  // Restrained cool edge and an asymmetric, pointed hooded cape.
  g.fillStyle(0x91bdb4);g.fillPoints([{x:21,y:22},{x:36,y:25},{x:29,y:57},{x:3,y:63+cape},{x:12,y:35}],true);
  g.fillStyle(0x153e48);g.fillPoints([{x:22,y:23},{x:36,y:27},{x:29,y:58},{x:5,y:61+cape},{x:14,y:35}],true);
  g.fillStyle(0x246271);g.fillPoints([{x:20,y:29},{x:28,y:29},{x:20,y:54},{x:8,y:58+cape}],true);
  g.lineStyle(1,0x537f80);g.lineBetween(13,38,9,56+cape);
  // Layered trousers and articulated leather boots; feet retain one baseline.
  const rear=22-Math.round(swing*7),front=34+Math.round(swing*7);
  g.fillStyle(0x112e3a);g.fillRoundedRect(rear,51+crouch,10,20-lift-crouch,3);
  g.fillStyle(0x285664);g.fillRoundedRect(front,49+crouch,10,22-lift-crouch,3);
  g.fillStyle(0x543d32);g.fillRoundedRect(rear-2,65-lift,15,11,3);g.fillRoundedRect(front-1,65,17,11,3);
  g.fillStyle(0xb18b5b);g.fillRect(rear-1,65-lift,10,3);g.fillRect(front,65,10,3);
  g.fillStyle(0x262c2c);g.fillRect(rear-2,74-lift,15,2);g.fillRect(front-1,74,17,2);
  // Teal tunic, overlap panel and weathered leather belt.
  g.fillStyle(0x173d48);g.fillRoundedRect(19,28+crouch,27,31,6);
  g.fillStyle(0x367987);g.fillRoundedRect(23,28+crouch,20,26,4);
  g.fillStyle(0x559793);g.fillTriangle(25,30+crouch,39,31+crouch,28,48);
  g.fillStyle(0x235761);g.fillPoints([{x:22,y:48},{x:43,y:48},{x:47,y:59},{x:28,y:57},{x:19,y:60}],true);
  g.fillStyle(0x674c38);g.fillRect(20,47+crouch,25,5);
  g.fillStyle(0xd3ad6d);g.fillRoundedRect(33,47+crouch,6,5,1);
  // Broad pointed hood, shadowed face and a small warm cheek.
  g.fillStyle(0x86b6aa);g.fillPoints([{x:14,y:25+crouch},{x:17,y:12+crouch},{x:26,y:2+crouch},{x:42,y:11+crouch},{x:49,y:29+crouch}],true);
  g.fillStyle(0x245764);g.fillPoints([{x:16,y:25+crouch},{x:19,y:13+crouch},{x:26,y:4+crouch},{x:41,y:13+crouch},{x:47,y:29+crouch}],true);
  g.fillStyle(0x0f2b35);g.fillRoundedRect(27,14+crouch,19,18,7);
  g.fillStyle(0xc7aa81);g.fillRoundedRect(33,18+crouch,12,13,4);
  g.fillStyle(0x19313a);g.fillRect(40,21+crouch,3,3);
  g.fillStyle(0x3c7680);g.fillTriangle(20,13+crouch,28,7+crouch,35,15+crouch);
  g.fillStyle(0x2e6370);g.fillTriangle(19,28+crouch,34,30+crouch,22,39+crouch);
  g.fillStyle(0xbca06b);g.fillCircle(28,32+crouch,2);
  // Satchel strap crosses the tunic. Two visible tools above its flap.
  g.lineStyle(3,0xa18155);g.lineBetween(22,30+crouch,40,50+crouch);
  g.fillStyle(0x92aaa3);g.fillRoundedRect(14,43+crouch,3,12,1);g.fillRect(12,42+crouch,7,3);
  g.fillStyle(0xc0a27b);g.fillRect(20,44+crouch,3,12);
  g.fillStyle(0x70513a);g.fillRoundedRect(10,51+crouch,17,14,3);
  g.fillStyle(0x9b7750);g.fillRoundedRect(10,50+crouch,17,6,2);
  g.fillStyle(0xd3b178);g.fillRect(17,54+crouch,3,5);
  // Raised instrument in interaction; amber crystal is large enough to read at 1×.
  const handY=(interact?31:42)+crouch+(interact?frame:0),handX=interact?47:45;
  g.lineStyle(8,0x2d6977);g.lineBetween(40,35+crouch,handX,handY+5);
  g.fillStyle(0xc8a983);g.fillCircle(handX,handY+5,4);
  g.fillStyle(0xe9b66c,.08);g.fillCircle(handX+3,handY-3,12);
  g.fillStyle(0x574437);g.fillRoundedRect(handX-2,handY+1,10,10,2);
  g.fillStyle(0xd49c51);g.fillPoints([{x:handX-3,y:handY},{x:handX+3,y:handY-14},{x:handX+9,y:handY-2},{x:handX+4,y:handY+5}],true);
  g.fillStyle(0xf2d28e);g.fillTriangle(handX+3,handY-12,handX+3,handY+2,handX+7,handY-2);
  g.lineStyle(1,0xffe6ae,.8);g.lineBetween(handX+3,handY-12,handX-2,handY);
  g.generateTexture(key,64,80);
 }
}
