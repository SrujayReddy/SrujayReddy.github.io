/*
 * background.js — Vibe Studio "scenes": safe, curated animated backdrops.
 *
 * The AI NEVER supplies background code. It only picks a scene NAME from a fixed
 * whitelist (waves | aurora | starfield | grid | none); WE own every renderer, so
 * a generated theme can restyle the whole backdrop ("a sea" → animated water) and
 * still be impossible to break the page with. By construction each scene is:
 *   • drawn on ONE dedicated 2D canvas BEHIND the particle field + content,
 *   • capped (DPR ≤ 2, small element counts) and paused when the tab is hidden,
 *   • reduced-motion aware (one static frame, no rAF loop),
 *   • wrapped so any throw fails to an EMPTY canvas (page looks exactly like today),
 *   • cleanly torn down on scene change / reset (no rAF leaks).
 *
 * Worst case is always "no backdrop" — i.e. the current site. Nothing here can
 * break layout, block interaction (pointer-events:none), or run away (single rAF,
 * hidden-tab pause). initBackground() returns { setScene(name, colors), clear() }.
 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const HEX = /^#[0-9a-f]{6}$/i;
function hexToRgb(h) {
  if (typeof h !== "string" || !HEX.test(h)) return [128, 128, 140];
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(c, a) {
  const [r, g, b] = Array.isArray(c) ? c : hexToRgb(c);
  return `rgba(${r | 0},${g | 0},${b | 0},${clamp(a, 0, 1)})`;
}
function mix(a, b, t) {
  const A = Array.isArray(a) ? a : hexToRgb(a);
  const B = Array.isArray(b) ? b : hexToRgb(b);
  return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
}
// deterministic PRNG so a scene's random layout is stable across frames/resizes
function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normColors(c) {
  c = c || {};
  const plasma = Array.isArray(c.plasma) && c.plasma.length ? c.plasma : [c.accent, c.accent, c.accent2];
  return {
    bg: hexToRgb(c.bg || "#0a0a12"),
    accent: hexToRgb(c.accent || "#6366f1"),
    accent2: hexToRgb(c.accent2 || c.accent || "#22d3ee"),
    ink: hexToRgb(c.ink || "#e8e8f0"),
    plasma: plasma.map(hexToRgb),
    dark: !!c.dark,
  };
}

// ── scenes: each = { init?(W,H,dpr,C), draw(ctx,t,C,W,H,dpr) } ─────
// All coordinates are in DEVICE pixels (W/H already include DPR).

const waves = {
  draw(ctx, t, C, W, H, dpr) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(C.bg, 1));
    g.addColorStop(1, rgba(mix(C.bg, C.plasma[2] || C.accent2, 0.5), 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const n = 6;
    const step = Math.max(2, 7 * dpr);
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1); // 0 back … 1 front
      const baseY = H * (0.34 + f * 0.66);
      const amp = H * (0.018 + f * 0.03);
      const wl = W * (0.95 - f * 0.55);
      const spd = 0.25 + f * 0.55;
      const surf = mix(C.accent, [255, 255, 255], f * 0.28);
      const col = mix(C.plasma[2] || C.accent2, surf, f);
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += step) {
        const y =
          baseY +
          Math.sin((x / wl) * Math.PI * 2 + t * spd + i) * amp +
          Math.sin((x / wl) * Math.PI * 4 - t * spd * 0.6 + i) * amp * 0.3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = rgba(col, 0.5 + f * 0.42);
      ctx.fill();
    }
    // a specular glint travelling along the front crest
    const gx = ((t * 0.08) % 1) * W;
    const grd = ctx.createRadialGradient(gx, H * 0.9, 0, gx, H * 0.9, W * 0.25);
    grd.addColorStop(0, rgba(mix(C.accent, [255, 255, 255], 0.5), 0.14));
    grd.addColorStop(1, rgba(C.accent, 0));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  },
};

const aurora = {
  draw(ctx, t, C, W, H, dpr) {
    ctx.fillStyle = rgba(C.bg, 1);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const bands = 5;
    const step = Math.max(2, 9 * dpr);
    for (let i = 0; i < bands; i++) {
      const col = C.plasma[i % C.plasma.length];
      const cx = W * (0.14 + 0.72 * (i / (bands - 1))) + Math.sin(t * 0.3 + i * 1.3) * W * 0.12;
      const w = W * (0.09 + 0.04 * Math.sin(t * 0.5 + i));
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(0.42, rgba(col, 0.1));
      g.addColorStop(0.6, rgba(col, 0.17));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let y = 0; y <= H; y += step) {
        const off = Math.sin((y / H) * Math.PI * 2 + t * 0.6 + i) * W * 0.05;
        const x = cx + off - w / 2;
        y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let y = H; y >= 0; y -= step) {
        const off = Math.sin((y / H) * Math.PI * 2 + t * 0.6 + i) * W * 0.05;
        ctx.lineTo(cx + off + w / 2, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  },
};

const starfield = {
  init(W, H, dpr, C) {
    const rnd = mulberry(1337);
    const n = clamp(Math.floor((W * H) / 16000), 40, 200);
    this.stars = [];
    for (let i = 0; i < n; i++) {
      this.stars.push({ x: rnd() * W, y: rnd() * H, z: 0.3 + rnd() * 0.7, ph: rnd() * 6.28, tw: 0.5 + rnd() * 1.5 });
    }
  },
  draw(ctx, t, C, W, H, dpr) {
    ctx.fillStyle = rgba(C.bg, 1);
    ctx.fillRect(0, 0, W, H);
    if (!this.stars) this.init(W, H, dpr, C);
    for (const s of this.stars) {
      s.x -= s.z * 0.18 * dpr;
      if (s.x < 0) s.x += W;
      const a = 0.32 + 0.42 * Math.sin(t * s.tw + s.ph);
      const r = (0.5 + s.z * 1.5) * dpr;
      ctx.fillStyle = rgba(s.z > 0.85 ? C.accent : C.ink, clamp(a, 0, 1) * s.z);
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, 6.2832);
      ctx.fill();
    }
  },
};

const grid = {
  draw(ctx, t, C, W, H, dpr) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(C.bg, 1));
    g.addColorStop(1, rgba(mix(C.bg, C.plasma[0] || C.accent, 0.35), 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const hor = H * 0.52;
    const vp = W * 0.5;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeStyle = rgba(C.accent, 1);
    const rows = 16;
    for (let i = 0; i < rows; i++) {
      let p = (i + (t * 0.25) % 1) / rows;
      p = p * p; // perspective compression
      const y = hor + p * (H - hor);
      ctx.globalAlpha = clamp(1 - p, 0.04, 0.6);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    const cols = 14;
    for (let i = 0; i <= cols; i++) {
      const fx = i / cols - 0.5;
      ctx.globalAlpha = 0.32;
      ctx.beginPath();
      ctx.moveTo(vp, hor);
      ctx.lineTo(vp + fx * W * 1.7, H);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};

const SCENES = { waves, aurora, starfield, grid };

export function initBackground() {
  const NOOP = { setScene() {}, clear() {} };
  let canvas, ctx;
  try {
    canvas = document.createElement("canvas");
    canvas.id = "scene-canvas";
    canvas.setAttribute("aria-hidden", "true");
    ctx = canvas.getContext("2d");
    if (!ctx) return NOOP; // no 2D context → stay invisible, page unaffected
    document.body.prepend(canvas);
  } catch {
    return NOOP;
  }

  let raf = 0,
    sceneName = null,
    t = 0,
    C = normColors(),
    dpr = 1,
    W = 0,
    H = 0,
    running = false,
    clearTimer = 0;
  const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    H = canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    if (sceneName) {
      try {
        SCENES[sceneName].init && SCENES[sceneName].init(W, H, dpr, C);
      } catch {}
      if (!running) drawOnce(); // keep the static frame crisp after a resize
    }
  }

  function drawOnce() {
    try {
      ctx.clearRect(0, 0, W, H);
      SCENES[sceneName].draw(ctx, t, C, W, H, dpr);
    } catch {
      safeStop();
    }
  }
  function safeStop() {
    running = false;
    try {
      ctx.clearRect(0, 0, W, H);
    } catch {}
  }

  function frame() {
    if (!running || !sceneName) {
      raf = 0; // idle → let the loop die (no rAF churn when no scene is active)
      return;
    }
    raf = window.requestAnimationFrame(frame);
    if (document.hidden) return; // the browser pauses rAF while hidden; resumes on return
    t += 1 / 60;
    drawOnce();
  }

  function setScene(name, cols) {
    C = normColors(cols);
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = 0;
    }
    if (name === "none" || !SCENES[name]) {
      clear();
      return;
    }
    sceneName = name;
    try {
      SCENES[name].init && SCENES[name].init(W, H, dpr, C);
    } catch {
      sceneName = null;
      return; // a bad init → no scene, page unaffected
    }
    canvas.classList.add("is-on");
    if (reduced()) {
      running = false;
      drawOnce(); // one static frame, no animation
      return;
    }
    running = true;
    if (!raf) frame();
  }

  function clear() {
    running = false;
    canvas.classList.remove("is-on"); // CSS fades opacity → 0
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      sceneName = null;
      try {
        ctx.clearRect(0, 0, W, H);
      } catch {}
    }, 700);
  }

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    // resume the loop when the tab returns to the foreground (if a scene is live)
    if (!document.hidden && sceneName && running && !raf && !reduced()) frame();
  });
  resize();

  const api = { setScene, clear };
  // deterministic verification hook (rAF is throttled in hidden preview tabs)
  try {
    window.__bg = {
      ...api,
      step(dt = 1 / 60, n = 1) {
        if (!sceneName) return;
        for (let i = 0; i < n; i++) {
          t += dt;
          drawOnce();
        }
      },
      scene: () => sceneName,
    };
  } catch {}
  return api;
}
