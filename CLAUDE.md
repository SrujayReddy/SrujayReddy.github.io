# CLAUDE.md

Operating guide for Claude Code (and any future AI session) working on this repo.
Read this first. It is the human-curated source of truth for *how to work here*; the
creative/technical spec lives in `DESIGN-BIBLE.md`, the running status in
`PROGRESS.md`, companion guides in `SKILLS.md` and `LOOPS.md`.

---

## What this is

A **cinematic, light-first, no-build static portfolio** for Srujay Reddy Jakkidi
(Forward Deployed Engineer). One continuous WebGL particle "organism" threads the
whole page; the camera rides a single spline through every act. Ships on GitHub
Pages on merge to `main` — `index.html` is at the repo root, **no build step**.
ES modules + an importmap load `three` / `gsap` / `lenis` from esm.sh at runtime.

## Run & preview it

```bash
python3 -m http.server 8000          # → http://localhost:8000  (full page)
#                                       → http://localhost:8000/lab.html (cap-only rig)
node tests/cap-physics.mjs           # headless physics regression (see SKILLS.md)
node tests/vibe-data.mjs             # Vibe Studio preset/contrast checks
node tests/camera-rail.mjs           # camera track continuity checks
```

- **You cannot see WebGL headlessly.** There is no reliable Preview/screenshot tool
  in most sessions, and the macOS terminal is **TCC-blocked from listing `~/Desktop`**
  (use `osascript`/Spotlight to find names; the Read tool *can* open Desktop images by
  path). So: verify *correctness* with the node tests; verify *look/feel* via the
  **human-in-the-loop screenshot loop** (see `LOOPS.md`). Never claim a visual is good
  without a screenshot — say what's verified vs. what needs eyes.
- Deterministic hooks for verification: `window.__cinema = {director, field}`,
  `director.step(dt)` (advances one frame when rAF is throttled), `window.__lab`
  (in `lab.html`, with `window.__eduCenter` to center the cap).

## Architecture (one renderer, acts on a rail)

```
index.html ── importmap ──> three@0.169 / gsap@3.12.5 / gsap/ScrollTrigger / lenis@1.1.14
   └─ js/main.js  (static imports: content.js, agent.js, vibe.js, easter-egg.js, theme.js)
        ├─ render every section from content.js into [data-mount] shells
        ├─ DEPENDENCY-FREE baseline: nav, anchors, IntersectionObserver reveal,
        │   static hero/thesis fallback  (works with zero CDN, no WebGL)
        └─ async / OPTIONAL (dynamic import):
             ├─ webgl/director.js  → ONE renderer/scene/camera + the camera RAIL
             │     ├─ webgl/field.js      (the particle "organism" + vibe tint)
             │     ├─ webgl/education.js   (the cap: velvet/gold + verlet tassel)
             │     └─ webgl/camera-rail.js (the CatmullRomCurve3 spline)
             └─ motion.js  → Lenis + GSAP; global scroll → director.setRide()
```

- **`js/content.js` is the single source of truth** for ALL copy/data (sections,
  `vibes`, `commands`, `knowledgeBase`). Edit content there, nowhere else.
- **`director.js`** owns one `WebGLRenderer`/`Scene`/`PerspectiveCamera`/rAF loop.
  Acts register against it (`init/setProgress/setActive/setTheme/update/dispose`).
  It threads shared uniforms (`uTheme`, `uVibe`, `uMouse`, …), crossfades a
  light↔dark `uTheme`, and drives the camera along `camera-rail.js` via `setRide(0..1)`.
- **Sections (DOM + rail order):** `home → education → positioning → thesis → now →
  bench(Vibe Studio) → experience → work → beyond → contact`. Education is the
  flagship and sits 2nd, right after the hero.

## The two AI features

- **⌘K agent** (`js/agent.js`): command palette + "ask anything". Ships **dormant**
  (`config.WORKER_URL === ""`) with an honest "resting" state; a Cloudflare Worker
  (`agent-worker/worker.js`) lights it up. No fake answers.
- **Vibe Studio** (`js/vibe.js`, `content.vibes`, `styles/vibe.css`): type/pick a
  vibe → the whole page redesigns live (bg, ink, surfaces, font, radius, accent,
  plasma, particle field). Ships dormant (free text → nearest preset via keyword
  scoring); a `{mode:"vibe"}` Worker branch upgrades free text to a generated theme.
  **Honest+safe:** every theme is contrast-validated (bg/ink ≥ 4.5:1) before it
  touches the page. (Old "Build Bench" was removed — it was thesis-adjacent.)

## Non-negotiables / conventions

1. **LIGHT-FIRST.** Bright editorial near-white is the hero; dark is an opt-in toggle.
   Additive glow that sings on black *washes out on white* — every WebGL visual swaps
   blending/palette by `uTheme` (Normal on light, Additive on dark).
2. **Semantic tokens only.** Components reference `--accent`, `--bg`, `--ink`,
   `--plasma`, `--radius`, etc. (see `styles/tokens.css`) — never raw hex. This is what
   lets the theme toggle *and* Vibe Studio reskin everything for free.
3. **Keep three/gsap/lenis as DYNAMIC imports in `main.js`.** Static top-level imports
   reintroduce a blank-page failure if a CDN hiccups. The page must render fully from
   `content.js` with zero heavy deps.
4. **Graceful degradation is load-bearing.** Every act has a reduced-motion / no-WebGL
   fallback. `[data-reveal]` elements start `opacity:0`; reduced motion reveals all.
5. **Verify physics/data with the node tests; verify look with screenshots.** Don't
   lean on the tests for visual claims — and don't ship visuals you've only imagined.

## Gotchas (learned the hard way — don't re-break these)

- **Cap tassel collision** (`education.js`): collide the *rendered tube centerline*
  (every sampled curve point, with the tube radius as margin), NOT just the sim
  nodes — a Catmull-Rom curve bows between nodes. And the vertical resolve must
  **always lift to the top, never push out the bottom** (else the tassel sinks under
  the board and slowly climbs back). `tests/cap-physics.mjs` guards both.
- **Multiple pinned ScrollTriggers** (education + thesis) need `refreshPriority`
  (earlier-on-page = higher) + `invalidateOnRefresh` + a function `end()`, or they
  overlap/jump.
- **Camera feel**: keep `camera-rail.js` stations *close together* and smooth the ride
  (`director` rideT `dt*2.4`, lerp `0.16`) — big station deltas read as sudden swings.
- **MeshPhysicalMaterial needs an environment** — `education.js` bakes a cheap PMREM
  studio env (no assets) so sheen/anisotropy actually show.
- **Worker ↔ content sync**: keep `worker.js` `SYSTEM_PROMPT` aligned with
  `content.knowledgeBase`. (The dead `{mode:"bench"}` branch should be swapped for
  `{mode:"vibe"}` — see PROGRESS "TODO".)
- **Egg audio is gesture-gated** (`easter-egg.js`) — never move `fire()` to load/scroll.

## File map (quick)

```
index.html              importmap, no-flash theme, SEO/JSON-LD, [data-mount] shells, ⌘K markup
js/content.js           ⭐ single source of truth (copy/data/vibes/commands/knowledgeBase)
js/main.js              render fns + boot + dependency-free baseline + fallbacks
js/theme.js             light/dark toggle (light default, no OS auto-follow)
js/motion.js            Lenis + GSAP; pins (thesis/education); global scroll → setRide
js/agent.js             ⌘K palette (commands always work; ask = dormant Worker)
js/vibe.js              Vibe Studio (live page restyle; presets + keyword fallback)
js/easter-egg.js        pizza/Joey burst (Konami + ⌘K "pizza")
js/webgl/director.js    one renderer/scene/camera + camera rail + shared uniforms + setVibe
js/webgl/field.js       the particle organism (theme-aware blend + vibe tint)
js/webgl/education.js    the cap (MeshPhysicalMaterial velvet/gold + verlet tassel + tube collision)
js/webgl/camera-rail.js  CatmullRomCurve3 station track
agent-worker/worker.js   Cloudflare proxy (CORS/rate-limit/Turnstile); dormant by default
styles/                 tokens.css (semantic tokens) · base · sections · command · vibe
tests/                  headless node checks: cap-physics · vibe-data · camera-rail
DESIGN-BIBLE.md         the full creative+technical spec   ·  PROGRESS.md  the running log
SKILLS.md               reusable capabilities + how-to procedures   ·  LOOPS.md  the dev loops
```

## When you change something

- Touched cap physics? → `node tests/cap-physics.mjs` (must stay 0.00000 on every pen line).
- Touched `content.vibes`? → `node tests/vibe-data.mjs` (contrast must stay ≥ 4.5).
- Touched the camera rail? → `node tests/camera-rail.mjs`.
- Touched anything visual? → ask for a screenshot; tune against reality (see `LOOPS.md`).
- Always update `PROGRESS.md` with what changed + what still needs a real-browser pass.
