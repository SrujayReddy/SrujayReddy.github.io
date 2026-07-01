/*
 * director.js — the SceneDirector.
 *
 * Owns ONE WebGLRenderer, ONE Scene, ONE PerspectiveCamera, ONE rAF loop for
 * the whole page. Per-section "acts" register against it; the director
 * crossfades them, threads a shared `uTheme` uniform through all of them (so a
 * light/dark toggle never rebuilds geometry), travels the shared camera as one
 * continuous dolly, and pauses entirely when nothing is on screen.
 *
 * Design rules (from the project design bible):
 *   • Light is primary. Each act swaps NormalBlending (ink on paper) ↔
 *     AdditiveBlending (glow on near-black) via setTheme — never a rebuild.
 *   • One render() per frame; the loop is the only driver (Lenis already drives
 *     gsap.ticker, so we do NOT use setAnimationLoop).
 *   • Dependency-free: this module imports only three. Motion (gsap/lenis) lives
 *     in motion.js and merely calls director.setProgress / setActive.
 *   • Everything is a pure function of progress so scrubbing reverses cleanly,
 *     and a deterministic hook (window.__cinema) can drive any state for tests.
 *
 * Act contract (see webgl/field.js for the reference implementation):
 *   {
 *     id: string,
 *     group?: THREE.Object3D,           // added to the scene; visibility managed
 *     init(ctx),                        // build geometry/materials
 *     setProgress(p),                   // 0..1 within the act's section
 *     setActive(on),                    // entering/leaving the viewport
 *     setTheme("light"|"dark"),         // flip blending + palette uniforms
 *     update(dt, ctx),                  // per-frame; use this.opacity for fades
 *     cameraRig?(p, camera, ctx),       // dominant act may pose the camera
 *     resize(w, h, ctx),
 *     dispose(),
 *   }
 */

import * as THREE from "three";
import { createCameraRail } from "./camera-rail.js";

export function createSceneDirector(canvas, { getTheme = () => "light" } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    // straight (non-premultiplied) alpha so the SAME shader output works under
    // both NormalBlending (light, ink-over-paper) and AdditiveBlending (dark, glow).
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0); // transparent — the CSS theme bg shows through

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  const CAM_HOME = new THREE.Vector3(0, 0, 6.2);
  camera.position.copy(CAM_HOME);

  // ── unified camera RIDE: one CatmullRomCurve3 the whole page scrolls along ──
  const rail = createCameraRail(THREE);
  let rideActive = true; // the spline drives the camera (legacy idle drift if false)
  let rideT = 0;         // smoothed 0..1 position along the track
  let rideTarget = 0;    // scroll-mapped target (set via api.setRide)
  const railPos = new THREE.Vector3();
  const railLook = new THREE.Vector3();

  const isMobile = Math.min(window.innerWidth, window.innerHeight) < 760;

  // Shared uniforms — passed BY REFERENCE into every act's material.
  const shared = {
    uTime: { value: 0 },
    uTheme: { value: getTheme() === "dark" ? 1 : 0 }, // 0 = light, 1 = dark
    uDpr: { value: dpr },
    uViewport: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uVibe: { value: new THREE.Color(0.5, 0.45, 0.95) }, // Vibe Studio accent (linear)
    uVibeMix: { value: 0 }, // 0 = no recolor
  };

  const ctx = { THREE, scene, camera, renderer, shared, dpr, isMobile };

  const acts = new Map();
  const order = [];

  // ── pointer parallax (smoothed) ──────────────────────────────
  const mouseTarget = new THREE.Vector2(0, 0);
  function onPointer(e) {
    mouseTarget.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1)
    );
  }
  if (!isMobile) window.addEventListener("pointermove", onPointer, { passive: true });

  // ── lifecycle ────────────────────────────────────────────────
  let running = true;
  let ready = false;
  let onReady = null;
  let raf = 0;
  const clock = new THREE.Clock();
  let themeTarget = shared.uTheme.value;
  const camPos = new THREE.Vector3().copy(CAM_HOME);
  const camLook = new THREE.Vector3(0, 0, 0);

  function register(act) {
    act.progress = 0;
    act.opacity = 0;
    act._opacityTarget = 0;
    if (act.init) act.init(ctx); // build geometry/materials (may set act.group)
    if (act.group) {
      act.group.visible = false;
      scene.add(act.group);
    }
    if (act.setTheme) act.setTheme(shared.uTheme.value >= 0.5 ? "dark" : "light");
    acts.set(act.id, act);
    order.push(act.id);
    return act;
  }

  function setActive(id, on) {
    const a = acts.get(id);
    if (!a) return;
    a._opacityTarget = on ? 1 : 0;
    if (on && a.group) a.group.visible = true;
  }

  function setProgress(id, p) {
    const a = acts.get(id);
    if (!a) return;
    a.progress = Math.max(0, Math.min(1, p));
    if (a.setProgress) a.setProgress(a.progress);
  }

  function setTheme(theme) {
    themeTarget = theme === "dark" ? 1 : 0;
    for (const a of acts.values()) if (a.setTheme) a.setTheme(theme);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    shared.uViewport.value.set(w, h);
    for (const a of acts.values()) if (a.resize) a.resize(w, h, ctx);
  }

  function dominant() {
    let best = null;
    for (const a of acts.values()) {
      if (a.opacity > 0.001 && (!best || a.opacity > best.opacity)) best = a;
    }
    return best;
  }

  // One simulation+render step. Extracted from the rAF loop so it can be driven
  // manually (window.__cinema.step) to verify states in environments where rAF
  // is throttled (e.g. a hidden/background tab).
  function step(dt) {
    shared.uTime.value += dt;

    // smoothed theme crossfade (hides the blend-mode swap)
    shared.uTheme.value += (themeTarget - shared.uTheme.value) * Math.min(1, dt * 6);

    // smoothed pointer
    shared.uMouse.value.lerp(mouseTarget, 0.06);

    // per-act opacity easing + update
    for (const a of acts.values()) {
      a.opacity += (a._opacityTarget - a.opacity) * Math.min(1, dt * 4);
      if (a.opacity < 0.002 && a._opacityTarget === 0) {
        a.opacity = 0;
        if (a.group) a.group.visible = false;
      }
      if (a.update) a.update(dt, ctx);
    }

    // camera: ride the unified spline (one continuous track), or legacy idle drift
    if (rideActive) {
      rideT += (rideTarget - rideT) * Math.min(1, dt * 2.4); // gently smooth the mapping (no abrupt swings)
      rail.posAt(rideT, railPos);
      rail.lookAt(rideT, railLook);
      // a whisper of parallax breath so static holds never feel frozen
      railPos.x += Math.sin(shared.uTime.value * 0.12) * 0.05;
      railPos.y += Math.cos(shared.uTime.value * 0.1) * 0.04;
      camera.position.lerp(railPos, 0.16);
      camera.lookAt(railLook);
    } else {
      const dom = dominant();
      camPos.copy(CAM_HOME);
      camPos.x += Math.sin(shared.uTime.value * 0.12) * 0.18;
      camPos.y += Math.cos(shared.uTime.value * 0.1) * 0.12;
      camLook.set(0, 0, 0);
      if (dom && dom.cameraRig) dom.cameraRig(dom.progress, camPos, camLook, dom.opacity, ctx);
      camera.position.lerp(camPos, 0.08);
      camera.lookAt(camLook);
    }

    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      if (onReady) onReady();
    }
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    step(Math.min(clock.getDelta(), 0.05));
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  loop();

  const api = {
    register,
    setActive,
    setProgress,
    setTheme,
    /** Map global scroll (0..1) to the camera's position along the unified rail. */
    setRide(t) { rideTarget = t < 0 ? 0 : t > 1 ? 1 : t; },
    /** Toggle the spline ride (false → legacy per-act idle drift). */
    setRideActive(v) { rideActive = !!v; },
    get rail() { return rail; },
    /** Vibe Studio: tint the particle field toward an accent hex (falsy = reset). */
    setVibe(hex) {
      if (hex && /^#[0-9a-f]{6}$/i.test(hex)) { shared.uVibe.value.set(hex); shared.uVibeMix.value = 0.55; }
      else { shared.uVibeMix.value = 0; }
    },
    get camera() {
      return camera;
    },
    setRunning(v) {
      running = v;
      if (v) clock.getDelta(); // avoid a dt spike on resume
    },
    /** Manually advance + render one frame (for verification when rAF is throttled). */
    step(dt = 0.016) {
      step(dt);
    },
    onReady(cb) {
      if (ready) cb();
      else onReady = cb;
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      for (const a of acts.values()) if (a.dispose) a.dispose();
      renderer.dispose();
    },
  };
  return api;
}
