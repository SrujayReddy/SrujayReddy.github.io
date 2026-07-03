/*
 * education.js — "The Turning of the Tassel" (flagship act).
 *
 * High-fidelity procedural graduation cap:
 *   • BOARD/SKULLCAP — beveled, chamfered geometry (no raw box), MeshPhysicalMaterial
 *     BLACK VELVET (max sheen, slate-indigo sheen tint, ultra-dark 0x050508 base) so it
 *     absorbs at direct angles and flashes a soft fabric glow at glancing angles.
 *   • TASSEL — a thin GOLD WOVEN-METAL tube (metalness 1.0, roughness 0.15, 0xd4af37),
 *     rendered glass-smooth (120 tubular × 16 radial), draping with heavy gravitational
 *     sag over the front edge as a real fixed-timestep verlet rope.
 *   • A high-contrast PMREM studio env gives the physical materials something rich to
 *     reflect; a 3-point rig (Directional key + contrasting PointLight rim + minimal
 *     Ambient) carves the form. flatShading:false + computeVertexNormals() everywhere.
 *
 * Physics: verlet rope in group-local space, collided in the cap's tumbling frame
 * (capPivot.quaternion) against a BOX board + HEMISPHERE skullcap. The RENDERED tube
 * centerline is also pushed out (with the tube radius as margin) so the visible gold
 * — which bows between nodes — never clips the cap. LIGHT-FIRST; setTheme eases one
 * themeMix toward a richer DARK (no rebuild).
 */

const N_DESKTOP = 26;
const N_MOBILE = 18;

const BOARD_HALF = 1.3;
const BOARD_TOP = 0.55;
// The cord anchor sits ABOVE the cord-expanded board collider (top ≈ 0.607) and
// outside the skullcap clearance, so the rope's first segment can never start
// buried inside the board — it emerges from the button, in the open.
const ANCHOR_Y = 0.74;
const SKULL_C = { x: 0, y: 0.06, z: 0 };
const SKULL_R = 0.6;
const CORD_R = 0.032;

const GOLD = 0xd4af37;
const BLACK = 0x050508; // ultra-dark velvet base

// board BOX collider (capPivot-local), pre-expanded by the cord radius.
const BOX_CY = BOARD_TOP - 0.05;
const BOX_HX = BOARD_HALF + CORD_R;
const BOX_HY = 0.075 + CORD_R;
const BOX_HZ = BOARD_HALF + CORD_R;
// clearance for the RENDERED tube centerline: the MAX tube radius (0.058 at the
// anchor end) + a hair, so the visible surface — which bows between nodes — can
// never dip into the cap, yet still rests tight against it.
const TUBE_MARGIN = 0.063;

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function makeEducationAct() {
  let THREE, group, capPivot, board, skull, button;
  let cordGeo, cordMat, fringeGeo, fringeMat, cordCurvePts, tubePts, renderCurve;
  let nodes, prev, segLen, nodeCount, tubular, radial, eIdx;
  let gLocal, vTmp, vEdge, vLocal, qInv, vAnchor;
  let lights;
  let velvetMats, goldMats;
  let cSheenL, cSheenD, cVelEmis, cGoldL, cGoldD, cGoldEmis, cFringeL, cFringeD;
  let themeVal = 0, themeMix = 0, themeTargetV = 0, themePrimed = false;
  let baseX = 2.05, baseY = 0.28, baseScale = 0.66; // responsive placement (see resize)
  let progress = 0;
  let twirl = -0.5, pitchS = 0.12, rollS = -0.16;
  let accumulator = 0, timeAcc = 0;
  const SPIN = Math.PI * 0.7;
  const BASE_TWIRL = -0.5;
  const PITCH_0 = 0.12, PITCH_1 = -0.06;
  const ROLL_0 = -0.16, ROLL_1 = 0.2;

  return {
    id: "education",
    opacity: 0,

    init(ctx) {
      THREE = ctx.THREE;
      const isMobile = ctx.isMobile;
      nodeCount = isMobile ? N_MOBILE : N_DESKTOP;
      // glass-smooth, high-density tube — a fluid curve, never a faceted pipe.
      tubular = isMobile ? 80 : 120;
      radial = isMobile ? 12 : 16;
      eIdx = Math.floor(nodeCount * 0.3);

      cSheenL = new THREE.Color(0x2b2f44); // restrained slate sheen — reads BLACK, not navy
      cSheenD = new THREE.Color(0x474d70);
      cVelEmis = new THREE.Color(0x07080f);
      cGoldL = new THREE.Color(0xd4af37);  // authentic metallic gold
      cGoldD = new THREE.Color(0xe6c24a);
      cGoldEmis = new THREE.Color(0x3a2a08);
      cFringeL = new THREE.Color(0xc99a28);
      cFringeD = new THREE.Color(0xe6c24a);

      // high-contrast studio PMREM env — gives the physical materials rich reflections.
      const envRT = buildEnvMap(THREE, ctx.renderer);
      const envMap = envRT.texture;

      group = new THREE.Group();
      // Responsive placement: desktop = right half beside the copy; narrow = centered
      // ABOVE the copy (x 2.05 would be off-screen on a phone — the "out of plane" bug).
      const eduCenter = typeof window !== "undefined" && window.__eduCenter;
      if (eduCenter) { baseX = 0; baseY = 0.28; baseScale = 0.66; }
      else if (isMobile) { baseX = 0; baseY = 1.55; baseScale = 0.42; }
      group.position.set(baseX, baseY, 0);
      group.rotation.x = 0.24; // front 3/4 — low enough that the crown reads below the board
      group.scale.setScalar(baseScale);

      capPivot = new THREE.Group();
      // Pose the pivot at its progress-0 orientation BEFORE the rope is built,
      // so the tassel is born in the same frame it will be simulated in.
      capPivot.rotation.set(PITCH_0, BASE_TWIRL, ROLL_0);
      group.add(capPivot);

      // ── board: beveled / chamfered velvet mortarboard (no raw box) ──────────
      const boardGeo = makeBoardGeo(THREE, BOARD_HALF, 0.12, 0.035);
      boardGeo.computeVertexNormals();
      board = new THREE.Mesh(boardGeo, velvetMat(THREE, BLACK, envMap));
      board.position.y = BOARD_TOP - 0.06;
      capPivot.add(board);

      // ── crown: the head-fitting part that HANGS BELOW the board so the
      //     silhouette reads unmistakably as a mortarboard (not a floating slab) ──
      const crownGeo = makeCrownGeo(THREE);
      crownGeo.computeVertexNormals();
      skull = new THREE.Mesh(crownGeo, velvetMat(THREE, BLACK, envMap));
      skull.position.y = 0.18; // top of the crown meets the underside of the board
      capPivot.add(skull);

      // ── button (gold woven metal) — tall enough to clear the board top ──
      const btnGeo = new THREE.CylinderGeometry(0.14, 0.155, 0.1, 36);
      btnGeo.computeVertexNormals();
      button = new THREE.Mesh(btnGeo, goldMat(THREE, envMap, 0.0));
      button.position.set(0, BOARD_TOP + 0.05, 0);
      capPivot.add(button);

      // ── weld: a gold knot over the anchor so the cord visibly grows out of
      //    the button (kills the "tassel not attached" gap for good) ─────────
      const weldGeo = new THREE.SphereGeometry(0.085, 24, 16);
      weldGeo.computeVertexNormals();
      const weld = new THREE.Mesh(weldGeo, goldMat(THREE, envMap, 0.0));
      weld.position.set(0, 0.7, 0);
      capPivot.add(weld);

      // ── 3-point cinematic studio rig ────────────────────────
      const ambient = new THREE.AmbientLight(0x26262e, 0.24);
      const key = new THREE.DirectionalLight(0xffffff, 2.6);
      key.position.set(2.6, 5.6, 3.4);
      const rim = new THREE.PointLight(0x86b5ff, 3.2); // contrasting cool rim
      rim.position.set(-2.8, -0.8, -3.4); // low + behind → slashes a bright edge
      rim.decay = 0;
      lights = { ambient, key, rim };
      group.add(ambient, key, rim);

      // ── tassel rope (group-local sim) — born ALREADY DRAPED in the pivot's
      //    rotated frame: across the top, over the right edge, hanging down ──
      const total = 2.7;
      segLen = total / (nodeCount - 1);
      nodes = [];
      prev = [];
      for (let i = 0; i < nodeCount; i++) {
        const tt = i / (nodeCount - 1);
        const run = tt * 2.3;
        const lx = Math.min(BOARD_HALF * 0.95, run);
        const ly = ANCHOR_Y - Math.max(0, run - BOARD_HALF * 0.95) - tt * 0.06;
        const p = new THREE.Vector3(lx, ly, 0.02).applyQuaternion(capPivot.quaternion);
        nodes.push(p);
        prev.push(p.clone());
      }
      cordCurvePts = nodes.map((n) => n.clone());
      // ONE persistent curve, reused every frame (cordCurvePts is mutated in place).
      renderCurve = new THREE.CatmullRomCurve3(cordCurvePts, false, "centripetal", 0.5);
      cordGeo = new THREE.TubeGeometry(renderCurve, tubular, CORD_R, radial, false);
      cordMat = goldMat(THREE, envMap, 0.0);
      const cord = new THREE.Mesh(cordGeo, cordMat);
      cord.frustumCulled = false;
      group.add(cord);
      tubePts = [];
      for (let i = 0; i <= tubular; i++) tubePts.push(new THREE.Vector3());

      const nStrand = isMobile ? 26 : 44;
      const fpos = new Float32Array(nStrand * 2 * 3);
      fringeGeo = new THREE.BufferGeometry();
      fringeGeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
      fringeGeo.userData.nStrand = nStrand;
      fringeMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0 });
      const fringe = new THREE.LineSegments(fringeGeo, fringeMat);
      fringe.frustumCulled = false;
      group.add(fringe);

      // soft contact shadow (CanvasTexture needs a DOM — skip in headless/test)
      if (typeof document !== "undefined") {
        const sc = document.createElement("canvas");
        sc.width = sc.height = 128;
        const g2 = sc.getContext("2d");
        const grd = g2.createRadialGradient(64, 64, 4, 64, 64, 64);
        grd.addColorStop(0, "rgba(8,9,16,0.55)");
        grd.addColorStop(1, "rgba(8,9,16,0)");
        g2.fillStyle = grd;
        g2.fillRect(0, 0, 128, 128);
        this._shadowTex = new THREE.CanvasTexture(sc);
        this._shadowMat = new THREE.MeshBasicMaterial({ map: this._shadowTex, transparent: true, depthWrite: false, opacity: 0 });
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), this._shadowMat);
        shadow.rotation.x = -Math.PI / 2 - 0.58;
        shadow.position.set(0, -1.35, 0.2);
        shadow.renderOrder = -1;
        group.add(shadow);
      }

      // heavier gravity → a real gravitational sag/drape.
      gLocal = new THREE.Vector3(0, -11, 0).applyQuaternion(group.quaternion.clone().invert());
      vTmp = new THREE.Vector3();
      vEdge = new THREE.Vector3();
      vLocal = new THREE.Vector3();
      vAnchor = new THREE.Vector3();
      qInv = new THREE.Quaternion();

      // Pre-settle ~2s of fixed-step physics so the FIRST rendered frame already
      // shows a calm, fully-draped tassel — never buried, never mid-fall.
      qInv.copy(capPivot.quaternion).invert();
      for (let k = 0; k < 240; k++) stepRope(1 / 120);

      velvetMats = [board.material, skull.material];
      goldMats = [cordMat, button.material, weld.material];

      this.group = group;
      this.nodes = nodes;
      this.tubePts = tubePts;
      this._materials = [board.material, skull.material, button.material, weld.material, cordMat, fringeMat];
      this._envRT = envRT;
      this.setTheme(themeVal ? "dark" : "light");
    },

    setProgress(p) { progress = Math.max(0, Math.min(1, p)); },
    setActive() {},

    setTheme(theme) {
      themeVal = theme === "dark" ? 1 : 0;
      themeTargetV = themeVal;
      if (!themePrimed && lights) {
        themeMix = themeVal;
        themePrimed = true;
        applyTheme(themeMix);
      }
    },

    update(dt) {
      if (!group) return;
      const vis = this.opacity > 0.001;
      group.visible = vis;
      if (!vis) return;

      themeMix += (themeTargetV - themeMix) * Math.min(1, dt * 2.6);
      applyTheme(themeMix);

      const fading = this.opacity < 0.999;
      for (const m of this._materials) {
        m.transparent = fading;
        m.opacity = this.opacity;
        if (m.depthWrite !== undefined) m.depthWrite = !fading;
      }
      if (this._shadowMat) this._shadowMat.opacity = this.opacity * 0.8;

      const e = easeInOut(progress);
      const k = Math.min(1, dt * 5);
      twirl += (BASE_TWIRL + e * SPIN - twirl) * k;
      pitchS += (lerp(PITCH_0, PITCH_1, e) - pitchS) * k;
      rollS += (lerp(ROLL_0, ROLL_1, e) - rollS) * k;
      // cap-toss finish: in the final stretch the cap floats up and tips, like the toss.
      const toss = Math.max(0, (progress - 0.82) / 0.18);
      const tossE = toss * toss * (3 - 2 * toss);
      capPivot.rotation.set(pitchS + tossE * 0.28, twirl, rollS + Math.sin(timeAcc * 0.5) * 0.006);
      group.position.y = baseY + tossE * 0.6;
      qInv.copy(capPivot.quaternion).invert();

      timeAcc += dt;
      accumulator += Math.min(dt, 0.05);
      const h = 1 / 120;
      let steps = 0;
      while (accumulator >= h && steps < 8) { stepRope(h); accumulator -= h; steps++; }

      for (let i = 0; i < nodeCount; i++) cordCurvePts[i].copy(nodes[i]);
      // smooth the RENDER centerline only (kills tube kinks; sim untouched). Multiple
      // Laplacian passes give a clean, flowing drape; collidePoint() below keeps it
      // outside the cap afterwards.
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i < nodeCount - 1; i++) {
          cordCurvePts[i].x = cordCurvePts[i].x * 0.5 + (cordCurvePts[i - 1].x + cordCurvePts[i + 1].x) * 0.25;
          cordCurvePts[i].y = cordCurvePts[i].y * 0.5 + (cordCurvePts[i - 1].y + cordCurvePts[i + 1].y) * 0.25;
          cordCurvePts[i].z = cordCurvePts[i].z * 0.5 + (cordCurvePts[i - 1].z + cordCurvePts[i + 1].z) * 0.25;
        }
      }
      // reuse the persistent curve; needsUpdate refreshes its arc-length cache so
      // computeFrenetFrames sees the mutated points (no per-frame curve allocation).
      renderCurve.needsUpdate = true;
      for (let i = 0; i <= tubular; i++) {
        renderCurve.getPoint(i / tubular, tubePts[i]);
        collidePoint(tubePts[i], TUBE_MARGIN);
      }
      updateTube(THREE, cordGeo, renderCurve, tubePts, tubular, radial);
      updateFringe(fringeGeo, nodes[nodeCount - 1], nodes[nodeCount - 2], timeAcc);
    },

    cameraRig() {},
    // Flagship dolly-in: as the pin scrubs, push the camera toward the cap and
    // recentre the frame on it (peaks mid-pin), then track it upward through the
    // toss. Purely ADDITIVE over the rail and eased to 0 at progress 0 and 1, so
    // the wider camera journey is untouched. Skipped on the narrow layout (there
    // the cap is already centred above the copy, so a sideways push would misframe).
    rideRig(pos, look) {
      if (baseX < 1) return;
      const p = Math.max(0, Math.min(1, progress));
      const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      // Ramp the push-in by ~1/3 through the pin, HOLD it through the toss climax,
      // then release in the last 10% as the act hands off — so the tassel-turn AND
      // the toss both play framed tight, and the exit to the next section is clean.
      const dwell = ss(0.05, 0.35, p) * (1 - ss(0.9, 1.0, p));
      pos.x += dwell * 0.5; // drift toward the cap (world +x)
      pos.z -= dwell * 0.62; // dolly in
      look.x += dwell * 0.62; // recentre the frame on the cap
      look.y += dwell * 0.06;
      const toss = Math.max(0, (p - 0.82) / 0.18);
      const tossE = toss * toss * (3 - 2 * toss);
      look.y += tossE * 0.34; // follow the cap up as it's tossed
      pos.y += tossE * 0.12;
    },
    // Keep the cap IN the visible plane across resizes/orientation changes:
    // desktop = right half beside the copy; narrow = smaller, centered above it.
    resize(w) {
      if (!group) return;
      if (typeof window !== "undefined" && window.__eduCenter) return; // lab stays centered
      const narrow = w < 760;
      baseX = narrow ? 0 : 2.05;
      baseY = narrow ? 1.55 : 0.28;
      baseScale = narrow ? 0.42 : 0.66;
      group.position.x = baseX;
      group.scale.setScalar(baseScale);
    },
    dispose() {
      if (cordGeo) cordGeo.dispose();
      if (fringeGeo) fringeGeo.dispose();
      if (this._envRT) this._envRT.dispose();
      if (this._shadowTex) this._shadowTex.dispose();
      if (this._shadowMat) this._shadowMat.dispose();
      if (this._materials) this._materials.forEach((m) => m.dispose());
      if (group) group.traverse((o) => o.geometry && o.geometry.dispose());
    },
  };

  // ── per-frame theme application ───────────────────────────────
  function applyTheme(mix) {
    if (!lights) return;
    lights.ambient.intensity = lerp(0.26, 0.16, mix); // minimal → rich, moody, deep shadows
    lights.key.intensity = lerp(2.6, 1.7, mix);
    lights.rim.intensity = lerp(3.2, 4.6, mix);

    for (const m of velvetMats) {
      m.roughness = lerp(0.92, 0.88, mix);
      m.sheen = lerp(0.5, 0.62, mix);
      m.sheenRoughness = 0.55;
      m.sheenColor.lerpColors(cSheenL, cSheenD, mix);
      m.clearcoat = lerp(0.12, 0.2, mix);
      m.clearcoatRoughness = lerp(0.5, 0.4, mix);
      m.envMapIntensity = lerp(0.22, 0.42, mix);
      m.emissive.copy(cVelEmis);
      m.emissiveIntensity = lerp(0.0, 0.1, mix);
    }
    for (const m of goldMats) {
      m.color.lerpColors(cGoldL, cGoldD, mix);
      m.metalness = 1.0;
      m.roughness = lerp(0.15, 0.12, mix);
      m.anisotropy = lerp(0.7, 0.85, mix);
      m.envMapIntensity = lerp(1.1, 1.3, mix);
      m.emissive.copy(cGoldEmis);
      m.emissiveIntensity = lerp(0.0, 0.15, mix);
    }
    fringeMat.color.lerpColors(cFringeL, cFringeD, mix);
  }

  // ── rope substep (group-local space) ──────────────────────────
  function stepRope(h) {
    const e = easeInOut(progress);
    const damp = 0.985;
    // The anchor is the BUTTON on the rotating board — pin it in the pivot's
    // CURRENT frame so the cord stays welded to the cap through the twirl.
    vAnchor.set(0, ANCHOR_Y, 0).applyQuaternion(capPivot.quaternion);
    nodes[0].copy(vAnchor);
    prev[0].copy(vAnchor);

    const clampV = segLen * 0.65; // tighter → the cord can't fast-punch through the board
    for (let i = 1; i < nodeCount; i++) {
      const n = nodes[i];
      const p = prev[i];
      let vx = (n.x - p.x) * damp;
      let vy = (n.y - p.y) * damp;
      let vz = (n.z - p.z) * damp;
      const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (sp > clampV) { const s = clampV / sp; vx *= s; vy *= s; vz *= s; }
      // a whisper of wind → organic, physical life (tiny, so it never destabilises)
      const wind = Math.sin(timeAcc * 1.2 + i * 0.6) * 0.00006;
      p.copy(n);
      n.x += vx + gLocal.x * h * h + wind;
      n.y += vy + gLocal.y * h * h;
      n.z += vz + gLocal.z * h * h + wind * 0.5;
    }

    const edgeX = 0.95 - 1.9 * e;
    vEdge.set(edgeX, BOARD_TOP + 0.04, BOARD_HALF * 0.92).applyQuaternion(capPivot.quaternion);
    nodes[eIdx].lerp(vEdge, 0.22);

    // more relaxation iterations → tighter, heavier drape (less stretch)
    const iters = 24;
    for (let it = 0; it < iters; it++) {
      nodes[0].copy(vAnchor);
      for (let i = 0; i < nodeCount - 1; i++) {
        const a = nodes[i];
        const b = nodes[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-5;
        const diff = (dist - segLen) / dist;
        const ma = i === 0 ? 0 : 0.5;
        const mb = i === 0 ? 1 : 0.5;
        a.x += dx * diff * ma; a.y += dy * diff * ma; a.z += dz * diff * ma;
        b.x -= dx * diff * mb; b.y -= dy * diff * mb; b.z -= dz * diff * mb;
      }
      for (let i = 1; i < nodeCount; i++) collide(nodes[i]);
    }
  }

  function resolveLocal(v, margin) {
    // Two passes: the skull push can land a point back on the box (and vice
    // versa), so resolving the pair twice makes the result order-independent.
    for (let pass = 0; pass < 2; pass++) resolveOnce(v, margin);
  }

  function resolveOnce(v, margin) {
    // Work relative to the SOLID (cord-expanded) board box.
    let rx = v.x, ry = v.y - BOX_CY, rz = v.z;
    const bx = BOX_HX, by = BOX_HY, bz = BOX_HZ;

    if (Math.abs(rx) <= bx && Math.abs(ry) <= by && Math.abs(rz) <= bz) {
      // INSIDE the board (or exactly ON its surface — nodes evicted with margin 0
      // land there, and the zero-distance case would slip past the rounded-box
      // push below) → evict to the least-penetrating face + margin, but NEVER
      // the bottom (else the tassel sinks under the board and slowly climbs back).
      let best = by - ry, axis = 0; // 0=top
      const pxr = bx - rx, pxl = bx + rx, pzr = bz - rz, pzl = bz + rz;
      if (pxr < best) { best = pxr; axis = 1; }
      if (pxl < best) { best = pxl; axis = 2; }
      if (pzr < best) { best = pzr; axis = 3; }
      if (pzl < best) { best = pzl; axis = 4; }
      if (axis === 0) ry = by + margin;
      else if (axis === 1) rx = bx + margin;
      else if (axis === 2) rx = -(bx + margin);
      else if (axis === 3) rz = bz + margin;
      else rz = -(bz + margin);
    } else if (margin > 0) {
      // OUTSIDE → rounded-box push-out: keep the point ≥ margin from the NEAREST
      // point on the box. Unlike an axis-aligned face push, this clears the board's
      // EDGES and CORNERS too — exactly where the cord wraps as it drapes over the
      // front edge (the "cuts through the edge while scrolling" clip).
      const qx = Math.max(-bx, Math.min(bx, rx));
      const qy = Math.max(-by, Math.min(by, ry));
      const qz = Math.max(-bz, Math.min(bz, rz));
      const dx = rx - qx, dy = ry - qy, dz = rz - qz;
      const d2 = dx * dx + dy * dy + dz * dz;
      // d2 > 0 (not an epsilon): points a few float-ulps off the surface still
      // have a numerically exact push direction, and skipping them leaves the
      // tube surface resting inside the clearance.
      if (d2 < margin * margin && d2 > 0) {
        const d = Math.sqrt(d2), s = margin / d;
        rx = qx + dx * s; ry = qy + dy * s; rz = qz + dz * s;
      }
    }
    v.x = rx; v.y = ry + BOX_CY; v.z = rz;

    // skullcap sphere (unchanged)
    const sx = v.x - SKULL_C.x, sy = v.y - SKULL_C.y, sz = v.z - SKULL_C.z;
    const sd = Math.sqrt(sx * sx + sy * sy + sz * sz);
    const minD = SKULL_R + CORD_R + margin;
    if (sd < minD && sd > 1e-4) {
      const s = minD / sd;
      v.x = SKULL_C.x + sx * s; v.y = SKULL_C.y + sy * s; v.z = SKULL_C.z + sz * s;
    }
  }

  function collide(n) {
    vLocal.copy(n).applyQuaternion(qInv);
    resolveLocal(vLocal, 0);
    vLocal.applyQuaternion(capPivot.quaternion);
    n.copy(vLocal);
  }

  function collidePoint(v, margin) {
    vTmp.copy(v).applyQuaternion(qInv);
    resolveLocal(vTmp, margin);
    vTmp.applyQuaternion(capPivot.quaternion);
    v.copy(vTmp);
  }
}

// ── beveled / chamfered mortarboard (ExtrudeGeometry — no raw box). A rounded
// square extruded with a bevel, so the edges catch specular glints. ─────────────
function makeBoardGeo(THREE, half, thick, bevel) {
  const r = 0.07; // corner radius
  const w = half;
  const s = new THREE.Shape();
  s.moveTo(-w + r, -w);
  s.lineTo(w - r, -w);
  s.quadraticCurveTo(w, -w, w, -w + r);
  s.lineTo(w, w - r);
  s.quadraticCurveTo(w, w, w - r, w);
  s.lineTo(-w + r, w);
  s.quadraticCurveTo(-w, w, -w, w - r);
  s.lineTo(-w, -w + r);
  s.quadraticCurveTo(-w, -w, -w + r, -w);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: thick,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.rotateX(-Math.PI / 2); // lie flat (thickness along Y)
  geo.center();
  return geo;
}

// ── crown: a rounded head-fitting crown (LatheGeometry) that hangs below the
// board, so the silhouette reads as a real mortarboard. ─────────────────────────
function makeCrownGeo(THREE) {
  const pts = [
    new THREE.Vector2(0.0, 0.235),
    new THREE.Vector2(0.5, 0.235),
    new THREE.Vector2(0.66, 0.2),
    new THREE.Vector2(0.72, 0.05),
    new THREE.Vector2(0.7, -0.12),
    new THREE.Vector2(0.62, -0.26),
    new THREE.Vector2(0.46, -0.34),
    new THREE.Vector2(0.26, -0.39),
    new THREE.Vector2(0.1, -0.41),
    new THREE.Vector2(0.0, -0.415),
  ];
  return new THREE.LatheGeometry(pts, 64);
}

// ── BLACK VELVET (MeshPhysicalMaterial): sheen over a faint clearcoat, no metal,
// ultra-dark base. Absorbs at direct angles; flashes a slate-indigo glow at grazing. ─
function velvetMat(THREE, hex, envMap) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    metalness: 0.0,
    roughness: 0.92,
    sheen: 0.5,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0x2b2f44),
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
    envMap,
    envMapIntensity: 0.22,
    emissive: 0x000000,
    emissiveIntensity: 0.0,
    flatShading: false,
    transparent: true,
    opacity: 0,
  });
}

// ── GOLD WOVEN METAL (MeshPhysicalMaterial): full metalness, low roughness, a hint
// of anisotropy for the woven streak, driven by the studio env. ─────────────────
function goldMat(THREE, envMap, anisotropyRotation) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd4af37,
    metalness: 1.0,
    roughness: 0.15,
    anisotropy: 0.7,
    anisotropyRotation: anisotropyRotation || 0.0,
    clearcoat: 0.1,
    envMap,
    envMapIntensity: 1.1,
    emissive: 0x000000,
    emissiveIntensity: 0.0,
    flatShading: false,
    transparent: true,
    opacity: 0,
  });
}

// High-contrast studio environment (PMREMGenerator.fromScene — no assets). A dark
// surround + a bright white key + warm/cool accents give the gold strong, punchy
// reflections and the velvet a clean grazing sheen.
function buildEnvMap(THREE, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const basic = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });

  env.add(new THREE.Mesh(new THREE.BoxGeometry(16, 10, 16), basic(0x1a1a22)));
  const key = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), basic(0xffffff));
  key.position.y = 4.8; key.rotation.x = Math.PI / 2; env.add(key);
  const warm = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 7.2), basic(0xffd9a0));
  warm.position.set(-6.0, 0.4, 1.2); warm.rotation.y = Math.PI / 2; env.add(warm);
  const cool = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 7.2), basic(0x9fc4ff));
  cool.position.set(6.0, 0.4, -1.0); cool.rotation.y = -Math.PI / 2; env.add(cool);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), basic(0x0e0e14));
  floor.position.y = -4.8; floor.rotation.x = -Math.PI / 2; env.add(floor);

  const rt = pmrem.fromScene(env, 0.03);
  env.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();
  return rt;
}

// Build the tube rings from a COLLIDED centerline (positions) + the curve's Frenet
// frames (orientation). High tubular×radial density → a continuous, glass-smooth tube.
function updateTube(THREE, geo, curve, points, tubular, radial) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const pos = geo.attributes.position.array;
  const nrm = geo.attributes.normal ? geo.attributes.normal.array : null;
  let k = 0;
  for (let i = 0; i <= tubular; i++) {
    const P = points[i];
    const N = frames.normals[i], B = frames.binormals[i];
    const t = i / tubular;
    const r = 0.058 * (1 - t) + 0.034 * t; // fuller, tapering cord — reads as real braid
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const sin = Math.sin(v), cos = -Math.cos(v);
      const nx = cos * N.x + sin * B.x, ny = cos * N.y + sin * B.y, nz = cos * N.z + sin * B.z;
      pos[k] = P.x + r * nx; pos[k + 1] = P.y + r * ny; pos[k + 2] = P.z + r * nz;
      // (nx,ny,nz) is exactly the unit outward normal (N,B orthonormal, cos²+sin²=1),
      // so we write normals analytically instead of an O(verts) computeVertexNormals().
      if (nrm) { nrm[k] = nx; nrm[k + 1] = ny; nrm[k + 2] = nz; }
      k += 3;
    }
  }
  geo.attributes.position.needsUpdate = true;
  if (geo.attributes.normal) geo.attributes.normal.needsUpdate = true;
}

function updateFringe(geo, end, beforeEnd, time) {
  const n = geo.userData.nStrand;
  const pos = geo.attributes.position.array;
  const dirx = end.x - beforeEnd.x, diry = end.y - beforeEnd.y, dirz = end.z - beforeEnd.z;
  const dl = Math.hypot(dirx, diry, dirz) || 1;
  const ux = dirx / dl, uy = diry / dl, uz = dirz / dl;
  const len = 0.46;
  let k = 0;
  for (let s = 0; s < n; s++) {
    const ang = (s / n) * Math.PI * 2;
    const spread = 0.06;
    const sway = Math.sin(time * 2.4 + s * 1.3) * 0.025;
    const ox = Math.cos(ang) * spread, oz = Math.sin(ang) * spread;
    pos[k++] = end.x + ox * 0.4; pos[k++] = end.y + 0.01; pos[k++] = end.z + oz * 0.4;
    pos[k++] = end.x + ux * len + ox + sway; pos[k++] = end.y + uy * len - 0.02; pos[k++] = end.z + uz * len + oz;
  }
  geo.attributes.position.needsUpdate = true;
}
