/*
 * Exercise the real thesis callbacks with a deterministic clock and small
 * GSAP/Lenis adapters. The adapters expose the event ordering of Lenis 1.1.14:
 * raw input / scrollTo starts synchronously; "scroll" is emitted on its next
 * animation frame, and completion emits after isScrolling becomes false.
 * No browser, external dependencies, or real-time sleeps are required.
 * Run: node tests/motion-settle.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../js/motion.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "")
  .replace("export function initMotion", "function initMotion");

function setup() {
  let now = 10000;
  let timerId = 0;
  const timers = new Map();
  const calls = [];
  const listeners = new Map();
  const tweens = [];
  const styleWrites = [];
  const counts = new Map();
  const element = (initial) => {
    let value = initial;
    let writes = 0;
    return { get textContent() { return value; }, set textContent(v) { value = String(v); writes++; }, get writes() { return writes; } };
  };
  counts.set("[data-count-thesis]", element("0"));
  counts.set("[data-count-after]", element("75"));
  const ticks = Array.from({ length: 5 }, () => ({ classList: { toggle() {} } }));
  const facts = Array.from({ length: 4 }, () => ({}));
  const lenis = {
    scroll: 430,
    isScrolling: false,
    isTouching: false,
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(listener);
    },
    emit(event) { for (const listener of listeners.get(event) || []) listener(this); },
    scrollTo(target, options) {
      calls.push({ target, options });
      this.isScrolling = "smooth";
    },
  };
  let st;
  let education;
  const gsap = {
    registerPlugin() {},
    set(target, values) { styleWrites.push({ target, values }); },
    utils: {
      clamp: (min, max, value) => Math.max(min, Math.min(max, value)),
      toArray: (selector) => selector.includes(".edu__fact") ? facts : ticks,
    },
    timeline({ scrollTrigger }) {
      st = { ...scrollTrigger, start: 100, end: 1100, progress: 0.33, isActive: true };
      return { scrollTrigger: st, to(target, values) { tweens.push({ target, values }); return this; } };
    },
  };
  const sandbox = {
    gsap,
    ScrollTrigger: { create(options) { education = options; } },
    window: { __lenis: lenis },
    document: { querySelector: (selector) => counts.get(selector) || {} },
    performance: { now: () => now },
    setTimeout(callback, delay) {
      timers.set(++timerId, { at: now + delay, callback });
      return timerId;
    },
    clearTimeout(id) { timers.delete(id); },
  };
  runInNewContext(source + "\nthis.buildThesisTimeline = buildThesisTimeline; this.buildEducationTimeline = buildEducationTimeline;", sandbox, { filename: "js/motion.js" });
  sandbox.buildThesisTimeline(null, {});
  return {
    lenis, st, calls, timers, tweens, counts, styleWrites, facts,
    buildEducation() { sandbox.buildEducationTimeline(null); return education; },
    tick(ms) {
      const end = now + ms;
      while (true) {
        const pending = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!pending) break;
        const [id, timer] = pending;
        now = timer.at;
        timers.delete(id);
        timer.callback();
      }
      now = end;
    },
  };
}

let passed = 0;
function check(name, run) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}

check("settled gesture retains 130 ms delay, nearest beat and 700 ms easing", () => {
  const h = setup();
  h.lenis.emit("scroll");
  h.tick(129);
  assert.equal(h.calls.length, 0);
  h.tick(1);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].target, 350);
  assert.equal(h.calls[0].options.duration, 0.7);
  assert.equal(h.calls[0].options.easing(0.5), 0.875);
});

check("fresh wheel input cancels a due timer before the next animation frame", () => {
  const h = setup();
  h.lenis.emit("scroll");
  h.tick(129);
  h.lenis.emit("virtual-scroll");
  assert.equal(h.timers.size, 0);
  h.lenis.isScrolling = "smooth";
  h.tick(50);
  assert.equal(h.calls.length, 0);
  // The real completed scroll emits after reset() clears isScrolling.
  h.lenis.isScrolling = false;
  h.lenis.emit("scroll");
  h.tick(130);
  assert.equal(h.calls[0].target, 350);
});

check("pending timer never replaces a fresh anchor or palette destination", () => {
  const h = setup();
  h.lenis.emit("scroll");
  h.tick(129);
  h.lenis.scrollTo(1800, { offset: -20 });
  h.tick(1);
  assert.deepEqual(h.calls.map((call) => call.target), [1800]);
});

check("a stalled animation frame is not mistaken for settled scrolling", () => {
  const h = setup();
  h.lenis.isScrolling = "smooth";
  h.lenis.emit("scroll");
  h.tick(200);
  assert.equal(h.calls.length, 0);
  h.lenis.isScrolling = false;
  h.lenis.emit("scroll");
  h.tick(130);
  assert.equal(h.calls.length, 1);
});

for (const exit of ["onLeave", "onLeaveBack"]) {
  check(`${exit} clears pending work even if the user immediately re-enters`, () => {
    const h = setup();
    h.lenis.emit("scroll");
    h.tick(129);
    h.st.isActive = false;
    h.st[exit]();
    assert.equal(h.timers.size, 0);
    h.st.isActive = true;
    h.tick(1);
    assert.equal(h.calls.length, 0);
    h.lenis.emit("scroll");
    h.tick(130);
    assert.equal(h.calls.length, 1);
  });
}

check("a resting touch cannot be snapped while the finger is still down", () => {
  const h = setup();
  h.lenis.isTouching = true;
  h.lenis.emit("scroll");
  h.tick(130);
  assert.equal(h.calls.length, 0);
  h.lenis.isTouching = false;
  h.lenis.emit("scroll");
  h.tick(130);
  assert.equal(h.calls.length, 1);
});

check("native keyboard or scrollbar settling keeps the existing snap timing", () => {
  const h = setup();
  h.lenis.isScrolling = "native";
  h.lenis.emit("scroll");
  h.tick(130);
  assert.equal(h.calls[0].target, 350);
});

check("fresh forward entry still presents the opening beat", () => {
  const h = setup();
  h.st.onEnter();
  h.lenis.emit("scroll");
  h.tick(130);
  assert.equal(h.calls[0].target, 100);
});

check("fresh reverse entry still presents the final beat inside the pin", () => {
  const h = setup();
  h.st.progress = 0.7;
  h.st.onEnterBack();
  h.lenis.emit("scroll");
  h.tick(130);
  assert.equal(h.calls[0].target, 1098);
});

check("expired entry catch uses the nearest beat", () => {
  const h = setup();
  h.st.onEnter();
  h.tick(1200);
  h.lenis.emit("scroll");
  h.tick(130);
  assert.equal(h.calls[0].target, 350);
});

check("already-settled positions do not start another scroll", () => {
  const h = setup();
  h.lenis.scroll = 351;
  h.lenis.emit("scroll");
  h.tick(130);
  assert.equal(h.calls.length, 0);
});

check("counter values stay exact while unchanged integers avoid DOM writes", () => {
  const h = setup();
  for (const [selector, end] of [["[data-count-thesis]", 93], ["[data-count-after]", 2]]) {
    const element = h.counts.get(selector);
    const tween = h.tweens.find(({ values }) => values.n === end);
    const initial = Number(element.textContent);
    for (const delta of [0, 0.1, 0.2]) {
      tween.target.n = initial + delta;
      tween.values.onUpdate();
    }
    assert.equal(element.writes, 0);
    tween.target.n = initial + 1.2;
    tween.values.onUpdate();
    assert.equal(element.textContent, String(initial + 1));
    assert.equal(element.writes, 1);
  }
});

check("education facts retain exact reveal values without repeated settled writes", () => {
  const h = setup();
  const education = h.buildEducation();
  h.styleWrites.length = 0;
  education.onUpdate({ progress: 0 });
  assert.equal(h.styleWrites.length, 0);
  education.onUpdate({ progress: 0.16 });
  assert.equal(h.styleWrites.length, 1);
  const alpha = (0.16 - 0.12) / 0.08;
  assert.equal(h.styleWrites[0].values.autoAlpha, alpha);
  assert.equal(h.styleWrites[0].values.y, (1 - alpha) * 16);
  education.onUpdate({ progress: 0.16 });
  assert.equal(h.styleWrites.length, 1);
  education.onUpdate({ progress: 1 });
  const completedWrites = h.styleWrites.length;
  education.onUpdate({ progress: 1 });
  assert.equal(h.styleWrites.length, completedWrites);
  education.onUpdate({ progress: 0 });
  assert.equal(h.styleWrites.length, completedWrites + h.facts.length);
});

console.log(`\n${passed} motion regression checks passed.`);
