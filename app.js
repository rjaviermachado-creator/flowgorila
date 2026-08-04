"use strict";

const STORAGE_PREFIX = "flowgorila_v2_";

const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(STORAGE_PREFIX + key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      // La web sigue funcionando aunque el navegador bloquee el almacenamiento.
    }
  },
  clear() {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // No hay nada más que hacer si el navegador bloquea localStorage.
    }
  }
};

const products = [
  { id: "avatar-neon", icon: "🦍", name: "Avatar Gorila Neón", description: "Aspecto digital para tu colección local.", price: 2.99 },
  { id: "badge-founder", icon: "🏆", name: "Insignia Fundador", description: "Insignia de demostración para el perfil.", price: 1.49 },
  { id: "theme-arcade", icon: "👾", name: "Tema Arcade", description: "Pack visual inspirado en las recreativas.", price: 3.49 },
  { id: "coin-pack", icon: "🪙", name: "Pack 500 monedas", description: "Producto ficticio: no añade monedas reales.", price: 4.99 }
];

const triviaQuestions = [
  { category: "cultura", difficulty: "facil", question: "¿Cuál es la capital de Japón?", answers: ["Seúl", "Tokio", "Pekín", "Bangkok"], correct: 1 },
  { category: "cultura", difficulty: "media", question: "¿Qué océano es el más grande?", answers: ["Atlántico", "Índico", "Pacífico", "Ártico"], correct: 2 },
  { category: "cultura", difficulty: "facil", question: "¿Cuántos lados tiene un hexágono?", answers: ["5", "6", "7", "8"], correct: 1 },
  { category: "cultura", difficulty: "media", question: "¿Qué elemento químico tiene el símbolo Fe?", answers: ["Flúor", "Hierro", "Fósforo", "Francio"], correct: 1 },
  { category: "gaming", difficulty: "facil", question: "¿Qué personaje azul corre a gran velocidad?", answers: ["Kirby", "Sonic", "Link", "Mario"], correct: 1 },
  { category: "gaming", difficulty: "media", question: "¿En qué saga aparece Master Chief?", answers: ["Halo", "Metroid", "Doom", "Gears"], correct: 0 },
  { category: "gaming", difficulty: "facil", question: "¿Qué juego usa bloques que caen para formar líneas?", answers: ["Pong", "Tetris", "Pac-Man", "Asteroids"], correct: 1 },
  { category: "gaming", difficulty: "media", question: "¿Qué empresa creó la saga The Legend of Zelda?", answers: ["Sega", "Nintendo", "Capcom", "Valve"], correct: 1 },
  { category: "cine", difficulty: "facil", question: "¿Cómo se llama una película que continúa otra?", answers: ["Prólogo", "Secuela", "Cameo", "Piloto"], correct: 1 },
  { category: "cine", difficulty: "media", question: "¿Qué profesional ordena y une las escenas grabadas?", answers: ["Montador", "Actor", "Doblador", "Compositor"], correct: 0 },
  { category: "cine", difficulty: "facil", question: "¿Qué premio reconoce al cine español?", answers: ["Grammy", "Goya", "Emmy", "Tony"], correct: 1 },
  { category: "cine", difficulty: "media", question: "¿Qué es un cameo?", answers: ["Una aparición breve", "Un error de rodaje", "Un decorado", "Una canción"], correct: 0 },
  { category: "musica", difficulty: "facil", question: "¿Cuántas teclas tiene normalmente un piano moderno?", answers: ["61", "72", "88", "100"], correct: 2 },
  { category: "musica", difficulty: "media", question: "¿Qué voz masculina suele ser la más aguda?", answers: ["Bajo", "Barítono", "Tenor", "Contrabajo"], correct: 2 },
  { category: "musica", difficulty: "facil", question: "¿Qué instrumento tiene normalmente seis cuerdas?", answers: ["Guitarra", "Violín", "Flauta", "Trompeta"], correct: 0 },
  { category: "musica", difficulty: "media", question: "¿Qué término musical suele indicar una velocidad rápida?", answers: ["Adagio", "Largo", "Allegro", "Grave"], correct: 2 }
];

const state = {
  xp: storage.get("xp", 0),
  coins: storage.get("coins", 0),
  bestScore: storage.get("bestScore", 0),
  streak: storage.get("streak", 0),
  lastVisit: storage.get("lastVisit", ""),
  dailyClaim: storage.get("dailyClaim", ""),
  cart: storage.get("cart", []),
  notifications: storage.get("notifications", []),
  comments: storage.get("comments", []),
  reactions: storage.get("reactions", { "🔥": 0, "💜": 0, "🎮": 0 }),
  completed: storage.get("completed", { trivia: false, memory: false, reaction: false }),
  theme: storage.get("theme", "light")
};

const elements = {};
let toastTimer;
let lastFocusedElement = null;
let reactionTimer = null;
let reactionStart = 0;
let reactionStatus = "idle";
let memoryLock = false;
let memoryFirst = null;
let memoryMoves = 0;
let memoryPairs = 0;
let triviaRound = [];
let triviaIndex = 0;
let triviaScore = 0;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function money(value) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function addNotification(text) {
  state.notifications.unshift({ id: randomId(), text, date: new Date().toLocaleString("es-ES") });
  state.notifications = state.notifications.slice(0, 20);
  storage.set("notifications", state.notifications);
  renderNotifications();
}

function award(xp, coins, message) {
  state.xp += xp;
  state.coins += coins;
  storage.set("xp", state.xp);
  storage.set("coins", state.coins);
  renderProgress();
  addNotification(`${message}: +${xp} XP y +${coins} monedas`);
  showToast(`+${xp} XP · +${coins} monedas`);
}

function updateVisitStreak() {
  const today = localDateKey();
  if (state.lastVisit === today) return;
  state.streak = state.lastVisit === yesterdayKey() ? state.streak + 1 : 1;
  state.lastVisit = today;
  storage.set("streak", state.streak);
  storage.set("lastVisit", state.lastVisit);
}

function renderProgress() {
  const level = Math.floor(state.xp / 100) + 1;
  const progress = state.xp % 100;
  elements.levelValue.textContent = String(level);
  elements.xpValue.textContent = `${state.xp} XP`;
  elements.coinsValue.textContent = String(state.coins);
  elements.bestScoreValue.textContent = String(state.bestScore);
  elements.streakValue.textContent = String(state.streak);
  elements.progressLabel.textContent = `${progress}/100 XP`;
  elements.progressFill.style.width = `${progress}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(progress));

  const missions = [
    { text: "Completa una partida de Flow Trivia", done: state.completed.trivia },
    { text: "Resuelve el tablero de memoria", done: state.completed.memory },
    { text: "Registra un tiempo de reacción", done: state.completed.reaction },
    { text: "Alcanza una racha de 3 días", done: state.streak >= 3 },
    { text: "Consigue 100 XP", done: state.xp >= 100 },
    { text: "Añade un artículo al carrito", done: state.cart.length > 0 }
  ];

  elements.missionsList.replaceChildren(...missions.map((mission) => {
    const item = document.createElement("div");
    item.className = `mission${mission.done ? " done" : ""}`;
    item.textContent = `${mission.done ? "✅" : "⬜"} ${mission.text}`;
    return item;
  }));
}

function claimDailyReward() {
  const today = localDateKey();
  if (state.dailyClaim === today) {
    showToast("La recompensa de hoy ya está abierta");
    return;
  }
  const reward = 20 + Math.floor(Math.random() * 31);
  state.dailyClaim = today;
  storage.set("dailyClaim", today);
  award(10, reward, "Recompensa diaria");
}

function renderProducts() {
  elements.productsGrid.replaceChildren(...products.map((product) => {
    const article = document.createElement("article");
    article.className = "product-card";
    article.innerHTML = `<div class="product-visual" aria-hidden="true">${product.icon}</div><div class="product-copy"><h3></h3><p></p><div class="product-footer"><strong>${money(product.price)}</strong><button type="button" data-product-id="${product.id}">Añadir</button></div></div>`;
    article.querySelector("h3").textContent = product.name;
    article.querySelector("p").textContent = product.description;
    return article;
  }));
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  state.cart.push(productId);
  storage.set("cart", state.cart);
  renderCart();
  renderProgress();
  showToast(`${product.name} añadido`);
}

function removeFromCart(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.cart.length) return;
  state.cart.splice(index, 1);
  storage.set("cart", state.cart);
  renderCart();
  renderProgress();
}

function renderCart() {
  elements.cartCount.textContent = String(state.cart.length);
  const rows = state.cart.map((productId, index) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return null;
    const row = document.createElement("div");
    row.className = "drawer-row";
    const content = document.createElement("div");
    const name = document.createElement("p");
    const price = document.createElement("small");
    name.textContent = `${product.icon} ${product.name}`;
    price.textContent = money(product.price);
    content.append(name, price);
    const remove = document.createElement("button");
    remove.className = "remove-button";
    remove.type = "button";
    remove.dataset.cartIndex = String(index);
    remove.setAttribute("aria-label", `Quitar ${product.name}`);
    remove.textContent = "Quitar";
    row.append(content, remove);
    return row;
  }).filter(Boolean);

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "El carrito está vacío.";
    elements.cartItems.replaceChildren(empty);
  } else {
    elements.cartItems.replaceChildren(...rows);
  }

  const total = state.cart.reduce((sum, productId) => sum + (products.find((item) => item.id === productId)?.price ?? 0), 0);
  elements.cartTotal.textContent = money(total);
}

function renderNotifications() {
  elements.notificationCount.textContent = String(state.notifications.length);
  if (state.notifications.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No tienes notificaciones.";
    elements.notificationItems.replaceChildren(empty);
    return;
  }

  elements.notificationItems.replaceChildren(...state.notifications.map((notification) => {
    const row = document.createElement("div");
    row.className = "drawer-row";
    const content = document.createElement("div");
    const text = document.createElement("p");
    const date = document.createElement("small");
    text.textContent = notification.text;
    date.textContent = notification.date;
    content.append(text, date);
    row.append(content);
    return row;
  }));
}

function openDrawer(drawer) {
  closeDrawers(false);
  lastFocusedElement = document.activeElement;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  elements.overlay.hidden = false;
  drawer.querySelector("button")?.focus();
}

function closeDrawers(restoreFocus = true) {
  document.querySelectorAll(".drawer").forEach((drawer) => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  });
  elements.overlay.hidden = true;
  if (restoreFocus && lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

function startTrivia() {
  const category = elements.triviaCategory.value;
  const difficulty = elements.triviaDifficulty.value;
  const filtered = triviaQuestions.filter((item) =>
    (category === "todas" || item.category === category) &&
    (difficulty === "todas" || item.difficulty === difficulty)
  );
  triviaRound = shuffle(filtered).slice(0, Math.min(5, filtered.length));
  triviaIndex = 0;
  triviaScore = 0;
  elements.triviaStart.disabled = true;
  renderTriviaQuestion();
}

function renderTriviaQuestion() {
  const question = triviaRound[triviaIndex];
  if (!question) {
    finishTrivia();
    return;
  }

  const wrapper = document.createElement("div");
  const progress = document.createElement("div");
  progress.className = "trivia-progress";
  progress.innerHTML = `<span>Pregunta ${triviaIndex + 1}/${triviaRound.length}</span><span>${triviaScore} aciertos</span>`;
  const title = document.createElement("h4");
  title.className = "trivia-question";
  title.textContent = question.question;
  const answers = document.createElement("div");
  answers.className = "answer-list";

  question.answers.forEach((answer, answerIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.dataset.answerIndex = String(answerIndex);
    button.textContent = answer;
    answers.append(button);
  });

  wrapper.append(progress, title, answers);
  elements.triviaStage.replaceChildren(wrapper);
}

function answerTrivia(answerIndex) {
  const question = triviaRound[triviaIndex];
  if (!question) return;
  const buttons = [...elements.triviaStage.querySelectorAll(".answer-button")];
  buttons.forEach((button) => { button.disabled = true; });
  const selected = buttons[answerIndex];
  const correct = buttons[question.correct];
  correct?.classList.add("correct");
  if (answerIndex === question.correct) triviaScore += 1;
  else selected?.classList.add("wrong");

  window.setTimeout(() => {
    triviaIndex += 1;
    renderTriviaQuestion();
  }, 700);
}

function finishTrivia() {
  state.bestScore = Math.max(state.bestScore, triviaScore);
  state.completed.trivia = true;
  storage.set("bestScore", state.bestScore);
  storage.set("completed", state.completed);
  elements.triviaStage.innerHTML = `<div class="game-placeholder"><strong>Partida terminada</strong><p>${triviaScore} de ${triviaRound.length} respuestas correctas.</p></div>`;
  elements.triviaStart.disabled = false;
  elements.triviaStart.textContent = "Jugar otra ronda";
  award(20, Math.max(5, triviaScore * 3), "Flow Trivia completado");
}

function setupMemory() {
  const icons = ["🎮", "🦍", "⚡", "🏆", "👾", "🔥"];
  const deck = shuffle([...icons, ...icons]).map((icon, index) => ({ id: index, icon }));
  memoryLock = false;
  memoryFirst = null;
  memoryMoves = 0;
  memoryPairs = 0;
  elements.memoryMoves.textContent = "0";
  elements.memoryPairs.textContent = "0/6";
  elements.memoryGrid.replaceChildren(...deck.map((tile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-tile";
    button.dataset.memoryIcon = tile.icon;
    button.dataset.memoryId = String(tile.id);
    button.setAttribute("aria-label", "Carta oculta");
    button.textContent = tile.icon;
    return button;
  }));
}

function selectMemoryTile(tile) {
  if (memoryLock || tile.classList.contains("matched") || tile === memoryFirst) return;
  tile.classList.add("revealed");
  tile.setAttribute("aria-label", `Carta ${tile.dataset.memoryIcon}`);
  if (!memoryFirst) {
    memoryFirst = tile;
    return;
  }

  memoryMoves += 1;
  elements.memoryMoves.textContent = String(memoryMoves);
  const second = tile;
  if (memoryFirst.dataset.memoryIcon === second.dataset.memoryIcon) {
    memoryFirst.classList.add("matched");
    second.classList.add("matched");
    memoryFirst = null;
    memoryPairs += 1;
    elements.memoryPairs.textContent = `${memoryPairs}/6`;
    if (memoryPairs === 6) {
      state.completed.memory = true;
      storage.set("completed", state.completed);
      award(15, Math.max(5, 30 - memoryMoves), "Memoria completada");
    }
    return;
  }

  memoryLock = true;
  const first = memoryFirst;
  window.setTimeout(() => {
    first.classList.remove("revealed");
    second.classList.remove("revealed");
    first.setAttribute("aria-label", "Carta oculta");
    second.setAttribute("aria-label", "Carta oculta");
    memoryFirst = null;
    memoryLock = false;
  }, 650);
}

function handleReaction() {
  if (reactionStatus === "idle" || reactionStatus === "finished") {
    reactionStatus = "waiting";
    elements.reactionZone.className = "reaction-zone ready";
    elements.reactionTitle.textContent = "Espera...";
    elements.reactionMessage.textContent = "No pulses hasta que se ponga verde.";
    const delay = 1500 + Math.random() * 2500;
    reactionTimer = window.setTimeout(() => {
      reactionStatus = "go";
      reactionStart = performance.now();
      elements.reactionZone.className = "reaction-zone go";
      elements.reactionTitle.textContent = "¡AHORA!";
      elements.reactionMessage.textContent = "Pulsa lo más rápido posible.";
    }, delay);
    return;
  }

  if (reactionStatus === "waiting") {
    window.clearTimeout(reactionTimer);
    reactionStatus = "finished";
    elements.reactionZone.className = "reaction-zone waiting";
    elements.reactionTitle.textContent = "Demasiado pronto";
    elements.reactionMessage.textContent = "Pulsa para intentarlo de nuevo.";
    return;
  }

  if (reactionStatus === "go") {
    const result = Math.round(performance.now() - reactionStart);
    const savedBest = storage.get("reactionBest", null);
    const best = savedBest === null ? result : Math.min(savedBest, result);
    storage.set("reactionBest", best);
    elements.reactionBest.textContent = `${best} ms`;
    reactionStatus = "finished";
    elements.reactionZone.className = "reaction-zone waiting";
    elements.reactionTitle.textContent = `${result} ms`;
    elements.reactionMessage.textContent = result < 250 ? "¡Reflejos increíbles!" : "Buen intento. Pulsa para repetir.";
    state.completed.reaction = true;
    storage.set("completed", state.completed);
    award(10, result < 300 ? 10 : 5, "Reto de reacción completado");
  }
}

function renderComments() {
  if (state.comments.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Todavía no hay mensajes guardados en este dispositivo.";
    elements.commentsList.replaceChildren(empty);
    return;
  }

  elements.commentsList.replaceChildren(...state.comments.map((comment) => {
    const article = document.createElement("article");
    article.className = "comment";
    const head = document.createElement("div");
    head.className = "comment-head";
    const name = document.createElement("strong");
    const time = document.createElement("time");
    const message = document.createElement("p");
    name.textContent = comment.name;
    time.textContent = comment.date;
    message.textContent = comment.message;
    head.append(name, time);
    article.append(head, message);
    return article;
  }));
}

function submitComment(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = String(formData.get("name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!name || !message) return;
  state.comments.unshift({ id: randomId(), name: name.slice(0, 24), message: message.slice(0, 220), date: new Date().toLocaleString("es-ES") });
  state.comments = state.comments.slice(0, 12);
  storage.set("comments", state.comments);
  renderComments();
  event.currentTarget.reset();
  showToast("Mensaje guardado en este dispositivo");
}

function renderReactions() {
  document.querySelectorAll("[data-reaction]").forEach((button) => {
    const reaction = button.dataset.reaction;
    button.querySelector("span").textContent = String(state.reactions[reaction] ?? 0);
  });
}

function addReaction(reaction) {
  if (!(reaction in state.reactions)) return;
  state.reactions[reaction] += 1;
  storage.set("reactions", state.reactions);
  renderReactions();
}

function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  elements.themeButton.textContent = state.theme === "dark" ? "☀️" : "🌙";
  elements.themeButton.setAttribute("aria-label", state.theme === "dark" ? "Activar tema claro" : "Activar tema oscuro");
  storage.set("theme", state.theme);
}

function resetProgress() {
  const accepted = window.confirm("¿Quieres borrar el progreso, comentarios y carrito guardados en este navegador?");
  if (!accepted) return;
  storage.clear();
  window.location.reload();
}

function cacheElements() {
  Object.assign(elements, {
    menuButton: document.querySelector("#menu-button"),
    mainNav: document.querySelector("#main-nav"),
    themeButton: document.querySelector("#theme-button"),
    notificationButton: document.querySelector("#notification-button"),
    notificationCount: document.querySelector("#notification-count"),
    cartButton: document.querySelector("#cart-button"),
    cartCount: document.querySelector("#cart-count"),
    dailyRewardButton: document.querySelector("#daily-reward-button"),
    levelValue: document.querySelector("#level-value"),
    xpValue: document.querySelector("#xp-value"),
    coinsValue: document.querySelector("#coins-value"),
    bestScoreValue: document.querySelector("#best-score-value"),
    streakValue: document.querySelector("#streak-value"),
    progressLabel: document.querySelector("#progress-label"),
    progressFill: document.querySelector("#progress-fill"),
    progressTrack: document.querySelector(".progress-track"),
    missionsList: document.querySelector("#missions-list"),
    triviaCategory: document.querySelector("#trivia-category"),
    triviaDifficulty: document.querySelector("#trivia-difficulty"),
    triviaStage: document.querySelector("#trivia-stage"),
    triviaStart: document.querySelector("#trivia-start"),
    memoryMoves: document.querySelector("#memory-moves"),
    memoryPairs: document.querySelector("#memory-pairs"),
    memoryGrid: document.querySelector("#memory-grid"),
    memoryReset: document.querySelector("#memory-reset"),
    reactionZone: document.querySelector("#reaction-zone"),
    reactionTitle: document.querySelector("#reaction-title"),
    reactionMessage: document.querySelector("#reaction-message"),
    reactionBest: document.querySelector("#reaction-best"),
    productsGrid: document.querySelector("#products-grid"),
    commentForm: document.querySelector("#comment-form"),
    commentsList: document.querySelector("#comments-list"),
    overlay: document.querySelector("#overlay"),
    cartDrawer: document.querySelector("#cart-drawer"),
    cartItems: document.querySelector("#cart-items"),
    cartTotal: document.querySelector("#cart-total"),
    notificationDrawer: document.querySelector("#notification-drawer"),
    notificationItems: document.querySelector("#notification-items"),
    clearNotifications: document.querySelector("#clear-notifications"),
    checkoutButton: document.querySelector("#checkout-button"),
    resetProgress: document.querySelector("#reset-progress"),
    toast: document.querySelector("#toast"),
    currentYear: document.querySelector("#current-year")
  });
}

function bindEvents() {
  elements.menuButton.addEventListener("click", () => {
    const isOpen = elements.mainNav.classList.toggle("open");
    elements.menuButton.setAttribute("aria-expanded", String(isOpen));
    elements.menuButton.textContent = isOpen ? "✕" : "☰";
  });
  elements.mainNav.addEventListener("click", () => {
    elements.mainNav.classList.remove("open");
    elements.menuButton.setAttribute("aria-expanded", "false");
    elements.menuButton.textContent = "☰";
  });
  elements.themeButton.addEventListener("click", () => setTheme(state.theme === "dark" ? "light" : "dark"));
  elements.dailyRewardButton.addEventListener("click", claimDailyReward);
  elements.cartButton.addEventListener("click", () => openDrawer(elements.cartDrawer));
  elements.notificationButton.addEventListener("click", () => openDrawer(elements.notificationDrawer));
  elements.overlay.addEventListener("click", () => closeDrawers());
  document.querySelectorAll(".drawer-close").forEach((button) => button.addEventListener("click", () => closeDrawers()));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawers(); });
  elements.triviaStart.addEventListener("click", startTrivia);
  elements.triviaStage.addEventListener("click", (event) => {
    const button = event.target.closest("[data-answer-index]");
    if (button) answerTrivia(Number(button.dataset.answerIndex));
  });
  elements.memoryGrid.addEventListener("click", (event) => {
    const tile = event.target.closest(".memory-tile");
    if (tile) selectMemoryTile(tile);
  });
  elements.memoryReset.addEventListener("click", setupMemory);
  elements.reactionZone.addEventListener("click", handleReaction);
  elements.productsGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-id]");
    if (button) addToCart(button.dataset.productId);
  });
  elements.cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-index]");
    if (button) removeFromCart(Number(button.dataset.cartIndex));
  });
  elements.commentForm.addEventListener("submit", submitComment);
  document.querySelectorAll("[data-reaction]").forEach((button) => button.addEventListener("click", () => addReaction(button.dataset.reaction)));
  elements.clearNotifications.addEventListener("click", () => {
    state.notifications = [];
    storage.set("notifications", []);
    renderNotifications();
  });
  elements.checkoutButton.addEventListener("click", () => showToast("Esta tienda es una demostración y no realiza cobros"));
  elements.resetProgress.addEventListener("click", resetProgress);
}

function init() {
  cacheElements();
  updateVisitStreak();
  setTheme(state.theme);
  renderProducts();
  renderCart();
  renderNotifications();
  renderComments();
  renderReactions();
  renderProgress();
  setupMemory();
  const reactionBest = storage.get("reactionBest", null);
  elements.reactionBest.textContent = reactionBest === null ? "—" : `${reactionBest} ms`;
  elements.currentYear.textContent = String(new Date().getFullYear());
  bindEvents();
}

document.addEventListener("DOMContentLoaded", init);
