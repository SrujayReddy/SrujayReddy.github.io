/* Real vendored GSAP timeline; deterministic input/clock adapters for Lenis.
 * Run: node tests/motion-settle.mjs. No browser or external calls required. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import realGsap from '../assets/vendor/gsap-3.12.5.mjs';

const source = readFileSync(new URL('../js/motion.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export function initMotion', 'function initMotion');
class Element {
  constructor(attributes = []) { this.attributes = new Set(attributes); }
  hasAttribute(name) { return this.attributes.has(name); }
}
function setup() {
  let now = 10000, timerId = 0;
  const timers = new Map(), listeners = new Map(), events = new Map(), calls = [], tweens = [], writes = [];
  const counter = initial => {
    let value = initial, count = 0;
    return { get textContent() { return value; }, set textContent(next) { value = String(next); count++; }, get writes() { return count; } };
  };
  const counts = new Map([['[data-count-thesis]', counter('0')], ['[data-count-after]', counter('75')]]);
  const beats = Array.from({ length: 5 }, () => ({ autoAlpha: 0, y: 20 }));
  const ticks = Array.from({ length: 5 }, () => ({ classList: { toggle() {} } }));
  const facts = Array.from({ length: 4 }, () => ({ autoAlpha: 0, y: 16 }));
  const root = new Element();
  const lenis = {
    scroll: 1000, animatedScroll: 1000, targetScroll: 1000, actualScroll: 1000,
    direction: 1, isScrolling: false, isTouching: false, isStopped: false, isLocked: false,
    resets: 0, rootElement: root, options: { smoothWheel: true },
    on(name, callback) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(callback); },
    emit(name, data = this) { for (const callback of listeners.get(name) || []) callback(data); },
    reset() { this.resets++; this.isScrolling = false; this.animatedScroll = this.targetScroll = this.actualScroll; },
    scrollTo(target, options = {}) { calls.push({ target, options }); this.isScrolling = 'smooth'; },
  };
  let st, timeline, education;
  const gsap = {
    registerPlugin() {},
    set(target, values) { writes.push({ target, values }); realGsap.set(target, values); },
    utils: { ...realGsap.utils, toArray: selector => selector === '.thesis__beat' ? beats : selector === '.edu__fact' ? facts : ticks },
    timeline({ scrollTrigger }) {
      st = { ...scrollTrigger, start: 100, end: 6400, isActive: true, progress: 0 };
      timeline = realGsap.timeline({ paused: true }); timeline.scrollTrigger = st;
      const to = timeline.to;
      timeline.to = function(target, values, position) { tweens.push({ target, values }); return to.call(this, target, values, position); };
      return timeline;
    },
  };
  const window = { __lenis: lenis, innerHeight: 900, addEventListener(name, callback) { if (!events.has(name)) events.set(name, []); events.get(name).push(callback); } };
  const sandbox = { gsap, ScrollTrigger: { create(options) { education = options; } }, window,
    document: { querySelector: selector => counts.get(selector) || {} }, HTMLElement: Element,
    performance: { now: () => now }, setTimeout(callback, delay) { timers.set(++timerId, { at: now + delay, callback }); return timerId; }, clearTimeout(id) { timers.delete(id); } };
  runInNewContext(source + '\nthis.buildThesisTimeline = buildThesisTimeline; this.buildEducationTimeline = buildEducationTimeline; this.cancelMomentum = cancelOppositeWheelMomentum; const originalInstall = installThesisSettling; installThesisSettling = (...args) => { globalThis.holds = args[3]; return originalInstall(...args); };', sandbox);
  sandbox.buildThesisTimeline(null, {});
  const h = { lenis, st, calls, timers, tweens, counts, writes, facts, beats, timeline, holds: sandbox.holds,
    position(y) { lenis.scroll = lenis.animatedScroll = lenis.actualScroll = lenis.targetScroll = y; st.progress = (y - st.start) / (st.end - st.start); },
    range(index) { const hold = sandbox.holds[index], span = st.end - st.start; return { start: st.start + hold.start / timeline.duration() * span, end: st.start + hold.end / timeline.duration() * span }; },
    input(deltaY, extra = {}) { lenis.emit('virtual-scroll', { deltaY, event: { type: 'wheel', ...extra } }); },
    event(name, data) { for (const callback of events.get(name) || []) callback(data); },
    momentum(deltaY, extra = {}, nested = null) { sandbox.cancelMomentum(lenis, { deltaY, event: { type: 'wheel', composedPath: () => nested ? [nested, root] : [root], ...extra } }); },
    buildEducation() { sandbox.buildEducationTimeline(null); return education; },
    tick(ms) { const end = now + ms; while (true) { const pending = [...timers].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0]; if (!pending) break; const [id,t] = pending; now=t.at;timers.delete(id);t.callback(); } now=end; },
  };
  return h;
}
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }
function approaching(direction = 1) {
  const h = setup(), range = h.range(1);
  h.position(direction > 0 ? range.start - 60 : range.end + 60);
  h.input(direction * 20); h.lenis.emit('scroll'); return h;
}
check('readable holds follow the real timeline and wait for completed counters', () => {
  const h = setup(); assert.equal(h.timeline.duration(), 6.1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.holds)), [{start:0,end:.25},{start:.95,end:1.2},{start:2.7,end:2.95},{start:4.55,end:4.8},{start:5.5,end:6.1}]);
  for (let i=0; i<h.holds.length; i++) {
    h.timeline.time((h.holds[i].start+h.holds[i].end)/2);
    assert.equal(h.beats[i].autoAlpha, 1); assert.equal(h.beats[i].y, 0);
    h.beats.forEach((beat,j) => { if (i !== j) assert.equal(beat.autoAlpha, 0); });
    if(i===2) assert.equal(h.counts.get('[data-count-thesis]').textContent, '93');
    if(i===3) assert.equal(h.counts.get('[data-count-after]').textContent, '2');
  }
});
for(const direction of [1,-1]) check('small settle follows direction ' + direction + ' and enters a readable hold', () => {
  const h = approaching(direction), from=h.lenis.scroll; h.tick(129); assert.equal(h.calls.length,0);h.tick(1);
  assert.equal(h.calls.length,1);const call=h.calls[0], range=h.range(1);
  assert.ok((call.target-from)*direction>0); assert.ok(Math.abs(call.target-from)<=120); assert.ok(call.target>=range.start && call.target<=range.end);
  assert.equal(call.options.duration,.7);assert.equal(call.options.easing(.5),.875);
  h.timeline.time((call.target-h.st.start)/(h.st.end-h.st.start)*h.timeline.duration());assert.equal(h.beats[1].autoAlpha,1);
});
check('a small down gesture cannot be rewound to the previous beat', () => {const h=setup();h.position(1700);h.input(20);h.lenis.emit('scroll');h.tick(130);assert.equal(h.calls.length,0);});
check('large settle jumps and entry catches are suppressed', () => {for(const progress of [.01,.34,.5,.99]){const h=setup();h.position(h.st.start+progress*(h.st.end-h.st.start));h.input(30);h.lenis.emit('scroll');h.tick(130);assert.equal(h.calls.length,0);}});
check('already readable holds preserve the exact scroll position',()=>{const h=setup(),r=h.range(2);h.position((r.start+r.end)/2);h.input(20);h.lenis.emit('scroll');h.tick(130);assert.equal(h.calls.length,0);});
check('settling requires user input and consumes the gesture once',()=>{const h=setup();h.position(h.range(1).start-60);h.lenis.emit('scroll');h.tick(130);assert.equal(h.calls.length,0);h.input(20);h.lenis.emit('scroll');h.tick(130);assert.equal(h.calls.length,1);h.lenis.isScrolling=false;h.lenis.emit('scroll');h.tick(300);assert.equal(h.calls.length,1);});
check('new raw input cancels a due settle before its next frame',()=>{const h=approaching();h.tick(129);h.input(-20);assert.equal(h.timers.size,0);h.tick(200);assert.equal(h.calls.length,0);});
check('new programmatic navigation cancels pending assistance synchronously',()=>{const h=approaching();h.tick(129);h.lenis.scrollTo(9000,{offset:-20});h.tick(1);assert.deepEqual(h.calls.map(c=>c.target),[9000]);});
check('an unfinished or stalled smooth frame cannot settle',()=>{const h=approaching();h.lenis.isScrolling='smooth';h.tick(300);assert.equal(h.calls.length,0);h.lenis.isScrolling=false;h.lenis.emit('scroll');h.tick(130);assert.equal(h.calls.length,1);});
for(const exit of ['onLeave','onLeaveBack']) check(exit+' discards assistance across re-entry',()=>{const h=approaching();h.tick(129);h.st.isActive=false;h.st[exit]();h.st.isActive=true;h.tick(300);h.lenis.emit('scroll');h.tick(130);assert.equal(h.calls.length,0);});
check('native touch inertia must end and the finger must lift before settling',()=>{const h=approaching();h.lenis.isScrolling='native';h.lenis.isTouching=true;h.lenis.emit('scroll');h.tick(500);assert.equal(h.calls.length,0);h.lenis.isScrolling=false;h.lenis.emit('scroll');h.tick(500);assert.equal(h.calls.length,0);h.lenis.isTouching=false;h.lenis.emit('scroll');h.tick(130);assert.equal(h.calls.length,1);});
check('native scroll keys replace wheel momentum and wait for actual rest',()=>{const h=setup();h.position(h.range(1).start-60);h.lenis.isScrolling='smooth';h.event('keydown',{key:'PageDown'});assert.equal(h.lenis.resets,1);h.lenis.isScrolling='native';h.lenis.emit('scroll');h.tick(500);assert.equal(h.calls.length,0);h.lenis.isScrolling=false;h.lenis.emit('scroll');h.tick(130);assert.equal(h.calls.length,1);});
check('modified keys and editable controls cannot reset momentum or arm a snap',()=>{for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{defaultPrevented:true},{target:{isContentEditable:true}},{target:{closest:()=>true}}]){const h=setup();h.lenis.isScrolling='smooth';h.event('keydown',{key:'ArrowDown',...extra});assert.equal(h.lenis.resets,0);h.lenis.isScrolling=false;h.lenis.emit('scroll');h.tick(500);assert.equal(h.calls.length,0);}});
check('a pointer gesture cancels pending assistance',()=>{const h=approaching();h.tick(129);h.event('pointerdown',{});h.tick(200);assert.equal(h.calls.length,0);});
check('opposite wheel input clears the old target instead of subtracting from it',()=>{const h=setup();h.lenis.targetScroll=1600;h.lenis.isScrolling='smooth';h.momentum(-20);assert.equal(h.lenis.resets,1);assert.equal(h.lenis.targetScroll,h.lenis.actualScroll);assert.equal(h.lenis.isScrolling,false);});
check('same-direction and unrelated wheel input retain momentum',()=>{for(const extra of [{deltaY:20},{deltaY:0},{ctrlKey:true},{defaultPrevented:true},{lenisStopPropagation:true},{type:'touchmove'}]){const h=setup();h.lenis.targetScroll=1600;h.momentum(extra.deltaY??-20,extra);assert.equal(h.lenis.resets,0);assert.equal(h.lenis.targetScroll,1600);}});
check('nested prevented wheel input cannot reset page momentum',()=>{for(const attributes of [['data-lenis-prevent'],['data-lenis-prevent-wheel']]){const h=setup();h.lenis.targetScroll=1600;h.momentum(-20,{},new Element(attributes));assert.equal(h.lenis.resets,0);}const h=setup();h.lenis.targetScroll=1600;h.lenis.options.prevent=()=>true;h.momentum(-20,{},new Element());assert.equal(h.lenis.resets,0);});
check('locked, stopped and native wheel paths retain their own state',()=>{for(const state of ['isLocked','isStopped','native']){const h=setup();h.lenis.targetScroll=1600;if(state==='native')h.lenis.options.smoothWheel=false;else h.lenis[state]=true;h.momentum(-20);assert.equal(h.lenis.resets,0);}});
check('counter values remain exact and unchanged integers avoid DOM writes',()=>{const h=setup();for(const [selector,end] of [['[data-count-thesis]',93],['[data-count-after]',2]]){const el=h.counts.get(selector),t=h.tweens.find(t=>t.values.n===end),start=Number(el.textContent);for(const d of [0,.1,.2]){t.target.n=start+d;t.values.onUpdate();}assert.equal(el.writes,0);t.target.n=start+1.2;t.values.onUpdate();assert.equal(el.textContent,String(start+1));assert.equal(el.writes,1);}});
check('education fact reveals preserve exact values without repeated writes',()=>{const h=setup(),education=h.buildEducation();h.writes.length=0;education.onUpdate({progress:0});assert.equal(h.writes.length,0);education.onUpdate({progress:.16});assert.equal(h.writes.length,1);assert.equal(h.writes[0].values.autoAlpha,(.16-.12)/.08);education.onUpdate({progress:.16});assert.equal(h.writes.length,1);education.onUpdate({progress:1});const n=h.writes.length;education.onUpdate({progress:1});assert.equal(h.writes.length,n);education.onUpdate({progress:0});assert.equal(h.writes.length,n+h.facts.length);});
realGsap.ticker.sleep();console.log('\n'+passed+' motion regression checks passed.');
