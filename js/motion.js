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

export function initMotion({ director, field } = {}) {
  // ── Lenis smooth scroll wired into ScrollTrigger ─────────────
  const lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
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
  const heroSpans = gsap.utils.toArray(".hero__title .line > span");
  // GSAP must OWN the yPercent channel from the start. The CSS sets
  // translateY(110%) to avoid FOUC, but that lands in the px translate channel
  // which gsap's yPercent tween can't clear — so seed yPercent explicitly.
  gsap.set(heroSpans, { yPercent: 110 });
  gsap.set(".hero__name, .hero__eyebrow, .hero__sub, .hero__cta, .hero__restyle", { opacity: 0, y: 12 });
  gsap
    .timeline({ delay: 0.15 })
    .to(".hero__name", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" })
    .to(heroSpans, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }, "-=0.5")
    .to(
      ".hero__eyebrow, .hero__sub, .hero__cta, .hero__restyle",
      { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 },
      "-=0.7"
    );

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
  buildThesisTimeline(field);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

function buildThesisTimeline(field) {
  const pin = document.querySelector(".thesis__pin");
  if (!pin) return;
  const beats = gsap.utils.toArray(".thesis__beat");
  const ticks = gsap.utils.toArray(".thesis__rail .tick");

  gsap.set(beats, { autoAlpha: 0, y: 20 });
  gsap.set(beats[0], { autoAlpha: 1, y: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".thesis",
      start: "top top",
      end: () => "+=" + window.innerHeight * 4,
      pin: pin,
      scrub: 0.6,
      invalidateOnRefresh: true,
      refreshPriority: 0, // refreshes AFTER education (which is earlier on the page)
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
    if (from != null) tl.to(beats[from], { autoAlpha: 0, y: -16, duration: 0.4 }, "+=0.25");
    tl.to(beats[to], { autoAlpha: 1, y: 0, duration: 0.5 }, from != null ? "-=0.2" : 0);
  };

  fadeBeat(0, 1);

  fadeBeat(1, 2);
  const numEl = document.querySelector("[data-count-thesis]");
  if (numEl) {
    const proxy = { n: 0 };
    tl.to(proxy, {
      n: 93,
      duration: 1,
      ease: "power1.out",
      onUpdate: () => (numEl.textContent = Math.round(proxy.n)),
    }, "-=0.2");
  }

  fadeBeat(2, 3);
  const afterEl = document.querySelector("[data-count-after]");
  if (afterEl) {
    const p2 = { n: 75 };
    tl.to(p2, {
      n: 2,
      duration: 1,
      ease: "power3.inOut",
      onUpdate: () => (afterEl.textContent = Math.round(p2.n)),
    }, "-=0.1");
  }

  fadeBeat(3, 4);
  tl.to({}, { duration: 0.6 });
}

function buildEducationTimeline(director) {
  const pin = document.querySelector(".education__pin");
  if (!pin) return;
  const facts = gsap.utils.toArray(".edu__fact");
  const ticks = gsap.utils.toArray(".edu__rail .tick");
  gsap.set(facts, { autoAlpha: 0, y: 16 });

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
        gsap.set(f, { autoAlpha: a, y: (1 - a) * 16 });
      });
      const active = Math.min(ticks.length - 1, Math.floor(p * ticks.length + 0.0001));
      ticks.forEach((t, i) => t.classList.toggle("is-active", i <= active));
    },
  });
}
