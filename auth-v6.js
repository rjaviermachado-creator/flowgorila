"use strict";

(() => {
  const PROFILES_KEY = "flowgorila_profiles_v6";
  const ACTIVE_KEY = "flowgorila_active_user";
  const MIGRATION_KEY = "flowgorila_v6_legacy_migrated";

  const readProfiles = () => {
    try {
      const value = JSON.parse(localStorage.getItem(PROFILES_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  };

  const writeProfiles = (profiles) => {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); return true; }
    catch { return false; }
  };

  const normalizeUser = (value) => value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);

  const hex = (buffer) => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join("");
  const randomSalt = () => {
    const bytes = new Uint8Array(16);
    if (crypto?.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return hex(bytes);
  };

  async function hashPassword(password, salt) {
    const payload = new TextEncoder().encode(`${salt}:${password}`);
    if (crypto?.subtle) return hex(await crypto.subtle.digest("SHA-256", payload));
    let hash = 2166136261;
    for (const byte of payload) { hash ^= byte; hash = Math.imul(hash, 16777619); }
    return `fallback-${(hash >>> 0).toString(16)}`;
  }

  function migrateLegacyData(userKey) {
    if (localStorage.getItem(MIGRATION_KEY)) return;
    const legacyPrefix = "flowgorila_v2_";
    const scopedPrefix = `flowgorila_v2_${userKey}_`;
    const known = new Set([
      "xp", "coins", "bestScore", "streak", "lastVisit", "dailyClaim", "cart", "comments",
      "reactions", "completed", "theme", "sound", "pikaSelected", "pikaUnlocked", "pokemonGbcSave"
    ]);
    try {
      known.forEach((suffix) => {
        const oldKey = legacyPrefix + suffix;
        const newKey = scopedPrefix + suffix;
        const value = localStorage.getItem(oldKey);
        if (value !== null && localStorage.getItem(newKey) === null) localStorage.setItem(newKey, value);
      });
      localStorage.setItem(MIGRATION_KEY, userKey);
    } catch {}
  }

  function setActive(userKey) {
    localStorage.setItem(ACTIVE_KEY, userKey);
    migrateLegacyData(userKey);
  }

  function removeGate() {
    document.getElementById("fg-auth-gate")?.remove();
    document.documentElement.classList.remove("fg-auth-locked");
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function showMessage(box, text, type = "") {
    box.textContent = text;
    box.className = `fg-auth-message${type ? ` ${type}` : ""}`;
  }

  function buildGate() {
    if (document.getElementById("fg-auth-gate")) return;
    document.documentElement.classList.add("fg-auth-locked");

    const gate = make("div", "fg-auth-gate");
    gate.id = "fg-auth-gate";
    gate.innerHTML = `
      <div class="fg-auth-backdrop" aria-hidden="true"></div>
      <section class="fg-auth-card" role="dialog" aria-modal="true" aria-labelledby="fg-auth-title">
        <div class="fg-auth-brand">
          <img src="flowgorila-logo.jpeg" alt="" width="72" height="72">
          <div><small>FLOWGORILA // PLAYER ACCESS</small><strong id="fg-auth-title">Entra con tu perfil</strong></div>
        </div>
        <p class="fg-auth-copy">Crea un perfil rápido para guardar tu progreso, juegos, monedas, comentarios y preferencias por separado en este dispositivo.</p>
        <div class="fg-auth-tabs" role="tablist" aria-label="Acceso al perfil">
          <button type="button" class="active" data-auth-tab="signin" role="tab" aria-selected="true">Entrar</button>
          <button type="button" data-auth-tab="signup" role="tab" aria-selected="false">Crear perfil</button>
        </div>
        <form id="fg-signin-form" class="fg-auth-form">
          <label>Nombre de usuario<input name="user" maxlength="28" autocomplete="username" required placeholder="Tu nombre gamer"></label>
          <label>Contraseña<input name="password" type="password" maxlength="80" autocomplete="current-password" required placeholder="Tu contraseña"></label>
          <button class="fg-auth-submit" type="submit">Entrar a FlowGorila</button>
        </form>
        <form id="fg-signup-form" class="fg-auth-form" hidden>
          <label>Nombre de usuario<input name="user" maxlength="28" autocomplete="username" required placeholder="Elige un nombre"></label>
          <label>Contraseña<input name="password" type="password" maxlength="80" autocomplete="new-password" required placeholder="Puede ser sencilla"></label>
          <label>Repite la contraseña<input name="confirm" type="password" maxlength="80" autocomplete="new-password" required placeholder="Repítela"></label>
          <button class="fg-auth-submit" type="submit">Crear perfil y entrar</button>
        </form>
        <div id="fg-auth-message" class="fg-auth-message" role="status" aria-live="polite"></div>
        <p class="fg-auth-foot">Perfil local: funciona sin servidor y no sincroniza automáticamente entre dispositivos. La contraseña no se guarda en texto plano.</p>
      </section>`;
    document.body.appendChild(gate);

    const tabs = [...gate.querySelectorAll("[data-auth-tab]")];
    const signin = gate.querySelector("#fg-signin-form");
    const signup = gate.querySelector("#fg-signup-form");
    const message = gate.querySelector("#fg-auth-message");

    tabs.forEach((tab) => tab.addEventListener("click", () => {
      const isSignin = tab.dataset.authTab === "signin";
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      signin.hidden = !isSignin;
      signup.hidden = isSignin;
      showMessage(message, "");
      (isSignin ? signin : signup).querySelector("input")?.focus();
    }));

    signin.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(signin);
      const rawUser = String(data.get("user") || "");
      const userKey = normalizeUser(rawUser);
      const password = String(data.get("password") || "");
      const profiles = readProfiles();
      const profile = profiles[userKey];
      if (!userKey || !profile) return showMessage(message, "Ese perfil no existe en este dispositivo.", "error");
      const candidate = await hashPassword(password, profile.salt);
      if (candidate !== profile.hash) return showMessage(message, "Contraseña incorrecta.", "error");
      setActive(userKey);
      showMessage(message, "Perfil abierto. Cargando tu progreso…", "success");
      setTimeout(() => location.reload(), 180);
    });

    signup.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(signup);
      const displayName = String(data.get("user") || "").trim().slice(0, 28);
      const userKey = normalizeUser(displayName);
      const password = String(data.get("password") || "");
      const confirm = String(data.get("confirm") || "");
      if (!userKey || displayName.length < 2) return showMessage(message, "El nombre debe tener al menos 2 caracteres.", "error");
      if (!password) return showMessage(message, "Escribe una contraseña.", "error");
      if (password !== confirm) return showMessage(message, "Las contraseñas no coinciden.", "error");
      const profiles = readProfiles();
      if (profiles[userKey]) return showMessage(message, "Ese nombre ya existe en este dispositivo.", "error");
      const salt = randomSalt();
      profiles[userKey] = {
        displayName,
        salt,
        hash: await hashPassword(password, salt),
        createdAt: new Date().toISOString()
      };
      if (!writeProfiles(profiles)) return showMessage(message, "El navegador no permite guardar el perfil.", "error");
      setActive(userKey);
      showMessage(message, "Perfil creado. Preparando FlowGorila…", "success");
      setTimeout(() => location.reload(), 180);
    });

    setTimeout(() => signin.querySelector("input")?.focus(), 60);
  }

  function addAccountUI(profile, userKey) {
    const headerActions = document.querySelector(".header-actions");
    if (headerActions && !document.getElementById("fg-user-chip")) {
      const chip = make("button", "fg-user-chip");
      chip.id = "fg-user-chip";
      chip.type = "button";
      chip.innerHTML = `<span>●</span><b>${profile.displayName.replace(/[<>&\"']/g, "")}</b>`;
      chip.setAttribute("aria-label", `Perfil ${profile.displayName}. Ir a mi perfil`);
      chip.addEventListener("click", () => document.getElementById("perfil")?.scrollIntoView({ behavior: "smooth" }));
      headerActions.prepend(chip);
    }

    const title = document.getElementById("profile-title");
    if (title) title.textContent = `${profile.displayName} · FlowGorila`;
    const main = document.querySelector("#perfil .profile-main");
    if (main && !document.getElementById("fg-profile-actions")) {
      const actions = make("div", "fg-profile-actions");
      actions.id = "fg-profile-actions";
      const note = make("p", "fg-profile-note", `Perfil local activo: @${userKey}. Tu progreso queda separado del resto de perfiles de este dispositivo.`);
      const logout = make("button", "button ghost", "Cerrar sesión");
      logout.type = "button";
      logout.addEventListener("click", () => {
        localStorage.removeItem(ACTIVE_KEY);
        location.reload();
      });
      const remove = make("button", "fg-danger-button", "Eliminar perfil");
      remove.type = "button";
      remove.addEventListener("click", () => {
        if (!confirm(`¿Eliminar el perfil ${profile.displayName} y su progreso guardado en este dispositivo?`)) return;
        const profiles = readProfiles();
        delete profiles[userKey];
        writeProfiles(profiles);
        const prefix = `flowgorila_v2_${userKey}_`;
        try {
          Object.keys(localStorage).filter((key) => key.startsWith(prefix)).forEach((key) => localStorage.removeItem(key));
          localStorage.removeItem(ACTIVE_KEY);
        } catch {}
        location.reload();
      });
      actions.append(note, logout, remove);
      main.appendChild(actions);
    }
  }

  function init() {
    const profiles = readProfiles();
    const active = localStorage.getItem(ACTIVE_KEY);
    const profile = active ? profiles[active] : null;
    if (!active || !profile) {
      if (active) localStorage.removeItem(ACTIVE_KEY);
      buildGate();
      return;
    }
    removeGate();
    addAccountUI(profile, active);
  }

  window.FlowGorilaAuthV6 = { readProfiles, activeUser: () => localStorage.getItem(ACTIVE_KEY) };
  init();
})();
