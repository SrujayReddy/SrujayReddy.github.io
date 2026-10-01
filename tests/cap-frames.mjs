/*
 * Verify the allocation-free tassel frames against the shipped Three.js r169
 * implementation, including its exact arc-length and finite-difference math.
 * Run: node tests/cap-frames.mjs (uses checked-in ESM, no npm installation).
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "../assets/vendor/three-0.169.0.mjs";

// Exercise the production helper without widening the browser module's API.
const source = await readFile(new URL("../js/webgl/education.js", import.meta.url), "utf8");
const encoded = Buffer.from(source + "\nexport { createFrameUpdater };\n").toString("base64");
const { createFrameUpdater } = await import(`data:text/javascript;base64,${encoded}`);

let checked = 0;
for (const segments of [120, 80]) {
  for (const shape of ["drape", "straight", "coincident"]) {
    const points = Array.from({ length: segments === 120 ? 26 : 18 }, () => new THREE.Vector3());
    const reference = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
    const optimized = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
    let allocatingSamples = 0;
    const getPoint = optimized.getPoint;
    optimized.getPoint = function (t, target) {
      if (!target) allocatingSamples++;
      return getPoint.call(this, t, target);
    };
    const update = createFrameUpdater(THREE, optimized, segments);
    let firstFrames, firstLengths;

    for (let frame = 0; frame < 120; frame++) {
      const progress = frame < 80 ? frame / 79 : [0, 1, 0.2, 0.9][frame % 4];
      points.forEach((point, i) => {
        const t = i / (points.length - 1);
        if (shape === "coincident") point.set(0, 0, 0);
        else if (shape === "straight") point.set(t * (1 + progress), 0, 0);
        else point.set(t * 2.1, 0.74 - t * t * 1.8, Math.sin(t * 4 + progress) * 0.3);
      });
      // Also cover the cache's existing resize/invalidation contract.
      reference.arcLengthDivisions = optimized.arcLengthDivisions = frame < 60 ? 200 : 240;
      reference.needsUpdate = optimized.needsUpdate = true;
      const expected = reference.computeFrenetFrames(segments, false);
      const actual = update();

      if (!firstFrames) {
        firstFrames = actual;
        firstLengths = optimized.cacheArcLengths;
      }
      assert.equal(actual, firstFrames, "frame result is reused");
      assert.equal(optimized.cacheArcLengths, firstLengths, "arc-length array is reused");
      assert.deepEqual(optimized.cacheArcLengths, reference.cacheArcLengths);
      for (const key of ["tangents", "normals", "binormals"]) {
        for (let i = 0; i <= segments; i++) {
          assert.deepEqual(actual[key][i].toArray(), expected[key][i].toArray(), `${shape}/${segments}/${frame}/${key}/${i}`);
        }
      }
      checked++;
    }
    assert.equal(allocatingSamples, 0, "every curve sample uses an existing target vector");
  }
}

console.log(`PASS: ${checked} desktop/mobile tassel frame sets exactly match Three.js r169; curve samples and arc-length storage are reused.`);
