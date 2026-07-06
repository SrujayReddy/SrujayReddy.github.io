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

## Round 9 (this session — owner content pass · cap scroll-clip fix · demo onto the hero)

Owner batch, ALL verified live (light + mobile) with zero console errors:
- [x] **Copy/content**: positioning statement replaced with the owner's new "observable, measurable,
      resilient" paragraph (resized from display-h1 to a 42ch statement; new emphasis words);
      thesis eyebrow "Honors Thesis" (MINDS@UW dropped); a plain-language `thesis.context` paragraph
      (renders under the subtitle) so the data-viz isn't opaque; REAL MINDS@UW paper permalink;
      advisor = "author of OSTEP" (not co-author); ALL "approx." badges removed (toConfirm flags
      dropped from breakdown + fix); education "Dean's List" fact → "Thesis … published in MINDS@UW";
      Experience lead line removed; "Selected work" → "Projects" everywhere (heading, nav, ⌘K command,
      knowledgeBase + worker SYSTEM_PROMPT).
- [x] **Cap scroll-clipping ROOT-CAUSED + fixed** (`education.js`): during scroll transients the cord
      cut through the board's front EDGE — the old collision pushed points off the nearest FACE
      (axis-aligned), which does nothing at a convex edge/corner where the tube wraps. Rewrote
      `resolveLocal` as inside→least-pen face eviction (never the bottom) + OUTSIDE **rounded-box
      (SDF) push-out** to the nearest point on the box. `tests/cap-physics.mjs` upgraded to a
      rounded-box distance check against the REAL board extents with the REAL max cord radius
      (0.058) — it now catches edge/corner pokes; all penetrations 0.00000. Verified visually in the
      lab mid-scroll (1 physics frame per progress step) at p≈0.55 and p≈0.95.
- [x] **Live-restyle demo moved onto the HERO as a page feature** (owner: drop the "Vibe" branding,
      no standalone section): `#bench` section + "Studio" nav link removed; a compact widget under
      the hero CTAs — mono label "Live demo — restyle this whole page:", 6 preset swatches + 🎲 +
      an "or describe a look…" input, mood pill + Reset. All `data-vibe-*` logic/machinery unchanged
      (presets, keyword routing, worker {mode:"vibe"}, contrast gating). New `styles/vibe.css` compact
      styles; included in the hero GSAP entrance + `applyStaticHero` fallback. Verified: one click →
      whole page restyles (sunset brutalist), Reset restores, mobile wraps cleanly at 560px.
- [x] **Pizza egg has a visible home again**: a discreet 🍕 button in the footer (`.egg-btn`,
      grayscale until hover) wired to the SAME `fire()` — burst + "Joey doesn't share food." toast
      (role=status) verified. ⌘K command + Konami still work. Footer "Built with WebGL·GSAP·Claude
      agent" line removed.
- [x] **Path Finder thumbnail** (`assets/images/path-finder.svg`): procedural campus-map SVG —
      faint street grid, lake nod, dashed explored edges, plasma-gradient shortest path, start/dest
      pins, mono caption. Wired into the project card; sits well beside the photo cards.
- [x] **Experience polish**: editorial chapter indices (01–04 via CSS counters) above each org +
      an accent inset-bar hover. Quiet credibility, no layout shift.

## Round 10 (final polish — resume removed · mobile plane fix · demo re-marketed)

- [x] **"Download résumé" removed entirely** (owner request): command gone from `content.commands`,
      probe + action stripped from `agent.js`, `RESUME_PATH` dropped from `config.js`. ⌘K verified: 10
      commands, no resume.
- [x] **Mobile "out of plane" cap FIXED**: the cap's desktop placement (world x=2.05, right half) is
      off-screen on a phone frustum (~±1.2 world units). Now responsive — narrow viewports center it
      in the top third (x=0, y=1.55, scale 0.42) with the copy pushed below (30svh padding, only when
      the 3D cap is live), and `resize(w)` repositions on orientation change. Verified at 375×812:
      cap fully in-frame above the heading. Physics still 0.00000.
- [x] **Demo re-marketed** (owner: "Live demo" was weak): the hero line is now
      "**Good software adapts to its users. This page does — pick a look:**" — ties the widget to the
      FDE positioning instead of demo-speak. aria-labels + placeholder updated ("or describe your own…").
- [x] Final sweep: all 3 tests PASS, all JS syntax-checked, zero console errors, desktop + mobile
      screenshots verified. Committed + pushed to `feat/cinematic-portfolio` (PR #2).

## Round 11 (owner batch: fold, transitions, cap birth+weld, guardrails, Gemini, redesigns)

All owner nitpicks addressed and verified live (light, 1440×900 + 1280×800 + mobile):
- [x] **Hero fold**: display clamp 5.25→4.4rem, tightened name/eyebrow/sub/CTA/restyle margins,
      hero padding, + a `max-height: 840px` compression tier. The restyle demo now sits ABOVE the
      fold on 900px and 800px viewports (verified 882/900 and 758/800).
- [x] **Thesis→dots transition**: leaving the pin no longer swaps the formation buffer at high morph
      (a visible particle teleport) — it now only eases uMorph home along the same targets, so the
      clock MELTS back into the ambient cluster. Buffer swaps happen exclusively at morph≈0 (enter).
- [x] **Cap "tassel buried at load" KILLED**: rope is now BORN already-draped in the pivot's rotated
      frame (pivot posed before rope creation) + ~2s of fixed-step pre-settle in init — the first
      rendered frame is a calm, fully-visible drape (verified at 2 frames after load).
- [x] **Cap "tassel not attached" KILLED**: the anchor now rides the ROTATING capPivot (it used to
      stay fixed while the button rotated away — the visible gap), the button is taller (clears the
      board top), ANCHOR_Y 0.6→0.74 (above the cord-expanded collider), and a gold WELD knot covers
      the anchor so the cord visibly grows out of the button. Verified mid-turn at 0.5.
- [x] **Collision correctness**: TUBE_MARGIN 0.045→0.063 (≥ max cord radius), inclusive inside-branch
      (points exactly ON the expanded surface were slipping between branches), d2>0 guard (float-ulp
      offsets kept the push direction), and a TWO-PASS box+sphere resolve (order-independence).
      cap-physics: ALL penetrations 0.00000 again.
- [x] **"Cold-start timeline, decomposed"** (owner: repetitive/misaligned): the proportional bar +
      legend replaced by 4 aligned bar-chart rows (label · bar · value); the image-pull row is bold
      plasma at 93–99% and visually dwarfs the 2–3% slivers. No more duplicate labels.
- [x] **Now section immersion**: soft accent band, an animated agent-signal pulse traveling a
      3-node pipeline into numbered (01–03) pillars with lift-on-hover. Subtle, on-theme (his job IS
      agent pipelines). Reduced-motion + mobile: pulse hidden, pipe removed.
- [x] **Vibe GUARDRAILS** (owner: brutalist/mono fonts blew up the hero): two layers —
      (1) `--font-display` token: the hero headline is IMMUNE to theme font swaps by construction;
      (2) a runtime self-heal in applyVibe: baseline-vs-after measurement of display lines + hero
      height; ANY font (preset or model-generated) that grows the hero gets dropped (colors stay).
      Verified: brutalist + mono keep the composition; guard fired and healed in test.
      Plus: the mood pill now REPLACES the label line (absolute, .has-vibe) so applying a theme can
      never push the hero below the fold.
- [x] **Worker: free-tier Gemini support**: chat streaming (streamGenerateContent?alt=sse) + vibe
      theme JSON (responseMimeType) via GEMINI_API_KEY from Google AI Studio; Anthropic path wins if
      both keys set. README rewritten with the two-provider table + free setup.
- [x] **Path Finder art v2**: campus blocks, lake, dashed explored edges, glow-underlay gradient
      route, ringed nodes, proper destination pin, caption chip.
- [x] Copy: label "…This page does that literally:", hero CTA "Ask anything about me", OpenAI
      backend-focused body/metrics/stack, CDIS "in collaboration with other Big Ten schools",
      Beyond: award card removed, Dean's Honor List 7 of 8 semesters, English & Telugu. knowledgeBase
      + worker SYSTEM_PROMPT synced.
- [~] Multi-agent adversarial verification workflow over the whole round: running; confirmed
      findings get fixed before ship.

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

- ~~Camera pass-through at end of section ("you scroll through it") via `cameraRig`.~~
  Done as a **dolly-in** (see below) — a full "scroll THROUGH the cap" would need the
  cap on the rail itself; the dolly gives the flagship its dwell without that risk.
- troika-three-text for crisp in-scene degree labels.
- Enlarge toward screen-filling while keeping the left copy readable (scrim).

## Round 10 (AI live + self-host fonts + education fly-through)

- [x] **AI features live.** `js/config.js` `WORKER_URL` → the deployed Cloudflare
      Worker (`srujay-agent.srujay.workers.dev`). Both ⌘K "ask" and the "describe your
      own…" theme generator now run against it (Gemini 2.5 Flash, free tier). Verified
      end-to-end from the real origin: ⌘K streams a grounded answer; vibe returns a
      contrast-safe theme; prompt-injection refused; CORS correctly locks to the site
      origin (localhost → 403, the graceful/dormant path). Palette footer now
      "Live · Gemini 2.5 Flash".
- [x] **Live-theme fonts actually show now.** The hero headline is on `--font-display`
      (immune), so the self-heal guard was relaxed to fire only on real horizontal
      OVERFLOW of display text (not any vertical reflow) — mono/serif/brutalist themes
      now visibly reskin the body instead of being reverted. `h1,h2,h3` get
      `overflow-wrap:break-word` so long tokens ("Wisconsin–Madison") wrap under any
      font. Verified: mono preset keeps its font, 0 overflow.
- [x] **Self-hosted Geist + Geist Mono.** Dropped the Google Fonts CDN; 6 subsetted
      latin woff2 in `assets/fonts/` + `styles/fonts.css` (`font-display:swap`), with
      the two above-the-fold weights preloaded. Verified: 0 requests to
      googleapis/gstatic, all faces same-origin, body + hero render Geist.
- [x] **Education fly-through (dolly-in).** The camera used to only glide the rail past
      the cap while the pin spun it. Added an additive per-act camera accent
      (`director` applies active acts' `rideRig` on top of the rail) + an education
      dolly that pushes toward the cap, HOLDS through the tassel-turn + toss climax,
      then releases on hand-off. Desktop only. Verified via `__cinema.step` +
      screenshots (small/right → large/centred → tossed & framed tight);
      cap-physics + camera-rail stay green.
- [ ] **Needs the owner's eyes (real browser, scrolling):** the fly-through *feel* at
      true scroll speed, and the live agent/theme behaviour on the deployed site (the
      forced-render + curl prove correctness, not feel).

## Round 11 (model → Flash-Lite + multi-lens review sweep)

- [x] **Gemini model → `gemini-2.5-flash-lite`** (worker.js defaults + wrangler.toml
      `GEMINI_MODEL`): 1,000 req/day free (4× the old 250) at 15 RPM, and it now
      comfortably covers the worker's own `RATE_PER_DAY=800` (which previously exceeded
      Flash's 250 quota). Labels updated (config.MODEL_LABEL + palette). **Needs a
      Worker redeploy** (`wrangler deploy`) to take effect live.
- [x] **Worker SYSTEM_PROMPT re-synced to content.js** — it was stale: "English, Hindi"
      (→ English & Telugu), "Dean's List x2" (→ Dean's Honor List 7 of 8 semesters), old
      OpenAI/CDIS copy. The live agent would have stated wrong facts. Now mirrored 1:1.
- [x] **12-finding review sweep** (5 lenses × adversarial verify). Fixed 11:
      • HIGH: WebGL-loads-but-motion-fails now adds `no-webgl` so the flagship cap's SVG
        fallback renders instead of a blank column. • ⌘K Escape closes from any focus
        position (was input-only). • combobox `aria-activedescendant` + option ids so SR
        announces the highlighted command. • `.palette__answer` is now an aria-live
        status region. • close()'s deferred teardown is cancelled on reopen (no blank-
        palette race). • "reduced motion" command now pauses the WebGL rAF (not just
        hides the canvas). • `[data-reveal].in-view` releases `will-change`. • project
        cards serve WebP (≈half the bytes, JPEG fallback via `<picture>`). • short-phone
        education pin no longer clips the last fact. • Path Finder → its real repo.
        • MODEL_LABEL is now data-driven (single source). Verified in-browser.
      • Skipped (flagged to owner): thesis "Symposium" link `href:"#"` — a deliberate
        muted "pending" chip; left as-is rather than delete owner content.

## Round 12 (Vibe Studio "think harder" + impact + circle fix)

- [x] **Thesis Symposium link** now points at the real program PDF (honors.ls.wisc.edu).
- [x] **Thesis particle circle — dim arc fixed** (`buildClockFormation` in main.js): the
      bottom arc used to render the non-dominant phases near-black (`colorMix ~0.03`),
      so it read as a sparse/dim gap. Rebuilt as an EVENLY-spaced (i/count + jitter),
      uniformly-bright ring — one clean glowing circle, no dim arc. The per-phase data
      lives in the DOM bar chart, not the ring's brightness.
- [x] **Vibe Studio thinks harder** (worker.js + wrangler.toml): the vibe path now runs a
      STRONGER model with DYNAMIC THINKING — `GEMINI_VIBE_MODEL` default `gemini-2.5-flash`
      (vs Flash-Lite for chat), `thinkingBudget:-1`, `temperature:1.0`, `maxOutputTokens:2048`,
      and a bolder design prompt. A couple seconds slower, a more considered palette.
      **Needs a Worker redeploy** to take effect.
- [x] **Thinking indicator** (vibe.js/vibe.css): free-text submit shows an animated
      spinner pill with cycling status ("Reading the vibe…" → "Composing the page…") so
      the extra thinking time reads as craft.
- [x] **Bigger-impact apply** (vibe.js/vibe.css): every theme change now plays a
      full-viewport light-SWEEP of the new palette (+ center bloom) synced with a longer
      (0.72s) colour crossfade and the particle re-tint — the reskin lands as a reveal.
      Verified: uniform circle, thinking state, sweep element + wiring, clean console.
      Sweep/thinking *motion* needs the owner's eyes (hidden preview tab throttles CSS anim).

## Round 13 (Vibe Studio: think longer + a MUCH bigger design surface)

- [x] **Thinks longer** (worker.js): vibe path now runs `gemini-2.5-flash` with an explicit
      `thinkingBudget: 8192` (was dynamic) + `maxOutputTokens: 3072` — genuinely deliberates
      for a few seconds. (Needs a worker redeploy.)
- [x] **Controls a lot more of the page.** The generated theme can now reshape the whole
      TYPE identity, not just colour:
      - `--font-display` — the BIG hero headline font (was locked to Geist; now vibe-driven,
        guardrail-protected). `--font-mono` — labels/eyebrows. (+ `--font-sans` body as before.)
      - `--heading-transform` (none/uppercase/lowercase) + `--tracking-heading` (letter-spacing)
        — tokenised in tokens.css, wired into `h1,h2,h3` (base.css) + `.hero__title` (sections.css).
      - `--radius` + full colour palette (as before).
      Worker schema (`VIBE_TOOL`) + prompt expanded to design all of it cohesively (brutalist →
      mono/heavy display, uppercase, 0px; editorial → serif, roomy tracking, soft radius).
      Client `validate()` sanitises the new fields (safe-font regex, case enum, em-tracking regex);
      `applyVibe()` clear-before-sets them; the overflow guardrail now reverts ALL type tokens
      together (colour always survives). Verified end-to-end with a mocked brutalist theme:
      hero → Arial Black UPPERCASE, body/labels → Courier, orange-on-black, radius 0; Reset
      restores every default; guardrail only reverts on true overflow. Clean console, tests green.

## Round 14 (Vibe Studio: AI-selected animated BACKGROUND scenes)

- [x] **The AI can now change the whole backdrop** — safely. New `js/background.js` is a
      sandboxed scene engine: the model NEVER writes background code, it only picks a scene
      NAME from a fixed whitelist and we render it. Scenes: **waves** (sea/water/rain),
      **aurora** (sky/ethereal/dream), **starfield** (space/night), **grid** (retro/synthwave/
      terminal), or **none**. Each is drawn in the vibe's colours on ONE dedicated 2D canvas
      at `z-index:-1` (behind the particle field + content), capped (DPR≤2, small counts),
      paused when the tab is hidden, reduced-motion aware (one static frame), wrapped so any
      throw fails to an EMPTY canvas, and torn down cleanly on reset. **Worst case = today's
      site.** Whitelist-validated in `validate()`; the model can't inject anything.
      - worker.js: `background` enum added to `VIBE_TOOL` + prompt ("a sea → deep blue palette
        + waves") + JSON keys. vibe.js: `initBackground()`, `bg.setScene()` in applyVibe,
        `bg.clear()` in reset. base.css: `#scene-canvas`. content.js: Cyberpunk Neon preset
        → `grid` as a showcase.
      - Verified in-browser (deterministic `window.__bg.step` hook): a mocked deep-sea theme
        renders layered teal WAVES with particles floating on top; the neon preset renders a
        magenta synthwave GRID; aurora/starfield paint too; reset clears; clean console.
        (Needs a worker redeploy for the AI to emit `background`.)

## Round 15 (overflow edge-cases from the font/vibe features)

- [x] **Big thesis number (`.bignum`) no longer clips.** It ran ~90vw wide and, once
      vibe fonts could widen those huge digits (serif/heavy), the text reached the screen
      edges and got clipped by the pin's `overflow:hidden`. Pulled the clamp in
      (`18vw/15rem` → `14.5vw/13rem`) and added `white-space:nowrap` + `max-width:100%`
      as a hard safety net. Verified across Geist / Georgia / Arial Black at the widest
      count (93–99%): text keeps ≥360px margins at every viewport, never overflows its box.
- [x] **Long AI mood label can't blow out the pill** — `.restyle__pill b` gets
      `max-width: min(58vw,22ch)` + ellipsis (the mood is model-generated, up to 48 chars).
- Checked the other big display numbers (`.collapse .num` in bounded flex-wrap cards,
  `.phase__val` tiny + nowrap) — already overflow-safe, no change needed.

## Round 16-17 (Vibe Studio polish + edge-cases + stuck-deploy fix)

- [x] **Fixed the mood-pill / "thinking" chip overlap** on re-submit (they shared one
      absolute slot) + `busy` guard so a second submit / swatch / reset can't race an
      in-flight generation + a 25s fetch timeout so the UI can't hang in "thinking".
- [x] **Night Sky preset** (deep indigo + soft-blue/lavender, `starfield` backdrop,
      "midnight · starlit · calm") added ALONGSIDE Cyberpunk Neon (keeps "laser" + grid).
      New `night` keyword set (over-broad "dark" dropped so it doesn't mis-route).
- [x] **Sleeker apply transition** — the sweep is a soft vertical strip (bright edge +
      plasma wash) that GPU-translates left→right; blend is per-apply (screen on dark,
      multiply on light) so it's visible on every theme; never stacks.
- [x] **"Out of tokens" is explained now** — ⌘K 429 → a fun "🪫 out of juice today,
      refills tomorrow" message; Vibe Studio shows a note on ANY live failure before
      falling back to a preset (rate-limit vs generic error) so a generic result is never
      silent. (Worker returns 429 for its own daily cap + the upstream Gemini limit.)
- [x] **Education flagship stability** — copy pinned to Geist/Geist-Mono + no
      heading-transform so a taller/uppercase vibe font can't drift the 5 facts against
      the fixed WebGL cap. Colours still change.
- [x] **`.bignum` clipping** fix (14.5vw + nowrap) and **`.nojekyll`** (no-build site
      skips Jekyll) to unstick Pages deploys. NOTE: the Pages *deploy* backend still
      flakes intermittently ("try again later"); a fresh commit / re-run clears it.

## Round 18 (instant load, thesis snap, dark readability, copy + polish)

- [x] **"Double load" fixed.** Root cause: the hero entrance was a GSAP timeline, so the
      headline sat INVISIBLE until gsap arrived from esm.sh, then everything re-hid and
      re-animated. Entrance is now pure CSS (`.hero.is-in`, added by boot the moment the
      baseline renders; timeout fallback for background tabs where rAF is throttled) —
      motion.js no longer touches the hero. Plus `preconnect` + `modulepreload` for
      three/gsap/ScrollTrigger/lenis so the CDN fetches start at HTML-parse time.
- [x] **Thesis fast-scroll**: ScrollTrigger `snap` (1/4, 5 beats) + pin lengthened 4→5×vh —
      fast flicks now land ON a beat instead of blasting past all five.
- [x] **Dark-mode readability**: dark `--ink-dim` #aab0bd→#b9bfcc, `--ink-mute`
      #6b7280→#8d95a6 (was ~3.9:1 — the unreadable Experience meta). Vibe `validate()`
      now contrast-CLAMPS generated `inkDim`/`inkMute` (re-derived from ink→bg blends if
      too faint) so every generated mode stays readable.
- [x] **Dots dissolve at Experience**: the field fades out as #experience approaches
      (director-eased ~0.8s) and stays off below (returns on scroll-up) — the line-dense
      rows are readable now.
- [x] **Vibe loading words**: "not cerebrating… / not pontificating… / not ruminating… /
      not cogitating… / not percolating… / not marinating…" (the AI-thinking-verbs joke).
- [x] **Rate-limit copy**: "Srujay's API key was exhausted by an earlier visitor — it
      refills tomorrow" (⌘K + Vibe Studio; a static site cannot identify visitors, so
      "an earlier visitor" is the honest version of the joke).
- [x] **OpenAI copy** rewritten to the owner's wording (owned the match engine over the
      WebSocket architecture …); dropped "70%→82%", now "increased response accuracy";
      third metric chip removed. knowledgeBase + worker SYSTEM_PROMPT synced (**needs
      `wrangler deploy`**).
- [x] **Analytics**: commented Cloudflare Web Analytics beacon in index.html (privacy-
      first, no cookies/consent; owner adds the site in the CF dashboard + pastes token).
- [x] Mobile palette fixes from the prior round (hints/footers overflowing) included.
- Needs owner's eyes on the live site: entrance feel, thesis snap feel at real scroll speed.
