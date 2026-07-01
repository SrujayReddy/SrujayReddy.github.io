/*
 * camera-rail.js — the single, continuous camera TRACK for the whole site.
 *
 * The portfolio is one spatial journey, not a stack of widgets: the camera rides
 * ONE CatmullRomCurve3 from the hero nebula through every act and (Stage 2) dives
 * through the macro graduation cap into the Build Bench. Global page scroll maps
 * smoothly to a single ride parameter t ∈ [0,1]; the director samples this rail
 * each frame (see director.js setRide / step).
 *
 * STATIONS are the focal points, one per act, in WORLD space. Stage 1 keeps the
 * existing content (around the origin) framed while making the camera a single
 * continuous ride; Stage 2 re-positions the assets onto the track and dramatizes
 * the macro fly-through. Editing a station here re-shapes the whole movie.
 *
 * Exports STATIONS (plain data, so it can be verified headlessly — see
 * tests/camera-rail.mjs) and createCameraRail(THREE) which builds the curves.
 */

// Education is the flagship and now sits 2nd in the DOM (right after the hero), so
// the camera glides Hero Nebula → Education before continuing the journey.
// Stations are kept CLOSE together (gentle position deltas) so the camera glides
// between sections instead of swinging fast — the "sudden jump" fix.
export const STATIONS = [
  { id: "hero",        pos: [0.0, 0.25, 6.8],  look: [0.0, 0.0, 0.0] },
  { id: "education",   pos: [0.35, 0.45, 5.7], look: [0.55, 0.2, 0.0] }, // glide in toward the flagship
  { id: "positioning", pos: [0.3, 0.3, 6.4],   look: [0.0, 0.0, 0.0] },
  { id: "thesis",      pos: [0.0, 0.1, 5.9],   look: [0.0, 0.0, 0.0] },
  { id: "now",         pos: [-0.35, 0.25, 6.4],look: [0.0, 0.0, 0.0] },
  { id: "bench",       pos: [0.3, -0.05, 6.1], look: [0.0, 0.0, 0.0] },
  { id: "experience",  pos: [0.4, 0.35, 6.4],  look: [0.0, 0.0, 0.0] },
  { id: "work",        pos: [-0.35, -0.1, 6.1],look: [0.0, 0.0, 0.0] },
  { id: "beyond",      pos: [0.0, 0.15, 6.5],  look: [0.0, 0.0, 0.0] },
];

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

export function createCameraRail(THREE) {
  const posPts = STATIONS.map((s) => new THREE.Vector3(s.pos[0], s.pos[1], s.pos[2]));
  const lookPts = STATIONS.map((s) => new THREE.Vector3(s.look[0], s.look[1], s.look[2]));

  // centripetal Catmull-Rom minimises overshoot/cusps between stations.
  const posCurve = new THREE.CatmullRomCurve3(posPts, false, "centripetal", 0.5);
  const lookCurve = new THREE.CatmullRomCurve3(lookPts, false, "centripetal", 0.5);

  const _p = new THREE.Vector3();
  const _l = new THREE.Vector3();

  return {
    posCurve,
    lookCurve,
    stationCount: STATIONS.length,
    // t ∈ [0,1] → camera position + look target. Both arc-length parameterised
    // (getPointAt) and sampled by the SAME t so they stay temporally in sync.
    posAt(t, out) { return posCurve.getPointAt(clamp01(t), out || _p); },
    lookAt(t, out) { return lookCurve.getPointAt(clamp01(t), out || _l); },
    // approximate ride-t of a station (uniform spacing — for syncing DOM/acts)
    stationT(i) { return STATIONS.length < 2 ? 0 : i / (STATIONS.length - 1); },
    stationIndex(id) { return STATIONS.findIndex((s) => s.id === id); },
  };
}
