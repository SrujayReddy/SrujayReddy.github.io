# Cinematic Rebuild — Progress Log

Living status for the light-first, per-section cinematic redesign. See
`DESIGN-BIBLE.md` for the full creative + technical spec, and `HANDOFF.md` for
the pre-redesign baseline.

## Architecture (new)

- **Theming** is light-first with a dark toggle. `styles/tokens.css` = two-tier
  tokens (brand hues constant; semantic tokens flip by `:root[data-theme]`).
  No-flash inline script in `index.html` sets the theme before paint; default is
  **light** (we do NOT auto-follow OS — dark is a remembered, explicit choice).
  `js/theme.js` owns the toggle + a `themechange` event the WebGL layer listens to.
- **WebGL** = a `SceneDirector` (`js/webgl/director.js`): ONE renderer/scene/camera/
  rAF loop. Per-section "acts" register against it; it crossfades them, threads a
  shared `uTheme` uniform (NormalBlending on light / AdditiveBlending on dark — the
  fix for the white-blob washout), travels the camera, and pauses offscreen.
  Acts implement `init/setProgress/setActive/setTheme/update/cameraRig/resize/dispose`.
  - `director.step(dt)` advances + renders ONE frame manually — used for verification
    because the preview tab is hidden (rAF throttled). `window.__cinema = {director, field}`.
- **The field** (`js/webgl/field.js`) is the "organism": one Points object behind
  the whole page. Home cluster + named formation buffers (`addFormation/setFormation/
  setMorph`). Renders as airy graphite specks (light) / glowing starfield (dark).
- **Motion** (`js/motion.js`) keeps the Lenis + GSAP/ScrollTrigger pattern and just
  calls `director.setProgress/setActive` per section.

## Done & verified (screenshots in session)

- [x] Fixed 2 pre-existing bugs: shader precision mismatch (field never rendered)
      and hero-title `yPercent` vs CSS `translateY` mismatch (headline stayed hidden).
- [x] Light-first theming system + dark toggle + no-flash + semantic-token sweep
      across base/sections/command CSS + `<noscript>`. Verified both themes.
- [x] SceneDirector + theme-aware particle field. White-blob root cause = oversized
      point sprites (`150/-z`); fixed to fine specks. Verified light + dark.
- [x] **Education flagship — "The Turning of the Tassel"** (`js/webgl/education.js`):
      procedural mortarboard (board + skullcap + button) + CPU verlet tassel
      (fixed-timestep, Jakobsen constraints, in-place tube rebuild — no per-frame GC).
      Scroll sweeps the tassel right→left; board yaws to follow; field hands off the
      stage. Degree facts resolve per beat. Verified light, dark, and the no-WebGL/
      reduced-motion SVG fallback. Content in `content.education`.

## Reliable preview loop (important)

- The Claude_Preview tab renders **hidden** → rAF throttled (animations don't auto-play)
  AND aggressive module caching breaks reloads on a reused origin.
- Fix: a **no-cache dev server** (`scratchpad/devserver.py`) on a **fresh port**
  (currently 8137, see `.claude/launch.json`). Verify by: reload → `window.__cinema`
  → `director.step()` in a loop → `preview_screenshot`. Force theme via
  `document.documentElement.setAttribute('data-theme', …)` + `director.setTheme(…)`.

## Round 2 (owner feedback: take quality up, fix the cap, invent a real 2nd AI feature)

- [x] **Graduation cap rebuilt to spec** (`js/webgl/education.js`): BLACK cap + GOLD tassel
      (real grad colours), clear 3/4 top-down orientation, smooth scroll-driven TWIRL, and a
      WORLD-SPACE verlet rope with collision against the board + skullcap so the tassel drapes
      over the front edge and never clips through. Fixed-timestep physics; tassel sweeps right→left
      (the "turn"). Iterated + verified in light & dark via a new **`lab.html`** harness (the full
      page preview is too flaky for scroll-dependent views — Lenis scroll gets stuck in the hidden
      tab). Remaining cap polish: fuller fringe, optional contact shadow, a real-browser in-page pass.
- [DECIDED] **2nd AI feature = "The Build Bench"** (assemble→run→MEASURE a mini agent) with the
      "Glass Box" transparency (real latency + honest grounding) baked in. Lens was dropped. A
      `build-bench-spec` workflow is producing the concrete build spec; implement from it. See task list.

## Round 3 (this session — AAA cap + Build Bench)

- [x] **AAA graduation cap** (`js/webgl/education.js`): upgraded to `MeshPhysicalMaterial` —
      matte BLACK velvet (sheen + clearcoat) board/skullcap/lip, GOLD woven-silk (anisotropy)
      tassel/button, lit by a cheap procedural PMREM env baked once (no assets); eased
      LIGHT→DARK theme crossfade (no rebuild). Motion is now a **multi-axis diagonal tumble**
      (pitch + yaw + roll). Collision generalized to the cap's full **quaternion** (BOX board
      via least-penetration push-out → rides the top + drapes over the front edge; HEMISPHERE
      skullcap) + a per-substep velocity clamp. Verified frame-by-frame headless via
      **`tests/cap-physics.mjs`** (runs the real act against a math-accurate THREE shim): NO
      clip (board/skull pen = 0), NO blowup, stable rope across slow sweep + fast scrub.
      Remaining: real-browser aesthetic pass on the velvet sheen / anisotropic gold + tumble feel.
- [~] **The Build Bench** (2nd AI feature): assemble → run ×N → MEASURE (p50/p95 latency, token
      cost, grounding) with a Glass-Box provenance badge + a prompt-cache "optimize & re-measure"
      beat (the interactive rhyme of the thesis "pre-pull the image"). Ships dormant via recorded
      real samples in `content.bench`; live `{mode:"bench"}` worker branch upgrades to
      measured-from-your-browser. Honest-by-construction grounding checked verbatim vs content.js.

## Round 4 (this session — the unified "Camera Spline Ride")

Re-architecting from per-act widgets → ONE continuous spatial journey.
- [x] **Stage 1 — unified camera track** (`js/webgl/camera-rail.js` + `director.js` + `motion.js`):
      one `CatmullRomCurve3` with a station per act; `director.setRide(0..1)` drives the camera
      along it; global Lenis scroll (`scroll/limit`) maps smoothly to the ride. Replaces idle-drift
      / per-act `cameraRig`. `setRideActive(false)` reverts to legacy. Verified headless via
      **`tests/camera-rail.mjs`**: continuous (jump 0.05), visits all 9 stations, stays framed (z>3.2).
- [ ] **Stage 2 — world placement + macro fly-through**: move assets into one world along the track;
      scale the cap MASSIVE; reshape the education station to dive under the brim → portal into the
      bench; sync DOM section opacity to station t-windows (not independent reveals).
- [ ] **Stage 3 — continuous field**: the organism never fully fades; coalesces into structures
      (cap / bench nodes) by camera proximity, dissolves to drift between.
- [ ] **Stage 4 — post-processing**: EffectComposer + theme-gated UnrealBloom (≈0 on light to avoid
      washout) + guarded BokehPass, addons importmap (three-deduped), self-disabling on error.
      NOTE: the post-fx LOOK + fly-through FEEL need a real browser to tune (no Preview MCP this session).
- [x] **Cap fix pass** (owner saw: tassel clipping + tacky/flat + wanted a classy diagonal twirl):
      • CLIPPING ROOT CAUSE: per-node collision is clean but the rendered tube is a Catmull-Rom
        curve that BOWS between nodes into the board. Fix: after the rope settles, sample the curve
        and push every TUBE CENTERLINE point out of the box+sphere with the tube radius as margin —
        the visible gold can't penetrate, not just the nodes. Test upgraded to REAL centripetal
        Catmull-Rom + a rendered-centerline check (it now reproduces the overshoot); pen = 0.00000.
      • LOOK: reoriented to show the mortarboard TOP (was the underside); brighter studio rig
        (key + cool fill + strong gold rim); velvet sheen + satin-gold tuned to catch light; brighter
        PMREM env; soft contact shadow; larger; fuller fringe; 24-node rope. (Look still needs a
        browser screenshot to confirm — physics is verified.)
      • TWIRL: constrained multi-axis diagonal tumble (~126° yaw + gentle pitch/roll), top stays legible.

## Round 5 (this session — layout reset + Build Bench sandbox)

- [x] **Cap scale/position reset** (`education.js`): scale 1.2 → **0.58**, position x 1.4 → **2.05**, y → 0.28 —
      sits in the right half, frames the UW–Madison copy without overlap. Velvet/gold materials intact;
      physics re-verified (no clip).
- [x] **Education promoted to 2nd in the DOM** (`index.html`, right after the hero) + **camera rail re-indexed**
      (`camera-rail.js`: hero → education → positioning → …) so the camera glides Hero Nebula → Education
      flagship. Rail test still passes (continuous, visits all stations, framed).
- [x] **Build Bench → "Agent Orchestration Sandbox"** (`js/bench.js` + `styles/bench.css`): a live node-graph
      canvas (Router → Retrieve → Prompt Cache → LLM · Haiku → Validate) with glowing data-packets pulsing
      the paths, a streaming **console terminal**, neon pipeline flows, and the prompt-cache toggle visibly
      speeding the cached leg. The honest measurement engine (real p50/p95, cost, grounding, trap-refuses,
      dormant recorded + live worker) is preserved underneath; bench-data test still passes.

## Round 6 (this session — flow fixes + Vibe Studio replaces Build Bench)

- [x] **Thesis-overlap fix** (`motion.js`): two pinned ScrollTriggers (education now 2nd, thesis 4th)
      were colliding. Built them in DOM order + `refreshPriority` (education 1 > thesis 0) +
      `invalidateOnRefresh` + dynamic `end()` so the pin-spacers stack correctly.
- [x] **Abrupt-camera fix** (`camera-rail.js` + `director.js`): compressed the station deltas (gentle
      travel) + heavier ride smoothing (dt*2.4, lerp 0.16) → the camera glides between sections instead
      of swinging fast/suddenly. Rail test still passes.
- [x] **Cap physics life** (`education.js`): relaxed the velocity clamp + a subtle "wind" so the tassel
      has organic, physical motion at rest. Still 0.00000 clip. (Look/quality still needs a fresh screenshot.)
- [x] **AI demo: Build Bench → "Vibe Studio"** (web-researched). Type/pick a vibe → the page restyles
      live: accent / plasma / washes + the WebGL **particle field** (`uVibe`/`uVibeMix` in field.js +
      `director.setVibe`) morph with a smooth transition. Honest+safe: only the COLOR identity changes,
      never --bg/--ink, so contrast + dark-mode stay intact. Ships dormant (free text → nearest preset via
      keyword scoring); a Worker `{mode:"vibe"}` branch (TODO — replaces the old bench branch) upgrades
      free text to a generated, hex-validated theme. New: `js/vibe.js`, `content.vibes`, `styles/vibe.css`,
      `tests/vibe-data.mjs`. Removed: `js/bench.js`, `styles/bench.css`, `tests/bench-data.mjs`.

## Round 7 (this session — cap through-the-top fix · Vibe Studio v2 · docs)

- [x] **Cap "falls through the top" fixed** (`education.js`): the box collision used
      least-penetration, which shoved a sunk node out the BOTTOM face (under the board),
      then it slowly climbed back. Now the vertical resolve **always lifts to the top,
      never pushes out the bottom**; tighter velocity clamp + lighter gravity. New test
      assertion `UNDER-board penetration = 0.00000`. Segment lengths went from a 2× stretch
      to a tight [0.107, 0.126] — even, natural drape.
- [x] **Vibe Studio v2 — full-page redesign** (`vibe.js`, `content.vibes`, `vibe.css`):
      a vibe now swaps the whole theme — **background, ink, surfaces, borders, FONT, corner
      RADIUS**, the accent/plasma palette, AND the particle field (`dark:true` flips the field
      to glow mode). 6 dramatic presets incl. a dark "Cyberpunk Neon". Honest+safe: every
      theme is **WCAG-AA contrast-validated (bg/ink ≥ 4.5:1)** before it touches the page;
      live-worker themes are contrast-gated client-side. `tests/vibe-data.mjs` enforces it.
- [x] **Docs written** (owner request): `CLAUDE.md` (operating guide — architecture, run/verify,
      conventions, gotchas, file map), `SKILLS.md` (the node verification harnesses, the
      skill-creator, how-to procedures), `LOOPS.md` (the human-in-the-loop visual loop, the
      verify-tighten ratchet, and Claude Code `/loop` + `/schedule` usage for this repo).

## Round 8 (this session — cap "looks like a real 3D cap" pass · edge-case audit)

Owner feedback: the cap read as a "navy floating slab," looked tacky/black-flat, tassel
looked artificial, wanted a CLASSY diagonal twirl and a real high-quality look.
- [x] **Cap silhouette now reads as a mortarboard** (`education.js`): root cause = the skullcap
      was a small upward dome tucked INSIDE/behind the wide board, so nothing read as a "cap".
      Replaced it with a `LatheGeometry` **crown that HANGS BELOW the board** (`makeCrownGeo`), and
      dropped the view tilt (`group.rotation.x` 0.58 → **0.24**, a front-3/4) so the crown shows
      under the board — it now unmistakably reads as a graduation cap. Verified in the lab, light + dark.
- [x] **True BLACK, not navy**: the navy came from a strong slate-blue sheen + blue ambient + env.
      Sheen 1.0 → 0.5, sheenColor 0x5566aa → **0x2b2f44**, envMapIntensity 0.4 → 0.22, ambient
      0x3a4566 → **0x26262e**. Reads black with a restrained grazing sheen.
- [x] **Cleaner gold tassel**: fuller cord radius (0.04 → 0.058 tapering to 0.034), and the cord kink
      near the button fixed with **3 Laplacian smoothing passes** on the RENDER centerline + a softer
      edge-pull (0.32 → 0.22). collidePoint() still pushes the smoothed tube out of the cap.
- [x] **Physics preserved**: `tests/cap-physics.mjs` still PASS — board/skull/under/tube penetration all
      0.00000, stable across slow sweep + fast scrub. (Added Vector2/LatheGeometry stubs to the shim.)
- [~] **Full-page in-context framing UNVERIFIED**: the camera-rail education station looks at ~x0.55 but
      the cap group is at world x2.05, and ride-t (scroll) isn't synced to the DOM/station windows
      (rail Stage 2 incomplete). Needs a real browser to tune; flagged for the audit. The cap in ISOLATION
      (lab) is confirmed premium; the seamless fly-through framing is the open work.
- [x] **Edge-case audit + fixes** (39-agent adversarial review across degradation/theme/a11y/perf/motion/
      AI-honesty). ALL 12 confirmed findings fixed + tests still green:
      • a11y/contrast (command.css): ⌘K glyph, active-icon, streaming caret → theme-aware `--accent`/
        `--accent-3` (ink on light, bright on dark); restored the palette input focus ring; ember toast
        border now visible on light; toast got `role="status"`.
      • perf (education.js): removed per-frame `new CatmullRomCurve3` (reuse one curve) + per-frame
        `computeVertexNormals()` (write tube normals analytically from the Frenet frames). cap-physics still 0.00000.
      • theme (sections.css): work-card media wash → `color-mix` over accent tokens (tracks dark + Vibe).
      • honesty: dead thesis `href="#"` now renders as a non-anchor; worker `SYSTEM_PROMPT` re-synced to
        `content.knowledgeBase` (NOW stack, OpenAI concurrency).
      • 2nd AI feature completed: implemented the `{mode:"vibe"}` Worker branch (`handleVibe` + tool-forced
        theme JSON + its own rate caps) so Vibe Studio's "a live model generates a theme" is now TRUE, not
        just advertised — client still hex+contrast-gates every field. (The dead `{mode:"bench"}` branch remains
        but is unused; safe to delete later.)
      • 6 of 8 low-severity items done: btn hover/shadow, edu SVG shadow, beyond feature + no-webgl
        fallback gradients → `color-mix` over accent tokens (track theme + Vibe); + a palette focus TRAP
        (Tab now cycles within the modal). Deferred 2: fast-scroll particle LOD (micro-opt) and the
        dormant-agent `innerHTML` (email is a trusted constant — genuinely safe).

- [x] **Cap polish** (owner picked this): scale 0.58 → **0.66** (more presence), and a **cap-toss finish** —
      in the final ~18% of the scroll the cap floats up and tips like the toss. Verified light, dark,
      and **mobile (375px, 18-node tassel)**. cap-physics still 0.00000; full suite green.

## In progress

- [~] Thesis "Latency Clock": the field now has a `clock` formation (ring split by
      phase share; image-pull dominant arc colored plasma) wired into the pinned
      thesis timeline (`setFormation('clock')` on enter, restore on leave). Mechanically
      working + no regression, but needs AESTHETIC tuning: ring radius is too large,
      and the dominant arc vs the tiny slivers needs clearer contrast (and ideally a
      sweep-hand + the 75s→2s collapse beat). See `buildClockFormation` in main.js.

## Next (build order from the bible)

3. Finish Thesis "Latency Clock" tuning (above) + sweep hand + collapse beat.
4. Hero "Ink Constellation" (SJ monogram morph) + Positioning "Reliability Ledger".
5. Now/Strada "Orchestration graph" — and wire the **Lens** AI feature (2nd AI:
   self-reframing portfolio via `apply_layout` tool; ships dormant with presets).
6. Experience "Constellation Trail" + Work "Light Table".
7. Beyond "Warming" + Contact "Signature" + integrate the pizza ember egg.
8. Polish: perf/a11y/mobile/Lighthouse, self-host Geist, troika 3D labels, Education
   camera pass-through ("scroll through it") + larger/screen-filling cap + cap-toss.

## Open Education refinements (deferred)

- Camera pass-through at end of section ("you scroll through it") via `cameraRig`.
- troika-three-text for crisp in-scene degree labels.
- Enlarge toward screen-filling while keeping the left copy readable (scrim).
