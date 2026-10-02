/*
 * motion.js — OPTIONAL enhancement layer (Lenis + GSAP/ScrollTrigger).
 *
 * Loaded via dynamic import() from main.js. If its CDN deps fail to load, the
 * site still renders fully (main.js owns the dependency-free baseline: content,
 * reveal, nav, anchors, and a static thesis fallback). This module only adds:
 * smooth scroll, the hero entrance, the positioning split-text, and the
 * signature thesis scrollytelling that drives the WebGL morph.
 *
 * Called only when prefers-reduced-motion is OFF and the deps loaded.
 */

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

// A trackpad reversal expresses a new destination, not a small subtraction
// from momentum banked in the old direction. Reset only input Lenis will own.
function cancelOppositeWheelMomentum(lenis, { deltaY, event }) {
  if (!deltaY || event?.type !== "wheel" || event.ctrlKey || event.defaultPrevented ||
      event.lenisStopPropagation || lenis.isStopped || lenis.isLocked || !lenis.options.smoothWheel) return;
  const pending = lenis.targetScroll - lenis.animatedScroll;
  if (pending * deltaY >= 0) return;
  const path = event.composedPath();
  const nested = path.slice(0, path.indexOf(lenis.rootElement));
  if (nested.some((node) => node instanceof HTMLElement && (
    lenis.options.prevent?.(node) || node.hasAttribute("data-lenis-prevent") || node.hasAttribute("data-lenis-prevent-wheel")
  ))) return;
  // reset() is part of the pinned Lenis implementation: stop the old animation,
  // clear velocity, and align both positions with the current native scroll.
  lenis.reset();
}

export function initMotion({ director, field } = {}) {
  // ── thesis pace zone: slow the WHEEL while the thesis pin is active ──
  // Lenis calls options.virtualScroll(data) before consuming the deltas, so
  // scaling data.deltaY here is the supported way to add "weight" to a section.
  // HARD RULE: never return false (that would eat the event) and never stop
  // Lenis — the worst possible failure is a constant 0.6× scroll speed, so a
  // frozen page is structurally impossible. Native scroll paths (touch,
  // scrollbar, keyboard) bypass this entirely and stay at full speed.
  const pace = { st: null, scale: 0.6 };

  // ── Lenis smooth scroll wired into ScrollTrigger ─────────────
  const lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    virtualScroll: (data) => {
      cancelOppositeWheelMomentum(lenis, data);
      if (pace.st && pace.st.isActive) data.deltaY *= pace.scale;
    },
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis; // main.js + agent.js prefer this for anchor scrolling

  // ── unified camera ride: global page scroll → one position along the spline ──
  if (director && director.setRide) {
    const rideFromScroll = (inst) => {
      const max = (inst && inst.limit) || document.documentElement.scrollHeight - window.innerHeight || 1;
      const scroll = (inst && inst.scroll) != null ? inst.scroll : window.scrollY || 0;
      director.setRide(scroll / max);
    };
    lenis.on("scroll", rideFromScroll);
    rideFromScroll(lenis);
  }

  // ── Hero entrance ────────────────────────────────────────────
  // Handled by pure CSS now (.hero.is-in, added by boot the moment the baseline
  // renders) so the page opens instantly. Re-animating it here was the "double
  // load": gsap arrived from the CDN seconds later, re-hid the visible hero and
  // played the entrance again. motion.js must NOT touch the hero.

  // ── Positioning split-text word reveal ───────────────────────
  const words = gsap.utils.toArray(".positioning__statement .word");
  if (words.length) {
    gsap.to(words, {
      opacity: 1,
      y: 0,
      ease: "power3.out",
      stagger: 0.04,
      duration: 0.6,
      scrollTrigger: { trigger: ".positioning", start: "top 60%" },
    });
  }

  // Build the pinned timelines in DOM order (education is now 2nd, before thesis)
  // so their pin-spacers stack correctly. refreshPriority reinforces the order.
  // ── Flagship: education "turning of the tassel" (2nd in the DOM) ──
  buildEducationTimeline(director);

  // ── Signature: thesis scrollytelling (pin + scrub) ───────────
  buildThesisTimeline(field, pace);

  // The ambient dots fight the line-dense experience rows (and everything below)
  // — ease the organism out as experience approaches and keep it off for the
  // rest of the page; it returns if you scroll back up. The director smooths
  // the opacity (~0.8s), so it reads as a slow dissolve, not a cut.
  if (director) {
    ScrollTrigger.create({
      trigger: "#experience",
      start: "top 80%",
      onEnter: () => director.setActive("field", false),
      onLeaveBack: () => director.setActive("field", true),
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());
  director?.attachTicker(gsap.ticker);
}

function buildThesisTimeline(field, pace) {
  const pin = document.querySelector(".thesis__pin");
  if (!pin) return;
  const beats = gsap.utils.toArray(".thesis__beat");
  const ticks = gsap.utils.toArray(".thesis__rail .tick");

  gsap.set(beats, { autoAlpha: 0, y: 20 });
  gsap.set(beats[0], { autoAlpha: 1, y: 0 });

  let cancelSettle = () => {};
  const readableHolds = [];
  let holdStart = 0;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".thesis",
      start: "top top",
      // 7 viewport-heights of runway: each beat costs real scrolling, paired
      // with the wheel pace zone. Entry never rewinds a user's gesture.
      end: () => "+=" + window.innerHeight * 7,
      pin: pin,
      // 1s catch-up: even an instant scroll jump plays the crossfade at a
      // readable speed instead of snapping the beats past.
      scrub: 1,
      invalidateOnRefresh: true,
      refreshPriority: 0, // refreshes AFTER education (which is earlier on the page)
      onLeave: () => cancelSettle(),
      onLeaveBack: () => cancelSettle(),
      onToggle: (self) => {
        if (!field) return;
        if (self.isActive) {
          // entering with morph≈0 → swapping the target buffer is invisible
          field.setFormation("clock");
        } else {
          // leaving: DON'T swap the buffer (that teleports particles while the
          // morph is still high) — just ease the morph home along the same
          // clock targets, so the ring melts back into the ambient cluster.
          field.setMorph(0);
        }
      },
      onUpdate: (self) => {
        if (field) field.setMorph(gsap.utils.clamp(0, 1, self.progress / 0.55));
        const active = Math.min(beats.length - 1, Math.floor(self.progress * beats.length));
        ticks.forEach((t, i) => t.classList.toggle("is-active", i <= active));
      },
    },
  });

  const fadeBeat = (from, to) => {
    if (from != null) {
      // A hold begins only once its entrance AND any counter have completed.
      // Store timeline times, so different beat durations never land in a fade.
      readableHolds.push({ start: holdStart, end: tl.duration() + 0.25 });
      tl.to(beats[from], { autoAlpha: 0, y: -16, duration: 0.4 }, "+=0.25");
    }
    tl.to(beats[to], { autoAlpha: 1, y: 0, duration: 0.5 }, from != null ? "-=0.2" : 0);
    holdStart = tl.duration();
  };

  fadeBeat(0, 1);

  fadeBeat(1, 2);
  const numEl = document.querySelector("[data-count-thesis]");
  if (numEl) {
    const proxy = { n: 0 };
    let displayed = numEl.textContent;
    tl.to(proxy, {
      n: 93,
      duration: 1,
      ease: "power1.out",
      onUpdate: () => {
        const next = String(Math.round(proxy.n));
        if (next !== displayed) numEl.textContent = displayed = next;
      },
    }, "-=0.2");
    holdStart = tl.duration();
  }

  fadeBeat(2, 3);
  const afterEl = document.querySelector("[data-count-after]");
  if (afterEl) {
    const p2 = { n: 75 };
    let displayed = afterEl.textContent;
    tl.to(p2, {
      n: 2,
      duration: 1,
      ease: "power3.inOut",
      onUpdate: () => {
        const next = String(Math.round(p2.n));
        if (next !== displayed) afterEl.textContent = displayed = next;
      },
    }, "-=0.1");
    holdStart = tl.duration();
  }

  fadeBeat(3, 4);
  tl.to({}, { duration: 0.6 });
  readableHolds.push({ start: holdStart, end: tl.duration() });

  const st = tl.scrollTrigger;
  if (pace) pace.st = st;
  if (window.__lenis && st) {
    cancelSettle = installThesisSettling(window.__lenis, st, tl, readableHolds);
  }
}

// Small, direction-preserving assistance after a USER gesture has finished.
// The pin, pacing, counters and crossfades remain scroll-driven. Settling never
// rewinds a gesture, crosses a section boundary, or chains itself into another snap.
function installThesisSettling(lenis, st, timeline, holds) {
  let timer = 0;
  let armed = false;
  let direction = 0;
  const clearTimer = () => {
    clearTimeout(timer);
    timer = 0;
  };
  const cancel = () => {
    clearTimer();
    armed = false;
    direction = 0;
  };
  const arm = (nextDirection) => {
    clearTimer();
    if (nextDirection) {
      direction = Math.sign(nextDirection);
      armed = true;
    }
  };

  // Lenis calls its public scrollTo() with programmatic:false for wheel input.
  // Explicit anchors/palette/API navigation must cancel old gesture assistance
  // immediately, including the gap before the first animation-frame event.
  const scrollTo = lenis.scrollTo;
  lenis.scrollTo = function (target, options) {
    if (options?.programmatic !== false) cancel();
    return scrollTo.call(this, target, options);
  };

  lenis.on("virtual-scroll", ({ deltaY, event }) => {
    cancel();
    if (!event?.ctrlKey) arm(deltaY);
  });
  window.addEventListener("pointerdown", cancel, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) return;
    cancel();
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
        (event.shiftKey && event.key !== " ") || lenis.isStopped || lenis.isLocked ||
        event.target?.isContentEditable || event.target?.closest?.("input, textarea, select, button")) return;
    // Let the browser's default key scroll replace outstanding wheel momentum.
    // Lenis otherwise ignores native changes while its smooth animation runs.
    if (lenis.isScrolling === "smooth") lenis.reset();
    arm(["ArrowUp", "PageUp", "Home"].includes(event.key) || (event.key === " " && event.shiftKey) ? -1 : 1);
  }, { passive: true });

  lenis.on("scroll", () => {
    clearTimer();
    // Scrollbars and keyboard/touch scrolling use the native path. Inertia is
    // still scrolling; Lenis emits once more with isScrolling:false at rest.
    if (lenis.isScrolling === "native") arm(lenis.direction);
    if (!armed || !st.isActive || lenis.isScrolling || lenis.isTouching) return;
    timer = setTimeout(() => {
      timer = 0;
      if (!armed || !st.isActive || lenis.isScrolling || lenis.isTouching) return;
      armed = false; // consume once, including when no nearby hold is appropriate
      const position = lenis.scroll;
      const limit = Math.min(120, window.innerHeight * 0.15);
      if (position <= st.start + limit || position >= st.end - limit) return;
      const span = st.end - st.start;
      const duration = timeline.duration();
      const ranges = holds.map((hold) => ({
        start: st.start + (hold.start / duration) * span,
        end: st.start + (hold.end / duration) * span,
      }));
      if (ranges.some((range) => position >= range.start && position <= range.end)) return;
      let target = null;
      for (const range of ranges) {
        const inset = Math.min(2, (range.end - range.start) / 2);
        const candidate = Math.round(direction > 0 ? range.start + inset : range.end - inset);
        if (candidate < range.start || candidate > range.end) continue;
        const distance = (candidate - position) * direction;
        if (distance <= 0 || distance > limit || candidate <= st.start + limit || candidate >= st.end - limit) continue;
        if (target === null || Math.abs(candidate - position) < Math.abs(target - position)) target = candidate;
      }
      if (target !== null && Math.abs(target - position) > 2) {
        // Bypass the navigation wrapper. armed is already false, so our own
        // animation/completion events cannot schedule another settle.
        scrollTo.call(lenis, target, { duration: 0.7, easing: (t) => 1 - Math.pow(1 - t, 3) });
      }
    }, 130);
  });
  return cancel;
}

function buildEducationTimeline(director) {
  const pin = document.querySelector(".education__pin");
  if (!pin) return;
  const facts = gsap.utils.toArray(".edu__fact");
  const ticks = gsap.utils.toArray(".edu__rail .tick");
  gsap.set(facts, { autoAlpha: 0, y: 16 });
  const factAlphas = facts.map(() => 0);

  ScrollTrigger.create({
    trigger: ".education",
    start: "top top",
    end: () => "+=" + window.innerHeight * 3,
    pin: pin,
    scrub: 0.6,
    invalidateOnRefresh: true,
    refreshPriority: 1, // earlier on the page → higher priority, refreshes first
    onToggle: (self) => {
      if (!director) return;
      director.setActive("education", self.isActive);
      // hand the stage to the cap: fade the ambient field down while it owns the screen
      director.setActive("field", !self.isActive);
    },
    onUpdate: (self) => {
      const p = self.progress;
      if (director) director.setProgress("education", p);
      // each fact resolves at its own point as the tassel sweeps across
      facts.forEach((f, i) => {
        const start = 0.12 + i * 0.12;
        const a = gsap.utils.clamp(0, 1, (p - start) / 0.08);
        if (a !== factAlphas[i]) {
          factAlphas[i] = a;
          gsap.set(f, { autoAlpha: a, y: (1 - a) * 16 });
        }
      });
      const active = Math.min(ticks.length - 1, Math.floor(p * ticks.length + 0.0001));
      ticks.forEach((t, i) => t.classList.toggle("is-active", i <= active));
    },
  });
}
