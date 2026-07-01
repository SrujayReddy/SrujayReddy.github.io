/*
 * field.js — "the organism": the one particle field that threads the whole page.
 *
 * It lives as a single Points object behind every section. In the hero it is a
 * soft drifting cluster (cursor-reactive); sections morph it into named
 * formations (a "SJ" monogram, a latency clock, an agent graph, …) by swapping
 * the active target buffer and driving uMorph 0→1. One geometry, one draw call,
 * re-forming — never separate particle systems.
 *
 * Theme is the load-bearing detail. On LIGHT it renders as fine graphite/jewel
 * ink with NormalBlending (alpha-over) so it reads on near-white instead of
 * blowing out to a white blob. On DARK it switches to AdditiveBlending with
 * off-white + bright plasma so it glows on near-black. The swap is a one-time
 * blending change under a uTheme color crossfade — no geometry rebuild.
 *
 * Exposes makeFieldAct() → an act for the SceneDirector (see director.js).
 */

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uTheme;       // 0 light, 1 dark
  uniform float uDpr;
  uniform float uSizeScale;
  uniform float uMorph;       // 0 = home cluster, 1 = active formation
  uniform vec2  uMouse;       // -1..1, smoothed

  attribute vec3  aTarget;
  attribute float aSize;
  attribute float aSeed;
  attribute float aColorMix;  // 0 ink … 1 plasma

  varying float vColorMix;

  float ease(float t){ return t*t*(3.0 - 2.0*t); }

  void main() {
    float m = ease(clamp(uMorph, 0.0, 1.0));

    // home: gentle breathing drift + cursor parallax that relaxes as we morph.
    vec3 home = position;
    float breath = sin(uTime * 0.55 + aSeed * 6.2831) * 0.10;
    home += normalize(home + 0.0001) * breath;
    float depth = clamp((home.z + 3.0) / 6.0, 0.0, 1.0);
    home.xy += uMouse * (0.18 + depth * 0.32) * (1.0 - m);

    vec3 pos = mix(home, aTarget, m);

    // a little turbulence mid-morph so points "flow" into formation
    float turb = sin(uTime * 1.1 + aSeed * 12.0) * 0.16 * (m * (1.0 - m)) * 4.0;
    pos.z += turb;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // light points read as fine crisp specks; dark points bloom into glow.
    float themeSize = mix(0.7, 1.25, uTheme);
    float size = aSize * uSizeScale * themeSize * (1.0 + m * 0.18);
    gl_PointSize = size * uDpr * (9.0 / -mv.z);

    vColorMix = aColorMix;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTheme;
  uniform float uOpacity;
  uniform vec3  uVibe;     // Vibe Studio accent (linear)
  uniform float uVibeMix;  // 0 = off
  varying float vColorMix;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    // crisp tight cores on light, softer haloes on dark
    a = pow(a, mix(2.4, 1.5, uTheme));

    // LIGHT: graphite ink + jewel-ink plasma (alpha-over on paper).
    vec3 inkL    = vec3(0.16, 0.17, 0.24);
    vec3 indigoL = vec3(0.31, 0.27, 0.90);   // ~#4f46e5
    vec3 cyanL   = vec3(0.05, 0.45, 0.57);   // ~#0e7490
    vec3 plasmaL = mix(indigoL, cyanL, clamp(vColorMix, 0.0, 1.0));
    vec3 colL    = mix(inkL, plasmaL, clamp(vColorMix * 1.1, 0.0, 1.0));

    // DARK: off-white ink + bright plasma (additive glow on near-black).
    vec3 inkD    = vec3(0.86, 0.88, 0.94);
    vec3 indigoD = vec3(0.39, 0.40, 0.95);
    vec3 cyanD   = vec3(0.13, 0.83, 0.93);
    vec3 plasmaD = mix(indigoD, cyanD, clamp(vColorMix, 0.0, 1.0));
    vec3 colD    = mix(inkD, plasmaD, clamp(vColorMix, 0.0, 1.0));

    vec3 col = mix(colL, colD, uTheme);
    // Vibe Studio: tint the plasma particles toward the chosen accent (0 = off).
    col = mix(col, uVibe, uVibeMix * clamp(vColorMix * 1.2, 0.0, 1.0));

    // alpha: light needs restraint (alpha-over stacks → haze); dark accent glows.
    float alphaL = mix(0.11, 0.45, vColorMix);
    float alphaD = mix(0.40, 0.95, vColorMix);
    float alpha = mix(alphaL, alphaD, uTheme);

    gl_FragColor = vec4(col, a * alpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

export function makeFieldAct() {
  let THREE, geo, material, points, targets;
  let homesRef, colorArr, baseColors;
  const uSizeScale = { value: 1 };
  const uMorph = { value: 0 };
  const uOpacity = { value: 1 };
  const formations = new Map(); // name -> { pos: Float32Array(COUNT*3), col: Float32Array(COUNT)|null }
  let morphWanted = 0;
  let COUNT = 0;

  return {
    id: "field",
    opacity: 1,

    init(ctx) {
      THREE = ctx.THREE;
      const { shared, isMobile } = ctx;
      COUNT = isMobile ? 4200 : 9000;
      uSizeScale.value = isMobile ? 0.85 : 1;

      const homes = new Float32Array(COUNT * 3);
      targets = new Float32Array(COUNT * 3);
      const sizes = new Float32Array(COUNT);
      const seeds = new Float32Array(COUNT);
      const mixes = new Float32Array(COUNT);

      for (let i = 0; i < COUNT; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2 * v - 1);
        const r = 3.05 * Math.cbrt(Math.random());
        const x = r * Math.sin(phi) * Math.cos(theta) * 1.25;
        const y = r * Math.sin(phi) * Math.sin(theta) * 0.78;
        const z = r * Math.cos(phi) * 0.9;
        homes[i * 3] = x;
        homes[i * 3 + 1] = y;
        homes[i * 3 + 2] = z;
        targets[i * 3] = x;
        targets[i * 3 + 1] = y;
        targets[i * 3 + 2] = z;
        sizes[i] = 2.0 + Math.random() * 4.0;
        seeds[i] = Math.random();
        mixes[i] = Math.random() < 0.18 ? 0.55 + Math.random() * 0.45 : Math.random() * 0.1;
      }

      homesRef = homes;
      colorArr = mixes;
      baseColors = mixes.slice();

      geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(homes, 3));
      geo.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
      geo.setAttribute("aColorMix", new THREE.BufferAttribute(mixes, 1));

      material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: shared.uTime,
          uTheme: shared.uTheme,
          uDpr: shared.uDpr,
          uMouse: shared.uMouse,
          uVibe: shared.uVibe,
          uVibeMix: shared.uVibeMix,
          uSizeScale,
          uMorph,
          uOpacity,
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      });

      points = new THREE.Points(geo, material);
      points.frustumCulled = false;
      this.group = points;
    },

    /** Number of particles (so formation builders can size their buffers). */
    get count() {
      return COUNT;
    },

    /** Register a formation: positions (COUNT*3) + optional per-particle colors (COUNT). */
    addFormation(name, pos, col = null) {
      formations.set(name, { pos, col });
    },

    /** Swap the active formation (instant; pair with setMorph). "home" restores base. */
    setFormation(name) {
      if (!geo) return;
      const f = formations.get(name);
      if (!f) {
        // restore the home cluster + original colors
        targets.set(homesRef);
        colorArr.set(baseColors);
      } else {
        targets.set(f.pos);
        colorArr.set(f.col || baseColors);
      }
      geo.attributes.aTarget.needsUpdate = true;
      geo.attributes.aColorMix.needsUpdate = true;
    },

    /** 0 = home cluster, 1 = current formation (smoothed in update). */
    setMorph(t) {
      morphWanted = Math.max(0, Math.min(1, t));
    },

    setActive() {
      /* always-on substrate; opacity is managed by the director */
    },

    setTheme(theme) {
      if (!material) return;
      material.blending = theme === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.needsUpdate = true;
    },

    update(dt) {
      uMorph.value += (morphWanted - uMorph.value) * Math.min(1, dt * 3.5);
      uOpacity.value = this.opacity;
    },

    resize(w, h) {
      uSizeScale.value = Math.min(w, h) < 760 ? 0.85 : 1;
    },

    dispose() {
      if (geo) geo.dispose();
      if (material) material.dispose();
    },
  };
}
