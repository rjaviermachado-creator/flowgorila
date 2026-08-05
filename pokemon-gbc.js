"use strict";

(()=>{
const TILE=32,MAP_W=40,MAP_H=28,VIEW_W=20,VIEW_H=15;
const palette={ground:"#9ccc65",ground2:"#83b957",grass:"#4c943c",grass2:"#2f7131",path:"#d9c879",water:"#4e9ac6",water2:"#8bc6d7",tree:"#28643a",tree2:"#59a34c",ink:"#16291d",paper:"#f4f0c6",red:"#c94346",yellow:"#f1d447"};
const encounters=[
  {name:"Rattata",color:"#8b66a5",kind:"rat",base:18,catchRate:.58},
  {name:"Pidgey",color:"#a98662",kind:"bird",base:20,catchRate:.55},
  {name:"Caterpie",color:"#62ae52",kind:"bug",base:17,catchRate:.7},
  {name:"Oddish",color:"#4d77a7",kind:"plant",base:21,catchRate:.52},
  {name:"Zubat",color:"#596fbd",kind:"bat",base:23,catchRate:.45},
  {name:"Gastly",color:"#75568c",kind:"ghost",base:25,catchRate:.4}
];
const gbc={started:false,mode:"world",dialog:"",busy:false,player:{x:21,y:14,dir:"down"},partner:{level:5,hp:28,maxHp:28,xp:0},balls:5,potions:3,caught:[],profGift:false,trainerDefeated:false,completeAwarded:false,battle:null,stepCount:0};
let canvas,ctx,startScreen,battleActions,locationLabel,ballsLabel,caughtLabel,repeatTimer=null;

function fillMap(type="ground"){return Array.from({length:MAP_H},()=>Array(MAP_W).fill(type));}
const map=fillMap();
function rect(x,y,w,h,type){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(map[yy]?.[xx]!==undefined)map[yy][xx]=type;}
rect(0,0,MAP_W,2,"water");rect(0,MAP_H-2,MAP_W,2,"water");rect(0,0,2,MAP_H,"water");rect(MAP_W-2,0,2,MAP_H,"water");
rect(3,4,10,8,"grass");rect(4,18,13,7,"grass");rect(20,17,15,8,"grass");rect(29,11,7,5,"grass");
rect(2,13,36,3,"path");rect(23,2,3,13,"path");rect(31,6,3,9,"path");rect(12,14,3,8,"path");
const buildings=[
  {x:23,y:4,w:6,h:5,doorX:25,doorY:9,type:"center",label:"CENTRO",roof:"#c94c52"},
  {x:31,y:4,w:6,h:5,doorX:33,doorY:9,type:"lab",label:"LAB",roof:"#557ea3"},
  {x:17,y:7,w:4,h:4,doorX:19,doorY:11,type:"house",label:"CASA",roof:"#a36b46"}
];
const trees=new Set();
[[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[12,3],[14,4],[14,5],[14,6],[14,7],[14,8],[14,9],[14,10],[14,11],[14,12],[18,3],[19,3],[20,3],[37,4],[37,5],[37,6],[37,7],[37,8],[37,9],[37,10],[37,11],[3,17],[4,17],[5,17],[17,18],[17,19],[17,20],[17,21],[17,22],[17,23],[19,17],[19,18],[19,19],[36,17],[36,18],[36,19],[36,20],[36,21],[36,22],[36,23]].forEach(([x,y])=>trees.add(`${x},${y}`));
const npcs=[
  {id:"nurse",x:25,y:10,name:"Enfermera",color:"#ef7391"},
  {id:"prof",x:33,y:10,name:"Profesor Pixel",color:"#e6e1bf"},
  {id:"trainer",x:15,y:14,name:"Entrenador Kai",color:"#3e68a0"}
];

function load(){
  const save=storage.get("pokemonGbcSave",null);if(!save)return;
  if(save.player&&Number.isFinite(save.player.x)&&Number.isFinite(save.player.y))gbc.player={...gbc.player,...save.player};
  if(save.partner)gbc.partner={...gbc.partner,...save.partner};
  const savedBalls=Number(save.balls),savedPotions=Number(save.potions);gbc.balls=Number.isFinite(savedBalls)?Math.max(0,savedBalls):5;gbc.potions=Number.isFinite(savedPotions)?Math.max(0,savedPotions):3;gbc.caught=Array.isArray(save.caught)?save.caught.slice(0,40):[];gbc.profGift=Boolean(save.profGift);gbc.trainerDefeated=Boolean(save.trainerDefeated);gbc.completeAwarded=Boolean(save.completeAwarded);
}
function save(show=false){storage.set("pokemonGbcSave",{player:gbc.player,partner:gbc.partner,balls:gbc.balls,potions:gbc.potions,caught:gbc.caught,profGift:gbc.profGift,trainerDefeated:gbc.trainerDefeated,completeAwarded:gbc.completeAwarded});if(show){showToast("💾 Partida de Pixel Quest guardada");sfx("success");}}
function updateStatus(){ballsLabel.textContent=String(gbc.balls);caughtLabel.textContent=String(gbc.caught.length);const p=gbc.player;locationLabel.textContent=p.x>=17&&p.x<=37&&p.y<=12?"🏘️ Ciudad Pixel":map[p.y]?.[p.x]==="grass"?"🌿 Hierba alta":"🛤️ Ruta Verde";}
function isBlocked(x,y){if(x<0||y<0||x>=MAP_W||y>=MAP_H)return true;if(map[y][x]==="water"||trees.has(`${x},${y}`))return true;for(const b of buildings){if(x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h)return true;}return npcs.some(n=>n.x===x&&n.y===y);}

function camera(){return{x:Math.max(0,Math.min(MAP_W-VIEW_W,gbc.player.x-Math.floor(VIEW_W/2))),y:Math.max(0,Math.min(MAP_H-VIEW_H,gbc.player.y-Math.floor(VIEW_H/2)))};}
function tileScreen(x,y,cam){return[(x-cam.x)*TILE,(y-cam.y)*TILE];}
function drawTile(type,sx,sy,wx,wy){
  ctx.fillStyle=type==="path"?palette.path:type==="water"?palette.water:type==="grass"?palette.grass:palette.ground;ctx.fillRect(sx,sy,TILE,TILE);
  if(type==="ground"){ctx.fillStyle=palette.ground2;ctx.fillRect(sx+5,sy+9,3,3);ctx.fillRect(sx+23,sy+23,3,4);}
  if(type==="path"){ctx.fillStyle="#bea963";if((wx+wy)%2===0)ctx.fillRect(sx+8,sy+7,3,3);ctx.fillRect(sx+23,sy+20,2,2);}
  if(type==="water"){ctx.fillStyle=palette.water2;ctx.fillRect(sx+4+(wy%2)*7,sy+9,16,3);ctx.fillRect(sx+12,sy+23,15,2);}
  if(type==="grass"){ctx.fillStyle=palette.grass2;for(let i=0;i<4;i++){const gx=sx+5+i*8,gy=sy+8+((wx+wy+i)%2)*11;ctx.fillRect(gx,gy,2,11);ctx.fillRect(gx-3,gy+3,4,2);}}
}
function drawTree(sx,sy){ctx.fillStyle="#5b4934";ctx.fillRect(sx+13,sy+18,7,14);ctx.fillStyle=palette.tree;ctx.fillRect(sx+4,sy+6,24,17);ctx.fillRect(sx+9,sy+1,15,23);ctx.fillStyle=palette.tree2;ctx.fillRect(sx+8,sy+5,8,6);ctx.fillRect(sx+18,sy+11,7,6);}
function drawBuilding(b,cam){const [sx,sy]=tileScreen(b.x,b.y,cam),w=b.w*TILE,h=b.h*TILE;if(sx+w<0||sy+h<0||sx>canvas.width||sy>canvas.height)return;ctx.fillStyle="#e8dba7";ctx.fillRect(sx,sy+34,w,h-34);ctx.fillStyle=b.roof;ctx.fillRect(sx-4,sy+10,w+8,38);ctx.fillStyle="#eef2c9";ctx.fillRect(sx+12,sy+52,30,22);ctx.fillRect(sx+w-42,sy+52,30,22);ctx.fillStyle="#3e604a";ctx.fillRect(sx+(b.doorX-b.x)*TILE+8,sy+h-34,17,34);ctx.fillStyle=palette.ink;ctx.font="bold 12px monospace";ctx.fillText(b.label,sx+8,sy+31);}
function drawNpc(n,cam){if(n.id==="trainer"&&gbc.trainerDefeated)return;const [sx,sy]=tileScreen(n.x,n.y,cam);ctx.fillStyle="#f4c89b";ctx.fillRect(sx+11,sy+4,11,9);ctx.fillStyle=n.color;ctx.fillRect(sx+8,sy+13,17,14);ctx.fillStyle="#303a36";ctx.fillRect(sx+8,sy+27,6,5);ctx.fillRect(sx+19,sy+27,6,5);ctx.fillStyle="#1f2722";ctx.fillRect(sx+13,sy+7,2,2);ctx.fillRect(sx+19,sy+7,2,2);}
function drawHero(cam){const [sx,sy]=tileScreen(gbc.player.x,gbc.player.y,cam);ctx.fillStyle="#e9c195";ctx.fillRect(sx+10,sy+5,12,9);ctx.fillStyle="#c83b43";ctx.fillRect(sx+7,sy+2,18,6);ctx.fillStyle="#345f8b";ctx.fillRect(sx+7,sy+14,18,13);ctx.fillStyle="#242c2a";ctx.fillRect(sx+8,sy+27,6,5);ctx.fillRect(sx+19,sy+27,6,5);ctx.fillStyle="#f2d33f";ctx.fillRect(sx+24,sy+17,6,8);ctx.fillRect(sx+27,sy+14,3,5);ctx.fillStyle="#3b3524";ctx.fillRect(sx+27,sy+15,3,2);}
function drawDialog(){if(!gbc.dialog)return;ctx.fillStyle=palette.paper;ctx.fillRect(18,365,604,98);ctx.strokeStyle=palette.ink;ctx.lineWidth=5;ctx.strokeRect(18,365,604,98);ctx.fillStyle=palette.ink;ctx.font="bold 18px monospace";wrapText(gbc.dialog,36,394,548,25);ctx.font="bold 13px monospace";ctx.fillText("A ▶",562,448);}
function wrapText(text,x,y,maxWidth,lineHeight){const words=text.split(" ");let line="";for(const word of words){const test=line+word+" ";if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);line=word+" ";y+=lineHeight;}else line=test;}ctx.fillText(line,x,y);}
function drawWorld(){const cam=camera();for(let y=cam.y;y<Math.min(MAP_H,cam.y+VIEW_H);y++)for(let x=cam.x;x<Math.min(MAP_W,cam.x+VIEW_W);x++){const [sx,sy]=tileScreen(x,y,cam);drawTile(map[y][x],sx,sy,x,y);if(trees.has(`${x},${y}`))drawTree(sx,sy);}buildings.forEach(b=>drawBuilding(b,cam));npcs.forEach(n=>drawNpc(n,cam));drawHero(cam);if(gbc.dialog)drawDialog();}

function spritePokemon(kind,x,y,scale=4){
  const px=(dx,dy,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x+dx*scale,y+dy*scale,w*scale,h*scale);};
  if(kind==="pikachu"){px(4,4,9,8,"#f1d447");px(6,1,2,5,"#f1d447");px(11,0,2,6,"#f1d447");px(6,1,2,2,"#2b2a24");px(11,0,2,2,"#2b2a24");px(2,9,12,7,"#f1d447");px(5,7,2,2,"#222");px(11,7,2,2,"#222");px(3,9,2,2,"#e84f4f");px(13,9,2,2,"#e84f4f");px(0,10,3,2,"#f1d447");px(0,8,2,3,"#f1d447");}
  else if(kind==="bird"){px(3,4,9,9,"#a98662");px(10,6,5,2,"#ded29a");px(0,6,5,5,"#765b48");px(6,2,3,3,"#a98662");px(11,5,1,1,"#222");px(14,7,2,1,"#e2b84d");}
  else if(kind==="bug"){px(4,2,7,5,"#d04b54");px(5,7,7,5,"#62ae52");px(6,12,7,4,"#62ae52");px(6,4,1,1,"#222");px(9,4,1,1,"#222");px(8,0,1,3,"#e0bd42");}
  else if(kind==="plant"){px(5,7,8,8,"#4d77a7");px(7,4,2,4,"#4e9b48");px(10,2,2,6,"#4e9b48");px(4,3,3,5,"#4e9b48");px(7,9,1,1,"#222");px(11,9,1,1,"#222");}
  else if(kind==="bat"){px(6,6,6,7,"#596fbd");px(0,4,6,6,"#6e80c6");px(12,4,5,6,"#6e80c6");px(7,7,1,1,"#222");px(10,7,1,1,"#222");px(7,11,4,1,"#d35d69");}
  else if(kind==="ghost"){px(3,3,11,11,"#75568c");px(1,5,15,7,"#8c76a6");px(6,6,2,2,"#fff");px(11,6,2,2,"#fff");px(7,10,5,1,"#222");}
  else{px(4,5,10,8,"#8b66a5");px(5,2,3,4,"#8b66a5");px(11,2,3,4,"#8b66a5");px(2,10,12,6,"#8b66a5");px(7,7,1,1,"#222");px(11,7,1,1,"#222");}
}
function hpBar(x,y,w,hp,max){ctx.fillStyle="#26382d";ctx.fillRect(x,y,w,8);const ratio=Math.max(0,hp/max);ctx.fillStyle=ratio>.5?"#62a850":ratio>.22?"#d4b34c":"#c64d49";ctx.fillRect(x+2,y+2,(w-4)*ratio,4);}
function drawBattle(){const b=gbc.battle;ctx.fillStyle="#b7d585";ctx.fillRect(0,0,640,330);ctx.fillStyle="#8cb36f";ctx.fillRect(0,270,640,60);ctx.fillStyle="#d8e2a5";ctx.fillRect(20,46,285,76);ctx.strokeStyle=palette.ink;ctx.lineWidth=4;ctx.strokeRect(20,46,285,76);ctx.fillStyle=palette.ink;ctx.font="bold 19px monospace";ctx.fillText(`${b.enemy.name}  Nv.${b.enemy.level}`,35,76);ctx.font="bold 13px monospace";ctx.fillText("PS",35,101);hpBar(70,94,210,b.enemy.hp,b.enemy.maxHp);spritePokemon(b.enemy.kind,455,125,6);spritePokemon("pikachu",85,190,6);ctx.fillStyle="#d8e2a5";ctx.fillRect(330,225,290,92);ctx.strokeRect(330,225,290,92);ctx.fillStyle=palette.ink;ctx.font="bold 18px monospace";ctx.fillText(`PIKACHU  Nv.${gbc.partner.level}`,345,254);ctx.font="bold 13px monospace";ctx.fillText(`PS ${gbc.partner.hp}/${gbc.partner.maxHp}`,345,280);hpBar(345,292,245,gbc.partner.hp,gbc.partner.maxHp);ctx.fillStyle=palette.paper;ctx.fillRect(12,335,616,132);ctx.strokeRect(12,335,616,132);ctx.fillStyle=palette.ink;ctx.font="bold 17px monospace";wrapText(b.message,30,368,570,25);}
function draw(){if(!ctx)return;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);if(gbc.mode==="battle"&&gbc.battle)drawBattle();else drawWorld();}

function showDialog(text){gbc.dialog=text;draw();}
function closeDialog(){gbc.dialog="";draw();}
function move(dx,dy,dir){if(!gbc.started||gbc.mode!=="world"||gbc.dialog)return;gbc.player.dir=dir;const nx=gbc.player.x+dx,ny=gbc.player.y+dy;if(!isBlocked(nx,ny)){gbc.player.x=nx;gbc.player.y=ny;gbc.stepCount++;tone(180,.025,"square",.008);updateStatus();onStep();if(gbc.stepCount%8===0)save();}draw();}
function onStep(){if(map[gbc.player.y]?.[gbc.player.x]==="grass"&&Math.random()<.16)startWildBattle();}
function interact(){
  if(!gbc.started)return;if(gbc.mode==="battle"){battleAction("attack");return;}if(gbc.dialog){closeDialog();return;}
  const npc=npcs.find(n=>!(n.id==="trainer"&&gbc.trainerDefeated)&&Math.abs(n.x-gbc.player.x)+Math.abs(n.y-gbc.player.y)<=1);
  if(!npc){showDialog("Pikachu te mira contento. ¡Pika pika! Explora la hierba alta y captura 3 criaturas.");return;}
  if(npc.id==="nurse"){gbc.partner.hp=gbc.partner.maxHp;save();showDialog("Enfermera: tu Pikachu vuelve a tener todos sus PS. ¡Buena suerte!");sfx("success");}
  else if(npc.id==="prof"){if(!gbc.profGift){gbc.balls+=3;gbc.profGift=true;save();updateStatus();showDialog("Profesor Pixel: toma 3 Pokéballs. Debilita a las criaturas antes de intentar capturarlas.");sfx("coin");}else showDialog("Profesor Pixel: captura al menos 3 criaturas y vence al entrenador de la Ruta Verde.");}
  else startTrainerBattle();
}
function back(){if(gbc.dialog){closeDialog();return;}if(gbc.mode==="battle")battleAction("run");}

function makeEnemy(base,trainer=false){const level=Math.max(3,gbc.partner.level-1+Math.floor(Math.random()*3)),maxHp=base.base+level*3;return{...base,level,maxHp,hp:maxHp,trainer};}
function startWildBattle(){const pool=encounters.slice(0,Math.min(encounters.length,3+Math.floor(gbc.partner.level/3))),base=pool[Math.floor(Math.random()*pool.length)];gbc.mode="battle";gbc.battle={enemy:makeEnemy(base),message:`¡Un ${base.name} salvaje apareció!`};gbc.busy=false;battleActions.hidden=false;sfx("go");draw();}
function startTrainerBattle(){const base={name:"Eevee",color:"#a98258",kind:"rat",base:30,catchRate:0};gbc.mode="battle";gbc.battle={enemy:makeEnemy(base,true),message:"¡Entrenador Kai te desafía! Su Eevee entra en combate."};gbc.busy=false;battleActions.hidden=false;sfx("go");draw();}
function finishBattle(message){gbc.mode="world";gbc.battle=null;gbc.busy=false;battleActions.hidden=true;save();checkCompletion();showDialog(message);updateStatus();draw();}
function gainXp(amount){gbc.partner.xp+=amount;const needed=18+gbc.partner.level*8;if(gbc.partner.xp>=needed){gbc.partner.xp-=needed;gbc.partner.level++;gbc.partner.maxHp+=4;gbc.partner.hp=gbc.partner.maxHp;return true;}return false;}
function enemyTurn(){const b=gbc.battle;if(!b)return;gbc.busy=true;b.message=`${b.enemy.name} contraataca...`;draw();setTimeout(()=>{if(!gbc.battle)return;const damage=3+Math.floor(Math.random()*5)+Math.floor(b.enemy.level/4);gbc.partner.hp=Math.max(0,gbc.partner.hp-damage);if(gbc.partner.hp<=0){gbc.partner.hp=gbc.partner.maxHp;gbc.player.x=21;gbc.player.y=14;finishBattle("Tu equipo se ha recuperado. Has vuelto a Ciudad Pixel.");sfx("wrong");return;}gbc.battle.message=`Pikachu recibió ${damage} de daño. ¿Qué harás?`;gbc.busy=false;draw();},520);}
function battleAction(action){
  const b=gbc.battle;if(!gbc.started||gbc.mode!=="battle"||!b||gbc.busy)return;const enemy=b.enemy;
  if(action==="attack"){const damage=6+Math.floor(Math.random()*7)+Math.floor(gbc.partner.level*.8);enemy.hp=Math.max(0,enemy.hp-damage);b.message=`¡Pikachu usó Impactrueno! ${damage} de daño.`;tone(880,.08,"square",.02);draw();if(enemy.hp<=0){const leveled=gainXp(8+enemy.level*3);if(enemy.trainer){gbc.trainerDefeated=true;award(25,20,"Entrenador derrotado");finishBattle(`¡Victoria!${leveled?" Pikachu subió de nivel.":""} El camino queda libre.`);}else{award(4,3,`${enemy.name} derrotado`);finishBattle(`${enemy.name} quedó fuera de combate.${leveled?" ¡Pikachu subió de nivel!":""}`);}return;}setTimeout(enemyTurn,380);}
  else if(action==="ball"){if(enemy.trainer){b.message="No puedes capturar la criatura de otro entrenador.";draw();return;}if(gbc.balls<=0){b.message="No te quedan Pokéballs. Visita al Profesor Pixel.";draw();return;}gbc.balls--;updateStatus();const weak=1-enemy.hp/enemy.maxHp,chance=Math.min(.94,enemy.catchRate+weak*.5);gbc.busy=true;b.message="¡Lanzaste una Pokéball! ...";sfx("coin");draw();setTimeout(()=>{if(Math.random()<chance){gbc.caught.push(enemy.name);gainXp(6+enemy.level*2);award(7,6,`${enemy.name} capturado`);finishBattle(`¡Genial! ${enemy.name} fue capturado. Llevas ${gbc.caught.length} captura${gbc.caught.length===1?"":"s"}.`);}else{b.message=`¡${enemy.name} se escapó de la Pokéball!`;gbc.busy=false;draw();setTimeout(enemyTurn,420);}},720);}
  else if(action==="potion"){if(gbc.potions<=0){b.message="No quedan pociones.";draw();return;}if(gbc.partner.hp>=gbc.partner.maxHp){b.message="Los PS de Pikachu ya están al máximo.";draw();return;}gbc.potions--;const healed=Math.min(14,gbc.partner.maxHp-gbc.partner.hp);gbc.partner.hp+=healed;b.message=`Usaste una poción. Pikachu recuperó ${healed} PS.`;sfx("success");draw();setTimeout(enemyTurn,420);}
  else if(action==="run"){if(enemy.trainer){b.message="¡No puedes huir de un combate de entrenador!";draw();return;}if(Math.random()<.82)finishBattle("Escapaste sin problemas.");else{b.message="¡No pudiste escapar!";draw();setTimeout(enemyTurn,350);}}
}
function checkCompletion(){if(gbc.caught.length>=3&&gbc.trainerDefeated&&!gbc.completeAwarded){gbc.completeAwarded=true;state.completed.pokemonGbc=true;storage.set("completed",state.completed);save();award(60,40,"Pokémon Pixel Quest completado");renderProgress();}}

function bind(){
  document.querySelectorAll("[data-gbc-dir]").forEach(btn=>{const dirs={up:[0,-1,"up"],down:[0,1,"down"],left:[-1,0,"left"],right:[1,0,"right"]},go=()=>move(...dirs[btn.dataset.gbcDir]);btn.addEventListener("pointerdown",e=>{e.preventDefault();go();clearInterval(repeatTimer);repeatTimer=setInterval(go,135);});["pointerup","pointercancel","pointerleave"].forEach(ev=>btn.addEventListener(ev,()=>{clearInterval(repeatTimer);repeatTimer=null;}));});
  document.getElementById("gbc-a").addEventListener("click",interact);document.getElementById("gbc-b").addEventListener("click",back);document.getElementById("gbc-save").addEventListener("click",()=>save(true));battleActions.addEventListener("click",e=>{const btn=e.target.closest("[data-gbc-action]");if(btn)battleAction(btn.dataset.gbcAction);});
  document.getElementById("gbc-start").addEventListener("click",()=>{gbc.started=true;startScreen.classList.add("hidden");showDialog(gbc.caught.length?"Partida cargada. Sigue explorando, entrenador.":"¡Bienvenido! Pikachu irá contigo. Explora la Ruta Verde, captura 3 criaturas y vence al entrenador Kai.");sfx("go");draw();});
  addEventListener("keydown",e=>{if(!gbc.started||["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName))return;const r=canvas.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;const k=e.key.toLowerCase(),moves={arrowup:[0,-1,"up"],w:[0,-1,"up"],arrowdown:[0,1,"down"],s:[0,1,"down"],arrowleft:[-1,0,"left"],a:[-1,0,"left"],arrowright:[1,0,"right"],d:[1,0,"right"]};if(moves[k]){e.preventDefault();move(...moves[k]);}else if(k==="z"||k==="enter"){e.preventDefault();interact();}else if(k==="x"||k==="escape"){e.preventDefault();back();}});
}
function init(){canvas=document.getElementById("gbc-canvas");if(!canvas)return;ctx=canvas.getContext("2d");startScreen=document.getElementById("gbc-start-screen");battleActions=document.getElementById("gbc-battle-actions");locationLabel=document.getElementById("gbc-location");ballsLabel=document.getElementById("gbc-balls");caughtLabel=document.getElementById("gbc-caught");load();updateStatus();bind();draw();}
document.addEventListener("DOMContentLoaded",init);
})();
