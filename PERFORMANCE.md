# Portfolio performance and profile update — September 2026

The cinematic design is preserved: the same library versions, particle counts,
DPR cap, shaders, materials, tube density, physics, camera rail and scroll timing.
No images were recompressed and no animation was removed.

## Loading changes

- Serve the four pinned final ESM libraries with the site. This eliminates eight
  external script requests and the CDN wrapper discovery chain. Files preserve
  the original executable code and exports; the vendor script verifies SHA-256
  and retains licenses.
- Preload the small baseline module graph so the content does not wait through
  successive module-discovery round trips.
- Fetch motion and graphics concurrently, initialize motion after the acts, and
  preserve a task boundary between GPU setup and layout/pinning work.
- Create one WebGL context. The renderer's existing error handler provides the
  fallback, so a separate throwaway feature-detection context is unnecessary.

## Measured loading results

Chrome on macOS, fresh contexts with cache disabled, 80 ms network latency,
1,000,000 bytes/s download, 500,000 bytes/s upload and 4× CPU slowdown. Local
servers use gzip for text assets. Baseline is commit `62e9fb4` (same tree as the
current deployed `main`); its library requests still go to esm.sh. Three recorded
runs per version per viewport, interleaved, with one excluded warmup per version.
Desktop: 1440×900/DPR1. Mobile viewport: 390×844/DPR2; this is desktop Chrome
emulation, not a physical phone. All 12 recorded runs completed without errors.

| Median | Desktop before → after | Mobile before → after |
| --- | --- | --- |
| First contentful paint | 332 → 336 ms | 344 → 392 ms |
| Largest contentful paint | 1,896 → 1,828 ms | 1,892 → 1,848 ms |
| Graphics **and** smooth scrolling ready | 1,618 → 1,114 ms | 1,615 → 1,117 ms |
| Observed long-task blocking | 307 → 293 ms | 287 → 284 ms |
| Cumulative layout shift | 0 → 0 | 0 → 0 |

Full enhancement readiness improved about **31%** in both viewports. This means
both `#webgl-canvas.is-ready` and `window.__lenis` exist, sampled every 10 ms.
The existing entrance animation remains unchanged. First paint did not improve
in this run; no blanket claim is made that every metric improved. Blocking is
sum(max(long-task duration − 50 ms, 0)) over the observation window, **not**
Lighthouse TBT. Local lab measurements are not production field measurements.

## Rendering changes

- Precompute the tassel's unchanging ring trigonometry and taper at Float64
  precision, eliminating 4,114 repeated trig calls per desktop frame.
- After every act fades out, clear the canvas once and skip subsequent empty
  render submissions. Simulation, camera, theme and fade clocks still advance.

## Visual and interaction checks

- 12 cap screenshots are byte-identical before/after: desktop and mobile,
  light/dark, at progress 0, 0.5 and 1, using deterministic random input and steps.
- 1,200 slow-scroll/fast-scrub simulation frames produce byte-identical tube
  positions, normals and rope nodes for desktop and mobile.
- A director comparison preserves state, camera, clear/resume behavior and
  reduces render submissions from 861 to 211 in a sequence with 600 hidden frames.
- Existing cap physics, camera rail and Vibe Studio data tests pass.
- Desktop/mobile content, light/dark, preset/reset, palette/Escape, section jumps,
  education/thesis visibility, reduced motion, unavailable WebGL and failed
  optional library loading checked in Chrome. No uncaught errors or horizontal
  overflow. No live AI requests were sent during these checks.
- One initial desktop jump check ran under concurrent GPU test load and stopped
  early. A dedicated before/after retest without that contention reached the
  intended section at the same 20 px offset in both versions.

Screenshots validate selected states; they do not prove every browser or input
sequence. The physical trackpad feel still deserves the owner's review.

## Profile changes

Grounded in the owner's supplied LinkedIn screenshots: Software Development
Engineer I at Amazon, September 2026–present, Seattle; Stores Payments / Unified
Financing Offers, Java and microservices. Strada is a former role, May–August 2026.
The hero/About copy emphasizes ambitious problems, raising the bar, measurement,
craft and stakeholder impact. Page metadata, structured data, commands, suggested
questions and the Worker's knowledge text are synchronized.

The public site is not changed by local edits. Publishing the page requires a
GitHub Pages deployment; the updated assistant knowledge also requires deploying
`agent-worker/worker.js` separately. Its existing endpoint is live, so until that
Worker is deployed its answers continue using the previous knowledge.
