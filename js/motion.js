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
  buildThesisTimeline(field);

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
}

function buildThesisTimeline(field) {
  const pin = document.querySelector(".thesis__pin");
  if (!pin) return;
  const beats = gsap.utils.toArray(".thesis__beat");
  const ticks = gsap.utils.toArray(".thesis__rail .tick");

  gsap.set(beats, { autoAlpha: 0, y: 20 });
  gsap.set(beats[0], { autoAlpha: 1, y: 0 });

  let entryAt = 0; // set by onEnter/onEnterBack, consumed by the settle-snap below
  // Desktop wheel-step controller (filled in after the trigger exists; the
  // callbacks below may fire before then, so it starts as a safe no-op).
  const deck = { engage() {}, release() {}, active: false };

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".thesis",
      start: "top top",
      end: () => "+=" + window.innerHeight * 5, // more scroll room per beat
      pin: pin,
      scrub: 0.6,
      invalidateOnRefresh: true,
      refreshPriority: 0, // refreshes AFTER education (which is earlier on the page)
      // mark fresh entries so the settle-snap can catch the OPENING slide:
      // +time = entered from above (show beat 0), −time = from below (last beat).
      onEnter: () => { entryAt = performance.now(); deck.engage(false); },
      onEnterBack: () => { entryAt = -performance.now(); deck.engage(true); },
      onToggle: (self) => {
        if (!self.isActive) deck.release(); // leaving in either direction frees the page
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

  // ── beat snap, THROUGH Lenis ──────────────────────────────────
  // ScrollTrigger's built-in `snap` writes scrollTop directly — but Lenis
  // re-animates the scroll position every frame and overwrites it, so that snap
  // silently loses and fast scrollers blow through all five beats in a blink.
  // Instead: when scrolling settles anywhere inside the pin, glide to the
  // nearest beat with lenis.scrollTo — every slide actually lands and gets
  // read, and slow deliberate scrolling is never interrupted mid-gesture.
  const st = tl.scrollTrigger;
  const lenis = window.__lenis;
  if (lenis && st) {
    let settle;
    lenis.on("scroll", () => {
      if (!st.isActive || deck.active) return; // the desktop deck drives itself
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (!st.isActive || deck.active) return;
        // ENTRY CATCH: a fast scroll from the section above carries momentum past
        // the opening slide and used to rest on beat 1–2 (the timeline) — the
        // thesis never got its title moment. If we settled within ~1.2s of
        // entering and still rest in the entry half, present the OPENING slide
        // (beat 0 from above, the last beat from below). Deliberate scrolling
        // deeper than halfway is respected. Otherwise: nearest beat.
        const fresh = entryAt !== 0 && performance.now() - Math.abs(entryAt) < 1200;
        let beat = Math.round(st.progress * 4);
        if (fresh && entryAt > 0 && st.progress < 0.5) beat = 0;
        else if (fresh && entryAt < 0 && st.progress > 0.5) beat = 4;
        entryAt = 0; // consume — later settles inside the pin snap to nearest
        const target = Math.min(st.start + (beat / 4) * (st.end - st.start), st.end - 2);
        if (Math.abs(target - lenis.scroll) > 2) {
          lenis.scrollTo(target, { duration: 0.7, easing: (t) => 1 - Math.pow(1 - t, 3) });
        }
      }, 130);
    });
  }

  // ── the deck: ONE SLIDE PER GESTURE (desktop wheels) ──────────
  // Even with the settle-snap, a fast wheel scrub still FLASHED all five beats
  // past before anything could snap — you couldn't comprehend one slide before
  // the next arrived. On fine-pointer devices the deck now steps instead of
  // scrubbing: entering the pin parks on the opening slide and stops Lenis;
  // each wheel flick advances exactly ONE beat (a readable animated glide);
  // flicking past either end hands the page back and you scroll on. Touch
  // devices keep the scrub + settle-snap above — Lenis can't intercept native
  // touch scrolling, and step-locking a thumb-drag would feel broken.
  const FLICK = 90;    // accumulated wheel delta that means "next slide"
  const STEP_S = 0.65; // glide duration between beats
  const COOL_MS = 350; // post-glide lockout so trackpad inertia can't double-step
  const desktopWheel = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (lenis && st && desktopWheel) {
    let beat = 0, gliding = false, accum = 0, lastWheel = 0, coolUntil = 0;
    const beatPos = (b) => Math.min(st.start + (b / 4) * (st.end - st.start), st.end - 2);
    const glide = (b, dur) => {
      gliding = true;
      lenis.scrollTo(beatPos(b), {
        duration: dur, force: true, lock: true,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        onComplete: () => { gliding = false; coolUntil = performance.now() + COOL_MS; },
      });
    };
    deck.engage = (fromBelow, atBeat) => {
      if (deck.active) return;
      deck.active = true;
      beat = atBeat != null ? atBeat : fromBelow ? 4 : 0;
      accum = 0;
      lenis.stop(); // Lenis ignores user scroll from here; the deck drives
      glide(beat, 0.55); // park on the opening slide
    };
    deck.release = () => {
      if (!deck.active) return;
      deck.active = false;
      gliding = false;
      lenis.start();
    };
    window.addEventListener(
      "wheel",
      (e) => {
        if (!deck.active) return;
        if (!st.isActive) { deck.release(); return; } // safety: never trap the page
        e.preventDefault(); // the deck owns the wheel while pinned
        const now = performance.now();
        if (gliding || now < coolUntil) return;
        if (Math.abs(e.deltaY) < 8) return; // inertia dribble doesn't count
        if (now - lastWheel > 260) accum = 0; // stale momentum resets
        lastWheel = now;
        accum += e.deltaY;
        if (Math.abs(accum) < FLICK) return;
        const dir = accum > 0 ? 1 : -1;
        accum = 0;
        const next = beat + dir;
        if (next < 0 || next > 4) { deck.release(); return; } // exit past the ends
        beat = next;
        glide(beat, STEP_S);
      },
      { passive: false }
    );
    // Page loaded (or refreshed) already inside the pin → engage on the nearest
    // beat instead of yanking to the opening slide.
    if (st.isActive) deck.engage(false, Math.round(st.progress * 4));
  }

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
