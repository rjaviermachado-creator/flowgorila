"use strict";

(() => {
  const FALLBACKS = {
    nintendo: "assets/gallery/nintendo-switch-2-promo.jpg",
    roblox: "assets/gallery/roblox-experiences-wall.jpg",
    rbd: "assets/gallery/rbd-rebelde-cover.svg",
    pokemon: "assets/gallery/pokemon-pikachu-art.jpg",
    gta: "assets/gallery/gta-online.jpg",
    generic: "flowgorila-logo.jpeg"
  };

  function chooseFallback(img) {
    const src = String(img.currentSrc || img.src || "").toLowerCase();
    if (img.closest("#nintendo") || src.includes("nintendo")) return FALLBACKS.nintendo;
    if (img.closest("#roblox") || src.includes("roblox")) return FALLBACKS.roblox;
    if (img.closest("#rbd") || src.includes("rbd")) return FALLBACKS.rbd;
    if (img.closest(".pokemon-gbc-section") || img.closest("#juegos") && /pokemon|pikachu/.test(src)) return FALLBACKS.pokemon;
    if (/gta|rockstar/.test(src)) return FALLBACKS.gta;
    return FALLBACKS.generic;
  }

  function protectImage(img) {
    if (!(img instanceof HTMLImageElement) || img.dataset.v6Protected) return;
    img.dataset.v6Protected = "true";
    if (!img.closest(".site-header,.hero-visual,.rbd-cover")) img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
      if (img.dataset.fallbackApplied === "true") return;
      img.dataset.fallbackApplied = "true";
      img.closest("figure,article,.nintendo-art,.experience-image,.roblox-visual")?.classList.add("external-media-failed");
      img.src = chooseFallback(img);
    });
  }

  function protectImages(root = document) {
    root.querySelectorAll?.("img").forEach(protectImage);
  }

  function hardenExternalLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach((anchor) => {
      const rel = new Set((anchor.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      rel.add("noopener");
      rel.add("noreferrer");
      anchor.setAttribute("rel", [...rel].join(" "));
    });
  }

  function activeNavigation() {
    if (!("IntersectionObserver" in window)) return;
    const links = new Map(
      [...document.querySelectorAll('.main-nav a[href^="#"]')]
        .map((a) => [a.getAttribute("href")?.slice(1), a])
        .filter(([id]) => id)
    );
    const sections = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link, id) => id === visible.target.id ? link.setAttribute("aria-current", "true") : link.removeAttribute("aria-current"));
    }, { rootMargin: "-22% 0px -62% 0px", threshold: [0, .1, .35, .65] });
    sections.forEach((section) => observer.observe(section));
  }

  function improveMobileMenu() {
    const nav = document.getElementById("main-nav");
    const button = document.getElementById("menu-button");
    if (!nav || !button) return;
    nav.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      button.setAttribute("aria-expanded", "false");
      nav.classList.remove("open", "is-open", "active");
    });
    addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      button.setAttribute("aria-expanded", "false");
      nav.classList.remove("open", "is-open", "active");
    });
  }

  function labelDemoCheckout() {
    const checkout = document.getElementById("checkout-button");
    if (checkout) {
      checkout.textContent = "Finalizar demo · sin cobro";
      checkout.setAttribute("aria-label", "Finalizar demostración. No se realizará ningún cobro");
    }
  }

  function removeStaleVerificationCopy() {
    document.querySelectorAll("#roblox p").forEach((p) => {
      if (p.textContent.includes("Verificadas el 5 de agosto de 2026")) {
        p.textContent = p.textContent.replace("Verificadas el 5 de agosto de 2026.", "Las fechas corresponden a cada publicación enlazada.");
      }
    });
  }

  function observeNewImages() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches("img")) protectImage(node);
          protectImages(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    protectImages();
    hardenExternalLinks();
    activeNavigation();
    improveMobileMenu();
    labelDemoCheckout();
    removeStaleVerificationCopy();
    observeNewImages();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
