import Phaser from 'phaser';
import type { MissionId } from '../core/content';

/** Foreground architecture deliberately has more contrast than the distant forest.
 * Doorways and approach stones share one warm material so the route reads at 1×. */
export function drawBuilding(g:Phaser.GameObjects.Graphics,id:MissionId){
 // Clear, lit approach, kept above ground foliage and below the engineer.
 g.fillStyle(0xd6ad68,.10);g.fillEllipse(-18,-5,340,23);
 for(let i=0;i<7;i++){
  const x=-168+i*34;
  g.fillStyle(i%2?0x788274:0x91917a);g.fillRoundedRect(x,-7,27,7,3);
  g.lineStyle(1,0xc5b78b,.45);g.lineBetween(x+4,-6,x+22,-6);
 }
 if(id==='signal'){
  // Narrow, tall masonry silhouette with a glazed beacon lantern.
  g.fillStyle(0x0b202a);g.fillRoundedRect(-73,-233,146,233,7);
  g.fillStyle(0x455c60);g.fillRect(-66,-231,132,225);
  g.fillStyle(0x344951);g.fillRect(34,-231,32,225);
  g.lineStyle(2,0x7d9390,.8);g.lineBetween(-66,-231,-66,-10);g.lineBetween(-65,-231,65,-231);
  for(let row=0;row<7;row++){
   const y=-216+row*30;g.lineStyle(2,0x233b43);g.lineBetween(-64,y,64,y);
   for(let col=0;col<3;col++){const x=-52+col*46+(row%2)*20;g.lineBetween(x,y,x,y+28);}
  }
  g.fillStyle(0x223d44);g.fillRect(-80,-249,160,20);
  g.fillStyle(0x81928a);g.fillRect(-82,-249,164,5);
  g.fillStyle(0x192e37);g.fillRoundedRect(-48,-307,96,59,4);
  g.fillStyle(0xc5a469);g.fillRect(-39,-300,78,43);
  g.fillStyle(0xedd19b,.9);g.fillRect(-27,-294,54,33);
  g.fillStyle(0x334e53);g.fillRect(-4,-304,8,52);
  g.fillTriangle(-65,-310,65,-310,0,-347);
  g.lineStyle(2,0x8caaa2);g.lineBetween(-64,-310,0,-347);g.lineBetween(0,-347,64,-310);
  g.fillStyle(0xb9af7e);g.fillRect(-74,-14,148,14);
 }else if(id==='bridge'){
  // Timber workshop: wide gable, exposed beams and a stone chimney.
  g.fillStyle(0x33494b);g.fillRect(62,-237,29,100);
  g.fillStyle(0x8b9381);g.fillRect(58,-241,37,9);
  g.fillStyle(0x172c32);g.fillRoundedRect(-113,-171,226,171,4);
  g.fillStyle(0x795f47);g.fillRect(-104,-163,208,159);
  g.lineStyle(2,0x3d3d33);
  for(let y=-149;y<-10;y+=19)g.lineBetween(-102,y,102,y);
  g.fillStyle(0x3c3430);for(const x of [-106,-46,100])g.fillRect(x,-164,8,164);
  g.fillTriangle(-133,-166,133,-166,-8,-251);
  g.fillStyle(0x405e5a);g.fillTriangle(-120,-173,119,-173,-8,-240);
  g.lineStyle(4,0xb0a481);g.lineBetween(-133,-166,-8,-251);g.lineBetween(-8,-251,133,-166);
  g.lineStyle(6,0x3c3931);g.lineBetween(-8,-235,-8,-174);g.lineBetween(-75,-170,-8,-225);g.lineBetween(59,-170,-8,-225);
  g.fillStyle(0xc9b178);g.fillRoundedRect(-87,-121,33,32,3);
  g.lineStyle(3,0x4b4131);g.lineBetween(-71,-120,-71,-89);g.lineBetween(-86,-105,-54,-105);
  // Recognizable workshop gear above the entrance.
  g.lineStyle(4,0xd3b17b);g.strokeCircle(5,-144,13);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;g.lineBetween(5+Math.cos(a)*12,-144+Math.sin(a)*12,5+Math.cos(a)*20,-144+Math.sin(a)*20);}
  g.fillStyle(0xaaa080);g.fillRect(-115,-12,230,12);
 }else{
  // Moss-covered service station: low stone wings and a curved copper roof.
  g.fillStyle(0x263d43);g.fillRoundedRect(-113,-175,226,175,12);
  g.fillStyle(0x526762);g.fillRoundedRect(-105,-170,210,165,8);
  g.lineStyle(2,0x31494a);for(let y=-147;y<-10;y+=27)g.lineBetween(-103,y,103,y);
  g.fillStyle(0x233e43);g.fillRoundedRect(-120,-216,240,62,{tl:50,tr:50,bl:7,br:7});
  g.lineStyle(3,0x8ba59a);g.strokeRoundedRect(-120,-216,240,62,{tl:50,tr:50,bl:7,br:7});
  g.fillStyle(0x748467);g.fillRoundedRect(-120,-216,240,20,9);
  for(let i=0;i<9;i++){g.fillStyle(i%2?0x647b54:0x81915f);g.fillEllipse(-104+i*26,-210,33,18);g.fillRoundedRect(-106+i*26,-205,9,12+(i%3)*8,4);}
  g.fillStyle(0x152f35);g.fillRoundedRect(-88,-135,36,56,5);
  g.lineStyle(2,0xb8ac7b);g.strokeRoundedRect(-88,-135,36,56,5);
  g.fillStyle(0xddc58c);for(let i=0;i<3;i++)g.fillRect(-82,-126+i*15,24,4);
  g.fillStyle(0xa4a388);g.fillRect(-116,-13,232,13);
  // Roots stop at the jambs, leaving the entrance open.
  g.lineStyle(5,0x6c7657);g.lineBetween(-111,-73,-100,-10);g.lineBetween(110,-82,97,-8);
 }
 // Warm arch and a deep, unoccluded doorway at the actual interaction point.
 g.fillStyle(0xe4bc76,.14);g.fillEllipse(0,-38,116,114);
 g.fillStyle(0xc2a16a);g.fillRoundedRect(-33,-98,66,98,{tl:30,tr:30,bl:0,br:0});
 g.fillStyle(0x10242b);g.fillRoundedRect(-24,-87,48,87,{tl:22,tr:22,bl:0,br:0});
 g.lineStyle(2,0xf0cc8c,.85);g.lineBetween(-24,-60,-24,-5);g.lineBetween(24,-60,24,-5);
 g.fillStyle(0xe6bc70,.23);g.fillRect(-23,-12,46,12);
 g.fillStyle(0xc9b28a);g.fillRoundedRect(-42,-5,84,7,2);
 for(const x of [-43,43]){
  g.fillStyle(0xe2b56a,.08);g.fillCircle(x,-93,24);
  g.fillStyle(0x20363b);g.fillRoundedRect(x-6,-104,12,23,3);
  g.fillStyle(0xf0ca88);g.fillRoundedRect(x-3,-100,6,13,2);
 }
 // The terminal is mounted alongside the door, never covering it.
 g.fillStyle(0x122b32);g.fillRoundedRect(48,-83,43,58,5);
 g.lineStyle(2,0xa2ab91);g.strokeRoundedRect(48,-83,43,58,5);
 g.fillStyle(0x091d26);g.fillRoundedRect(53,-78,33,32,3);
 g.fillStyle(0x7d8f80);g.fillRect(56,-38,27,4);
}

export const buildingHeight:Record<MissionId,number>={signal:347,bridge:251,service:224};
