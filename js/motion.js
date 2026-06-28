/*
 * motion.js — Lenis smooth scroll + GSAP/ScrollTrigger orchestration.
 *
 * Owns: hero entrance, scroll-reveal, positioning split-text, nav state, and
 * the signature thesis scrollytelling (pinned + scrubbed) which drives the
 * WebGL morph. Everything has a prefers-reduced-motion path.
 */

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export function initMotion({ scene, reduced }) {
  // ── Nav scrolled state (always on, cheap) ───────────────────
  const nav = document.querySelector(".nav");
  const onScroll = () => nav && nav.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ── Reduced-motion path: reveal everything, no smooth scroll ──
  if (reduced) {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("in-view"));
    document.querySelectorAll(".positioning__statement .word").forEach((w) => {
      w.style.opacity = 1;
      w.style.transform = "none";
    });
    document.querySelector(".hero__title") && revealHeroInstant();
    // Show the thesis numbers at their final values.
    finalizeThesisNumbers();
    if (scene) scene.setMorph(1);
    return;
  }

  // ── Lenis smooth scroll wired into ScrollTrigger ─────────────
  const lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor links go through Lenis.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1) {
        const t = document.querySelector(id);
        if (t) {
          e.preventDefault();
          lenis.scrollTo(t, { offset: -20 });
        }
      }
    });
  });
  window.__lenis = lenis; // used by agent.js command actions

  // ── Hero entrance ────────────────────────────────────────────
  const heroSpans = gsap.utils.toArray(".hero__title .line > span");
  gsap
    .timeline({ delay: 0.15 })
    .to(".hero__name", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" })
    .to(heroSpans, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }, "-=0.5")
    .to(".hero__sub, .hero__cta, .hero__eyebrow", {
      opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08,
    }, "-=0.7");

  // ── Generic scroll reveal ────────────────────────────────────
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      onEnter: () => el.classList.add("in-view"),
    });
  });

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

  // Recompute on font load / late layout shifts.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

function revealHeroInstant() {
  gsap.set(".hero__title .line > span", { yPercent: 0 });
  gsap.set(".hero__name, .hero__sub, .hero__cta, .hero__eyebrow", { opacity: 1, y: 0 });
}

function buildThesisTimeline(scene) {
  const pin = document.querySelector(".thesis__pin");
  if (!pin) return;
  const beats = gsap.utils.toArray(".thesis__beat");
  const ticks = gsap.utils.toArray(".thesis__rail .tick");

  // start: only beat 0 visible
  gsap.set(beats, { autoAlpha: 0, y: 20 });
  gsap.set(beats[0], { autoAlpha: 1, y: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".thesis",
      start: "top top",
      end: "+=" + window.innerHeight * 4, // 4 viewports of scrub
      pin: pin,
      scrub: 0.6,
      onUpdate: (self) => {
        // morph: particles resolve into data over the first ~55%
        if (scene) scene.setMorph(gsap.utils.clamp(0, 1, self.progress / 0.55));
        // rail ticks
        const active = Math.min(beats.length - 1, Math.floor(self.progress * beats.length));
        ticks.forEach((t, i) => t.classList.toggle("is-active", i <= active));
      },
    },
  });

  // helper to cross-fade beat i -> i+1
  const fadeBeat = (from, to) => {
    if (from != null) tl.to(beats[from], { autoAlpha: 0, y: -16, duration: 0.4 }, "+=0.25");
    tl.to(beats[to], { autoAlpha: 1, y: 0, duration: 0.5 }, from != null ? "-=0.2" : 0);
  };

  // Beat 1: breakdown bar
  fadeBeat(0, 1);
  // animate the dominant segment label in
  tl.add(() => {}, "+=0.1");

  // Beat 2: the big number 93(–99)%
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

  // Beat 3: the fix collapse 75s -> 2s
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

  // Beat 4: punchline + links
  fadeBeat(3, 4);
  tl.to({}, { duration: 0.6 }); // hold at the end before unpin
}

function finalizeThesisNumbers() {
  const numEl = document.querySelector("[data-count-thesis]");
  if (numEl) numEl.textContent = "93";
  const afterEl = document.querySelector("[data-count-after]");
  if (afterEl) afterEl.textContent = "2";
  // un-stack the beats so the section reads as a normal document
  document.querySelectorAll(".thesis__beat").forEach((b) => {
    b.style.gridArea = "auto";
    b.style.opacity = 1;
    b.style.transform = "none";
    b.style.visibility = "visible";
    b.style.marginBottom = "4rem";
  });
  const pin = document.querySelector(".thesis__pin");
  if (pin) {
    pin.style.display = "block";
    pin.style.minHeight = "auto";
  }
}
