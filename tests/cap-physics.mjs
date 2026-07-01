/*
 * tests/cap-physics.mjs — frame-by-frame physics regression test for the
 * graduation-cap tassel. Runs the REAL makeEducationAct() from
 * js/webgl/education.js against a math-accurate THREE shim (Vector3/Quaternion/
 * Euler use the exact three.js formulas; rendering is stubbed) and asserts,
 * across a slow scroll sweep AND instantaneous fast-scrub jumps:
 *   • NO CLIP   — no rope node ends inside the board BOX or skullcap SPHERE,
 *                 tested in capPivot-local space (the frame collide() resolves in)
 *   • NO BLOWUP — every node stays finite and within a sane world radius
 *   • CONSTRAINT— segment lengths stay near the rest length (rope stays a rope)
 *
 * Run:  node tests/cap-physics.mjs   (exit 0 = pass, 1 = fail)
 * This needs no browser/GL, so it works in CI and headless sandboxes.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

// ── math-accurate THREE shim ────────────────────────────────────────────────
class Quaternion {
  constructor() { this._x = 0; this._y = 0; this._z = 0; this._w = 1; }
  copy(q) { this._x = q._x; this._y = q._y; this._z = q._z; this._w = q._w; return this; }
  clone() { return new Quaternion().copy(this); }
  invert() { this._x *= -1; this._y *= -1; this._z *= -1; return this; } // conjugate (unit)
  setFromEuler(e) {
    const c1 = Math.cos(e._x / 2), c2 = Math.cos(e._y / 2), c3 = Math.cos(e._z / 2);
    const s1 = Math.sin(e._x / 2), s2 = Math.sin(e._y / 2), s3 = Math.sin(e._z / 2);
    this._x = s1 * c2 * c3 + c1 * s2 * s3;
    this._y = c1 * s2 * c3 - s1 * c2 * s3;
    this._z = c1 * c2 * s3 + s1 * s2 * c3;
    this._w = c1 * c2 * c3 - s1 * s2 * s3;
    return this;
  }
}
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  setScalar(s) { this.x = s; this.y = s; this.z = s; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this; }
  applyQuaternion(q) {
    const { x, y, z } = this; const qx = q._x, qy = q._y, qz = q._z, qw = q._w;
    const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
  }
}
class Euler {
  constructor() { this._x = 0; this._y = 0; this._z = 0; this._cb = () => {}; }
  _onChange(cb) { this._cb = cb; return this; }
  get x() { return this._x; } set x(v) { this._x = v; this._cb(); }
  get y() { return this._y; } set y(v) { this._y = v; this._cb(); }
  get z() { return this._z; } set z(v) { this._z = v; this._cb(); }
  set(x, y, z) { this._x = x; this._y = y; this._z = z; this._cb(); return this; }
}
class Obj3D {
  constructor() {
    this.position = new Vector3(); this.quaternion = new Quaternion(); this.rotation = new Euler();
    this.scale = new Vector3(1, 1, 1);
    this.rotation._onChange(() => this.quaternion.setFromEuler(this.rotation));
    this.children = []; this.visible = true; this.frustumCulled = true;
  }
  add(...os) { for (const o of os) this.children.push(o); return this; }
  traverse(cb) { cb(this); for (const c of this.children) c.traverse ? c.traverse(cb) : cb(c); }
}
class Group extends Obj3D {}
class Mesh extends Obj3D { constructor(geo, mat) { super(); this.geometry = geo; this.material = mat; } }
class Color { copy() { return this; } lerpColors() { return this; } setHex() { return this; } }
function makeMat(o = {}) {
  const m = Object.assign({ dispose() {}, needsUpdate: false, transparent: false, opacity: 1, depthWrite: true }, o);
  m.color = new Color(); m.emissive = new Color(); m.sheenColor = new Color();
  return m;
}
class BufGeo { constructor() { this.attributes = {}; this.userData = {}; } setAttribute(n, a) { this.attributes[n] = a; return this; } dispose() {} }
class TubeGeometry {
  constructor(curve, tubular, r, radial) {
    this.attributes = { position: { array: new Float32Array((tubular + 1) * (radial + 1) * 3), needsUpdate: false } };
  }
  computeVertexNormals() {} dispose() {}
}
// real centripetal Catmull-Rom (Barry–Goldman) — matches three's default curveType,
// so education.js's tube sampling reproduces the SAME overshoot the browser sees.
function crD(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function crLerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }; }
function crSeg(p0, p1, p2, p3, t) {
  const al = 0.5;
  const t0 = 0;
  const t1 = t0 + (Math.pow(crD(p0, p1), al) || 1e-6);
  const t2 = t1 + (Math.pow(crD(p1, p2), al) || 1e-6);
  const t3 = t2 + (Math.pow(crD(p2, p3), al) || 1e-6);
  const tt = t1 + (t2 - t1) * t;
  const A1 = crLerp(p0, p1, (tt - t0) / (t1 - t0));
  const A2 = crLerp(p1, p2, (tt - t1) / (t2 - t1));
  const A3 = crLerp(p2, p3, (tt - t2) / (t3 - t2));
  const B1 = crLerp(A1, A2, (tt - t0) / (t2 - t0));
  const B2 = crLerp(A2, A3, (tt - t1) / (t3 - t1));
  return crLerp(B1, B2, (tt - t1) / (t2 - t1));
}
class CatmullRomCurve3 {
  constructor(points) { this.points = points; }
  getPoint(t, P) {
    const pts = this.points, l = pts.length;
    const pp = (l - 1) * Math.min(Math.max(t, 0), 1);
    let i = Math.floor(pp), w = pp - i;
    if (i >= l - 1) { i = l - 2; w = 1; }
    const p1 = pts[i], p2 = pts[i + 1];
    const p0 = i - 1 >= 0 ? pts[i - 1] : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y, z: 2 * p1.z - p2.z };
    const p3 = i + 2 <= l - 1 ? pts[i + 2] : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y, z: 2 * p2.z - p1.z };
    const r = crSeg(p0, p1, p2, p3, w);
    return P.set(r.x, r.y, r.z);
  }
  computeFrenetFrames(seg) {
    const normals = [], binormals = [];
    for (let i = 0; i <= seg; i++) { normals.push(new Vector3(1, 0, 0)); binormals.push(new Vector3(0, 0, 1)); }
    return { normals, binormals };
  }
}
function stubGeo() { return { dispose() {}, scale() { return this; }, computeVertexNormals() {}, rotateX() { return this; }, center() { return this; } }; }
// NOTE: these must be regular functions (new-able) — education.js does `new THREE.X()`.
const THREE = {
  Group, Mesh, Vector3, Quaternion, Color, CatmullRomCurve3, TubeGeometry,
  Scene: Group, BufferGeometry: BufGeo,
  BufferAttribute: class { constructor(arr) { this.array = arr; this.needsUpdate = false; } },
  PMREMGenerator: class { fromScene() { return { texture: {}, dispose() {} }; } dispose() {} },
  BoxGeometry: function () { return stubGeo(); },
  SphereGeometry: function () { return stubGeo(); },
  CylinderGeometry: function () { return stubGeo(); },
  PlaneGeometry: function () { return stubGeo(); },
  MeshPhysicalMaterial: function (o) { return makeMat(o); },
  MeshBasicMaterial: function (o) { return makeMat(o); },
  CanvasTexture: function () { return { dispose() {} }; },
  LineBasicMaterial: function (o) { return makeMat(o); },
  LineSegments: function (geo, mat) { return new Mesh(geo, mat); },
  HemisphereLight: function (a, b, i) { return { intensity: i }; },
  DirectionalLight: function (c, i) { return { intensity: i, position: new Vector3() }; },
  AmbientLight: function (c, i) { return { intensity: i }; },
  PointLight: function (c, i) { return { intensity: i, decay: 2, position: new Vector3() }; },
  ExtrudeGeometry: function () { return stubGeo(); },
  LatheGeometry: function () { return stubGeo(); },
  Vector2: function (x = 0, y = 0) { return { x, y }; },
  Shape: class { moveTo() {} lineTo() {} quadraticCurveTo() {} absarc() {} bezierCurveTo() {} },
  SRGBColorSpace: 'srgb', DoubleSide: 2, NormalBlending: 1, AdditiveBlending: 2,
};

// ── load the REAL act ───────────────────────────────────────────────────────
const here = dirname(fileURLToPath(import.meta.url));
const eduUrl = pathToFileURL(join(here, '..', 'js', 'webgl', 'education.js')).href;
const { makeEducationAct } = await import(eduUrl);

const act = makeEducationAct();
act.init({ THREE, isMobile: false, renderer: {}, scene: new Group(), camera: {}, shared: { uTheme: { value: 0 } } });
act.opacity = 1;

// cap-local collider constants (mirror education.js) for the assertions
const BOARD_HALF = 1.3, BOARD_TOP = 0.55, CORD_R = 0.032;
const BOX_CY = BOARD_TOP - 0.05, BOX_HX = BOARD_HALF + CORD_R, BOX_HY = 0.075 + CORD_R, BOX_HZ = BOARD_HALF + CORD_R;
const SKULL_C = { x: 0, y: 0.06, z: 0 }, SKULL_R = 0.6, EPS = 6e-3, TUBE_R = 0.04;

const nodes = act.nodes;
const capPivot = act.group.children[0];
const segLen = 2.7 / (nodes.length - 1);
const fails = [];
let maxSeg = 0, minSeg = 1e9, worstBox = 0, worstSphere = 0, worstTube = 0, worstUnder = 0, sawNaN = false;

function checkFrame(tag) {
  const qInv = capPivot.quaternion.clone().invert();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || !Number.isFinite(n.z)) { sawNaN = true; fails.push(`${tag}: node ${i} NaN/Inf`); continue; }
    if (Math.hypot(n.x, n.y, n.z) > 8) fails.push(`${tag}: node ${i} escaped`);
    if (i === 0) continue; // node0 is the pinned anchor (intentionally at the button)
    const L = n.clone().applyQuaternion(qInv);
    const rx = L.x, ry = L.y - BOX_CY, rz = L.z;
    if (Math.abs(rx) < BOX_HX - EPS && Math.abs(ry) < BOX_HY - EPS && Math.abs(rz) < BOX_HZ - EPS) {
      const pen = Math.min(BOX_HX - Math.abs(rx), BOX_HY - Math.abs(ry), BOX_HZ - Math.abs(rz));
      worstBox = Math.max(worstBox, pen); fails.push(`${tag}: node ${i} INSIDE board box (pen=${pen.toFixed(4)})`);
    }
    const d = Math.hypot(L.x - SKULL_C.x, L.y - SKULL_C.y, L.z - SKULL_C.z);
    if (d < SKULL_R + CORD_R - EPS) { worstSphere = Math.max(worstSphere, SKULL_R + CORD_R - d); fails.push(`${tag}: node ${i} INSIDE skullcap (pen=${(SKULL_R + CORD_R - d).toFixed(4)})`); }
    // the cord must NEVER sit under the interior of the board (the "through-the-top,
    // pushed out the bottom" bug — old least-penetration could shove it down).
    if (Math.abs(L.x) < BOARD_HALF - 0.25 && Math.abs(L.z) < BOARD_HALF - 0.25 && L.y < BOX_CY - 0.05) {
      worstUnder = Math.max(worstUnder, BOX_CY - 0.05 - L.y);
      fails.push(`${tag}: node ${i} UNDER the board interior (y=${L.y.toFixed(3)})`);
    }
  }
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1], sl = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    maxSeg = Math.max(maxSeg, sl); minSeg = Math.min(minSeg, sl);
    if (sl > segLen * 2.4 || sl < segLen * 0.4) fails.push(`${tag}: seg ${i} length ${sl.toFixed(3)}`);
  }
  // the RENDERED tube centerline (not just nodes) must clear the board + skull by
  // the tube radius — this is the check that catches curve-overshoot clipping.
  for (const Pp of act.tubePts) {
    const L = Pp.clone().applyQuaternion(qInv);
    const rx = L.x, ry = L.y - BOX_CY, rz = L.z;
    const pbx = BOARD_HALF + TUBE_R, pby = 0.075 + TUBE_R, pbz = BOARD_HALF + TUBE_R;
    if (Math.abs(rx) < pbx - EPS && Math.abs(ry) < pby - EPS && Math.abs(rz) < pbz - EPS) {
      const pen = Math.min(pbx - Math.abs(rx), pby - Math.abs(ry), pbz - Math.abs(rz));
      worstTube = Math.max(worstTube, pen);
      fails.push(`${tag}: TUBE centerline penetrates board (pen=${pen.toFixed(4)})`);
    }
    const dd = Math.hypot(L.x - SKULL_C.x, L.y - SKULL_C.y, L.z - SKULL_C.z);
    if (dd < SKULL_R + TUBE_R - EPS) {
      worstTube = Math.max(worstTube, SKULL_R + TUBE_R - dd);
      fails.push(`${tag}: TUBE centerline penetrates skullcap (pen=${(SKULL_R + TUBE_R - dd).toFixed(4)})`);
    }
  }
}
const settle = (p, frames = 30) => { act.setProgress(p); for (let f = 0; f < frames; f++) act.update(1 / 60); };

for (let s = 0; s <= 40; s++) { settle(s / 40, 4); checkFrame(`sweep p=${(s / 40).toFixed(2)}`); }
settle(0, 90); checkFrame('settled@0');
settle(1, 90); checkFrame('settled@1');
settle(0.5, 90); checkFrame('settled@0.5');
const jumps = [0, 1, 0, 1, 0.5, 0, 1, 0.2, 0.9, 0.05, 1, 0];
for (let r = 0; r < 6; r++) for (const p of jumps) { settle(p, 2); checkFrame(`scrub→${p}`); }

console.log('── cap tassel physics verification ──');
console.log(`nodes: ${nodes.length} | rest segLen: ${segLen.toFixed(3)}`);
console.log(`segment length range: [${minSeg.toFixed(3)}, ${maxSeg.toFixed(3)}]`);
console.log(`NaN/Inf: ${sawNaN} | worst board pen: ${worstBox.toFixed(5)} | worst skullcap pen: ${worstSphere.toFixed(5)} (tol ${EPS})`);
console.log(`worst UNDER-board penetration: ${worstUnder.toFixed(5)} (must be 0 — the "through-the-top" bug)`);
console.log(`worst RENDERED-TUBE penetration: ${worstTube.toFixed(5)} (must be ~0 — this is the clipping check)`);
if (fails.length === 0) {
  console.log('\n✅ PASS — no clipping, no blowup, rope stable across slow sweep + fast scrub.');
} else {
  console.log(`\n❌ FAIL — ${fails.length} issue(s):`);
  for (const f of fails.slice(0, 25)) console.log('  • ' + f);
  process.exit(1);
}
