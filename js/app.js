
const App = {
  init(){
    this.posts=Store.get("fg_posts",FLOW_DATA.posts);
    this.products=Store.get("fg_products",FLOW_DATA.products);
    this.cart=Store.get("fg_cart",[]);
    this.favorites=Store.get("fg_favorites",[]);
    this.currentPostFilter="all";
    this.renderPosts();this.renderProducts();this.renderCart();this.renderNotifications();this.bindUI();this.renderProfile("favorites");
    Community.init();Auth.init();Games.init();
    document.querySelector("#year").textContent=new Date().getFullYear();
    document.querySelector("#stat-posts").textContent=this.posts.length;
  },
  toast(text){const t=document.querySelector("#toast");t.textContent=text;t.classList.add("show");clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>t.classList.remove("show"),2200)},
  bindUI(){
    document.querySelector("#cart-btn").onclick=()=>this.openDrawer("#cart-drawer");
    document.querySelector("#notifications-btn").onclick=()=>this.openDrawer("#notifications-drawer");
    document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>this.closeDrawers());
    document.querySelector("#drawer-overlay").onclick=()=>this.closeDrawers();
    document.querySelectorAll("#post-filters button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#post-filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");this.currentPostFilter=b.dataset.filter;this.renderPosts()});
    document.querySelector("#product-search").oninput=()=>this.renderProducts();
    document.querySelector("#product-category").onchange=()=>this.renderProducts();
    document.querySelectorAll(".profile-tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".profile-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");this.renderProfile(b.dataset.tab)});
    document.querySelector("#checkout-btn").onclick=()=>this.toast("El pago real se conectará en una fase posterior");
  },
  openDrawer(sel){document.querySelector(sel).classList.add("open");document.querySelector("#drawer-overlay").classList.remove("hidden")},
  closeDrawers(){document.querySelectorAll(".drawer").forEach(d=>d.classList.remove("open"));document.querySelector("#drawer-overlay").classList.add("hidden")},
  renderPosts(){
    const list=this.currentPostFilter==="all"?this.posts:this.posts.filter(p=>p.category===this.currentPostFilter);
    document.querySelector("#posts-grid").innerHTML=list.map(p=>`<article class="post-card"><div class="post-visual">${p.icon}</div><div class="post-body"><small>${p.category.toUpperCase()}</small><h3>${p.title}</h3><p>${p.description}</p><div class="post-meta"><button class="like-btn" data-like="${p.id}">❤️ ${p.likes}</button><button class="favorite-btn" data-fav="post:${p.id}">${this.favorites.includes("post:"+p.id)?"★":"☆"} Guardar</button></div></div></article>`).join("");
    document.querySelectorAll("[data-like]").forEach(b=>b.onclick=()=>{const p=this.posts.find(x=>x.id===b.dataset.like);p.likes++;Store.set("fg_posts",this.posts);this.renderPosts()});
    document.querySelectorAll("[data-fav]").forEach(b=>b.onclick=()=>this.toggleFavorite(b.dataset.fav));
  },
  renderProducts(){
    const q=document.querySelector("#product-search").value.toLowerCase(),cat=document.querySelector("#product-category").value;
    const list=this.products.filter(p=>p.name.toLowerCase().includes(q)&&(cat==="all"||p.category===cat));
    document.querySelector("#products-grid").innerHTML=list.map(p=>`<article class="product-card"><div class="product-visual">${p.icon}</div><div class="product-body"><small>${p.category.toUpperCase()}</small><h3>${p.name}</h3><p>${p.description}</p><div class="product-foot"><b>${p.price.toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</b><button class="favorite-btn" data-fav="product:${p.id}">${this.favorites.includes("product:"+p.id)?"★":"☆"}</button><button class="add-btn" data-add="${p.id}">Añadir</button></div></div></article>`).join("");
    document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>this.addCart(b.dataset.add));
    document.querySelectorAll("[data-fav]").forEach(b=>b.onclick=()=>this.toggleFavorite(b.dataset.fav));
  },
  addCart(id){const p=this.products.find(x=>x.id===id);this.cart.push(p);Store.set("fg_cart",this.cart);this.renderCart();this.toast("Producto añadido")},
  renderCart(){
    document.querySelector("#cart-count").textContent=this.cart.length;
    const box=document.querySelector("#cart-items");
    box.innerHTML=this.cart.length?this.cart.map((p,i)=>`<div class="cart-row"><span>${p.icon} ${p.name}</span><button data-remove="${i}">✕</button></div>`).join(""):"<p>Tu carrito está vacío.</p>";
    document.querySelector("#cart-total").textContent=this.cart.reduce((s,p)=>s+p.price,0).toLocaleString("es-ES",{style:"currency",currency:"EUR"});
    box.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{this.cart.splice(Number(b.dataset.remove),1);Store.set("fg_cart",this.cart);this.renderCart()});
  },
  toggleFavorite(key){const i=this.favorites.indexOf(key);if(i>=0)this.favorites.splice(i,1);else this.favorites.push(key);Store.set("fg_favorites",this.favorites);this.renderPosts();this.renderProducts();this.renderProfile("favorites")},
  renderNotifications(){
    const list=Store.get("fg_notifications",[]);document.querySelector("#notifications-count").textContent=list.filter(n=>!n.read).length;
    document.querySelector("#notifications-list").innerHTML=list.length?list.map(n=>`<div class="notification"><div><b>${n.text}</b><small>${n.date}</small></div></div>`).join(""):"<p>No hay notificaciones.</p>";
  },
  renderProfile(tab){
    const box=document.querySelector("#profile-content");
    if(tab==="favorites"){
      const items=this.favorites.map(key=>{const [type,id]=key.split(":");const obj=type==="post"?this.posts.find(x=>x.id===id):this.products.find(x=>x.id===id);return obj?`<div class="favorite-item">${obj.icon||"⭐"} <b>${obj.title||obj.name}</b></div>`:""}).join("");
      box.innerHTML=`<div class="favorite-grid">${items||"<p>No tienes favoritos todavía.</p>"}</div>`;
    }else if(tab==="achievements"){
      const ach=Store.get("fg_achievements",[]);box.innerHTML=ach.length?ach.map(a=>`<div class="achievement">${a}</div>`).join(""):"<p>Aún no has desbloqueado logros.</p>";
    }else{
      const scores=Store.get("fg_scores",[]);box.innerHTML=scores.length?scores.slice().reverse().map(s=>`<div class="achievement">🎮 ${s.game}: ${s.score} puntos · ${s.date}</div>`).join(""):"<p>No hay actividad de juego.</p>";
    }
  }
};
document.addEventListener("DOMContentLoaded",()=>App.init());
