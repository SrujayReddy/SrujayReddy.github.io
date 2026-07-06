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
import { initBackground } from "./background.js";

// the curated scene backdrops the AI (or a preset) may pick — whitelist-validated
const SCENES = ["waves", "aurora", "starfield", "grid"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const HEX = /^#[0-9a-f]{6}$/i;
const PROPS = [
  "--accent", "--accent-2", "--accent-3", "--plasma", "--plasma-bright", "--wash-1", "--wash-2", "--select-bg", "--glow",
  "--bg", "--bg-tint", "--surface", "--surface-2", "--ink", "--ink-dim", "--ink-mute", "--line", "--line-strong",
  "--font-sans", "--font-display", "--font-mono", "--heading-transform", "--tracking-heading", "--radius", "--radius-lg",
];
// typography tokens the guardrail reverts together if a wild choice overflows the layout
const TYPE_PROPS = ["--font-sans", "--font-display", "--font-mono", "--heading-transform", "--tracking-heading"];

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hexA(h, a) {
  if (!HEX.test(h)) return `rgba(99,102,241,${a})`;
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}
// blend two hexes (t=0 → a, t=1 → b); used to derive readable secondary inks.
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
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
  // the safe scene-backdrop engine (a no-op if canvas/2D is unavailable)
  const bg = initBackground();

  let current = null;
  let busy = false; // a vibe request is in flight → lock out concurrent actions

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
        <div class="restyle__thinking" data-vibe-thinking hidden aria-live="polite">
          <span class="restyle__orb" aria-hidden="true"></span>
          <b data-vibe-thinking-text>Designing your look…</b>
        </div>
      </div>
    </div>
  `;

  const $ = (s) => mount.querySelector(s);
  const form = $("[data-vibe-form]");
  const input = $("[data-vibe-input]");
  const pill = $("[data-vibe-pill]");
  const moodEl = $("[data-vibe-mood]");
  const thinkingEl = $("[data-vibe-thinking]");
  const thinkingText = $("[data-vibe-thinking-text]");

  // ── events ───────────────────────────────────────────────────
  mount.querySelectorAll("[data-vibe]").forEach((el) =>
    el.addEventListener("click", () => {
      if (busy) return; // don't let a swatch race an in-flight generation
      const p = v.presets.find((x) => x.id === el.dataset.vibe);
      if (p) applyVibe(p, p.mood);
    })
  );
  $("[data-vibe-surprise]").addEventListener("click", () => {
    if (busy) return;
    const p = v.presets[Math.floor(rand() * v.presets.length)];
    input.value = p.label;
    applyVibe(p, p.mood);
  });
  $("[data-vibe-reset]").addEventListener("click", () => { if (!busy) resetVibe(); });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return; // ignore empty + re-submits while one is in flight
    busy = true;
    form.classList.add("is-busy");
    let vibe;
    if (live) {
      // the model now THINKS about the palette (a couple seconds) — show it working
      // so the wait reads as craft, not lag.
      const t = startThinking();
      let failure = null; // null = fresh AI theme; else why we fell back to a preset
      try { vibe = await resolveLive(text); }
      catch (e) { failure = e && e.rateLimited ? "rate" : "error"; vibe = resolveDormant(text); }
      // ALWAYS tell the user WHY a generic result appeared instead of a fresh AI theme.
      if (failure === "rate") await t.note("🪫 Srujay's API key was exhausted by an earlier visitor — it refills tomorrow. Here's a close preset.", 3400);
      else if (failure === "error") await t.note("⚡ Couldn't reach the live AI just now — here's a close preset.", 2600);
      t.stop();
    } else {
      vibe = resolveDormant(text); // no backend → instant nearest-preset
    }
    form.classList.remove("is-busy");
    busy = false;
    applyVibe(vibe, vibe.mood || text);
  });

  // ── "thinking" state: cycling status while the model designs a theme ──
  // A quiet joke on AI "thinking" verbs — everything it is definitely not doing.
  const THINKING_MSGS = [
    "not cerebrating…",
    "not pontificating…",
    "not ruminating…",
    "not cogitating…",
    "not percolating…",
    "not marinating…",
  ];
  function startThinking() {
    const wrap = mount.querySelector(".restyle");
    wrap && wrap.classList.add("is-thinking");
    thinkingEl.hidden = false;
    let i = 0;
    thinkingText.textContent = THINKING_MSGS[0];
    let timer = setInterval(() => {
      i = (i + 1) % THINKING_MSGS.length;
      thinkingText.textContent = THINKING_MSGS[i];
    }, 1100);
    const stopCycle = () => { if (timer) { clearInterval(timer); timer = null; } };
    return {
      stop() {
        stopCycle();
        thinkingEl.hidden = true;
        if (wrap) { wrap.classList.remove("is-thinking"); wrap.classList.remove("is-note"); }
      },
      // swap the spinner for a static status message, hold it, then continue.
      async note(msg, ms) {
        stopCycle();
        wrap && wrap.classList.add("is-note");
        thinkingText.textContent = msg;
        await new Promise((r) => setTimeout(r, ms));
      },
    };
  }

  // ── cinematic apply: a light-sweep of the new palette wipes across the page,
  // synced with the colour crossfade — the reskin reads as a deliberate reveal. ─
  function playSweep(vibe) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll(".vibe-sweep").forEach((e) => e.remove()); // never stack sweeps
    const p = Array.isArray(vibe.plasma) ? vibe.plasma : [vibe.accent, vibe.accent, vibe.accent];
    const el = document.createElement("div");
    el.className = "vibe-sweep";
    // a soft wash trailing a bright leading edge — the strip GPU-translates L→R.
    el.style.setProperty("--wash", hexA(p[1] || vibe.accent, 0.5));
    el.style.setProperty("--edge2", hexA(p[2] || vibe.accent, 0.7));
    el.style.setProperty("--edge", hexA(vibe.accent, 0.95));
    // screen glows on a DARK theme; multiply keeps the strip visible on a LIGHT one.
    el.style.mixBlendMode = vibe.dark ? "screen" : "multiply";
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
    setTimeout(() => el.isConnected && el.remove(), 1400); // belt-and-suspenders cleanup
  }

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
    // a hard timeout so a slow/hung Worker can never lock the UI in "thinking":
    // on abort the fetch rejects → the caller falls back to the nearest preset.
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(config.WORKER_URL, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "vibe", prompt: text.slice(0, 120) }),
        signal: ctrl.signal,
      });
      if (res.status === 429) { const e = new Error("rate_limited"); e.rateLimited = true; throw e; }
      if (!res.ok) throw new Error("vibe " + res.status);
      return validate(await res.json(), text);
    } finally {
      clearTimeout(to);
    }
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
      // secondary inks are contrast-CLAMPED, not just hex-checked: a generated
      // theme may pick faint ones. If too dim vs bg, re-derive from ink→bg blends
      // so body/meta text stays readable in every generated mode.
      inkDim: ((c) => (contrast(sbg, c) >= 4.5 ? c : mixHex(sink, sbg, 0.2)))(safe ? hx(data.inkDim, fb.inkDim) : fb.inkDim),
      inkMute: ((c) => (contrast(sbg, c) >= 4.0 ? c : mixHex(sink, sbg, 0.35)))(safe ? hx(data.inkMute, fb.inkMute) : fb.inkMute),
      line: fb.line, lineStrong: fb.lineStrong,
      // a CSS-invalid font (stray ';', braces, unbalanced quotes) makes
      // setProperty silently no-op and leaks the PREVIOUS theme's font — only
      // accept safe font-family characters.
      font: safeFont(data.font) || fb.font,
      // fontDisplay = the big hero headline; fontMono = labels. Both optional →
      // the headline falls back to the body font (still changes), mono to default.
      fontDisplay: safeFont(data.fontDisplay) || safeFont(data.font) || fb.font,
      fontMono: safeFont(data.fontMono),
      headingCase: ["uppercase", "lowercase", "none"].includes(data.headingCase) ? data.headingCase : "none",
      // heading letter-spacing: a small em value, clamped to a sane range.
      tracking: /^-?0?\.?[0-9]{1,3}em$/.test(String(data.tracking || "")) ? data.tracking : null,
      radius: /^[0-9]{1,2}px$/.test(data.radius || "") ? data.radius : fb.radius,
      dark: lum(sbg) < 0.4,
      // scene backdrop — whitelist ONLY; anything unknown → "none" (safe).
      background: SCENES.includes(data.background) ? data.background : "none",
      mood: (typeof data.mood === "string" ? data.mood : fb.mood).slice(0, 48),
    };
  }
  // Accept only safe font-family characters (no braces/semicolons that would break CSS).
  function safeFont(x) {
    return typeof x === "string" && x.length < 120 && /^[\w\s"',.-]+$/.test(x) ? x : null;
  }

  // ── apply / reset ────────────────────────────────────────────
  function applyVibe(vibe, mood) {
    current = vibe;
    document.body.classList.add("vibe-restyling");
    playSweep(vibe); // the palette wipes across the page as the colours crossfade
    // ── layout guardrail probes ───────────────────────────────
    // A theme may ship ANY font (hand-written presets today, model-generated
    // strings tomorrow). The hero HEADLINE is already immune (--font-display),
    // so normal font swaps only reflow body/display text vertically — which we
    // ALLOW (the whole point is to see the font change). We only self-heal when
    // a font is so wide that display text OVERFLOWS its box (genuinely broken);
    // then we drop just the font and keep the colours. The page never breaks.
    const probes = [
      document.querySelector(".positioning__statement"),
      document.querySelector(".edu__school"),
      ...document.querySelectorAll(".hero__title .line"),
    ].filter(Boolean);
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
    // type + shape language — the expanded surface: body font, the big hero
    // HEADLINE font, the label/mono font, heading case + letter-spacing, and radius.
    // Clear each first so a rejected/absent value falls back to the DEFAULT, never
    // the previously-applied vibe's value.
    TYPE_PROPS.forEach((p) => root.style.removeProperty(p));
    set("--font-sans", vibe.font);
    if (vibe.fontDisplay) set("--font-display", vibe.fontDisplay); // the headline restyles too
    if (vibe.fontMono) set("--font-mono", vibe.fontMono);
    if (vibe.headingCase && vibe.headingCase !== "none") set("--heading-transform", vibe.headingCase);
    if (vibe.tracking) set("--tracking-heading", vibe.tracking);
    if (vibe.radius) { set("--radius", vibe.radius); set("--radius-lg", (parseFloat(vibe.radius) * 1.5 || 14) + "px"); }
    // browser chrome + the WebGL field (theme by darkness, tint by accent)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && vibe.bg) meta.setAttribute("content", vibe.bg);
    const cinema = window.__cinema;
    if (cinema && cinema.director) {
      if (cinema.director.setTheme) cinema.director.setTheme(vibe.dark ? "dark" : "light");
      if (cinema.director.setVibe) cinema.director.setVibe(vibe.particle || vibe.accent);
    }
    // scene backdrop (waves / aurora / starfield / grid — or none). The engine
    // whitelist-validates, caps perf, and fails to an empty canvas: it can only add
    // atmosphere, never break the page. Particles + content always render on top.
    bg.setScene(vibe.background || "none", {
      bg: vibe.bg, accent: vibe.accent, accent2: vibe.accent2,
      plasma: vibe.plasma, ink: vibe.ink, dark: vibe.dark,
    });

    moodEl.textContent = mood || vibe.label || "custom";
    pill.hidden = false;
    const wrap = mount.querySelector(".restyle");
    if (wrap) wrap.classList.add("has-vibe");

    // ── layout guardrail check ────────────────────────────────
    requestAnimationFrame(() => {
      // horizontal overflow = a word too wide for its box (a genuinely broken font
      // or too-loose tracking / all-caps headline). Vertical reflow is fine and
      // stays. Revert the TYPE tokens together (the colour redesign always survives).
      const broken = probes.some((el) => el.scrollWidth > el.clientWidth + 4);
      if (broken) TYPE_PROPS.forEach((p) => root.style.removeProperty(p));
    });

    setTimeout(() => document.body.classList.remove("vibe-restyling"), 950);
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
    bg.clear(); // fade out + tear down any scene backdrop
    pill.hidden = true;
    const wrap = mount.querySelector(".restyle");
    if (wrap) wrap.classList.remove("has-vibe");
    current = null;
    input.value = "";
    setTimeout(() => document.body.classList.remove("vibe-restyling"), 950);
  }

  // deterministic-ish randomness without Date/Math.random pitfalls in tests:
  // Math.random is fine in the browser runtime (this module never runs headless).
  function rand() { return Math.random(); }
}
