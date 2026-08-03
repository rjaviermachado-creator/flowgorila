
const Community = {
  init(){
    this.comments=Store.get("fg_comments",[]);
    this.reactions=Store.get("fg_reactions",{"❤️":12,"🔥":8,"🎮":15,"⭐":7});
    this.poll=Store.get("fg_poll",{gaming:0,coleccion:0,tienda:0});
    this.renderComments(); this.renderReactions(); this.renderPoll();
    document.querySelector("#comment-form").addEventListener("submit",e=>{
      e.preventDefault();
      const name=document.querySelector("#comment-name").value.trim();
      const text=document.querySelector("#comment-text").value.trim();
      if(!name||!text)return;
      this.comments.push({id:Date.now(),name,text,date:new Date().toLocaleString("es-ES")});
      Store.set("fg_comments",this.comments); e.target.reset(); this.renderComments();
      Store.pushNotification("Tu comentario se publicó en este navegador."); App.toast("Comentario publicado");
    });
    document.querySelectorAll("[data-poll]").forEach(btn=>btn.onclick=()=>{
      this.poll[btn.dataset.poll]++; Store.set("fg_poll",this.poll); this.renderPoll(); App.toast("Voto guardado");
    });
  },
  escape(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))},
  renderComments(){
    const box=document.querySelector("#comments-list");
    box.innerHTML=this.comments.length?this.comments.slice().reverse().map(c=>`<article class="comment"><header><b>${this.escape(c.name)}</b><small>${c.date}</small></header><p>${this.escape(c.text)}</p></article>`).join(""):`<p>No hay comentarios todavía.</p>`;
    document.querySelector("#stat-comments").textContent=this.comments.length;
  },
  renderReactions(){
    const bar=document.querySelector("#reaction-bar");
    bar.innerHTML=Object.entries(this.reactions).map(([e,n])=>`<button data-react="${e}">${e} <span>${n}</span></button>`).join("");
    bar.querySelectorAll("button").forEach(b=>b.onclick=()=>{this.reactions[b.dataset.react]++;Store.set("fg_reactions",this.reactions);this.renderReactions()});
  },
  renderPoll(){document.querySelectorAll("[data-poll]").forEach(b=>b.querySelector("span").textContent=this.poll[b.dataset.poll]||0)}
};
