/*
 * vibe.js — "Vibe Studio": the 2nd AI feature.
 *
 * Type a vibe (or pick a preset) and the page restyles itself in place — accent,
 * gradients, washes, selection, and the WebGL particle field all morph live with a
 * smooth transition. The "AI redesigns a website, live" demo, and a widget people
 * would actually want on their own site.
 *
 * Safe + honest by construction: a vibe only re-skins the COLOR identity (accent /
 * plasma / washes / particles) — never --bg / --ink — so contrast and dark-mode
 * stay intact. Ships dormant: free text maps to the nearest preset via keyword
 * scoring; a Worker {mode:"vibe"} branch upgrades free text to a generated theme,
 * validated client-side (hex-only) before it touches the page.
 */

import { content } from "./content.js";
import { config } from "./config.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const HEX = /^#[0-9a-f]{6}$/i;
const PROPS = [
  "--accent", "--accent-2", "--accent-3", "--plasma", "--plasma-bright", "--wash-1", "--wash-2", "--select-bg", "--glow",
  "--bg", "--bg-tint", "--surface", "--surface-2", "--ink", "--ink-dim", "--ink-mute", "--line", "--line-strong",
  "--font-sans", "--radius", "--radius-lg",
];

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hexA(h, a) {
  if (!HEX.test(h)) return `rgba(99,102,241,${a})`;
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}
function lum(h) {
  if (!HEX.test(h)) return 0.5;
  const [r, g, b] = hexToRgb(h).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) { const la = lum(a), lb = lum(b), hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05); }

export function initVibe() {
  const mount = document.querySelector('[data-mount="restyle"]');
  if (!mount) return;
  const v = content.vibes;
  if (!v) return;
  const live = !!config.WORKER_URL;
  const root = document.documentElement;

  let current = null;

  // ── compact hero widget ──────────────────────────────────────
  const swatches = v.presets
    .map(
      (p) =>
        `<button class="restyle__swatch" type="button" data-vibe="${p.id}" title="${esc(p.label)}" aria-label="Restyle: ${esc(p.label)}"><span style="background:linear-gradient(120deg, ${p.plasma[0]}, ${p.plasma[2]})"></span></button>`
    )
    .join("");

  mount.innerHTML = `
    <div class="restyle" role="group" aria-label="Adaptive design — restyle this page">
      <p class="restyle__label"><span class="restyle__spark" aria-hidden="true"></span>${esc(v.label || v.blurb)}</p>
      <div class="restyle__row">
        <div class="restyle__swatches">
          ${swatches}
          <button class="restyle__swatch restyle__surprise" type="button" data-vibe-surprise title="Surprise me" aria-label="Surprise me">🎲</button>
        </div>
        <form class="restyle__form" data-vibe-form>
          <input class="restyle__input" type="text" data-vibe-input autocomplete="off" spellcheck="false"
                 aria-label="Describe a look" placeholder="${esc(v.placeholder)}" maxlength="120" />
        </form>
        <div class="restyle__pill" data-vibe-pill hidden>
          <b data-vibe-mood></b>
          <button type="button" data-vibe-reset>Reset</button>
        </div>
      </div>
    </div>
  `;

  const $ = (s) => mount.querySelector(s);
  const form = $("[data-vibe-form]");
  const input = $("[data-vibe-input]");
  const pill = $("[data-vibe-pill]");
  const moodEl = $("[data-vibe-mood]");

  // ── events ───────────────────────────────────────────────────
  mount.querySelectorAll("[data-vibe]").forEach((el) =>
    el.addEventListener("click", () => {
      const p = v.presets.find((x) => x.id === el.dataset.vibe);
      if (p) applyVibe(p, p.mood);
    })
  );
  $("[data-vibe-surprise]").addEventListener("click", () => {
    const p = v.presets[Math.floor(rand() * v.presets.length)];
    input.value = p.label;
    applyVibe(p, p.mood);
  });
  $("[data-vibe-reset]").addEventListener("click", resetVibe);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    form.classList.add("is-busy");
    const vibe = await resolve(text);
    form.classList.remove("is-busy");
    applyVibe(vibe, vibe.mood || text);
  });

  // ── resolve: live worker → validated theme, else nearest preset ──
  async function resolve(text) {
    if (live) {
      try { return await resolveLive(text); }
      catch { return resolveDormant(text); }
    }
    return resolveDormant(text);
  }
  function resolveDormant(text) {
    const t = text.toLowerCase();
    let best = v.presets[0], score = -1;
    for (const [id, kws] of Object.entries(v.keywords)) {
      const s = kws.reduce((acc, k) => acc + (t.includes(k) ? 1 : 0), 0);
      if (s > score) { score = s; best = v.presets.find((p) => p.id === id) || best; }
    }
    return best;
  }
  async function resolveLive(text) {
    const res = await fetch(config.WORKER_URL, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "vibe", prompt: text.slice(0, 120) }),
    });
    if (!res.ok) throw new Error("vibe " + res.status);
    return validate(await res.json(), text);
  }
  // hex-only validation; any bad field falls back to the nearest preset's value.
  function validate(data, text) {
    const fb = resolveDormant(text);
    const hx = (x, f) => (typeof x === "string" && HEX.test(x) ? x : f);
    const bg = hx(data.bg, fb.bg), ink = hx(data.ink, fb.ink);
    // contrast gate: an unreadable bg/ink pair → keep the safe fallback's surfaces.
    const safe = contrast(bg, ink) >= 4.5;
    const sbg = safe ? bg : fb.bg, sink = safe ? ink : fb.ink;
    const plasma = Array.isArray(data.plasma) && data.plasma.length === 3 && data.plasma.every((c) => HEX.test(c)) ? data.plasma : fb.plasma;
    return {
      id: "live", label: "custom",
      accent: hx(data.accent, fb.accent),
      accent2: hx(data.accent2, fb.accent2),
      plasma,
      particle: hx(data.particle, fb.particle),
      bg: sbg, ink: sink,
      bgTint: safe ? hx(data.bgTint, fb.bgTint) : fb.bgTint,
      surface: safe ? hx(data.surface, fb.surface) : fb.surface,
      surface2: safe ? hx(data.surface2, fb.surface2) : fb.surface2,
      inkDim: safe ? hx(data.inkDim, fb.inkDim) : fb.inkDim,
      inkMute: safe ? hx(data.inkMute, fb.inkMute) : fb.inkMute,
      line: fb.line, lineStrong: fb.lineStrong,
      // a CSS-invalid font (stray ';', braces, unbalanced quotes) makes
      // setProperty silently no-op and leaks the PREVIOUS theme's font — only
      // accept safe font-family characters.
      font:
        typeof data.font === "string" && data.font.length < 120 && /^[\w\s"',.-]+$/.test(data.font)
          ? data.font
          : fb.font,
      radius: /^[0-9]{1,2}px$/.test(data.radius || "") ? data.radius : fb.radius,
      dark: lum(sbg) < 0.4,
      mood: (typeof data.mood === "string" ? data.mood : fb.mood).slice(0, 48),
    };
  }

  // ── apply / reset ────────────────────────────────────────────
  function applyVibe(vibe, mood) {
    current = vibe;
    document.body.classList.add("vibe-restyling");
    // ── layout guardrail baseline ─────────────────────────────
    // A theme may ship ANY font (hand-written presets today, model-generated
    // strings tomorrow). Fonts with very different metrics reflow display text
    // and can blow the composition apart. Measure the key display blocks now,
    // compare after the theme lands, and self-heal (drop only the font) if the
    // layout grew — colors always survive, the page never breaks.
    const probes = [
      ...document.querySelectorAll(".hero__title .line"),
      document.querySelector(".positioning__statement"),
      document.querySelector(".edu__school"),
    ].filter(Boolean);
    const baseline = probes.map((el) => el.getBoundingClientRect().height);
    const heroEl = document.querySelector(".hero");
    const heroBase = heroEl ? heroEl.scrollHeight : 0;
    const set = (k, val) => { if (val != null) root.style.setProperty(k, val); };
    const grad = `linear-gradient(110deg, ${vibe.plasma[0]}, ${vibe.plasma[1]} 45%, ${vibe.plasma[2]})`;
    // accent + plasma + glow/washes
    set("--accent", vibe.accent);
    set("--accent-2", vibe.accent2 || vibe.accent);
    set("--accent-3", vibe.accent2 || vibe.accent);
    set("--plasma", grad);
    set("--plasma-bright", grad);
    set("--select-bg", hexA(vibe.accent, 0.22));
    set("--glow", `0 0 40px ${hexA(vibe.accent, 0.28)}`);
    set("--wash-1", `radial-gradient(120% 80% at 80% -10%, ${hexA(vibe.accent, 0.12)}, transparent 60%)`);
    set("--wash-2", `radial-gradient(90% 60% at -10% 110%, ${hexA(vibe.accent2 || vibe.accent, 0.10)}, transparent 55%)`);
    // the dramatic part: background / ink / surfaces / borders (contrast-safe)
    set("--bg", vibe.bg);
    set("--bg-tint", vibe.bgTint);
    set("--surface", vibe.surface);
    set("--surface-2", vibe.surface2);
    set("--ink", vibe.ink);
    set("--ink-dim", vibe.inkDim);
    set("--ink-mute", vibe.inkMute);
    set("--line", vibe.line);
    set("--line-strong", vibe.lineStrong);
    // type + shape language. Clear first so a rejected value falls back to the
    // DEFAULT font, never the previously-applied vibe's font.
    root.style.removeProperty("--font-sans");
    set("--font-sans", vibe.font);
    if (vibe.radius) { set("--radius", vibe.radius); set("--radius-lg", (parseFloat(vibe.radius) * 1.5 || 14) + "px"); }
    // browser chrome + the WebGL field (theme by darkness, tint by accent)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && vibe.bg) meta.setAttribute("content", vibe.bg);
    const cinema = window.__cinema;
    if (cinema && cinema.director) {
      if (cinema.director.setTheme) cinema.director.setTheme(vibe.dark ? "dark" : "light");
      if (cinema.director.setVibe) cinema.director.setVibe(vibe.particle || vibe.accent);
    }

    moodEl.textContent = mood || vibe.label || "custom";
    pill.hidden = false;
    const wrap = mount.querySelector(".restyle");
    if (wrap) wrap.classList.add("has-vibe");

    // ── layout guardrail check ────────────────────────────────
    requestAnimationFrame(() => {
      const grew = probes.some(
        (el, i) => el.getBoundingClientRect().height > baseline[i] * 1.5 + 2
      );
      // the opening composition must SURVIVE any font: if the hero got taller
      // than it was before the theme (wider glyphs → extra wraps → pushed
      // below the fold), keep the colors but drop the font. The +48 margin
      // absorbs the pill/label swap so only real font blowups (100s of px) trip it.
      const heroGrew = heroEl && heroBase && heroEl.scrollHeight > heroBase + 48;
      if (grew || heroGrew) root.style.removeProperty("--font-sans");
    });

    setTimeout(() => document.body.classList.remove("vibe-restyling"), 820);
  }

  function resetVibe() {
    document.body.classList.add("vibe-restyling");
    PROPS.forEach((p) => root.style.removeProperty(p));
    const theme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#06070a" : "#fbfbfd");
    const cinema = window.__cinema;
    if (cinema && cinema.director) {
      if (cinema.director.setTheme) cinema.director.setTheme(theme); // restore the real theme
      if (cinema.director.setVibe) cinema.director.setVibe(null);
    }
    pill.hidden = true;
    const wrap = mount.querySelector(".restyle");
    if (wrap) wrap.classList.remove("has-vibe");
    current = null;
    input.value = "";
    setTimeout(() => document.body.classList.remove("vibe-restyling"), 820);
  }

  // deterministic-ish randomness without Date/Math.random pitfalls in tests:
  // Math.random is fine in the browser runtime (this module never runs headless).
  function rand() { return Math.random(); }
}
