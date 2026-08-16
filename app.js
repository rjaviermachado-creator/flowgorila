"use strict";

const ACTIVE_PROFILE = (() => {
  try { return localStorage.getItem("flowgorila_active_user") || "guest"; }
  catch { return "guest"; }
})();
const STORAGE_PREFIX = `flowgorila_v2_${ACTIVE_PROFILE}_`;
const storage = {
  get(key, fallback) { try { const value = localStorage.getItem(STORAGE_PREFIX + key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch {} },
  clear() { try { Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_PREFIX)).forEach((key) => localStorage.removeItem(key)); } catch {} }
};

const state = {
  xp: Number(storage.get("xp", 0)) || 0,
  coins: Number(storage.get("coins", 0)) || 0,
  bestScore: Number(storage.get("bestScore", 0)) || 0,
  streak: Number(storage.get("streak", 0)) || 0,
  lastVisit: storage.get("lastVisit", null),
  dailyClaim: storage.get("dailyClaim", null),
  cart: Array.isArray(storage.get("cart", [])) ? storage.get("cart", []) : [],
  comments: Array.isArray(storage.get("comments", [])) ? storage.get("comments", []) : [],
  reactions: { "🔥": 0, "💜": 0, "🎮": 0, ...storage.get("reactions", {}) },
  completed: { trivia: false, pokemonGbc: false, platformer: false, ...storage.get("completed", {}) },
  theme: storage.get("theme", "dark"),
  sound: storage.get("sound", true) !== false
};

const products = [
  { id: "gorila-neon", name: "Avatar Gorila Neon", description: "Aspecto digital exclusivo para tu colección demo.", price: 4.99, icon: "🦍" },
  { id: "flow-cap", name: "Gorra Flow", description: "Un drop urbano virtual con el sello FlowGorila.", price: 3.49, icon: "🧢" },
  { id: "arcade-badge", name: "Badge Arcade", description: "Insignia de jugador para presumir de flow.", price: 2.49, icon: "🏆" },
  { id: "neon-pack", name: "Pack Cyber", description: "Combo visual de estética neón y gamer.", price: 5.99, icon: "⚡" }
];

const TRIVIA_BANK_SIZE = 160000;
const triviaFacts = {
  geografia: [
    ["España","Madrid"],["Francia","París"],["Italia","Roma"],["Portugal","Lisboa"],["Alemania","Berlín"],["Reino Unido","Londres"],["Irlanda","Dublín"],["Grecia","Atenas"],["Japón","Tokio"],["China","Pekín"],["Corea del Sur","Seúl"],["India","Nueva Delhi"],["Australia","Canberra"],["Canadá","Ottawa"],["Estados Unidos","Washington D. C."],["México","Ciudad de México"],["Argentina","Buenos Aires"],["Brasil","Brasilia"],["Chile","Santiago"],["Perú","Lima"],["Colombia","Bogotá"],["Cuba","La Habana"],["Egipto","El Cairo"],["Marruecos","Rabat"],["Kenia","Nairobi"],["Noruega","Oslo"],["Suecia","Estocolmo"],["Finlandia","Helsinki"],["Polonia","Varsovia"],["Austria","Viena"],["Suiza","Berna"],["Bélgica","Bruselas"]
  ],
  ciencia: [
    ["¿Qué planeta es conocido como el planeta rojo?","Marte",["Venus","Júpiter","Mercurio"]],["¿Cuál es el planeta más grande del sistema solar?","Júpiter",["Saturno","Tierra","Neptuno"]],["¿Qué gas absorben principalmente las plantas durante la fotosíntesis?","Dióxido de carbono",["Oxígeno","Helio","Hidrógeno"]],["¿Cuál es el símbolo químico del oro?","Au",["Ag","O","Fe"]],["¿Cuántos huesos tiene aproximadamente un adulto?","206",["106","306","406"]],["¿Qué órgano bombea la sangre?","Corazón",["Pulmón","Hígado","Riñón"]],["¿Cuál es la unidad básica de la vida?","Célula",["Átomo","Tejido","Órgano"]],["¿A qué temperatura se congela el agua a presión normal?","0 °C",["10 °C","-20 °C","100 °C"]],["¿Qué fuerza nos mantiene sobre la superficie terrestre?","Gravedad",["Magnetismo","Fricción","Electricidad"]],["¿Qué estrella está en el centro del sistema solar?","El Sol",["Sirio","Polaris","Betelgeuse"]]
  ],
  historia: [
    ["¿En qué año llegó Cristóbal Colón a América?","1492",["1453","1512","1588"]],["¿Qué civilización construyó Machu Picchu?","Inca",["Maya","Romana","Egipcia"]],["¿En qué país comenzó la Revolución Industrial?","Reino Unido",["Francia","España","Italia"]],["¿Qué ciudad quedó sepultada por el Vesubio en el año 79?","Pompeya",["Atenas","Esparta","Cartago"]],["¿Quién fue el primer emperador romano?","Augusto",["Nerón","Julio César","Trajano"]],["¿En qué año terminó la Segunda Guerra Mundial?","1945",["1939","1942","1950"]],["¿Qué antiguo pueblo desarrolló la democracia en Atenas?","Los griegos",["Los vikingos","Los fenicios","Los persas"]],["¿Qué muro cayó en 1989?","Muro de Berlín",["Muro de Adriano","Gran Muralla","Muro de las Lamentaciones"]]
  ],
  gaming: [
    ["¿Qué compañía creó la saga Super Mario?","Nintendo",["Valve","Rockstar","Sega"]],["¿Qué estudio desarrolla Grand Theft Auto?","Rockstar Games",["Mojang","Bungie","Capcom"]],["¿Cómo se llama el lenguaje de scripting utilizado en Roblox?","Luau",["Ruby","Swift","Kotlin"]],["¿Quién es la mascota eléctrica más conocida de Pokémon?","Pikachu",["Eevee","Mewtwo","Charizard"]],["¿Qué material se usa para fabricar muchas herramientas en Minecraft?","Madera",["Agua","Lana","Cristal"]],["¿Cómo se llama la consola híbrida de Nintendo lanzada en 2017?","Nintendo Switch",["Wii U","GameCube","Nintendo 64"]],["¿En qué saga aparece Link?","The Legend of Zelda",["Metroid","Kirby","Splatoon"]],["¿Qué compañía publica PlayStation?","Sony",["Nintendo","Valve","Atari"]],["¿Qué género es Fortnite Battle Royale?","Battle royale",["Carreras","Estrategia por turnos","Simulación deportiva"]],["¿Qué Pokémon inicial de Kanto es de tipo Fuego?","Charmander",["Squirtle","Bulbasaur","Pikachu"]]
  ],
  cultura: [
    ["¿Cuántos lados tiene un hexágono?","6",["5","7","8"]],["¿Quién pintó la Mona Lisa?","Leonardo da Vinci",["Picasso","Van Gogh","Dalí"]],["¿Cuál es el idioma con más hablantes nativos?","Chino mandarín",["Inglés","Francés","Alemán"]],["¿Cuántos minutos tiene una hora?","60",["50","70","100"]],["¿Qué instrumento suele tener 88 teclas?","Piano",["Violín","Flauta","Guitarra"]],["¿Cuántos colores tiene tradicionalmente el arcoíris?","7",["5","6","9"]],["¿Cuál es el océano más grande?","Pacífico",["Atlántico","Índico","Ártico"]],["¿Qué deporte se juega en Wimbledon?","Tenis",["Golf","Fútbol","Baloncesto"]]
  ],
  cine: [
    ["¿Cómo se llama el ogro verde protagonista de una famosa saga animada?","Shrek",["Hulk","Groot","Sulley"]],["¿Qué película tiene un parque lleno de dinosaurios clonados?","Jurassic Park",["Avatar","Jumanji","Tron"]],["¿Cómo se llama el vaquero de Toy Story?","Woody",["Buzz","Rex","Sully"]],["¿Qué saga tiene un anillo que debe ser destruido en Mordor?","El Señor de los Anillos",["Harry Potter","Star Wars","Matrix"]],["¿Qué personaje vive en una piña debajo del mar?","Bob Esponja",["Nemo","Stitch","Simba"]],["¿Cómo se llama el león protagonista de El Rey León?","Simba",["Mufasa","Scar","Timon"]],["¿Qué héroe de Marvel usa un escudo circular?","Capitán América",["Thor","Hulk","Iron Man"]],["¿Qué saga cinematográfica incluye a Darth Vader?","Star Wars",["Star Trek","Avatar","Alien"]]
  ]
};

const elements = {};
let triviaRound = [], triviaIndex = 0, triviaScore = 0, triviaCombo = 0, triviaTimer = null, triviaTimeLeft = 15;
let platformerRunning = false, platformerFrame = null, platformerKeys = {left:false,right:false,jump:false};
let audioContext = null;
let lastFocusedElement = null;

function cacheElements() {
  ["menu-button","main-nav","sound-button","theme-button","cart-button","cart-count","daily-reward-button","level-value","xp-value","coins-value","best-score-value","streak-value","trivia-category","trivia-difficulty","trivia-stage","trivia-start","platformer-canvas","platformer-overlay","platformer-start","platformer-left","platformer-right","platformer-jump","platformer-power","platformer-level-select","platformer-power-status","products-grid","comment-form","comments-list","progress-label","progress-fill","missions-list","current-year","reset-progress","overlay","cart-drawer","cart-items","cart-total","checkout-button","toast","sound-hint","cursor-glow","fx-canvas"].forEach((id) => { elements[id.replaceAll("-", "_")] = document.getElementById(id); });
  elements.progress_track = document.querySelector(".progress-track");
}

function todayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function yesterdayKey() { const date = new Date(); date.setDate(date.getDate()-1); return todayKey(date); }
function money(value) { return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value); }
function shuffle(items) { const result = [...items]; for (let i=result.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; } return result; }
function randomId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }

function ensureAudio() {
  if (!state.sound) return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function tone(frequency, duration=.07, type="sine", volume=.035, delay=0) {
  const ctx = ensureAudio(); if (!ctx) return;
  const osc=ctx.createOscillator(), gain=ctx.createGain(), start=ctx.currentTime+delay;
  osc.type=type; osc.frequency.setValueAtTime(frequency,start); gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(volume,start+.008); gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(start); osc.stop(start+duration+.02);
}

function sfx(kind="click") {
  if (!state.sound) return;
  if (kind==="hover") tone(610,.045,"sine",.012);
  else if (kind==="click") tone(260,.055,"triangle",.025);
  else if (kind==="flip") { tone(430,.06,"square",.02); tone(610,.05,"triangle",.016,.035); }
  else if (kind==="wrong") { tone(180,.13,"sawtooth",.025); tone(125,.15,"triangle",.02,.08); }
  else if (kind==="go") { tone(740,.08,"square",.025); tone(980,.12,"sine",.03,.05); }
  else if (kind==="success") { tone(523,.13,"triangle",.03); tone(659,.14,"triangle",.03,.08); tone(784,.2,"sine",.035,.16); }
  else if (kind==="coin") { tone(880,.06,"square",.022); tone(1320,.11,"sine",.025,.055); }
}

function setSound(enabled, announce=true) {
  state.sound=Boolean(enabled); storage.set("sound",state.sound);
  elements.sound_button.textContent=state.sound?"🔊":"🔇";
  elements.sound_button.setAttribute("aria-label",state.sound?"Silenciar efectos":"Activar efectos de sonido");
  if (state.sound) { ensureAudio(); sfx("success"); }
  if (announce) showToast(state.sound?"Sonido Flow activado 🔊":"Sonido silenciado 🔇");
}

function showToast(message) { elements.toast.textContent=message; elements.toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>elements.toast.classList.remove("show"),2400); }

function updateVisitStreak() {
  const today=todayKey(); if (state.lastVisit===today) return;
  state.streak=state.lastVisit===yesterdayKey()?state.streak+1:1; state.lastVisit=today;
  storage.set("streak",state.streak); storage.set("lastVisit",state.lastVisit);
}

function renderProgress() {
  const level=Math.floor(state.xp/100)+1, within=state.xp%100;
  elements.level_value.textContent=String(level); elements.xp_value.textContent=`${state.xp} XP`; elements.coins_value.textContent=String(state.coins); elements.best_score_value.textContent=String(state.bestScore); elements.streak_value.textContent=`${state.streak} día${state.streak===1?"":"s"}`;
  elements.progress_label.textContent=`${within}/100 XP`; elements.progress_fill.style.width=`${within}%`; elements.progress_track.setAttribute("aria-valuenow",String(within));
  const missions=[{label:"Completa Universal Trivia",done:state.completed.trivia},{label:"Domina Pokémon Pixel Quest",done:state.completed.pokemonGbc},{label:"Completa Pika Dash",done:state.completed.platformer}];
  elements.missions_list.replaceChildren(...missions.map((item)=>{const node=document.createElement("div");node.className=`mission${item.done?" done":""}`;node.textContent=`${item.done?"✓":"○"} ${item.label}`;return node;}));
}

function award(xp, coins, label) {
  state.xp+=xp; state.coins+=coins; storage.set("xp",state.xp); storage.set("coins",state.coins); renderProgress();
  sfx("success"); showToast(`${label} · +${xp} XP · +${coins} monedas`); burst(innerWidth/2,innerHeight/2,20); comboPop(innerWidth/2,Math.min(innerHeight-90,innerHeight*.72),`+${xp} XP`);
}

function claimDailyReward() { const today=todayKey(); if(state.dailyClaim===today){sfx("wrong");showToast("La recompensa de hoy ya está abierta");return;} const coins=20+Math.floor(Math.random()*31);state.dailyClaim=today;storage.set("dailyClaim",today);sfx("coin");award(10,coins,"Recompensa diaria"); }

function renderProducts() {
  elements.products_grid.replaceChildren(...products.map((product)=>{const article=document.createElement("article");article.className="product-card reveal";article.innerHTML=`<div class="product-visual"><span aria-hidden="true">${product.icon}</span></div><div class="product-copy"><h3></h3><p></p><div class="product-footer"><strong>${money(product.price)}</strong><button type="button" data-product-id="${product.id}">Añadir</button></div></div>`;article.querySelector("h3").textContent=product.name;article.querySelector("p").textContent=product.description;return article;}));
}

function renderCart() {
  elements.cart_count.textContent=String(state.cart.length);
  const rows=state.cart.map((id,index)=>{const product=products.find((p)=>p.id===id);if(!product)return null;const row=document.createElement("div");row.className="drawer-row";row.innerHTML=`<div><p>${product.icon} ${product.name}</p><small>${money(product.price)}</small></div><button class="remove-button" data-cart-index="${index}" type="button">Quitar</button>`;return row;}).filter(Boolean);
  if(!rows.length){const empty=document.createElement("p");empty.className="empty-state";empty.textContent="El carrito está vacío.";elements.cart_items.replaceChildren(empty);}else elements.cart_items.replaceChildren(...rows);
  elements.cart_total.textContent=money(state.cart.reduce((sum,id)=>sum+(products.find((p)=>p.id===id)?.price||0),0));
}

function addToCart(id) { const product=products.find((p)=>p.id===id);if(!product)return;state.cart.push(id);storage.set("cart",state.cart);renderCart();sfx("coin");showToast(`${product.name} añadido al carrito`); }
function removeFromCart(index) { if(index<0||index>=state.cart.length)return;state.cart.splice(index,1);storage.set("cart",state.cart);renderCart();sfx("click"); }

function openCart() { lastFocusedElement=document.activeElement;elements.cart_drawer.classList.add("open");elements.cart_drawer.setAttribute("aria-hidden","false");elements.overlay.hidden=false;elements.cart_drawer.querySelector("button")?.focus(); }
function closeCart() { elements.cart_drawer.classList.remove("open");elements.cart_drawer.setAttribute("aria-hidden","true");elements.overlay.hidden=true;if(lastFocusedElement instanceof HTMLElement)lastFocusedElement.focus(); }

function triviaChoice(category,difficulty,question,correct,wrong){
  const choices=shuffle([String(correct),...wrong.map(String)]).filter((value,index,array)=>array.indexOf(value)===index).slice(0,4);
  while(choices.length<4)choices.push(`Opción ${choices.length+1}`);
  return {category,difficulty,question,answers:choices,correct:choices.indexOf(String(correct))};
}

function generateMathQuestion(requestedDifficulty="todas"){
  const difficulty=requestedDifficulty==="todas"?shuffle(["facil","media","dificil"])[0]:requestedDifficulty;
  let a,b,correct,question;
  if(difficulty==="facil"){
    a=5+Math.floor(Math.random()*76);b=2+Math.floor(Math.random()*59);
    if(Math.random()<.5){correct=a+b;question=`¿Cuánto es ${a} + ${b}?`;}else{const high=Math.max(a,b),low=Math.min(a,b);correct=high-low;question=`¿Cuánto es ${high} − ${low}?`;}
  }else if(difficulty==="media"){
    a=2+Math.floor(Math.random()*18);b=2+Math.floor(Math.random()*13);
    if(Math.random()<.62){correct=a*b;question=`¿Cuánto es ${a} × ${b}?`;}else{correct=a;question=`¿Cuánto es ${a*b} ÷ ${b}?`;}
  }else{
    const kind=Math.floor(Math.random()*3);
    if(kind===0){a=20+Math.floor(Math.random()*980);b=20+Math.floor(Math.random()*980);correct=a+b;question=`Calcula ${a} + ${b}.`;}
    else if(kind===1){a=12+Math.floor(Math.random()*88);b=3+Math.floor(Math.random()*27);correct=a*b;question=`Calcula ${a} × ${b}.`;}
    else{const percent=[10,20,25,50][Math.floor(Math.random()*4)];a=(4+Math.floor(Math.random()*97))*20;correct=a*percent/100;question=`¿Cuál es el ${percent}% de ${a}?`;}
  }
  const spread=Math.max(2,Math.round(Math.abs(correct)*.08));
  return triviaChoice("matematicas",difficulty,question,correct,[correct+spread,Math.max(0,correct-spread),correct+spread+Math.max(2,Math.floor(Math.random()*7))]);
}

function generateFactQuestion(category,requestedDifficulty="todas"){
  if(category==="geografia"){
    const data=triviaFacts.geografia,item=data[Math.floor(Math.random()*data.length)],reverse=Math.random()<.34;
    if(reverse){const wrong=shuffle(data.filter(x=>x[0]!==item[0]).map(x=>x[0])).slice(0,3);return triviaChoice(category,requestedDifficulty,`¿De qué país es capital ${item[1]}?`,item[0],wrong);}
    const wrong=shuffle(data.filter(x=>x[1]!==item[1]).map(x=>x[1])).slice(0,3);return triviaChoice(category,requestedDifficulty,`¿Cuál es la capital de ${item[0]}?`,item[1],wrong);
  }
  const data=triviaFacts[category]||triviaFacts.cultura,item=data[Math.floor(Math.random()*data.length)];
  return triviaChoice(category,requestedDifficulty,item[0],item[1],item[2]);
}

function generateTriviaQuestion(category,difficulty){
  const categories=["geografia","ciencia","matematicas","historia","gaming","cultura","cine"];
  const selected=category==="todas"?categories[Math.floor(Math.random()*categories.length)]:category;
  return selected==="matematicas"?generateMathQuestion(difficulty):generateFactQuestion(selected,difficulty);
}

function buildTriviaRound(category,difficulty,count=10){
  const result=[],seen=new Set();let attempts=0;
  while(result.length<count&&attempts<250){attempts++;const q=generateTriviaQuestion(category,difficulty);if(seen.has(q.question))continue;seen.add(q.question);result.push(q);}
  while(result.length<count)result.push(generateMathQuestion(difficulty));
  return result;
}

function startTrivia(){
  clearInterval(triviaTimer);triviaRound=buildTriviaRound(elements.trivia_category.value,elements.trivia_difficulty.value,10);triviaIndex=0;triviaScore=0;triviaCombo=0;elements.trivia_start.disabled=true;elements.trivia_start.textContent="Ronda en curso…";sfx("go");renderTriviaQuestion();
}

function startTriviaTimer(){
  clearInterval(triviaTimer);triviaTimeLeft=15;const node=document.getElementById("trivia-timer");if(node)node.textContent=`${triviaTimeLeft}s`;
  triviaTimer=setInterval(()=>{triviaTimeLeft--;const current=document.getElementById("trivia-timer");if(current)current.textContent=`${triviaTimeLeft}s`;if(triviaTimeLeft<=0){clearInterval(triviaTimer);answerTrivia(-1,true);}},1000);
}

function renderTriviaQuestion(){
  const question=triviaRound[triviaIndex];if(!question){finishTrivia();return;}
  elements.trivia_stage.dataset.locked="0";
  const wrap=document.createElement("div"),progress=document.createElement("div"),title=document.createElement("h4"),answers=document.createElement("div");
  progress.className="trivia-progress";progress.innerHTML=`<span>Pregunta ${triviaIndex+1}/${triviaRound.length}</span><span class="trivia-combo">Combo x${triviaCombo}</span><span class="trivia-timer" id="trivia-timer">15s</span>`;
  const line=document.createElement("div");line.className="trivia-progress-line";line.innerHTML=`<i style="width:${((triviaIndex+1)/triviaRound.length)*100}%"></i>`;
  title.className="trivia-question";title.textContent=question.question;answers.className="answer-list";
  question.answers.forEach((answer,index)=>{const button=document.createElement("button");button.type="button";button.className="answer-button";button.dataset.answerIndex=String(index);button.textContent=answer;answers.append(button);});wrap.append(progress,line,title,answers);elements.trivia_stage.replaceChildren(wrap);startTriviaTimer();
}

function answerTrivia(index,timedOut=false){
  const q=triviaRound[triviaIndex];if(!q||elements.trivia_stage.dataset.locked==="1")return;elements.trivia_stage.dataset.locked="1";clearInterval(triviaTimer);
  const buttons=[...elements.trivia_stage.querySelectorAll(".answer-button")];buttons.forEach((b)=>b.disabled=true);buttons[q.correct]?.classList.add("correct");
  if(index===q.correct){triviaScore++;triviaCombo++;sfx("success");}else{triviaCombo=0;if(index>=0)buttons[index]?.classList.add("wrong");sfx("wrong");if(timedOut)showToast("Tiempo agotado ⏱️");}
  setTimeout(()=>{triviaIndex++;renderTriviaQuestion();},timedOut?900:680);
}

function finishTrivia(){
  clearInterval(triviaTimer);state.bestScore=Math.max(state.bestScore,triviaScore);state.completed.trivia=true;storage.set("bestScore",state.bestScore);storage.set("completed",state.completed);
  const rank=triviaScore===10?"PERFECTO 🏆":triviaScore>=8?"EXPERTO 🌟":triviaScore>=6?"MUY BIEN ⚡":"SIGUE ENTRENANDO 🎯";
  elements.trivia_stage.innerHTML=`<div class="game-placeholder"><strong>${rank}</strong><p>${triviaScore} de 10 correctas · banco potencial ${TRIVIA_BANK_SIZE.toLocaleString("es-ES")}+</p></div>`;elements.trivia_start.disabled=false;elements.trivia_start.textContent="Jugar otra ronda de 10";award(30,Math.max(10,triviaScore*4),"Universal Trivia completado");
}

const PIKA_LEVEL_COUNT=12;
const platformer={level:1,x:70,y:280,vx:0,vy:0,w:40,h:48,onGround:false,coins:0,hearts:3,camera:0,levelWidth:2800,goalX:2700,lastTime:0,facing:1,superMode:false,lotus:false,invulnerableUntil:0,lastShot:0};
let platformerPlatforms=[],platformerCoins=[],platformerEnemies=[],platformerPowerups=[],platformerProjectiles=[];

function seededPikaRandom(seed){let value=seed>>>0;return()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};}

function refreshPlatformerLevels(selected=platformer.level){
  const unlocked=Math.max(1,Math.min(PIKA_LEVEL_COUNT,Number(storage.get("pikaUnlocked",1))||1));
  if(!elements.platformer_level_select.options.length){for(let level=1;level<=PIKA_LEVEL_COUNT;level++){const option=document.createElement("option");option.value=String(level);elements.platformer_level_select.append(option);}}
  [...elements.platformer_level_select.options].forEach((option)=>{const level=Number(option.value),locked=level>unlocked;option.disabled=locked;option.textContent=`Nivel ${level}${locked?" 🔒":""}`;});
  elements.platformer_level_select.value=String(Math.min(unlocked,Math.max(1,selected)));
}

function setupPlatformerLevels(){
  const unlocked=Math.max(1,Math.min(PIKA_LEVEL_COUNT,Number(storage.get("pikaUnlocked",1))||1)),selected=Math.min(unlocked,Math.max(1,Number(storage.get("pikaSelected",1))||1));platformer.level=selected;refreshPlatformerLevels(selected);
}

function buildPlatformerLevel(level){
  const random=seededPikaRandom(2026+level*7919),targetWidth=2450+(level-1)*320;let x=0,segment=0;
  platformerPlatforms=[];platformerCoins=[];platformerEnemies=[];platformerPowerups=[];platformerProjectiles=[];
  while(x<targetWidth){
    const segmentWidth=Math.max(300,420+Math.floor(random()*160)-level*5),ground={x,y:360,w:segmentWidth,h:70};platformerPlatforms.push(ground);
    for(let coinX=x+120;coinX<x+segmentWidth-70;coinX+=115+Math.floor(random()*35))platformerCoins.push({x:coinX,y:322,taken:false});
    if(segment>0&&random()<Math.min(.25+level*.045,.82)){
      const min=x+55,max=x+segmentWidth-70,start=min+random()*Math.max(20,max-min);platformerEnemies.push({x:start,min,max,y:326,vx:(.9+level*.065+random()*.4)*(random()>.5?1:-1),dead:false});
      if(level>=8&&segmentWidth>390&&random()<.38){const start2=min+random()*Math.max(20,max-min);platformerEnemies.push({x:start2,min,max,y:326,vx:(1.05+level*.07)*(random()>.5?1:-1),dead:false});}
    }
    if(segment>0&&random()<.82){const floatW=105+Math.floor(random()*75),floatX=x+85+random()*Math.max(30,segmentWidth-floatW-150),floatY=205+Math.floor(random()*85);platformerPlatforms.push({x:floatX,y:floatY,w:floatW,h:20});platformerCoins.push({x:floatX+floatW*.35,y:floatY-28,taken:false},{x:floatX+floatW*.7,y:floatY-28,taken:false});}
    if(segment===1||segment>2&&random()<.08)platformerPowerups.push({x:x+Math.min(150,segmentWidth*.45),y:323,type:"pokeball",taken:false});
    if(level>=2&&(segment===2||segment>3&&random()<.07))platformerPowerups.push({x:x+Math.min(185,segmentWidth*.55),y:318,type:"lotus",taken:false});
    if(x+segmentWidth>=targetWidth){x+=segmentWidth;break;}
    const gap=Math.min(152,72+Math.floor(random()*(34+level*4)));x+=segmentWidth+gap;segment++;
  }
  platformer.levelWidth=x;platformer.goalX=x-82;
}

function updatePlatformerPowerStatus(){
  if(!elements.platformer_power_status)return;elements.platformer_power_status.textContent=platformer.lotus?"🌸 LOTUS THUNDER ACTIVO":platformer.superMode?"🔴⚪ Pokéball · escudo activo":"⚡ Modo normal";elements.platformer_power?.classList.toggle("active",platformer.lotus);
}

function resetPlatformer(){
  if(platformerFrame)cancelAnimationFrame(platformerFrame);platformerFrame=null;platformerRunning=false;platformer.x=70;platformer.y=280;platformer.vx=0;platformer.vy=0;platformer.onGround=false;platformer.coins=0;platformer.hearts=3;platformer.camera=0;platformer.facing=1;platformer.superMode=false;platformer.lotus=false;platformer.invulnerableUntil=0;platformer.lastShot=0;platformerKeys={left:false,right:false,jump:false};buildPlatformerLevel(platformer.level);updatePlatformerPowerStatus();if(elements.platformer_overlay){elements.platformer_overlay.classList.remove("hidden");elements.platformer_overlay.innerHTML=`<strong>NIVEL ${platformer.level}</strong><span>Dificultad ${platformer.level}/12 · recoge Pokéballs y flores de loto</span>`;}if(elements.platformer_start)elements.platformer_start.textContent=`Jugar nivel ${platformer.level}`;drawPlatformer();
}

function startPlatformer(){
  const selected=Math.max(1,Math.min(PIKA_LEVEL_COUNT,Number(elements.platformer_level_select.value)||1));platformer.level=selected;storage.set("pikaSelected",selected);resetPlatformer();platformerRunning=true;platformer.lastTime=performance.now();elements.platformer_overlay.classList.add("hidden");elements.platformer_start.textContent=`Reiniciar nivel ${platformer.level}`;sfx("go");platformerFrame=requestAnimationFrame(platformerLoop);
}

function platformerRespawn(){
  const ground=platformerPlatforms.filter((p)=>p.y===360&&p.x<=platformer.x).sort((a,b)=>b.x-a.x)[0];platformer.x=Math.max(25,(ground?.x||0)+35);platformer.y=280;platformer.vx=0;platformer.vy=0;platformer.camera=Math.max(0,platformer.x-250);
}

function hitPlatformerPlayer(forceRespawn=false){
  const now=performance.now();if(now<platformer.invulnerableUntil)return;
  if(platformer.lotus||platformer.superMode){if(platformer.lotus)platformer.lotus=false;else platformer.superMode=false;platformer.invulnerableUntil=now+1150;updatePlatformerPowerStatus();sfx("wrong");if(forceRespawn)platformerRespawn();else{platformer.vy=-6;platformer.vx=-platformer.facing*4;}return;}
  platformer.hearts--;sfx("wrong");if(platformer.hearts<=0){platformerRunning=false;elements.platformer_overlay.classList.remove("hidden");elements.platformer_overlay.innerHTML=`<strong>GAME OVER</strong><span>Nivel ${platformer.level} · vuelve a intentarlo</span>`;elements.platformer_start.textContent=`Reintentar nivel ${platformer.level}`;drawPlatformer();return;}platformerRespawn();
}

function collectPlatformerPowerup(powerup){
  powerup.taken=true;if(powerup.type==="pokeball"){platformer.superMode=true;sfx("success");showToast("🔴⚪ Pokéball: escudo activado");}else{platformer.superMode=true;platformer.lotus=true;sfx("go");showToast("🌸 Flor de loto: ¡Lotus Thunder activado!");}updatePlatformerPowerStatus();
}

function shootLotus(){
  if(!platformerRunning||!platformer.lotus)return;const now=performance.now();if(now-platformer.lastShot<320)return;platformer.lastShot=now;platformerProjectiles.push({x:platformer.x+platformer.w/2+platformer.facing*18,y:platformer.y+22,vx:platformer.facing*11,life:85});tone(940,.07,"sawtooth",.025);
}

function winPlatformer(){
  if(!platformerRunning)return;platformerRunning=false;const level=platformer.level,next=Math.min(PIKA_LEVEL_COUNT,level+1),unlocked=Math.max(Number(storage.get("pikaUnlocked",1))||1,next);storage.set("pikaUnlocked",unlocked);refreshPlatformerLevels(level<PIKA_LEVEL_COUNT?next:level);elements.platformer_overlay.classList.remove("hidden");
  if(level===PIKA_LEVEL_COUNT){state.completed.platformer=true;storage.set("completed",state.completed);elements.platformer_overlay.innerHTML=`<strong>¡12/12! ⚡</strong><span>PIKA DASH COMPLETADO · ${platformer.coins} monedas en el nivel final</span>`;elements.platformer_start.textContent="Repetir nivel 12";renderProgress();}
  else{elements.platformer_overlay.innerHTML=`<strong>¡NIVEL ${level} SUPERADO!</strong><span>${platformer.coins} monedas · nivel ${next} desbloqueado</span>`;elements.platformer_start.textContent=`Jugar nivel ${next}`;storage.set("pikaSelected",next);}
  award(12+level*3,Math.max(8,platformer.coins)+level,`Pika Dash · nivel ${level} superado`);sfx("success");
}

function updatePlatformer(dt){
  const step=Math.min(1.55,dt/16.6667),acc=(.76+platformer.level*.012)*step,maxSpeed=6.05+platformer.level*.055;
  if(platformerKeys.left){platformer.vx=Math.max(-maxSpeed,platformer.vx-acc);platformer.facing=-1;}else if(platformerKeys.right){platformer.vx=Math.min(maxSpeed,platformer.vx+acc);platformer.facing=1;}else platformer.vx*=Math.pow(.78,step);
  if(platformerKeys.jump&&platformer.onGround){platformer.vy=-12.8;platformer.onGround=false;tone(720,.06,"square",.018);}platformerKeys.jump=false;
  const previousBottom=platformer.y+platformer.h;platformer.vy+=.72*step;platformer.vy=Math.min(15,platformer.vy);platformer.x+=platformer.vx*step;platformer.y+=platformer.vy*step;platformer.x=Math.max(0,Math.min(platformer.levelWidth-platformer.w,platformer.x));platformer.onGround=false;
  for(const p of platformerPlatforms){const overlaps=platformer.x+platformer.w>p.x&&platformer.x<p.x+p.w;if(overlaps&&platformer.vy>=0&&previousBottom<=p.y+7&&platformer.y+platformer.h>=p.y){platformer.y=p.y-platformer.h;platformer.vy=0;platformer.onGround=true;break;}}
  if(platformer.y>490){hitPlatformerPlayer(true);if(!platformerRunning)return;}
  for(const coin of platformerCoins){if(coin.taken)continue;const dx=platformer.x+platformer.w/2-coin.x,dy=platformer.y+platformer.h/2-coin.y;if(dx*dx+dy*dy<34*34){coin.taken=true;platformer.coins++;sfx("coin");}}
  for(const powerup of platformerPowerups){if(powerup.taken)continue;const dx=platformer.x+platformer.w/2-powerup.x,dy=platformer.y+platformer.h/2-powerup.y;if(dx*dx+dy*dy<38*38)collectPlatformerPowerup(powerup);}
  for(const enemy of platformerEnemies){if(enemy.dead)continue;enemy.x+=enemy.vx*step;if(enemy.x<enemy.min||enemy.x>enemy.max){enemy.vx*=-1;enemy.x=Math.max(enemy.min,Math.min(enemy.max,enemy.x));}const hit=platformer.x+platformer.w>enemy.x&&platformer.x<enemy.x+34&&platformer.y+platformer.h>enemy.y&&platformer.y<enemy.y+34;if(hit){if(platformer.vy>1&&platformer.y+platformer.h<enemy.y+20){enemy.dead=true;platformer.vy=-8;sfx("success");}else{hitPlatformerPlayer(false);if(!platformerRunning)return;}}}
  for(const shot of platformerProjectiles){shot.x+=shot.vx*step;shot.life-=step;for(const enemy of platformerEnemies){if(enemy.dead)continue;if(Math.abs(shot.x-(enemy.x+17))<27&&Math.abs(shot.y-(enemy.y+17))<25){enemy.dead=true;shot.life=0;platformer.coins+=2;sfx("success");break;}}}platformerProjectiles=platformerProjectiles.filter((shot)=>shot.life>0&&shot.x>0&&shot.x<platformer.levelWidth);
  if(platformer.x+platformer.w>platformer.goalX)winPlatformer();platformer.camera=Math.max(0,Math.min(Math.max(0,platformer.levelWidth-960),platformer.x-250));
}

function drawPlatformer(){
  const canvas=elements.platformer_canvas;if(!canvas)return;const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,camera=platformer.camera||0;const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,`hsl(${202+platformer.level*2} 92% 67%)`);sky.addColorStop(.7,"#b7edff");sky.addColorStop(1,"#e9fbff");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ctx.globalAlpha=.65;ctx.fillStyle="#fff";for(let i=0;i<8;i++){const x=((i*330-camera*.16)%1300+1300)%1300-80,y=45+(i%3)*48;ctx.beginPath();ctx.ellipse(x,y,58,20,0,0,Math.PI*2);ctx.ellipse(x+42,y+4,46,16,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  ctx.fillStyle="#7ecb73";ctx.beginPath();ctx.moveTo(0,330);for(let x=0;x<=w;x+=120){const world=x+camera;ctx.lineTo(x,275-Math.sin(world*.004)*42-Math.sin(world*.012)*18);}ctx.lineTo(w,360);ctx.lineTo(0,360);ctx.fill();
  for(const p of platformerPlatforms){const x=p.x-camera;if(x+p.w<0||x>w)continue;ctx.fillStyle="#62412a";ctx.fillRect(x,p.y,p.w,p.h);ctx.fillStyle="#54b948";ctx.fillRect(x,p.y,p.w,9);ctx.fillStyle="#8bd45a";for(let gx=0;gx<p.w;gx+=28)ctx.fillRect(x+gx,p.y-3,15,4);}
  for(const coin of platformerCoins){if(coin.taken)continue;const x=coin.x-camera;if(x<-20||x>w+20)continue;ctx.fillStyle="#ffd92f";ctx.beginPath();ctx.arc(x,coin.y,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#f49b12";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#fff4a6";ctx.fillRect(x-2,coin.y-6,4,12);}
  for(const powerup of platformerPowerups){if(powerup.taken)continue;const x=powerup.x-camera;if(x<-30||x>w+30)continue;if(powerup.type==="pokeball"){ctx.fillStyle="#f2384f";ctx.beginPath();ctx.arc(x,powerup.y,15,Math.PI,0);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x,powerup.y,15,0,Math.PI);ctx.fill();ctx.strokeStyle="#252a33";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-15,powerup.y);ctx.lineTo(x+15,powerup.y);ctx.stroke();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x,powerup.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();}else{ctx.fillStyle="#ff6dc7";for(let petal=0;petal<6;petal++){const angle=petal*Math.PI/3;ctx.beginPath();ctx.ellipse(x+Math.cos(angle)*10,powerup.y+Math.sin(angle)*10,8,5,angle,0,Math.PI*2);ctx.fill();}ctx.fillStyle="#ffe45c";ctx.beginPath();ctx.arc(x,powerup.y,7,0,Math.PI*2);ctx.fill();}}
  for(const enemy of platformerEnemies){if(enemy.dead)continue;const x=enemy.x-camera;if(x<-40||x>w+40)continue;ctx.fillStyle="#7136a8";ctx.beginPath();ctx.roundRect(x,enemy.y,34,34,10);ctx.fill();ctx.fillStyle="#fff";ctx.fillRect(x+7,enemy.y+9,6,7);ctx.fillRect(x+22,enemy.y+9,6,7);ctx.fillStyle="#151018";ctx.fillRect(x+9,enemy.y+11,3,4);ctx.fillRect(x+24,enemy.y+11,3,4);}
  for(const shot of platformerProjectiles){const x=shot.x-camera;if(x<-20||x>w+20)continue;ctx.fillStyle="#ff72d1";ctx.shadowColor="#fff066";ctx.shadowBlur=15;ctx.beginPath();ctx.arc(x,shot.y,8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#fff45e";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-13,shot.y+9);ctx.lineTo(x-3,shot.y-6);ctx.lineTo(x+4,shot.y+2);ctx.lineTo(x+14,shot.y-10);ctx.stroke();}
  const goalX=platformer.goalX-camera;ctx.fillStyle="#e6edf1";ctx.fillRect(goalX,155,7,205);ctx.fillStyle="#ff2d4f";ctx.beginPath();ctx.arc(goalX+4,166,25,Math.PI,0);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(goalX+4,166,25,0,Math.PI);ctx.fill();ctx.fillStyle="#1f2430";ctx.beginPath();ctx.arc(goalX+4,166,7,0,Math.PI*2);ctx.fill();
  if(!(performance.now()<platformer.invulnerableUntil&&Math.floor(performance.now()/90)%2))drawPikachu(ctx,platformer.x-camera,platformer.y,platformer.facing<0);
  ctx.fillStyle="rgba(8,12,20,.8)";ctx.fillRect(14,14,350,42);ctx.fillStyle="#fff";ctx.font="700 16px Arial";ctx.fillText(`⚡ NIVEL ${platformer.level}/12   🪙 ${platformer.coins}   ❤ ${platformer.hearts}`,28,40);ctx.fillStyle="rgba(8,12,20,.72)";ctx.fillRect(w-205,16,190,26);ctx.fillStyle="#fff";ctx.font="700 11px Arial";ctx.fillText(`META ${Math.max(0,Math.round((platformer.goalX-platformer.x)/10))} m`,w-188,33);
  if(platformer.lotus){ctx.fillStyle="rgba(255,77,193,.88)";ctx.fillRect(14,64,190,27);ctx.fillStyle="#fff";ctx.font="800 11px Arial";ctx.fillText("🌸 LOTUS THUNDER · X / E",25,82);}
}

function drawPikachu(ctx,x,y,flip){
  ctx.save();ctx.translate(x+(flip?platformer.w:0),y);ctx.scale(flip?-1:1,1);ctx.fillStyle="#f7d532";ctx.strokeStyle="#5b4612";ctx.lineWidth=2;
  if(platformer.superMode){ctx.save();ctx.globalAlpha=.4;ctx.fillStyle=platformer.lotus?"#ff68cc":"#fff06a";ctx.beginPath();ctx.ellipse(20,24,28,34,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  ctx.beginPath();ctx.moveTo(9,13);ctx.lineTo(5,-18);ctx.lineTo(18,8);ctx.moveTo(31,9);ctx.lineTo(38,-19);ctx.lineTo(35,15);ctx.fill();ctx.stroke();ctx.fillStyle="#27231d";ctx.beginPath();ctx.moveTo(5,-18);ctx.lineTo(9,-5);ctx.lineTo(14,2);ctx.fill();ctx.beginPath();ctx.moveTo(38,-19);ctx.lineTo(37,-4);ctx.lineTo(34,3);ctx.fill();ctx.fillStyle="#f7d532";ctx.beginPath();ctx.roundRect(4,7,34,29,12);ctx.fill();ctx.stroke();ctx.beginPath();ctx.roundRect(9,29,27,18,8);ctx.fill();ctx.stroke();ctx.fillStyle="#1e1d1a";ctx.beginPath();ctx.arc(14,18,2.6,0,Math.PI*2);ctx.arc(29,18,2.6,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ef3e3e";ctx.beginPath();ctx.arc(10,25,4,0,Math.PI*2);ctx.arc(33,25,4,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f7d532";ctx.beginPath();ctx.moveTo(5,31);ctx.lineTo(-9,25);ctx.lineTo(-3,37);ctx.lineTo(-15,44);ctx.lineTo(4,45);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}

function platformerLoop(now){
  if(!platformerRunning){drawPlatformer();return;}const dt=Math.min(32,now-platformer.lastTime||16.7);platformer.lastTime=now;updatePlatformer(dt);drawPlatformer();if(platformerRunning)platformerFrame=requestAnimationFrame(platformerLoop);
}

function setPlatformerControl(key,value){platformerKeys[key]=value;}

function bindPlatformerControls(){
  const touchMap=[[elements.platformer_left,"left"],[elements.platformer_right,"right"],[elements.platformer_jump,"jump"]];touchMap.forEach(([button,key])=>{button.addEventListener("pointerdown",e=>{e.preventDefault();setPlatformerControl(key,true)});if(key!=="jump")["pointerup","pointercancel","pointerleave"].forEach(event=>button.addEventListener(event,()=>setPlatformerControl(key,false)));});
  elements.platformer_power.addEventListener("pointerdown",e=>{e.preventDefault();shootLotus();});
  addEventListener("keydown",e=>{if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName))return;const key=e.key.toLowerCase();if(["arrowleft","a","arrowright","d","arrowup","w"," ","x","e"].includes(key)&&platformerRunning)e.preventDefault();if(key==="arrowleft"||key==="a")platformerKeys.left=true;if(key==="arrowright"||key==="d")platformerKeys.right=true;if(key==="arrowup"||key==="w"||key===" ")platformerKeys.jump=true;if(key==="x"||key==="e")shootLotus();});
  addEventListener("keyup",e=>{const key=e.key.toLowerCase();if(key==="arrowleft"||key==="a")platformerKeys.left=false;if(key==="arrowright"||key==="d")platformerKeys.right=false;});
  elements.platformer_level_select.addEventListener("change",()=>{platformer.level=Math.max(1,Math.min(PIKA_LEVEL_COUNT,Number(elements.platformer_level_select.value)||1));storage.set("pikaSelected",platformer.level);resetPlatformer();sfx("click");});
}

function renderComments() {
  if(!state.comments.length){const p=document.createElement("p");p.className="empty-state";p.textContent="Todavía no hay mensajes guardados en este dispositivo.";elements.comments_list.replaceChildren(p);return;}
  elements.comments_list.replaceChildren(...state.comments.map((comment)=>{const article=document.createElement("article");article.className="comment";const head=document.createElement("div"),name=document.createElement("strong"),time=document.createElement("time"),message=document.createElement("p");head.className="comment-head";name.textContent=comment.name;time.textContent=comment.date;message.textContent=comment.message;head.append(name,time);article.append(head,message);return article;}));
}

function submitComment(event) { event.preventDefault();const data=new FormData(event.currentTarget),name=String(data.get("name")||"").trim(),message=String(data.get("message")||"").trim();if(!name||!message)return;state.comments.unshift({id:randomId(),name:name.slice(0,24),message:message.slice(0,220),date:new Date().toLocaleString("es-ES")});state.comments=state.comments.slice(0,12);storage.set("comments",state.comments);renderComments();event.currentTarget.reset();sfx("success");showToast("Mensaje guardado en este dispositivo"); }
function renderReactions(){document.querySelectorAll("[data-reaction]").forEach((b)=>b.querySelector("span").textContent=String(state.reactions[b.dataset.reaction]||0));}
function addReaction(button){const key=button.dataset.reaction;if(!(key in state.reactions))return;state.reactions[key]++;storage.set("reactions",state.reactions);renderReactions();sfx("coin");burst(button.getBoundingClientRect().left+button.offsetWidth/2,button.getBoundingClientRect().top,8);}

function setTheme(theme){state.theme=theme==="light"?"light":"dark";document.documentElement.dataset.theme=state.theme;elements.theme_button.textContent=state.theme==="dark"?"☀️":"🌙";elements.theme_button.setAttribute("aria-label",state.theme==="dark"?"Activar tema claro":"Activar tema oscuro");storage.set("theme",state.theme);}

async function loadRobloxGameThumbnails(){
  const cards=[...document.querySelectorAll(".experience-card[data-place-id]")];
  if(!cards.length)return;
  const ids=cards.map((card)=>card.dataset.placeId).join(",");
  try{
    const response=await fetch(`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${ids}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`);
    if(!response.ok)return;
    const payload=await response.json();
    const images=new Map((payload.data||[]).filter((item)=>item.imageUrl).map((item)=>[String(item.targetId),item.imageUrl]));
    cards.forEach((card)=>{const image=card.querySelector("img");const url=images.get(card.dataset.placeId);if(image&&url)image.src=url;});
  }catch{
    // La miniatura HTML de Roblox permanece como respaldo si la API no responde.
  }
}

function resetProgress(){if(!confirm("¿Quieres borrar el progreso, comentarios y carrito guardados en este navegador?"))return;storage.clear();location.reload();}

const particles=[];
function resizeCanvas(){const canvas=elements.fx_canvas;if(!canvas)return;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=`${innerWidth}px`;canvas.style.height=`${innerHeight}px`;canvas.getContext("2d").setTransform(dpr,0,0,dpr,0,0);}
function burst(x,y,count=12){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;const colors=["#ff2d78","#8a55ff","#00e5ff","#a6ff45","#ffd54a"];for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=1.8+Math.random()*4;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1,life:1,size:2+Math.random()*4,color:colors[Math.floor(Math.random()*colors.length)]});}}
function animateParticles(){const ctx=elements.fx_canvas?.getContext("2d");if(!ctx)return;ctx.clearRect(0,0,innerWidth,innerHeight);for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.life-=.025;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();if(p.life<=0)particles.splice(i,1);}ctx.globalAlpha=1;requestAnimationFrame(animateParticles);}
function comboPop(x,y,text){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;const node=document.createElement("div");node.className="combo-pop";node.style.left=`${x}px`;node.style.top=`${y}px`;node.textContent=text;document.body.append(node);setTimeout(()=>node.remove(),750);}

function setupVisualEffects(){
  resizeCanvas();addEventListener("resize",resizeCanvas);animateParticles();
  addEventListener("pointermove",(event)=>{if(elements.cursor_glow){elements.cursor_glow.style.left=`${event.clientX}px`;elements.cursor_glow.style.top=`${event.clientY}px`;}});
  document.addEventListener("pointerdown",(event)=>{if(state.sound&&event.target!==elements.sound_button)sfx("click");burst(event.clientX,event.clientY,7);const target=event.target.closest(".fx-button");if(target){const rect=target.getBoundingClientRect(),r=document.createElement("span");r.className="ripple";r.style.left=`${event.clientX-rect.left}px`;r.style.top=`${event.clientY-rect.top}px`;r.style.width=r.style.height=`${Math.max(rect.width,rect.height)/2}px`;target.append(r);setTimeout(()=>r.remove(),600);}});
  document.querySelectorAll("button,a").forEach((item)=>item.addEventListener("pointerenter",()=>sfx("hover")));
  const observer=new IntersectionObserver((entries)=>entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target);}}),{threshold:.08});document.querySelectorAll(".reveal").forEach((node)=>observer.observe(node));
  if(matchMedia("(hover:hover) and (pointer:fine)").matches){document.querySelectorAll(".tilt-card").forEach((card)=>{card.addEventListener("pointermove",(e)=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${-y*4}deg) rotateY(${x*5}deg) translateY(-2px)`;});card.addEventListener("pointerleave",()=>card.style.transform="");});}
}

function bindEvents(){
  elements.menu_button.addEventListener("click",()=>{const open=elements.main_nav.classList.toggle("open");elements.menu_button.textContent=open?"✕":"☰";elements.menu_button.setAttribute("aria-expanded",String(open));});
  elements.main_nav.addEventListener("click",()=>{elements.main_nav.classList.remove("open");elements.menu_button.textContent="☰";elements.menu_button.setAttribute("aria-expanded","false");});
  elements.sound_button.addEventListener("click",()=>setSound(!state.sound));elements.theme_button.addEventListener("click",()=>setTheme(state.theme==="dark"?"light":"dark"));elements.daily_reward_button.addEventListener("click",claimDailyReward);elements.cart_button.addEventListener("click",openCart);elements.overlay.addEventListener("click",closeCart);document.querySelector(".drawer-close").addEventListener("click",closeCart);document.addEventListener("keydown",(e)=>{if(e.key==="Escape")closeCart();});
  elements.trivia_start.addEventListener("click",startTrivia);elements.trivia_stage.addEventListener("click",(e)=>{const b=e.target.closest("[data-answer-index]");if(b)answerTrivia(Number(b.dataset.answerIndex));});elements.platformer_start.addEventListener("click",startPlatformer);bindPlatformerControls();
  elements.products_grid.addEventListener("click",(e)=>{const b=e.target.closest("[data-product-id]");if(b)addToCart(b.dataset.productId);});elements.cart_items.addEventListener("click",(e)=>{const b=e.target.closest("[data-cart-index]");if(b)removeFromCart(Number(b.dataset.cartIndex));});elements.checkout_button.addEventListener("click",()=>showToast("Tienda demo: no se realiza ningún cobro"));
  elements.comment_form.addEventListener("submit",submitComment);document.querySelectorAll("[data-reaction]").forEach((b)=>b.addEventListener("click",()=>addReaction(b)));elements.reset_progress.addEventListener("click",resetProgress);
}

function init(){cacheElements();updateVisitStreak();setTheme(state.theme);setSound(state.sound,false);renderProducts();renderCart();renderComments();renderReactions();renderProgress();setupPlatformerLevels();resetPlatformer();loadRobloxGameThumbnails();elements.current_year.textContent=String(new Date().getFullYear());bindEvents();setupVisualEffects();setTimeout(()=>{elements.sound_hint.classList.add("show");setTimeout(()=>elements.sound_hint.classList.remove("show"),3500);},900);}
document.addEventListener("DOMContentLoaded",init);
