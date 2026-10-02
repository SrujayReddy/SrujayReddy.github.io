# Portfolio performance and profile update — September 2026

The cinematic design preserves the same library versions, particle counts,
DPR cap, shaders, materials, tube density, physics, camera rail and authored
crossfade timing. Scroll-control corrections are described in the October
follow-up below. No images were recompressed and no cinematic animation removed.

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

## Follow-up: thesis → Now scrolling and full rendering pass

The September 30 follow-up compares with `eea37f6`, the already optimized local
version above. It addresses continuous runtime work and navigation races.

- The Now pipeline's 64 px signal now translates on the compositor. A
  ResizeObserver updates its travel distance only when the track changes size;
  the original CSS remains the fallback. Its 3.6 s duration, easing, opacity,
  gradient, glow and path are retained. A wide invisible moving carrier was
  rejected because its overflow caused extra paint work.
- Pending thesis snaps cancel at the raw input event and on either exit. They
  cannot override active Lenis animations or held touches. Settled beat targets,
  entry catch, 130 ms delay, 700 ms easing, 0.6 wheel scale and seven-viewport
  runway are retained. Palette focus restoration no longer scrolls to an old
  offscreen button. Native CSS smooth scrolling stays disabled for the entire
  Lenis lifetime, avoiding a second animation during idle scrollTop writes.
- Unchanged counter integers and settled education reveal styles avoid repeated
  DOM writes. Camera rail and particle rendering were audited; their density,
  appearance and interpolation remain the same.
- The tassel reuses Frenet/tangent/arc-length vectors and storage with the exact
  pinned Three r169 arithmetic. Static fringe offsets and unchanged material
  theme values are cached; dynamic geometry carries the appropriate GPU hint.
- Vibe backgrounds cache invariant gradients and colors on resize/theme changes.
  The original canvas clear is retained: removing it changed three star-edge
  pixels by one channel value in a parity check.

### Runtime trace

Chrome on macOS, 1440×900/DPR2, 4× CPU slowdown, one sequential before/after
trace per stage. Approximately three seconds per stage; the exit stage applies
28 wheel deltas of 150 px. These are local diagnostic samples, not field data or
Lighthouse scores.

| Layout operations | Before (`eea37f6`) | Final |
| --- | ---: | ---: |
| Thesis hold | 179 | 0 |
| Thesis exit scroll | 190 | 12 |
| Now hold | 182 | 0 |
| Experience hold | 182 | 0 |

During the Now hold, layout time fell from 69.4 ms to 0; measured main-thread
task time fell from 723.5 ms to 629.4 ms. During exit, layout time fell from
84.8 ms to 8.7 ms. Frame-time p95 remained approximately 16.8 ms in both versions;
this machine already sustained roughly 60 fps. The supported claim is less work
and removal of scroll races, not a demonstrated universal FPS increase.

### Verification

- 1,920 full cap frames exactly match `eea37f6`: 338,181,120 geometry attribute
  bytes plus rope/tube coordinates, transforms, visibility, materials and lights.
- The committed `cap-frames.mjs` compares 720 frame sets against real shipped
  Three.js, including coincident/straight curves and arc-length cache resizing.
- Twelve new cap screenshots are byte-identical: desktop/mobile, light/dark,
  progress 0/0.5/1. All 48 background frames are byte-identical across four scenes,
  two sizes, two palettes and three sampled times, including scene changes/reset.
- Signal screenshots including the glow are byte-identical at the midpoint at
  widths 1440 and 900. Five sampled times retain identical opacity/size/easing;
  transform positions differ from old layout rounding by at most 1/64 CSS px.
  The signal remains hidden at the original mobile breakpoint.
- Fourteen deterministic motion tests pass; the original source fails the new
  pending-wheel-timer regression. Existing physics, camera and vibe-data tests pass.
- Chrome desktop, mobile viewport and reduced-motion navigation checks pass at
  4× CPU slowdown: settled thesis beat, wheel exit, reverse exit, palette jumps,
  focus restoration, theme/reset and no horizontal overflow or uncaught errors.
  The desktop/mobile Amazon jump lands at its intended 20 px offset.
- Browser AI tests intercept the endpoint. Streamed replies, temporary/daily
  limits, interrupted streams and generated theme application pass without
  making live inference requests. The Worker has 15 mocked contract checks and
  passes Wrangler's deployment dry run.

Screenshots and numerical parity establish the tested states, not every browser,
physical trackpad or live model response. The owner can review the local page at
`http://127.0.0.1:8137/`. The public site and live Worker have not been changed.

### AI replacement status

The local Worker defaults explicitly to Workers AI (Llama 3.1 8B FP8 chat,
Llama 3.3 70B FP8 Fast themes). Existing provider keys cannot select a paid
provider, and there is no automatic paid fallback. Chat/Vibe preserve their
browser contracts; rate-limit messaging distinguishes temporary capacity from
confirmed daily exhaustion. See `agent-worker/README.md` for the plan constraints.

Wrangler authentication is expired and cannot refresh. The account's Free plan,
model availability and live response/theme quality must be verified before
activation. No inference or paid-plan change was performed. Frontend publishing
also remains blocked by the previously observed GitHub write-access failure.

## October 1 — scroll direction and jitter correction

The owner still experienced extreme jitter after the September 30 changes. The
older hold/exit tests measured fewer layouts, but did not establish that physical
scrolling felt smooth. This pass treats unwanted scroll movement separately from
rendering speed.

### Reproduced interaction defects and corrections

- A small downward gesture in Thesis could be undone by its nearest-beat snap.
  Fresh-entry catch could also rewind several viewport heights. Two uniform
  quarter-progress snap destinations landed inside fades: at 25% timeline progress
  neither neighboring slide was fully visible. Settling now derives readable
  holds from the actual GSAP timeline, including completed counters. It assists
  only a finished user gesture, in that gesture's direction, by at most
  `min(120 px, 0.15 × viewport height)`. It leaves readable holds and section
  boundaries alone and consumes each gesture once. Crossfades, counter timing,
  seven-viewport pin, 0.6 wheel pace, 130 ms settle delay and 700 ms easing remain.
  This replaces the September 30 entry-catch/quarter-progress behavior above.
- With pending downward momentum, a small upward wheel gesture only subtracted
  from the old destination. The page continued downward for the next 400+ ms in
  the reproduced case. Eligible opposite-direction wheel input now clears the
  old momentum before Lenis consumes the new delta. Ctrl-zoom, nested/prevented
  scrolling, stopped/locked state and same-direction input retain their paths.
  In the browser regression, the next recorded frame moved upward 14.5 ms after
  the reversing event. Native scroll keys also replace unfinished wheel momentum;
  editing controls and modified shortcuts are excluded.
- Graphics now join GSAP's ticker after the Lenis/ScrollTrigger update, so rendering
  sees the current frame's scroll state. The director keeps its existing Three
  clock, dt cap, simulation math and manual step; standalone/lab/no-motion usage
  retain their own RAF. This corrects scheduling order without claiming a GPU
  speedup.

### Evidence and limits

- Controlled Chrome on macOS/Apple M1 Pro Metal, 1440×900/DPR2, 4× CPU slowdown:
  150 positive wheel events across Thesis → Now and eight small positive events
  for a settled gesture. A clean headed run recorded approximately 120 animation
  callbacks per second. The old settled gesture traveled backward 56 px; the new
  one traveled backward 0 px. Both had approximately 10 ms p95 callback intervals.
  Headless runs reproduced 32 px → 0 px backward movement at approximately 60 Hz.
  Callback intervals do not measure GPU presentation or universal FPS. No claim
  is made that every browser/device lag is eliminated.
- Twenty-two committed motion regression checks use the actual shipped GSAP
  timeline to validate readable hold math/counter completion, bounded direction,
  no self-chaining, fresh input/navigation/exit cancellation, native input and
  momentum guards. The director test validates one driver, same-frame progress,
  exact simulation/camera parity at 60/120 Hz, hidden pause/resume, standalone
  fallback and disposal. Cap physics/frame and camera tests also pass.
- Ten actual browser scenarios pass: small-gesture rewind prevention, nearby
  readable landing, Thesis exit, reverse entry, first-frame momentum reversal,
  native keyboard takeover, explicit navigation, palette close, mobile native
  touch and reduced-motion fallback. No uncaught errors or horizontal overflow.
- Twenty-four deterministic viewport screenshots cover home, education, three
  Thesis states and Now, on desktop/mobile and light/dark at DPR2. Twenty-three
  are byte-identical; one dark Thesis image differs at one pixel by one channel
  level. Particle density/resolution, shaders, cap geometry/materials/physics,
  camera and authored crossfade timing are unchanged. Selected images were
  visually inspected.
- Moving the fixed background washes to a separate layer did not show a useful
  improvement in the controlled trial and was not applied. No speculative
  particle-count, DPR, alpha, blur or animation-frequency cuts were made.

Evidence/scripts/traces: `~/.codex/artifacts/portfolio-jitter-2026-10-01/`.
The revised page is served locally at `http://127.0.0.1:8137/`; reload before testing
so the open page runs the revised modules. Real trackpad feel in the owner's
in-app browser still requires the owner's review. Public publishing and live AI
activation remain in the pending state documented above.
