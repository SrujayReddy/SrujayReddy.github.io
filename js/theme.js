/*
 * theme.js — light/dark theme controller.
 *
 * The initial theme is set by the no-flash inline script in index.html (reads
 * localStorage("theme") then prefers-color-scheme). This module wires the nav
 * toggle, persists the choice, keeps the browser UI (theme-color) in sync, and
 * broadcasts a "themechange" CustomEvent so theme-aware layers (the WebGL
 * SceneDirector) can re-tune blending/colors without a rebuild.
 *
 * Light is the primary experience; dark is an opt-in.
 */

const root = document.documentElement;
const META_LIGHT = "#fbfbfd";
const META_DARK = "#06070a";

export function currentTheme() {
  return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function setTheme(theme, { persist = true } = {}) {
  const t = theme === "dark" ? "dark" : "light";
  root.setAttribute("data-theme", t);
  if (persist) {
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }
  // Reflect on the toggle + browser chrome.
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
    b.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "dark" ? META_DARK : META_LIGHT);
  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: t } }));
  return t;
}

export function toggleTheme() {
  return setTheme(currentTheme() === "dark" ? "light" : "dark");
}

export function initTheme() {
  // Sync controls to whatever the no-flash script established (no persist —
  // it's already stored, and we don't want to clobber a media-query default).
  setTheme(currentTheme(), { persist: false });

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => toggleTheme());
  });

  // Light is the deliberate default; we do NOT auto-follow the OS. Dark is a
  // remembered, explicit choice. (See the no-flash script in index.html.)

  // Expose for the deterministic preview/verification hook.
  window.__theme = { current: currentTheme, set: setTheme, toggle: toggleTheme };
}
