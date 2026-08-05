"use strict";

const STORAGE_PREFIX = "flowgorila_v2_";
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
  completed: { trivia: false, memory: false, reaction: false, ...storage.get("completed", {}) },
  theme: storage.get("theme", "dark"),
  sound: storage.get("sound", true) !== false
};

const products = [
  { id: "gorila-neon", name: "Avatar Gorila Neon", description: "Aspecto digital exclusivo para tu colección demo.", price: 4.99, icon: "🦍" },
  { id: "flow-cap", name: "Gorra Flow", description: "Un drop urbano virtual con el sello FlowGorila.", price: 3.49, icon: "🧢" },
  { id: "arcade-badge", name: "Badge Arcade", description: "Insignia de jugador para presumir de flow.", price: 2.49, icon: "🏆" },
  { id: "neon-pack", name: "Pack Cyber", description: "Combo visual de estética neón y gamer.", price: 5.99, icon: "⚡" }
];

const triviaQuestions = [
  { category: "gaming", difficulty: "facil", question: "¿En qué plataforma se crean experiencias con Roblox Studio?", answers: ["Roblox", "Spotify", "Netflix", "Discord"], correct: 0 },
  { category: "gaming", difficulty: "media", question: "¿Cómo se llama el lenguaje de scripting utilizado en Roblox?", answers: ["Luau", "Ruby", "Swift", "Kotlin"], correct: 0 },
  { category: "gaming", difficulty: "facil", question: "¿Qué compañía creó la saga Super Mario?", answers: ["Nintendo", "Valve", "Rockstar", "Sega"], correct: 0 },
  { category: "gaming", difficulty: "media", question: "¿Qué estudio desarrolla Grand Theft Auto?", answers: ["Rockstar Games", "Mojang", "Bungie", "Capcom"], correct: 0 },
  { category: "cultura", difficulty: "facil", question: "¿Cuál es la capital de Japón?", answers: ["Tokio", "Kioto", "Osaka", "Seúl"], correct: 0 },
  { category: "cultura", difficulty: "media", question: "¿Qué planeta es conocido como el planeta rojo?", answers: ["Marte", "Venus", "Júpiter", "Mercurio"], correct: 0 },
  { category: "cine", difficulty: "facil", question: "¿Cómo se llama el ogro verde protagonista de una famosa saga animada?", answers: ["Shrek", "Hulk", "Groot", "Sulley"], correct: 0 },
  { category: "cine", difficulty: "media", question: "¿Qué película tiene un parque lleno de dinosaurios clonados?", answers: ["Jurassic Park", "Avatar", "Jumanji", "Tron"], correct: 0 },
  { category: "gaming", difficulty: "facil", question: "¿Qué objeto de Minecraft se usa normalmente para fabricar herramientas?", answers: ["Mesa de trabajo", "Cama", "Antorcha", "Cofre"], correct: 0 },
  { category: "cultura", difficulty: "facil", question: "¿Cuántos lados tiene un hexágono?", answers: ["6", "5", "7", "8"], correct: 0 }
];

const elements = {};
let triviaRound = [], triviaIndex = 0, triviaScore = 0;
let memoryFirst = null, memoryLock = false, memoryMoves = 0, memoryPairs = 0;
let reactionStatus = "idle", reactionTimer = null, reactionStart = 0;
let audioContext = null;
let lastFocusedElement = null;

function cacheElements() {
  ["menu-button","main-nav","sound-button","theme-button","cart-button","cart-count","daily-reward-button","level-value","xp-value","coins-value","best-score-value","streak-value","trivia-category","trivia-difficulty","trivia-stage","trivia-start","memory-moves","memory-pairs","memory-grid","memory-reset","reaction-zone","reaction-title","reaction-message","reaction-best","products-grid","comment-form","comments-list","progress-label","progress-fill","missions-list","current-year","reset-progress","overlay","cart-drawer","cart-items","cart-total","checkout-button","toast","sound-hint","cursor-glow","fx-canvas"].forEach((id) => { elements[id.replaceAll("-", "_")] = document.getElementById(id); });
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
  const missions=[{label:"Completa Flow Trivia",done:state.completed.trivia},{label:"Resuelve Memoria",done:state.completed.memory},{label:"Supera Reacción",done:state.completed.reaction}];
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

function startTrivia() {
  const category=elements.trivia_category.value,difficulty=elements.trivia_difficulty.value;
  const filtered=triviaQuestions.filter((q)=>(category==="todas"||q.category===category)&&(difficulty==="todas"||q.difficulty===difficulty));
  triviaRound=shuffle(filtered).slice(0,Math.min(5,filtered.length));triviaIndex=0;triviaScore=0;elements.trivia_start.disabled=true;sfx("go");renderTriviaQuestion();
}

function renderTriviaQuestion() {
  const question=triviaRound[triviaIndex];if(!question){finishTrivia();return;}
  const wrap=document.createElement("div"),progress=document.createElement("div"),title=document.createElement("h4"),answers=document.createElement("div");progress.className="trivia-progress";progress.innerHTML=`<span>Pregunta ${triviaIndex+1}/${triviaRound.length}</span><span>${triviaScore} aciertos</span>`;title.className="trivia-question";title.textContent=question.question;answers.className="answer-list";
  question.answers.forEach((answer,index)=>{const button=document.createElement("button");button.type="button";button.className="answer-button";button.dataset.answerIndex=String(index);button.textContent=answer;answers.append(button);});wrap.append(progress,title,answers);elements.trivia_stage.replaceChildren(wrap);
}

function answerTrivia(index) {
  const q=triviaRound[triviaIndex];if(!q)return;const buttons=[...elements.trivia_stage.querySelectorAll(".answer-button")];buttons.forEach((b)=>b.disabled=true);buttons[q.correct]?.classList.add("correct");
  if(index===q.correct){triviaScore++;sfx("success");}else{buttons[index]?.classList.add("wrong");sfx("wrong");}
  setTimeout(()=>{triviaIndex++;renderTriviaQuestion();},720);
}

function finishTrivia() { state.bestScore=Math.max(state.bestScore,triviaScore);state.completed.trivia=true;storage.set("bestScore",state.bestScore);storage.set("completed",state.completed);elements.trivia_stage.innerHTML=`<div class="game-placeholder"><strong>Partida terminada</strong><p>${triviaScore} de ${triviaRound.length} correctas.</p></div>`;elements.trivia_start.disabled=false;elements.trivia_start.textContent="Jugar otra ronda";award(20,Math.max(5,triviaScore*3),"Flow Trivia completado"); }

function setupMemory() {
  const icons=["🎮","🦍","⚡","🏆","👾","🔥"],deck=shuffle([...icons,...icons]);memoryFirst=null;memoryLock=false;memoryMoves=0;memoryPairs=0;elements.memory_moves.textContent="0";elements.memory_pairs.textContent="0/6";
  elements.memory_grid.replaceChildren(...deck.map((icon,index)=>{const b=document.createElement("button");b.type="button";b.className="memory-tile";b.dataset.icon=icon;b.dataset.id=String(index);b.setAttribute("aria-label","Carta oculta");b.textContent=icon;return b;}));
}

function selectMemory(tile) {
  if(memoryLock||tile.classList.contains("matched")||tile===memoryFirst)return;tile.classList.add("revealed");sfx("flip");
  if(!memoryFirst){memoryFirst=tile;return;}memoryMoves++;elements.memory_moves.textContent=String(memoryMoves);const second=tile;
  if(memoryFirst.dataset.icon===second.dataset.icon){memoryFirst.classList.add("matched");second.classList.add("matched");memoryFirst=null;memoryPairs++;elements.memory_pairs.textContent=`${memoryPairs}/6`;sfx("success");if(memoryPairs===6){state.completed.memory=true;storage.set("completed",state.completed);award(15,Math.max(5,30-memoryMoves),"Memoria completada");}return;}
  memoryLock=true;const first=memoryFirst;sfx("wrong");setTimeout(()=>{first.classList.remove("revealed");second.classList.remove("revealed");memoryFirst=null;memoryLock=false;},650);
}

function handleReaction() {
  if(reactionStatus==="idle"||reactionStatus==="finished"){reactionStatus="waiting";elements.reaction_zone.className="reaction-zone ready";elements.reaction_title.textContent="Espera...";elements.reaction_message.textContent="No pulses hasta que se ponga verde.";reactionTimer=setTimeout(()=>{reactionStatus="go";reactionStart=performance.now();elements.reaction_zone.className="reaction-zone go";elements.reaction_title.textContent="¡AHORA!";elements.reaction_message.textContent="Pulsa lo más rápido posible.";sfx("go");},1500+Math.random()*2400);return;}
  if(reactionStatus==="waiting"){clearTimeout(reactionTimer);reactionStatus="finished";elements.reaction_zone.className="reaction-zone waiting";elements.reaction_title.textContent="Demasiado pronto";elements.reaction_message.textContent="Pulsa para intentarlo otra vez.";sfx("wrong");return;}
  if(reactionStatus==="go"){const result=Math.round(performance.now()-reactionStart),saved=storage.get("reactionBest",null),best=saved===null?result:Math.min(saved,result);storage.set("reactionBest",best);elements.reaction_best.textContent=`${best} ms`;reactionStatus="finished";elements.reaction_zone.className="reaction-zone waiting";elements.reaction_title.textContent=`${result} ms`;elements.reaction_message.textContent=result<250?"¡Reflejos increíbles!":"Buen intento. Pulsa para repetir.";state.completed.reaction=true;storage.set("completed",state.completed);award(10,result<300?10:5,"Reto de reacción completado");}
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
  elements.trivia_start.addEventListener("click",startTrivia);elements.trivia_stage.addEventListener("click",(e)=>{const b=e.target.closest("[data-answer-index]");if(b)answerTrivia(Number(b.dataset.answerIndex));});elements.memory_grid.addEventListener("click",(e)=>{const b=e.target.closest(".memory-tile");if(b)selectMemory(b);});elements.memory_reset.addEventListener("click",()=>{setupMemory();sfx("go");});elements.reaction_zone.addEventListener("click",handleReaction);
  elements.products_grid.addEventListener("click",(e)=>{const b=e.target.closest("[data-product-id]");if(b)addToCart(b.dataset.productId);});elements.cart_items.addEventListener("click",(e)=>{const b=e.target.closest("[data-cart-index]");if(b)removeFromCart(Number(b.dataset.cartIndex));});elements.checkout_button.addEventListener("click",()=>showToast("Tienda demo: no se realiza ningún cobro"));
  elements.comment_form.addEventListener("submit",submitComment);document.querySelectorAll("[data-reaction]").forEach((b)=>b.addEventListener("click",()=>addReaction(b)));elements.reset_progress.addEventListener("click",resetProgress);
}

function init(){cacheElements();updateVisitStreak();setTheme(state.theme);setSound(state.sound,false);renderProducts();renderCart();renderComments();renderReactions();renderProgress();setupMemory();loadRobloxGameThumbnails();const best=storage.get("reactionBest",null);elements.reaction_best.textContent=best===null?"—":`${best} ms`;elements.current_year.textContent=String(new Date().getFullYear());bindEvents();setupVisualEffects();setTimeout(()=>{elements.sound_hint.classList.add("show");setTimeout(()=>elements.sound_hint.classList.remove("show"),3500);},900);}
document.addEventListener("DOMContentLoaded",init);
