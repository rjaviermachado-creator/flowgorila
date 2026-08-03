
const Games = {
  init(){this.renderTriviaStart();this.renderMystery();this.renderRushStart();this.renderRanking()},
  addScore(game,score){
    const profile=Auth.profile();
    const scores=Store.get("fg_scores",[]);
    scores.push({name:profile?.name||"Invitado",game,score,date:new Date().toLocaleDateString("es-ES")});
    Store.set("fg_scores",scores);this.renderRanking();
  },
  renderTriviaStart(){
    document.querySelector("#trivia-game").innerHTML=`<p>Responde 5 preguntas.</p><button class="btn yellow" id="start-trivia">Comenzar</button>`;
    document.querySelector("#start-trivia").onclick=()=>this.startTrivia();
  },
  startTrivia(){
    this.tSet=[...FLOW_DATA.trivia].sort(()=>Math.random()-.5).slice(0,5);this.tIndex=0;this.tScore=0;this.showTrivia();
  },
  showTrivia(){
    const box=document.querySelector("#trivia-game");
    if(this.tIndex>=this.tSet.length){box.innerHTML=`<h3>Resultado: ${this.tScore}/50</h3><button class="btn yellow" id="again-trivia">Jugar otra vez</button>`;this.addScore("Trivia",this.tScore);document.querySelector("#again-trivia").onclick=()=>this.startTrivia();return}
    const q=this.tSet[this.tIndex];
    box.innerHTML=`<b>Pregunta ${this.tIndex+1}/5 · ${this.tScore} puntos</b><h4>${q.q}</h4><div class="answer-list">${q.a.map((a,i)=>`<button data-a="${i}">${a}</button>`).join("")}</div>`;
    box.querySelectorAll("[data-a]").forEach(btn=>btn.onclick=()=>{
      box.querySelectorAll("[data-a]").forEach((b,i)=>{b.disabled=true;if(i===q.c)b.classList.add("correct")});
      if(Number(btn.dataset.a)===q.c)this.tScore+=10;else btn.classList.add("wrong");
      setTimeout(()=>{this.tIndex++;this.showTrivia()},750);
    });
  },
  renderMystery(){
    document.querySelector("#mystery-game").innerHTML=`<div class="mystery-icon">🎁</div><p id="mystery-text">¿Qué habrá dentro?</p><button class="btn secondary" id="open-mystery">Abrir caja</button>`;
    document.querySelector("#open-mystery").onclick=()=>{
      const rewards=["⭐ Insignia Estrella","💎 50 monedas virtuales","🎨 Fondo pastel","🔥 Título especial","👑 Marco dorado","🎁 Premio sorpresa"];
      const reward=rewards[Math.floor(Math.random()*rewards.length)];
      document.querySelector(".mystery-icon").textContent="🎉";document.querySelector("#mystery-text").textContent=`Has conseguido: ${reward}`;
      const ach=Store.get("fg_achievements",[]);if(!ach.includes(reward))ach.push(reward);Store.set("fg_achievements",ach);Store.pushNotification(`Caja abierta: ${reward}`);
    };
  },
  renderRushStart(){
    document.querySelector("#rush-game").innerHTML=`<p>20 segundos.</p><button class="btn primary" id="start-rush">Comenzar</button>`;
    document.querySelector("#start-rush").onclick=()=>this.startRush();
  },
  startRush(){
    this.rScore=0;this.rTime=20;this.rActive=true;this.drawRush();
    this.rTimer=setInterval(()=>{this.rTime--;this.drawRushHeader();if(this.rTime<=0){clearInterval(this.rTimer);this.rActive=false;document.querySelector("#rush-game").innerHTML=`<h3>Resultado: ${this.rScore}</h3><button class="btn primary" id="again-rush">Jugar otra vez</button>`;this.addScore("Color Rush",this.rScore);document.querySelector("#again-rush").onclick=()=>this.startRush()}},1000);
  },
  drawRushHeader(){const h=document.querySelector("#rush-status");if(h)h.textContent=`Puntos: ${this.rScore} · Tiempo: ${this.rTime}`},
  drawRush(){
    const colors=[["ROJO","#ff4138"],["AZUL","#2789ff"],["AMARILLO","#ffd62d"],["VERDE","#1fbf7b"],["ROSA","#ff347e"],["MORADO","#7d48ff"]].sort(()=>Math.random()-.5);
    this.target=colors[Math.floor(Math.random()*colors.length)][0];
    document.querySelector("#rush-game").innerHTML=`<b id="rush-status">Puntos: ${this.rScore} · Tiempo: ${this.rTime}</b><p>Pulsa: <strong>${this.target}</strong></p><div class="rush-grid">${colors.map(c=>`<button data-color="${c[0]}" style="background:${c[1]}"></button>`).join("")}</div>`;
    document.querySelectorAll("[data-color]").forEach(b=>b.onclick=()=>{if(!this.rActive)return;if(b.dataset.color===this.target)this.rScore++;else this.rScore=Math.max(0,this.rScore-1);this.drawRush()});
  },
  renderRanking(){
    const scores=Store.get("fg_scores",[]).sort((a,b)=>b.score-a.score).slice(0,8);
    document.querySelector("#ranking-list").innerHTML=scores.length?scores.map((s,i)=>`<div class="ranking-row"><span>${i+1}. ${s.name} · ${s.game}</span><b>${s.score}</b></div>`).join(""):"<p>Aún no hay puntuaciones.</p>";
  }
};
