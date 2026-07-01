/*
 * tests/camera-rail.mjs — verifies the unified camera TRACK design headlessly.
 *
 * Re-implements centripetal Catmull-Rom (the same spline three.js traces for
 * curveType:"centripetal") over the exported STATIONS and asserts the ride is:
 *   • CONTINUOUS — no jump between consecutive samples (smooth, no cusps)
 *   • COMPLETE   — the path actually passes through every station (each act is visited)
 *   • IN FRAME   — the camera stays in front of the content (z > 3.2) and bounded,
 *                  and the look-target stays near the subject (never points at nothing)
 *
 * This validates the TRACK design (control-point layout + curve shape); the exact
 * arc-length speed + the cinematic feel are browser-tuned. Run: node tests/camera-rail.mjs
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const { STATIONS } = await import(pathToFileURL(join(here, '..', 'js', 'webgl', 'camera-rail.js')).href);

const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// centripetal Catmull-Rom (Barry–Goldman pyramid), alpha = 0.5
function seg(p0, p1, p2, p3, t) {
  const a = 0.5;
  const t0 = 0;
  const t1 = t0 + (Math.pow(d(p0, p1), a) || 1e-6);
  const t2 = t1 + (Math.pow(d(p1, p2), a) || 1e-6);
  const t3 = t2 + (Math.pow(d(p2, p3), a) || 1e-6);
  const tt = t1 + (t2 - t1) * t;
  const A1 = lp(p0, p1, (tt - t0) / (t1 - t0));
  const A2 = lp(p1, p2, (tt - t1) / (t2 - t1));
  const A3 = lp(p2, p3, (tt - t2) / (t3 - t2));
  const B1 = lp(A1, A2, (tt - t0) / (t2 - t0));
  const B2 = lp(A2, A3, (tt - t1) / (t3 - t1));
  return lp(B1, B2, (tt - t1) / (t2 - t1));
}

// sample the whole non-closed spline (phantom reflected endpoints, like three)
function samplePath(points) {
  const n = points.length;
  const ext = [
    [2 * points[0][0] - points[1][0], 2 * points[0][1] - points[1][1], 2 * points[0][2] - points[1][2]],
    ...points,
    [2 * points[n - 1][0] - points[n - 2][0], 2 * points[n - 1][1] - points[n - 2][1], 2 * points[n - 1][2] - points[n - 2][2]],
  ];
  const out = [];
  for (let i = 1; i < ext.length - 2; i++) {
    for (let s = 0; s <= 50; s++) out.push(seg(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], s / 50));
  }
  return out;
}

const posPts = STATIONS.map((s) => s.pos);
const lookPts = STATIONS.map((s) => s.look);
const posPath = samplePath(posPts);
const lookPath = samplePath(lookPts);

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// continuity
let maxJump = 0;
for (let i = 1; i < posPath.length; i++) maxJump = Math.max(maxJump, d(posPath[i], posPath[i - 1]));
ok(maxJump < 0.6, `camera path jumps ${maxJump.toFixed(3)} between samples (not smooth)`);

// completeness — every station is visited
for (const st of STATIONS) {
  let min = Infinity;
  for (const p of posPath) min = Math.min(min, d(p, st.pos));
  ok(min < 0.06, `station "${st.id}" not visited by the path (min dist ${min.toFixed(3)})`);
}

// in-frame bounds (camera in front of the content; never flies to nothing)
let minZ = Infinity, maxX = 0, maxY = 0;
for (const p of posPath) { minZ = Math.min(minZ, p[2]); maxX = Math.max(maxX, Math.abs(p[0])); maxY = Math.max(maxY, Math.abs(p[1])); }
ok(minZ > 3.2, `camera dips too close/behind content (min z ${minZ.toFixed(2)})`);
ok(maxX < 2.2 && maxY < 1.6, `camera strays out of frame (maxX ${maxX.toFixed(2)}, maxY ${maxY.toFixed(2)})`);

// look-target stays near the subject (never points at empty space)
let lookMax = 0;
for (const l of lookPath) lookMax = Math.max(lookMax, Math.hypot(l[0], l[1], l[2]));
ok(lookMax < 1.4, `look-target wanders off-subject (max |look| ${lookMax.toFixed(2)})`);

console.log('── unified camera rail verification ──');
console.log(`stations: ${STATIONS.length} | path samples: ${posPath.length}`);
console.log(`max inter-sample jump: ${maxJump.toFixed(3)} (smooth < 0.6)`);
console.log(`camera z range floor: ${minZ.toFixed(2)} (in-front > 3.2) | maxX ${maxX.toFixed(2)} maxY ${maxY.toFixed(2)}`);
console.log(`look-target max radius: ${lookMax.toFixed(2)} (on-subject < 1.4)`);
if (fails.length === 0) {
  console.log('\n✅ PASS — one continuous track, visits every act, stays framed on the subject.');
} else {
  console.log(`\n❌ FAIL — ${fails.length} issue(s):`);
  for (const f of fails) console.log('  • ' + f);
  process.exit(1);
}
