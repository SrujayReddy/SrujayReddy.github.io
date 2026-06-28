/*
 * scene.js — the WebGL particle system that threads the whole page.
 *
 * One coherent field of points that:
 *   • breathes as a soft cluster in the hero (cursor-reactive parallax), and
 *   • morphs into a data formation (a stacked cold-start timeline) as the
 *     thesis section is scrolled — the "image pull" segment dominates and glows.
 *
 * No postprocessing dependency: the glow is achieved with additive blending +
 * soft point sprites, which keeps the no-build stack robust (no second three
 * instance from examples/jsm). Perf guards: DPR<=2, device-scaled particle
 * count, pause when offscreen, graceful no-WebGL signal to the caller.
 */

import * as THREE from "three";
import { content } from "../content.js";

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;     // 0 = cluster, 1 = data formation
  uniform vec2  uMouse;     // -1..1
  uniform float uPixelRatio;
  uniform float uSizeScale;

  attribute vec3  aData;
  attribute float aSize;
  attribute float aSeed;
  attribute float aColorMix;

  varying float vColorMix;
  varying float vAlpha;

  // easing
  float ease(float t){ return t*t*(3.0 - 2.0*t); }

  void main() {
    float m = ease(clamp(uMorph, 0.0, 1.0));

    // home (cluster) gets a gentle breathing drift + cursor parallax that
    // fades out as we morph into data.
    vec3 home = position;
    float breath = sin(uTime * 0.6 + aSeed * 6.2831) * 0.12;
    home += normalize(home + 0.001) * breath;
    float depth = (home.z + 3.0) / 6.0;            // 0..1-ish
    home.xy += uMouse * (0.5 + depth) * (1.0 - m) * 0.6;

    vec3 pos = mix(home, aData, m);

    // a little turbulence mid-morph so particles "flow" into place
    float turb = sin(uTime * 1.2 + aSeed * 12.0) * 0.18 * (m * (1.0 - m)) * 4.0;
    pos.z += turb;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float size = aSize * uSizeScale * (1.0 + m * 0.25);
    gl_PointSize = size * uPixelRatio * (140.0 / -mv.z);

    vColorMix = aColorMix;
    // dim the non-dominant data points a touch; keep cluster bright
    vAlpha = mix(0.85, mix(0.35, 1.0, aColorMix), m);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform float uMorph;
  varying float vColorMix;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    // soft radial falloff -> glow
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.6);

    // ink (off-white) -> plasma (indigo/violet/cyan) by colorMix
    vec3 ink    = vec3(0.86, 0.88, 0.94);
    vec3 indigo = vec3(0.39, 0.40, 0.95);
    vec3 cyan   = vec3(0.13, 0.83, 0.93);
    vec3 plasma = mix(indigo, cyan, clamp(vColorMix*0.6 + uMorph*0.4, 0.0, 1.0));
    vec3 col = mix(ink, plasma, clamp(vColorMix, 0.0, 1.0));

    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

export function isWebGLAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch (e) {
    return false;
  }
}

export function createScene(canvas, { onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0); // transparent — CSS bg shows through

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  // ── device-scaled particle count ─────────────────────────────
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const small = Math.min(window.innerWidth, window.innerHeight) < 760;
  const COUNT = small ? 4200 : 9000;

  // ── build attributes ─────────────────────────────────────────
  const homes = new Float32Array(COUNT * 3);
  const datas = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);
  const mixes = new Float32Array(COUNT);

  // cumulative shares for the data formation (the breakdown bar)
  const segs = content.thesis.breakdown;
  const total = segs.reduce((s, x) => s + x.share, 0);
  const bounds = [];
  let acc = 0;
  for (const s of segs) {
    const start = acc / total;
    acc += s.share;
    bounds.push({ start, end: acc / total, dominant: !!s.dominant });
  }

  const BAR_W = 8.2;
  const BAR_H = 1.5;

  function pickSegment() {
    const r = Math.random();
    for (let i = 0; i < bounds.length; i++) {
      if (r >= bounds[i].start && r < bounds[i].end) return bounds[i];
    }
    return bounds[bounds.length - 1];
  }

  for (let i = 0; i < COUNT; i++) {
    // home: soft gaussian sphere cluster
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 2.4 * Math.cbrt(Math.random());
    homes[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    homes[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.8;
    homes[i * 3 + 2] = r * Math.cos(phi);

    // data: position inside the assigned segment of a wide bar
    const seg = pickSegment();
    const segX0 = -BAR_W / 2 + seg.start * BAR_W;
    const segX1 = -BAR_W / 2 + seg.end * BAR_W;
    datas[i * 3 + 0] = segX0 + Math.random() * (segX1 - segX0);
    datas[i * 3 + 1] = (Math.random() - 0.5) * BAR_H;
    datas[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

    sizes[i] = 6 + Math.random() * 10;
    seeds[i] = Math.random();
    mixes[i] = seg.dominant ? 0.7 + Math.random() * 0.3 : Math.random() * 0.18;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(homes, 3));
  geo.setAttribute("aData", new THREE.BufferAttribute(datas, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aColorMix", new THREE.BufferAttribute(mixes, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uPixelRatio: { value: dpr },
    uSizeScale: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, material);
  scene.add(points);

  // ── interaction / state ──────────────────────────────────────
  const mouseTarget = new THREE.Vector2(0, 0);
  const mouse = new THREE.Vector2(0, 0);
  let morphTarget = 0;
  let running = true;
  let ready = false;
  let raf = 0;
  const clock = new THREE.Clock();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the data bar framed on narrow screens
    uniforms.uSizeScale.value = w < 760 ? 0.8 : 1;
    camera.position.z = w < 760 ? 7.6 : 6.2;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  function onPointer(e) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -((e.clientY / window.innerHeight) * 2 - 1);
    mouseTarget.set(x, y);
  }
  window.addEventListener("pointermove", onPointer, { passive: true });

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;

    // smooth mouse + morph
    mouse.lerp(mouseTarget, 0.06);
    uniforms.uMouse.value.copy(mouse);
    uniforms.uMorph.value += (morphTarget - uniforms.uMorph.value) * 0.08;

    // slow camera drift for parallax life
    camera.position.x = Math.sin(uniforms.uTime.value * 0.12) * 0.18;
    camera.position.y = Math.cos(uniforms.uTime.value * 0.1) * 0.12;
    camera.lookAt(0, 0, 0);

    points.rotation.z = (1 - uniforms.uMorph.value) * Math.sin(uniforms.uTime.value * 0.08) * 0.06;

    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      onReady && onReady();
    }
  }
  loop();

  return {
    setMorph(t) {
      morphTarget = Math.max(0, Math.min(1, t));
    },
    setRunning(v) {
      running = v;
      if (v) clock.getDelta(); // avoid a big dt jump on resume
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      geo.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
