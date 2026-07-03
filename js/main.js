/*
 * main.js — render + orchestration.
 *
 * Renders every section from content.js into the [data-mount] shells in
 * index.html, then wires the WebGL scene (feature-detected, paused offscreen),
 * motion (Lenis + GSAP), the ⌘K agent, and the easter egg.
 */

import { content } from "./content.js";
import { initAgent } from "./agent.js";
import { initEasterEgg } from "./easter-egg.js";
import { initTheme } from "./theme.js";
import { initVibe } from "./vibe.js";

// three / gsap / lenis are loaded lazily (dynamic import) so a CDN hiccup
// degrades to a fully-rendered static page instead of a blank one.

document.documentElement.classList.add("js");

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const mount = (name, html) => {
  const el = document.querySelector(`[data-mount="${name}"]`);
  if (el) el.innerHTML = html;
  return el;
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const chips = (arr) => arr.map((s) => `<span class="chip">${esc(s)}</span>`).join("");
const tc = (on) => (on ? ` <span class="to-confirm" title="Figure to confirm">approx.</span>` : "");

// ── Hero ──────────────────────────────────────────────────────
function renderHero() {
  const id = content.identity;
  const lines = id.heroLines
    .map((l) => `<span class="line"><span>${esc(l)}</span></span>`)
    .join("");
  const gh = content.contact.links.find((l) => l.label === "GitHub").href;
  mount(
    "hero",
    `
    <p class="hero__name">${esc(id.name)}</p>
    <span class="eyebrow hero__eyebrow">${esc(id.role)} @ ${esc(id.company)} · ${esc(id.companyNote)}</span>
    <h1 class="hero__title">${lines}</h1>
    <p class="hero__sub">${esc(id.tagline)} Based in <strong>${esc(id.location)}</strong>.</p>
    <div class="hero__cta">
      <button class="btn btn--primary" data-open-palette="ask" type="button">⌘K · Ask anything about me</button>
      <a class="btn" href="${gh}" target="_blank" rel="noopener">GitHub ↗</a>
      <a class="btn" href="#thesis">See the thesis</a>
    </div>
    <div class="hero__restyle" data-mount="restyle"></div>
    <div class="hero__scrollcue"><span class="bar"></span> Scroll</div>
  `
  );
}

// ── Positioning ───────────────────────────────────────────────
function renderPositioning() {
  const p = content.positioning;
  const words = p.statement
    .split(" ")
    .map((w) => {
      const bare = w.replace(/[^a-z]/gi, "").toLowerCase();
      const hot = p.emphasis.some((e) => e.split(" ").includes(bare));
      return `<span class="word">${hot ? `<span class="gradient-text">${esc(w)}</span>` : esc(w)}</span>`;
    })
    .join(" ");
  mount(
    "positioning",
    `
    <p class="positioning__lead">${esc(p.lead)}</p>
    <h2 class="positioning__statement">${words}</h2>
  `
  );
}

// ── Thesis (signature) ────────────────────────────────────────
function renderThesis() {
  const t = content.thesis;
  // Horizontal bar-chart rows: every phase named + quantified, aligned in one
  // grid — the 93–99% image-pull row visually dwarfs the 2–3% slivers.
  const phases = t.breakdown
    .map(
      (s) => `
      <div class="phase ${s.dominant ? "is-dominant" : ""}">
        <span class="phase__label">${esc(s.label)}</span>
        <span class="phase__track"><i style="width:${Math.max(s.share * 100, 1.6).toFixed(1)}%"></i></span>
        <span class="phase__val">${s.dominant ? "93–99%" : (s.share * 100).toFixed(0) + "%"}</span>
      </div>`
    )
    .join("");
  const links = t.links
    .map((l) => {
      const label = `${esc(l.label)}${tc(l.toConfirm)}`;
      // A placeholder href ("#") would ship a dead anchor — render it as a
      // non-interactive pending item until the real URL exists.
      return !l.href || l.href === "#"
        ? `<span class="thesis__link-pending">${label}</span>`
        : `<a href="${l.href}" target="_blank" rel="noopener">${label}</a>`;
    })
    .join("");

  mount(
    "thesis",
    `
    <div class="thesis__rail">${[0, 1, 2, 3, 4].map((i) => `<span class="tick${i === 0 ? " is-active" : ""}"></span>`).join("")}</div>

    <div class="thesis__beat"><div class="wrap">
      <span class="eyebrow thesis__eyebrow">${esc(t.eyebrow)}</span>
      <h2 class="thesis__title gradient-text">${esc(t.title)}</h2>
      <p class="thesis__subtitle">${esc(t.subtitle)}</p>
      ${t.context ? `<p class="thesis__context">${esc(t.context)}</p>` : ""}
      <p class="thesis__advisor">Advised by <b>${esc(t.advisor.name)}</b> — ${esc(t.advisor.note)}.</p>
    </div></div>

    <div class="thesis__beat"><div class="wrap">
      <span class="eyebrow">Cold-start timeline, decomposed</span>
      <div class="phases">${phases}</div>
      <p class="bignum__caption">Under bandwidth constraints, one phase swallows the timeline.</p>
    </div></div>

    <div class="thesis__beat"><div class="wrap">
      <div class="bignum"><span class="gradient-text" data-count-thesis>0</span><span class="gradient-text">–${t.headline.valueHigh}</span><span class="unit">${t.headline.unit}</span></div>
      <p class="bignum__caption">${esc(t.headlineLabel)}</p>
    </div></div>

    <div class="thesis__beat"><div class="wrap">
      <span class="eyebrow">${esc(t.fix.label)}</span>
      <div class="collapse">
        <div class="collapse__card is-before"><div class="num">${t.fix.before.value}<span style="font-size:.4em">${t.fix.before.unit}</span></div><div class="lbl">cold start${tc(t.fix.before.toConfirm)}</div></div>
        <div class="collapse__arrow">→</div>
        <div class="collapse__card is-after"><div class="num"><span data-count-after>${t.fix.before.value}</span><span style="font-size:.4em">${t.fix.after.unit}</span></div><div class="lbl">pre-pulled${tc(t.fix.after.toConfirm)}</div></div>
      </div>
      <p class="collapse__note">${esc(t.fix.note)} — pre-pull the image and the cold start collapses.</p>
    </div></div>

    <div class="thesis__beat"><div class="wrap">
      <h2 class="thesis__punch gradient-text">${esc(t.punchline)}</h2>
      <div class="thesis__links">${links}</div>
    </div></div>
  `
  );
}

// ── Now (Strada) ──────────────────────────────────────────────
function renderNow() {
  const n = content.now;
  const pillars = n.pillars
    .map((p) => `<div class="now__pillar" data-reveal><h3>${esc(p.k)}</h3><p>${esc(p.v)}</p></div>`)
    .join("");
  mount(
    "now",
    `
    <span class="eyebrow" data-reveal>${esc(n.eyebrow)}</span>
    <div class="now__head" data-reveal>
      <h2 class="now__title">${esc(n.title)} · ${esc(n.company)}</h2>
      <span class="now__badge">${esc(n.companyNote)}</span>
      <span class="now__period">${esc(n.period)}</span>
    </div>
    <p class="now__body" data-reveal>${esc(n.body)}</p>
    <div class="now__pipe" aria-hidden="true"><b></b><b></b><b></b><i></i></div>
    <div class="now__pillars">${pillars}</div>
    <div class="now__stack" data-reveal>${chips(n.stack)}</div>
  `
  );
}

// ── Experience timeline ───────────────────────────────────────
function renderExperience() {
  const rows = content.experience
    .map(
      (x) => `
      <article class="xp" data-reveal>
        <div class="xp__left">
          <h3 class="xp__org">${esc(x.org)}</h3>
          <p class="xp__role">${esc(x.role)}</p>
          <p class="xp__meta">${esc(x.period)} · ${esc(x.place)}</p>
        </div>
        <div class="xp__right">
          <p class="xp__body">${esc(x.body)}</p>
          <div class="xp__metrics">
            ${x.metrics.map((m) => `<div class="xp__metric"><div class="v gradient-text">${esc(m.v)}</div><div class="k">${esc(m.k)}</div></div>`).join("")}
          </div>
          <div class="xp__stack">${chips(x.stack)}</div>
        </div>
      </article>`
    )
    .join("");
  mount(
    "experience",
    `
    <div class="section__head" data-reveal>
      <h2 class="section__title">Experience</h2>
    </div>
    <div class="timeline">${rows}</div>
  `
  );
}

// ── Selected work ─────────────────────────────────────────────
function renderWork() {
  const cards = content.projects
    .map((p) => {
      const media = p.image
        ? `<div class="work-card__media"><img src="${p.image}" alt="${esc(p.name)}" loading="lazy" decoding="async" width="640" height="360"></div>`
        : `<div class="work-card__media work-card__media--mono">{ ${esc(p.stack[0])} }</div>`;
      return `
      <a class="work-card" href="${p.href}" target="_blank" rel="noopener" data-reveal>
        ${media}
        <div class="work-card__body">
          <h3 class="work-card__name">${esc(p.name)} <span class="arrow">↗</span></h3>
          <p class="work-card__blurb">${esc(p.blurb)}</p>
          <div class="work-card__stack">${chips(p.stack)}</div>
        </div>
      </a>`;
    })
    .join("");
  mount(
    "work",
    `
    <div class="section__head" data-reveal>
      <h2 class="section__title">Projects</h2>
      <a class="link-underline" href="${content.contact.links.find((l) => l.label === "GitHub").href}" target="_blank" rel="noopener">All projects on GitHub ↗</a>
    </div>
    <div class="work__grid">${cards}</div>
  `
  );
}

// ── Education: "The Turning of the Tassel" ────────────────────
function capSVG() {
  // Line-art mortarboard with the tassel resting LEFT (the turn complete).
  return `
    <svg class="edu__capsvg" viewBox="0 0 260 210" fill="none" aria-hidden="true">
      <polygon points="130,38 238,82 130,126 22,82" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M78,104 C78,104 104,124 130,124 C156,124 182,104 182,104 L182,128 C182,128 156,150 130,150 C104,150 78,128 78,128 Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="130" cy="82" r="5.5" fill="currentColor"/>
      <path d="M130,82 C104,92 60,96 52,128" stroke="var(--violet)" stroke-width="2.4" stroke-linecap="round"/>
      <g stroke="var(--violet)" stroke-width="2.2" stroke-linecap="round">
        <line x1="50" y1="130" x2="46" y2="166"/>
        <line x1="54" y1="131" x2="53" y2="170"/>
        <line x1="58" y1="130" x2="61" y2="166"/>
      </g>
      <circle cx="54" cy="129" r="4" fill="var(--violet)"/>
      <rect x="44" y="166" width="20" height="9" rx="3" fill="var(--violet)"/>
    </svg>`;
}

function renderEducation() {
  const e = content.education;
  const facts = e.facts
    .map(
      (f, i) =>
        `<li class="edu__fact" data-edu-fact style="--i:${i}"><span class="k">${esc(f.k)}</span><span class="v">${esc(f.v)}</span></li>`
    )
    .join("");
  mount(
    "education",
    `
    <div class="edu__rail" aria-hidden="true">${e.facts
      .map((_, i) => `<span class="tick${i === 0 ? " is-active" : ""}"></span>`)
      .join("")}</div>
    <div class="wrap edu__layout">
      <div class="edu__copy">
        <span class="eyebrow" data-reveal>${esc(e.eyebrow)}</span>
        <h2 class="edu__school gradient-text">${esc(e.school)}</h2>
        <p class="edu__degree">${esc(e.degree)}</p>
        <ul class="edu__facts">${facts}</ul>
      </div>
      <div class="edu__cap">${capSVG()}</div>
    </div>
  `
  );
}

// ── Beyond the code ───────────────────────────────────────────
function renderBeyond() {
  const b = content.beyond;
  const items = b.items
    .map((i) => `<div class="beyond__item"><span class="k">${esc(i.k)}</span><span class="v">${esc(i.v)}</span></div>`)
    .join("");
  mount(
    "beyond",
    `
    <div class="section__head" data-reveal><h2 class="section__title">Beyond the code</h2></div>
    <div class="beyond__list beyond__list--solo" data-reveal>${items}</div>
  `
  );
}

// ── Contact + footer ──────────────────────────────────────────
function renderContact() {
  const c = content.contact;
  const links = c.links
    .map((l) => `<a class="link-underline" href="${l.href}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
    .join("");
  mount(
    "contact",
    `
    <span class="eyebrow" data-reveal style="justify-content:center">Contact</span>
    <h2 class="contact__blurb gradient-text" data-reveal>${esc(c.blurb)}</h2>
    <p class="contact__email" data-reveal><a href="mailto:${c.email}">${c.email}</a></p>
    <div class="contact__links" data-reveal>${links}</div>
  `
  );
  mount(
    "footer",
    `
    <span>© ${new Date().getFullYear()} ${esc(content.identity.name)}</span>
    <button class="egg-btn" type="button" data-egg aria-label="Joey doesn't share food" title="Joey doesn't share food">🍕</button>
  `
  );
}

// ── dependency-free baseline ──────────────────────────────────
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

function navState() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const on = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
  on();
  window.addEventListener("scroll", on, { passive: true });
}

function nativeAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length <= 1) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      if (window.__lenis) window.__lenis.scrollTo(t, { offset: -20 });
      else t.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });
}

function nativeReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add("in-view");
          io.unobserve(en.target);
        }
      }
    },
    { rootMargin: "0px 0px -12% 0px" }
  );
  items.forEach((el) => io.observe(el));
}

// Render the thesis as a normal stacked document when GSAP isn't driving it
// (reduced motion, or the CDN failed to load).
function applyStaticThesis() {
  const num = $("[data-count-thesis]");
  if (num) num.textContent = "93";
  const after = $("[data-count-after]");
  if (after) after.textContent = "2";
  document.querySelectorAll(".thesis__beat").forEach((b) => {
    b.style.gridArea = "auto";
    b.style.opacity = "1";
    b.style.transform = "none";
    b.style.visibility = "visible";
    b.style.marginBottom = "4rem";
  });
  const pin = $(".thesis__pin");
  if (pin) {
    pin.style.display = "block";
    pin.style.minHeight = "auto";
  }
  const rail = $(".thesis__rail");
  if (rail) rail.style.display = "none";
}

function applyStaticHero() {
  document.querySelectorAll(".hero__title .line > span").forEach((s) => (s.style.transform = "none"));
  document.querySelectorAll(".hero__name, .hero__eyebrow, .hero__sub, .hero__cta, .hero__restyle").forEach((e) => {
    e.style.opacity = "1";
    e.style.transform = "none";
  });
  document.querySelectorAll(".positioning__statement .word").forEach((w) => {
    w.style.opacity = "1";
    w.style.transform = "none";
  });
}

// Build the thesis "latency clock" formation: particles arranged on a thin ring,
// split into arcs by each cold-start phase's share. Image pull is the dominant
// finding, so ~93% of the ring is one glowing arc — the truth, drawn as a clock
// that is almost entirely one phase.
function buildClockFormation(count, breakdown) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count);
  const total = breakdown.reduce((s, b) => s + b.share, 0) || 1;
  const bounds = [];
  let acc = 0;
  for (const b of breakdown) {
    const start = acc / total;
    acc += b.share;
    bounds.push({ start, end: acc / total, dominant: !!b.dominant });
  }
  const R = 2.2;
  const thickness = 0.34;
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let seg = bounds[bounds.length - 1];
    for (const b of bounds) {
      if (r >= b.start && r < b.end) { seg = b; break; }
    }
    const span = seg.end - seg.start || 1;
    const t = (r - seg.start) / span;
    const a0 = seg.start * Math.PI * 2;
    const a1 = seg.end * Math.PI * 2;
    const ang = -Math.PI / 2 - (a0 + t * (a1 - a0)); // start at 12 o'clock, sweep clockwise
    const rad = R + (Math.random() - 0.5) * thickness;
    positions[i * 3] = Math.cos(ang) * rad;
    positions[i * 3 + 1] = Math.sin(ang) * rad;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    colors[i] = seg.dominant ? 0.6 + Math.random() * 0.4 : Math.random() * 0.06;
  }
  return { positions, colors };
}

// ── boot ──────────────────────────────────────────────────────
function boot() {
  renderHero();
  renderPositioning();
  renderThesis();
  renderNow();
  renderExperience();
  renderWork();
  renderEducation();
  renderBeyond();
  renderContact();

  // Baseline that never depends on a CDN.
  initTheme();
  navState();
  nativeAnchors();
  nativeReveal();
  const fireEgg = initEasterEgg();
  initAgent({ onPizza: fireEgg });
  // Visible pizza affordance (same egg, wherever a [data-egg] control appears).
  document.querySelectorAll("[data-egg]").forEach((b) => b.addEventListener("click", fireEgg));
  initVibe();

  if (reduced) {
    document.documentElement.classList.add("no-webgl");
    applyStaticHero();
    applyStaticThesis();
    return;
  }

  // Progressive enhancement: WebGL (SceneDirector) + GSAP/Lenis, each optional.
  (async () => {
    let director = null;
    let field = null;
    const canvas = document.getElementById("webgl-canvas");
    if (canvas && hasWebGL()) {
      try {
        const [{ createSceneDirector }, { makeFieldAct }, { makeEducationAct }] = await Promise.all([
          import("./webgl/director.js"),
          import("./webgl/field.js"),
          import("./webgl/education.js"),
        ]);
        director = createSceneDirector(canvas, {
          getTheme: () => document.documentElement.getAttribute("data-theme") || "light",
        });
        field = director.register(makeFieldAct());
        director.register(makeEducationAct());
        const clock = buildClockFormation(field.count, content.thesis.breakdown);
        field.addFormation("clock", clock.positions, clock.colors);
        director.setActive("field", true);
        director.onReady(() => canvas.classList.add("is-ready"));
        window.addEventListener("themechange", (e) => director.setTheme(e.detail.theme));
        document.addEventListener("visibilitychange", () => director.setRunning(!document.hidden));
        // Deterministic verification hook (rAF is throttled in hidden tabs).
        window.__cinema = { director, field };
      } catch (e) {
        document.documentElement.classList.add("no-webgl");
        console.warn("WebGL deps unavailable; static canvas.", e);
      }
    } else {
      document.documentElement.classList.add("no-webgl");
    }

    try {
      const mod = await import("./motion.js");
      mod.initMotion({ director, field });
    } catch (e) {
      console.warn("Motion deps unavailable; static layout.", e);
      applyStaticHero();
      applyStaticThesis();
    }
  })();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
