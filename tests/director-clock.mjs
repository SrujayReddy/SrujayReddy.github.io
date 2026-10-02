/* Verify single-driver rendering and unchanged simulation timing without a GPU.
 * Run: node tests/director-clock.mjs (uses the checked-in Three.js module).
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "../assets/vendor/three-0.169.0.mjs";

let now = 0, nextRaf = 0;
const pending = new Map();
globalThis.requestAnimationFrame = (callback) => {
  pending.set(++nextRaf, callback);
  return nextRaf;
};
globalThis.cancelAnimationFrame = (id) => pending.delete(id);
globalThis.window = {
  innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
  addEventListener() {}, removeEventListener() {},
};
class Clock {
  constructor() { this.last = now; }
  getDelta() { const delta = now - this.last; this.last = now; return delta; }
}
class Renderer {
  constructor() { this.calls = 0; this.disposals = 0; }
  setClearColor() {}
  setPixelRatio() {}
  setSize() {}
  render() { this.calls++; }
  dispose() { this.disposals++; }
}
class Ticker {
  listeners = [];
  add(callback) { this.remove(callback); this.listeners.push(callback); }
  remove(callback) { this.listeners = this.listeners.filter((item) => item !== callback); }
  tick() { for (const callback of [...this.listeners]) callback(now); }
}
globalThis.__directorClockThree = { ...THREE, Clock, WebGLRenderer: Renderer };
const railUrl = new URL("../js/webgl/camera-rail.js", import.meta.url).href;
const source = (await readFile(new URL("../js/webgl/director.js", import.meta.url), "utf8"))
  .replace('import * as THREE from "three";', "const THREE = globalThis.__directorClockThree;")
  .replace('"./camera-rail.js"', JSON.stringify(railUrl));
const { createSceneDirector } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

function fixture() {
  let ctx;
  const samples = [];
  const director = createSceneDirector({});
  const act = director.register({
    id: "test", group: new THREE.Group(),
    init(value) { ctx = value; },
    update(dt) { samples.push({ dt, progress: this.progress }); },
  });
  director.setActive("test", true);
  return { director, act, ctx, samples };
}
function flushRaf() {
  const callbacks = [...pending.values()];
  pending.clear();
  callbacks.forEach((callback) => callback(now * 1000));
}
function compare(a, b) {
  assert.deepEqual(a.samples, b.samples, "one update per frame with the same progress and dt");
  assert.equal(a.act.opacity, b.act.opacity);
  for (const name of ["uTime", "uTheme", "uMouse"]) assert.deepEqual(a.ctx.shared[name], b.ctx.shared[name]);
  assert.deepEqual(a.ctx.camera.position.toArray(), b.ctx.camera.position.toArray());
  assert.deepEqual(a.ctx.camera.quaternion.toArray(), b.ctx.camera.quaternion.toArray());
  assert.equal(a.ctx.renderer.calls, b.ctx.renderer.calls);
}

const actual = fixture(), reference = fixture();
reference.director.attachTicker(new Ticker()); // reference advances explicitly
assert.equal(pending.size, 1, "standalone/lab uses its own RAF");
let last = now;
for (let i = 0; i < 5; i++) {
  now += 1 / 60;
  flushRaf();
  reference.director.step(now - last);
  last = now;
}
compare(actual, reference);

const ticker = new Ticker();
let progress = 0;
ticker.add(() => {
  // Models the Lenis/ScrollTrigger listener registered before graphics.
  for (const item of [actual, reference]) {
    item.director.setProgress("test", progress);
    item.director.setRide(progress);
  }
});
actual.director.attachTicker(ticker);
actual.director.attachTicker(ticker);
assert.equal(pending.size, 0, "attaching cancels the standalone RAF");
assert.equal(ticker.listeners.length, 2, "repeat attachment cannot duplicate the renderer");
for (let i = 0; i < 120; i++) {
  now += i < 60 ? 1 / 60 : 1 / 120;
  progress = i / 119;
  ticker.tick();
  reference.director.step(now - last);
  last = now;
  assert.equal(actual.samples.at(-1).progress, progress, "graphics sees this frame's scroll state");
}
compare(actual, reference);

const beforePause = actual.samples.length;
actual.director.setRunning(false);
now += 30;
ticker.tick();
assert.equal(actual.samples.length, beforePause, "hidden/paused rendering does no simulation");
actual.director.setRunning(true);
last = now;
now += 1 / 60;
ticker.tick();
reference.director.step(now - last);
compare(actual, reference);
assert(actual.samples.at(-1).dt < 0.017, "resume does not feed the background interval into simulation");

const replacement = new Ticker();
actual.director.attachTicker(replacement);
assert.equal(ticker.listeners.length, 1, "replacing a ticker removes the old graphics listener");
assert.equal(replacement.listeners.length, 1);
actual.director.attachTicker(null);
assert.equal(replacement.listeners.length, 0);
assert.equal(pending.size, 1, "detaching restores standalone RAF");
now += 1 / 60;
flushRaf();
const beforeManual = actual.samples.length;
actual.director.setRunning(false);
actual.director.step(0.012);
assert.equal(actual.samples.length, beforeManual + 1, "manual verification step stays available while paused");
assert.equal(actual.samples.at(-1).dt, 0.012);

actual.director.attachTicker(replacement);
actual.director.dispose();
actual.director.dispose();
assert.equal(replacement.listeners.length, 0, "dispose removes the ticker listener");
assert.equal(pending.size, 0, "dispose leaves no RAF callbacks");
assert.equal(actual.ctx.renderer.disposals, 1);
const afterDispose = actual.samples.length;
now += 1;
replacement.tick();
actual.director.attachTicker(ticker);
assert.equal(actual.samples.length, afterDispose);
assert.equal(ticker.listeners.length, 1, "disposed directors cannot reattach");
reference.director.dispose();

console.log("PASS: single frame driver, same-frame scroll state, exact 60/120 Hz simulation parity, standalone fallback, pause/resume, manual step and disposal.");
