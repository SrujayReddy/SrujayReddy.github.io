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

export function initMotion({ scene } = {}) {
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

  // ── Hero entrance ────────────────────────────────────────────
  const heroSpans = gsap.utils.toArray(".hero__title .line > span");
  gsap.set(".hero__name, .hero__eyebrow, .hero__sub, .hero__cta", { opacity: 0, y: 12 });
  gsap
    .timeline({ delay: 0.15 })
    .to(".hero__name", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" })
    .to(heroSpans, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }, "-=0.5")
    .to(
      ".hero__eyebrow, .hero__sub, .hero__cta",
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

  // ── Signature: thesis scrollytelling (pin + scrub) ───────────
  buildThesisTimeline(scene);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

function buildThesisTimeline(scene) {
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
      end: "+=" + window.innerHeight * 4,
      pin: pin,
      scrub: 0.6,
      onUpdate: (self) => {
        if (scene) scene.setMorph(gsap.utils.clamp(0, 1, self.progress / 0.55));
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
