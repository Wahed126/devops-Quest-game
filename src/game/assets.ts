import Phaser from 'phaser';
import { canvasText } from '../ui/typography';
import { createEngineer } from './engineer';
export class BootScene extends Phaser.Scene {
 constructor(){super('Boot');}
 preload(){
  const center=this.scale.width/2;
  const label=canvasText(this,center,350,'GROWING THE FOREST…','label','#b7d1c5').setOrigin(.5);
  const bar=this.add.rectangle(center-130,385,0,3,0xdbc08b).setOrigin(0);
  this.load.on('progress',(v:number)=>{bar.width=260*v;window.dispatchEvent(new CustomEvent('quest-loading',{detail:v}));});
  this.load.on('complete',()=>label.destroy());
  this.load.image('forest',`${import.meta.env.BASE_URL}assets/forest.webp`);
 }
 create(){
  // Original vector textures, drawn once and reused by the renderer.
  const g=this.make.graphics({x:0,y:0});
  g.fillStyle(0xffffff);g.fillRect(0,0,16,16);g.generateTexture('solid',16,16);g.clear();
  createEngineer(g);
  g.clear();g.fillStyle(0x253e40);g.fillEllipse(28,27,44,34);g.fillStyle(0xc8c9a0);g.fillRoundedRect(9,10,39,30,13);g.fillStyle(0x183d42);g.fillRoundedRect(16,17,26,13,6);g.fillStyle(0xa6efcf);g.fillCircle(23,23,3);g.fillCircle(35,23,3);g.fillStyle(0xc49a58);g.fillTriangle(0,19,11,15,10,29);g.fillTriangle(56,19,47,15,48,29);g.generateTexture('drone',58,48);
  g.destroy();
  this.scene.start('Forest');
 }
}
