# Srujay Reddy Jakkidi — Portfolio Creative + Technical Bible

*One coherent cinematic journey. Light-first, dark by choice. One renderer, eight acts, one organism.*

---

## 0. North Star

A scroll-driven, no-build static site that is **one continuous particle organism** passing through eight bespoke moments — never a demo reel. The single argument the whole site makes, in motion, is Srujay's own thesis: **diffuse, noisy systems given shape and identity, reversibly and on demand.** "Measure first, then make it fast" is the spine; every act is that ethos enacted (raw cluster → measured data → orchestrated system → conferred degree → curated work → human warmth → a signed name).

Three non-negotiables sit above everything:

1. **LIGHT-FIRST.** Bright, airy, editorial near-white (Apple/Linear/Vercel light surfaces). Dark is a deliberate, beautiful toggle — not the default.
2. **ONE WebGL renderer / one canvas / one `three` instance.** Every visual is the *same* particle field re-forming. No second context, no postprocessing dependency.
3. **Graceful degradation is load-bearing, not an afterthought.** Content renders from `content.js` with zero dependency on three/gsap/lenis (dynamic imports only). Full static fallback on reduced-motion / no-WebGL / CDN failure.

The **#1 art-direction failure mode** governing every decision below: *additive glow that sings on black washes out to invisible on white.* Every visual must swap blending and palette by theme. This is stated once here and assumed everywhere.

---

## 1. Art Direction — Light-First, Dark by Choice

### 1.1 The feel

Light mode is the hero aesthetic: crisp ink on warm paper, particles reading as **fine graphite/jewel specks** (ink on paper), plasma reserved as restrained jewel-tone accent. Dark mode is the *same composition at dusk* — deep ink with the plasma finally allowed to glow. Toggling re-skins the entire scroll-film at once; no section should ever look like a different site in either theme.

### 1.2 Token architecture (rewrite of `styles/tokens.css`)

Two tiers. **Components never reference raw hex** — only semantic tokens. This is the design-system discipline made visible.

**Tier 1 — brand ramp (theme-invariant):**

```
--indigo:#6366f1;  --violet:#8b5cf6;  --cyan:#22d3ee;
/* AA-safe ink variants for small text on near-white (≥4.5:1) */
--indigo-ink:#4f46e5;  --violet-ink:#7c3aed;  --cyan-ink:#0e7490;
--ember:#FF5C39;   /* pizza/Joey accent — CONSTANT across both themes */
```

The **bright** ramp is for large display text (≥24px / AA-large 3:1) and decorative fills/glow only — **never small copy.** Small accented copy uses the **-ink** variants.

**Tier 2 — semantic tokens (flip by theme):** `--bg, --bg-raise, --bg-raise-2, --ink, --ink-dim, --ink-mute, --line, --line-strong, --accent, --accent-text, --plasma, --glow, --selection, --shadow-card, --warm-veil`.

| Token | LIGHT (`:root`, primary) | DARK (`html[data-theme="dark"]`) |
|---|---|---|
| `--bg` | `#FBFBFD` | `#06070A` |
| `--bg-raise` | `#F4F4F7` | `#0B0D12` |
| `--bg-raise-2` | `#ECEDF2` | `#11141B` |
| `--ink` | `#0B0D12` | `#ECEEF2` |
| `--ink-dim` | `#4A4F5C` | `#AAB0BD` |
| `--ink-mute` | `#8A909E` | `#6B7280` |
| `--line` | `rgba(11,13,18,.08)` | `rgba(255,255,255,.08)` |
| `--line-strong` | `rgba(11,13,18,.14)` | `rgba(255,255,255,.14)` |
| `--accent-text` | `--violet-ink` / `--indigo-ink` | bright `--violet` / `--cyan` |
| `--plasma` | indigo→violet→cyan, **on white reads as jewel ink** | bright glow gradient |
| `--glow` | soft tinted drop-shadow `0 8px 30px rgba(124,92,246,.18)` | neon bloom `0 0 40px rgba(124,92,246,.35)` |
| `--shadow-card` | `0 24px 60px -30px rgba(99,102,241,.25)` | deep graphite |
| `--ember` | `#FF5C39` | `#FF5C39` (invariant) |

Add `color-scheme: light` to `:root` and `color-scheme: dark` to the dark block (native controls/scrollbars follow). Use `[data-theme]` attribute (**not** CSS `light-dark()`) because `scene.js` must read the active theme in JS to recolor WebGL.

### 1.3 How every visual adapts (the universal blending rule)

A single `uTheme` uniform (0 = light, 1 = dark) threads through every shader. On theme change:

- **LIGHT:** `material.blending = THREE.NormalBlending` (premultiplied-alpha safe; multiply `col.rgb *= alpha` in-shader). Particles are **dark ink / jewel** (`rgb ~0.16–0.22` for bulk, `-ink` plasma for accents), capped alpha (~0.6), slightly smaller sprites. Glow is *implied by density + soft falloff*, never additive bloom. For acts that truly want a glow seam, use premultiplied screen-safe `CustomBlending` (`blendSrc=OneFactor, blendDst=OneMinusSrcAlphaFactor`).
- **DARK:** `material.blending = THREE.AdditiveBlending`, off-white ink (~0.86) + bright plasma, larger soft sprites, true bloom on near-black.

The swap is a one-time `material.blending = …; material.needsUpdate = true` at toggle, **hidden under a ~250–500ms `uTheme` color crossfade** so there's no visible pop. **No geometry rebuild, ever.** Critical correctness fix carried into every ShaderMaterial: append `#include <colorspace_fragment>` so sRGB output is correct under r17x+'s default `outputColorSpace = SRGBColorSpace` (the current `scene.js` omits it).

### 1.4 No flash of wrong theme

A render-blocking inline `<script>` is the **first element in `<head>`** (before any CSS link). It reads `localStorage.theme` (`light|dark|system`), resolves `system`/absent via `matchMedia('(prefers-color-scheme: dark)')`, sets `documentElement.dataset.theme`, and updates `<meta name="theme-color">`. ~200 bytes, <1ms, intentionally blocking. The current `index.html`'s hardcoded `color-scheme: dark` / `theme-color #06070A` must flip to light-first with `<meta media>` variants. The `<noscript>` block's hardcoded colors must be retuned to the light palette.

### 1.5 Fonts

Self-host **Geist + Geist Mono** as variable woff2 (via Fontsource / google-webfonts-helper), committed to `assets/fonts/`. Drop the two Google Fonts `preconnect`s + stylesheet `<link>`. `@font-face` with `font-display: swap`, `<link rel=preload>` the 1–2 critical weights. troika 3D text consumes the *same* woff2 — one source of truth for type. Keep the strong system fallback stack.

---

## 2. The Shared Camera & Transition Language (connective tissue)

**One `PerspectiveCamera`. One `THREE.Scene`. One `render()` per frame.** Acts live as `THREE.Group`s in that scene; inactive acts are `group.visible = false` (zero draw cost). The camera "travels" by lerping toward each active act's dolly target, so the whole journey is one continuous dolly, never a cut.

The grammar every adjacent pair obeys — **ENTER → SUSTAIN → DISSOLVE-into-shared-substrate:**

- **ENTER:** the incoming act's `uOpacity` tweens 0→1 (~0.6s); the *same particles* flow from the previous formation into the new one via the established `mix(home, targetA, targetB)` morph pattern. The outgoing act drives its morph uniform back toward 0 *before* the new one engages, so formations never conflict.
- **SUSTAIN:** scroll progress drives that act's signature transform.
- **DISSOLVE:** as the section leaves, the field loosens back toward the ambient drift substrate, which the next act inherits.

**The literal hand-offs (every boundary):**

| From → To | Hand-off |
|---|---|
| Hero → Positioning | Hero `uForm` (SJ signature) returns to 0; the loose cloud peels off and streams into the Positioning glyph phrase (`uText` 0→1). |
| Positioning → Thesis | `uText` releases with a *downward drift bias*; particles flow into the clock-ring formation as `uClock` rises. |
| Thesis → Now | Clock ring relaxes (`uClock` 1→0 partial); particles re-gather into the orchestration node/edge graph (`uGraph` 0→1). |
| Now → Experience | Graph nodes release their particles; they scatter and re-bucket into the 4 constellation stations (`uStage` → constellation, `uActive` engages). |
| Experience → Work | The four lit stars hold a beat, then relax; particles condense into the 4 glass slab silhouettes as the camera enters the corridor. |
| Work → Education | Slabs let go; the field gathers *upward* and resolves into the mortarboard target positions; cap fades up, tassel drops to the RIGHT. |
| Education → Beyond | Cap-toss: board lifts, releases points skyward; they scatter and settle low into the warm constellation as `uWarm`/`uBeyond` rise. |
| Beyond → Contact | `uWarm`/`uSpot` ease back to 0 (warmth was a *remembered* beat); the field returns to neutral, then writes the signature (`uSign` 0→1). |

Everything is **scrubbed, never time-based**, so scrolling up reverses every transition perfectly — the proof that it was one organism all along.

---

## 3. The Eight Acts

Shared assumptions for all: device-scaled `COUNT` (9000 desktop / 4200 mobile), DPR ≤ 2, `uSizeScale` 0.8 + camera pulled back on mobile, rAF paused offscreen via IntersectionObserver → `setRunning(false)`, `dt = Math.min(clock.getDelta(), 0.05)`. Perf cost for every particle act is **near-zero incremental** (reuses the one renderer/geometry/draw call; each act adds one `Float32Array(COUNT*3)` target attribute + a couple scalar uniforms; glyph/path sampling is one-time offscreen rasterization at boot).

### Act 1 — Hero: "Ink Constellation" (signs SJ)

- **Concept & meaning:** A near-white field of fine ink-suspended particles, cursor-reactive parallax (near points track faster than far). On entrance and on a slow idle loop, the cloud inhales to center and resolves the initials **"S J"** (S in plasma, J in ink), holds a beat, exhales back to nebula — a discovered signature, never branded-at. Behind a crisp editorial headline. The same field that becomes every later formation: this is the opening breath of one organism.
- **Build:** Extend the existing `Points`/`ShaderMaterial`. Add attribute `aInitial` (vec3) sampled from an offscreen 2D rasterization of "SJ" (Geist 600, letter-spacing matched to headline) → `readImageData` → rejection-sample opaque pixels → nearest available glyph point. Uniform `uForm` (0=cloud, 1=SJ), forced to 0 once any downstream morph >0. `pos = mix(mix(home, aInitial, uForm), targetNext, uMorphNext)`. Per-particle flow turbulence `sin(uTime + aSeed) * uForm*(1-uForm)` so points *stream* into letters. Expose `setForm(t)`.
- **Scroll mapping:** Mostly *dissolves* on scroll. ENTER is time-driven (0→1→0 SJ on load, ~1.2s expo.out / hold 1.6s / 1.4s out) so the page greets before you touch the wheel. Idle re-sign on a slow ~14s loop (fire on entrance + return-to-hero, not perpetually, to avoid gimmick fatigue). Hero scroll progress drives headline translate-up + fade, gentle camera dolly-in, cloud loosening, and hands off to Positioning.
- **Theme:** Light — NormalBlending, bulk dark graphite (`rgb 0.16–0.22`, alpha ~0.5–0.75), ~20–30% plasma at higher alpha. Dark — AdditiveBlending, off-white ink + bright plasma.
- **Mobile:** 4200, parallax off (touch jitter) → subtle scroll-velocity drift; coarser glyph sampling so SJ stays legible; sign once on entrance, loop ~20s.
- **Reduced-motion / no-WebGL:** Static headline (existing `applyStaticHero`) + a high-quality CSS/SVG "SJ ink constellation" still frame behind the headline (the coalesced signature). No motion.
- **Risk watch:** Verify washout on *real* white, not gray mockup. Cap plasma alpha so WCAG on headline holds regardless of field behind it. Re-sample glyphs on `fonts.ready` (fall back to free cloud if font not loaded at boot).

### Act 2 — Positioning: "The Reliability Ledger"

- **Concept & meaning:** The loose cloud condenses into the *words themselves* — the positioning claim assembled from particles streaming into glyph outlines like filings to a magnet. The hot phrase ("a number, not a hope") refuses to stay still: a thin plasma underline runs beneath it, and a Geist-Mono ticker scrambles from a noisy blur and **snaps** to a locked figure (`99.9%` / `p95 −55%`) inside a hairline box the instant scroll passes a threshold. *Hope becoming a number, performed.* The medium is the message.
- **Build:** No new renderer. Add `aText` (positions sampled from glyphs of the hot phrase via offscreen 2D canvas; reservoir-sample ~1500 particles, rest stay ambient). Uniform `uText` (0→1) blended like the existing morph, with mid-flight turbulence. **The real HTML statement stays the accessible source of truth on top** — particles are accent only. Ticker = pure DOM+GSAP (`<span data-count>` scrambling digits via `onUpdate` jitter until ~85% progress, then snap). Underline = SVG/`<i>` with `--plasma`, `scaleX` 0→1 on the same trigger.
- **Scroll mapping:** ScrollTrigger on `.positioning`, `start "top 70%"`, `end "center center"`, scrub. Enter (0→0.4): particles stream into glyphs. Sustain (0.4→0.75): assembled, low shimmer, ticker scrambling. Snap (0.75): underline fires `expo.out`, ticker locks, particles tighten. Dissolve (0.85→1): `uText`→0 with downward drift bias into Thesis.
- **Theme:** Light — NormalBlending, deep indigo `#4f46e5`→violet ink (alpha ~0.7); ledger value near-black in a `--line-strong` box. Dark — AdditiveBlending glow; ledger box gains `--glow` halo.
- **Mobile:** Cap text-sampled subset ~700, sample only the short phrase; ticker on its own line; parallax off; shorten scrub on short viewports.
- **Reduced-motion / no-WebGL:** Real statement renders immediately; static full-width underline; ledger shows final locked value in the box. Meaning survives as still composition.
- **Risk watch:** Recompute sample positions on resize + `fonts.ready`. Keep ticker amplitude low and the snap decisive (one metric, not a slot machine).

### Act 3 — Thesis: "The Latency Clock" (flagship #2)

- **Concept & meaning:** The traveling field spirals inward into a thin glowing **clock dial** dead-center. As you scroll the pinned act, one sweep-hand (a tapering blade of particles) makes a single **75-second** rotation; the ring fills behind it color-coded by the four cold-start phases. The truth lands physically: **93–99% of the ring is one dominating violet→cyan wedge — image pull** — the other three phases are near-invisible slivers. "Where does the time go?" answered as a clock that is *almost entirely one color.* Then the punchline: "pre-pull the image" — the clock violently rewinds, the dominant wedge collapses inward, the hand snaps from a 75s lap to a **2-second flick**, ring contracts to a bright dot. *"Measure first. Then make it fast."* The time-motif and the data fused into one object that IS the thesis.
- **Build:** Third target buffer `aClock` = points on a thin annulus, each pre-assigned to a phase wedge by cumulative `share` angle (reuse existing `bounds[]` math mapped to 0..2π). Uniforms `uClock` (sphere→clock) and `uSweep` (hand angle / wedge reveal). Vertex: lerp sphere→bar→clock; gate each wedge point's visibility on `step(pointAngle, uSweep*2π)` so the dial paints on as the hand sweeps. Sweep-hand = ~150 points (80 mobile) along a tapering radial line. Drive from the existing pinned `buildThesisTimeline()` — replace `setMorph` with `setClock`/`setSweep`; keep `93` and `75→2` count-ups bound to the same scrub. Phase labels (Schedule/Init/Image pull/Start) = absolutely-positioned DOM (not WebGL text), fading in with their wedge.
- **Scroll mapping:** Pinned, `+= innerHeight*4` (2.5× mobile), scrub 0.6. Enter (0–0.15): spiral into empty dial, hand at 12. Measure (0.15–0.5): `uSweep` 0→1, single 75s lap, wedges paint on, `93%` counts up locked to the hand entering the giant wedge. Reveal (0.5–0.7): hand parks, wedge pulses. Fix (0.7–0.88): rewind, dominant wedge migrates to center, 2s flick, `75→2` fires. Dissolve (0.88–1): ring relaxes, partial `uClock` 1→0, particles drift toward the next graph substrate.
- **Theme:** Light — NormalBlending; dominant wedge in saturated `#6366f1→#8b5cf6→#22d3ee` at high alpha (a confident colored arc on white), minor wedges + empty dial in soft graphite (`--ink-mute`) at low alpha (etched/editorial). Crisp violet sweep-hand with soft alpha trail. Dark — AdditiveBlending, luminous neon ring on near-black. Geometry/motion identical; only blend, base neutral, alpha curve change.
- **Mobile:** 4200, radius scales with `uSizeScale`, labels stack below; pin reduced to ~2.5×; hand ~80 points.
- **Reduced-motion / no-WebGL:** Upgrade the existing static thesis fallback from a bar to an **inline SVG donut** — image-pull as a ~95% violet→cyan wedge, three graphite slivers, `93–99%` + `75s → 2s` + punchline as plain Geist. Final values, no count-up. Theme-aware via `currentColor` + tokens.
- **Risk watch:** Give the three tiny phases a minimum visual angle / labeled tick so the viewer sees they exist (honest — the point is they're dwarfed). Keep it abstract (NO numerals/bezel) so it reads Linear/Vercel, not wall-clock. Ease the rewind as an intentional snap with a brief hand-trail; test scroll-up reversibility. Test the boundary morph both directions.

### Act 4 — Now / Strada: "The Orchestration Constellation" (live agent graph)

*This is the AI-feature's structural rhyme and the literal picture of Srujay's job.*

- **Concept & meaning:** The field re-gathers into a directed agent workflow: ~9–11 luminous tool-nodes (Intake → Planner/hub → Tool-calls / Temporal / Validate → Result) connected by curved bezier edges. Each node is a tight breathing sub-swarm of the *same* particles. The drama is the **signal**: a plasma packet ignites at entry, races an edge (the edge brightening in its wake like a fuse), arrives, flares the node with a pulse-ring, forks onward. Tool-calls fire in sequence and occasionally in parallel; one packet visibly **loops back and re-fires** (Temporal durable retry). A calm idle heartbeat at rest. You dolly *through* the mesh for a beat, then the three pillars resolve in front. Less a diagram, more a mind thinking in real time — you watch the job instead of reading it.
- **Build:** Add `aGraph` target. Lay ~9–11 node anchors deterministically on a gentle 3D arc (JS, not GLTF); ~70% of particles are gaussian node sub-swarms, ~30% parametric points along quadratic-bezier edges. Signals via cheap shader math, **no extra geometry**: edge-particles carry `aEdgeId` + normalized arc-position `aCounter`; a tiny `[edges×1]` `DataTexture` (NearestFilter, sample `(edgeId+0.5)/count`) holds each edge's last fire-time, written from JS when a pulse launches. Fragment computes a moving gaussian comet head + trailing fuse. Node flare = `uNodeEnergy` spiked on arrival, decaying with a size/alpha pulse-ring. A **deterministic JS scheduler** (pure function of scroll progress, so scrubbing back perfectly rewinds) fires the sequence on a ~6s cycle; 1–3 packets in flight max. Idle heartbeat scheduler runs when ScrollTrigger isn't active. Net new: ~5 uniforms + 2 attributes + tiny scheduler (~50–80 lines `scene.js`, ~30 `motion.js`).
- **Scroll mapping:** ScrollTrigger on `.now`, scrub 0.6. Enter (0→0.30): particles flow from clock into nodes/edges, camera eases inward. Sustain (0.30→0.85): the run executes; pillar cards reveal in sync as their conceptual node lights. Dissolve (0.85→1): camera settles, graph dims to idle heartbeat, particles loosen toward the next substrate.
- **Theme:** Light — NormalBlending; nodes saturated indigo/violet ink cores with crisp edges, packets get an extra-bright cyan hot-core + faint darker contact-halo (legible on white), edge fuses thin violet at ~70% (higher idle base alpha so hairlines survive bright bg). Dark — AdditiveBlending, packets bloom hot.
- **Mobile:** Same 4200 particles (no extra budget). Tighter, more frontal 2.5D layout; only the primary spine path animates (secondary edges dim static); 1 packet at a time; shorten the camera dolly (avoid motion sickness); pillars stack 1-col.
- **Reduced-motion / no-WebGL:** Static but beautiful — inline SVG graph (nodes + edges) drawn once with one pulse frozen ~60% along an edge and one node mid-flare, so "tool-call firing" reads as a still. Copy/pillars/chips from `content.now` always present. A subtle backdrop vignette/scrim behind text on light so the constellation never competes with reading.
- **Risk watch:** Cap nodes ~9–11, curve edges to avoid crossings, keep idle quiet. Keep z-travel gentle, eased, shorter on mobile, off under reduced-motion. Validate scrub determinism by scrubbing fast both directions.

### Act 5 — Experience: "The Constellation Trail" (flight through a career)

- **Concept & meaning:** The field re-gathers into **four bright stations** strung on a luminous flight-path arcing from upper-right (newest, GE HealthCare) to lower-left (earliest, MOURI Tech) — a career drawn as a constellation. Each station is a small galaxy (dense plasma core + slow-orbiting halo + metric satellite glints). You don't reveal cards — you **fly the path**: the active station blooms, its orbit speeds up, neighbors recede to dim pinpoints (depth-of-field via size+alpha falloff); a warp of streaking particles trails between stations. On arrival, metrics count up (`−55%`, `+12 pts`, `500+`, `≤15 min`) as the connecting line draws forward. Discrete bright moments that only become a *shape* — a trajectory — when connected. One person, one substrate, re-forming through chapters.
- **Build:** Third stage buffer `aData2` (constellation) + `uStage` (0=cluster,1=bar,2=constellation) + `uActive` (0..3 float, fractional = mid-flight). 4 station centers on a `THREE.CatmullRomCurve3`; particles bucketed by `aSeed` into 4 groups (core gaussian sphere, halo ring on a tilted disc, tagged satellites at metric angles). Vertex: `orbitSpeed` and size/alpha scale by closeness of station index to `uActive` (gaussian falloff → automatic DoF + bloom-on-arrival). **"Flight" = translate `points.position` along the inverse curve so the active station centers** (the *shared camera stays untouched* — avoids fighting idle drift). Connecting line = a thin `THREE.Line` with animated draw-range. Warp streaks reuse ~12% of particles stretched along velocity during `|dActive|>threshold`. DOM `.xp-station` cards fade/translate in sync with `uActive`; metrics use the `data-count` pattern.
- **Scroll mapping:** Pin `#experience` ~4×vh (3× mobile), scrub 0.6; `uActive` 0→3. **Count-up fires on `uActive` crossing each integer (arrival), not pin-enter** (or numbers spin off-center). Velocity-aware: faster scroll = longer warp streaks.
- **Theme:** Light — NormalBlending, cores as deep indigo/violet ink dots (`#4f46e5→#7c3aed`), halos faint cyan-gray, path a 1px ink hairline `rgba(30,30,50,0.25)`, active bloom conveyed by saturation + size + a subtle `--plasma` ~10% radial wash behind the card. Dark — additive starfield bloom, additive constellation lines. Cards: glassy white (backdrop-blur) light / raised graphite dark; count-up numbers gradient-text both.
- **Mobile:** Stations stack vertical (path top→bottom); orbitSpeed reduced, warp off, DoF softened; field translates on Y only; pin ~3×vh; **hide constellation lines <600px**, keep dots.
- **Reduced-motion / no-WebGL:** Existing accessible static timeline (real `<article>`s, headings) + a static inline SVG star-chart backdrop (4 dots + polyline, plasma dark / ink-hairline light); metrics at final value immediately.
- **Risk watch:** Gate stages (thesis morph → 0 before constellation forms). Sell "flight" with slight parallax (cores move less than halos) + warp streaks, eased translation. QA light mode on actual near-white.

### Act 6 — Selected Work: "The Light Table" (holographic slab gallery)

- **Concept & meaning:** Four projects become four edge-lit glass slabs floating in a bright volume — museum specimens of light / wafers on a clean-room table. The camera **dollies down a Z-corridor**, gliding past each slab one at a time; each gets its own held, screen-filling beat before receding into soft bokeh. Plasma is caught in the *beveled edge* as a thin refracted seam (light bending through a real edge, not a sci-fi overlay); the active slab's seam brightens and chromatically shears. The page's particle substrate drifts between slabs as suspended dust. Curation enacted: a deliberate few, each given its own framed moment under the light.
- **Build:** `gallery` mode (not a second instance). 4 slabs = thin beveled `ExtrudeGeometry` (~3.0×1.7×0.06). Front face = real project image as `CanvasTexture` (composed once at init); for the imageless **Path Finder**, a procedural code-glyph plate (mono `{ Java }` + faint Dijkstra node graph) on an offscreen 2D canvas. Custom bevel shader: sample plasma along the chamfer + Fresnel `pow(1-dot(N,V),3)` (brightest at grazing) + small time-driven RGB shear on the active slab. Slabs along −Z (≈ −2,−6,−10,−14). ScrollTrigger pin `#work` `+= innerHeight*4`, scrub → `camera.position.z` sweeps the corridor with eased holds at each plane; `onUpdate` sets active slab + DOM `aria-current`. Pointer adds clamped ±0.1rad tilt + `uSheen` glare (reuse smoothed `uMouse`). Existing point field rendered at ~30% alpha between slabs via `uGallery`. ~8 draw calls total.
- **Scroll mapping:** Enter (0–0.1): particles re-condense into slab silhouettes, slabs fade from dust. Sustain (0.1–0.9): four eased holds; active = opacity 1 + Fresnel boost + RGB shear ramp over ~0.3s; neighbors 0.45 + DoF blur; matching DOM card gets `is-current`. Dissolve (0.9–1): edges dim, points relax into ambient drift for Education.
- **Theme:** Light — **NormalBlending**; glass = high-key frosted white panel (inner shadow + 1px cool border), plasma lives ONLY in the bevel seam as a slightly *darkened* (multiply-ish) gradient; active slab gains a soft cast shadow `0 24px 60px -30px rgba(99,102,241,.45)`; dust = dark cool-gray→faint-indigo points (visible on white). Dark — additive edge glow, off-white glass, light dust, deeper shadow. One `uTheme` crossfades.
- **Mobile:** **No dolly** (fights vertical scroll, costs fps). Stacked vertical slabs (~80vh each), lightly tilted, seam intact but reduced bevel segments + no RGB-shear; mostly static camera + small parallax on the active slab; dust ~1500; pointer tilt off; tap = navigate.
- **Reduced-motion / no-WebGL:** Existing accessible `.work-card` grid (real links/images/stack chips, `aria-hidden` on canvas), each card gets a static 1px plasma `::before` seam + frosted glass (light), all four evenly lit, focusable in order, visible focus rings.
- **Risk watch:** Two pinned scrub sections (thesis + work) need correct ScrollTrigger ordering + `ScrollTrigger.refresh()` after fonts/load. Don't trap keyboard scroll in the pin; ensure tab reaches every card. Make the Path Finder procedural plate genuinely nice, not empty. Fall back to pure CSS cards if mobile frame time slips.

### Act 7 — Education: "The Turning of the Tassel" (FLAGSHIP #1)

*The owner's exact vision — the only literal rite of passage, made interactive. Build this second, right after the foundation.*

- **Concept & meaning:** A full-screen, near-life-size **3D mortarboard** floats dead-center over the bright page — a thin premium board (matte indigo-graphite, faint plasma rim), a low dome skullcap, a button, and from it a **living tassel** (a real verlet/spring strand with weight that swings, lags, overshoots, settles). As you scroll the degree details, you *perform the ritual*: scroll progress sweeps the tassel **RIGHT → LEFT** (the graduation "turning of the tassel"), the board yawing a few degrees to follow like a head turn. Each degree fact rings a beat as a strand swings past (a plasma bloom travels the strands, text resolves in sync): **UW–Madison · B.S. Honors, CS & Data Science · GPA 3.9 · Dean's List Fall 2024 & Spring 2025 · May 2026.** At the final beat the cap **lifts and releases a slow weightless burst skyward** (the cap toss), which disperses back into the ambient field. Scroll 0 = candidate, scroll 1 = conferred — *your own motion completes the graduation.* You scroll through it.
- **Build:** Add an `educationGroup` to the existing scene. Board = beveled `BoxGeometry` (~0.55 wide); skullcap = flattened half-`SphereGeometry`; button = small `CylinderGeometry`. Materials = `MeshStandardMaterial` (board `#2a2d3a`, metalness 0.15, rough 0.55) + a Fresnel emissive rim via `onBeforeCompile`. **Tassel = CPU verlet**: ~14 nodes (10 mobile), `pos += (pos-prev)*damp + accel*dt²`, `damp≈0.98`, gravity + sin-noise wind + `uMouse` idle nudge; Jakobsen distance constraints, 8 iters (4 mobile), node0 hard-pinned. **Fixed-timestep accumulator decoupled from scrub** so fast scroll stays buttery and stable. Render the cord as a `TubeGeometry` rebuilt **in-place** from a `CatmullRomCurve3` through the nodes (low tubular/radial segments; **never `new TubeGeometry` per frame** — update a pre-allocated BufferAttribute), or as instanced cylinders on mobile. Strand fan = ~10–14 short instanced sub-ropes. THE TURN: `anchorX = lerp(+half, −half, easeInOut(progress))` + lateral wind bias `sin(progress·π)*push` for a real arc; **clamp anchor velocity (lerp, don't snap)** + weak stiffness-to-rest so it self-untangles. Clean `scene.setEducation(progress)` API parallel to `setMorph`; one section owns the field at a time via an internal `activeSection`. **troika-three-text** for crisp 3D degree labels if any are rendered in-scene (worker-based glyph gen, deduped to the one `three` instance via esm.sh `?external=three`).
- **Camera pass-through:** Reuse the thesis pin pattern. 0–0.15 cap settles into full-frame (camera.z far→~0.9); 0.15–0.75 tassel turns + credential beats fade in; 0.75–1.0 camera.z 0.9 → −0.2 **pushes through the board** (small `camera.near`, fade board opacity to 0 as z→0 so the lens never intersects visible polys harshly; briefly raise lateral push so strands splay around the lens), then **release the camera cleanly** (lerp `capCam` back to 0, re-enable idle drift via `1-capActive`).
- **Theme:** Light (primary) — board is a **SOLID** material (real object on white), **subtle** Fresnel rim only; `HemisphereLight` sky `#ffffff` / ground `#dfe3ee`; a soft contact shadow / radial vignette grounds it (do NOT float weightlessly); the cap-toss dissolve hands particles back via NormalBlending. Dark — emissive/rim intensity ~2×, rim cyan-leaning, additive cap-toss dissolve on near-black. One `uTheme` lerps emissiveIntensity, rim color (violet→cyan), light intensities, contact-shadow opacity over ~0.4s — no rebuild.
- **Mobile:** Camera pulled back so full board+arc fits portrait; tassel 10 nodes, 2 relaxation iters, fewer strands; beats stack centered below the cap; pin `innerHeight*3`; touch breath replaces cursor; small+low-power → fall through to the SVG fallback.
- **Reduced-motion / no-WebGL:** Premium static editorial block (`applyStaticThesis` pattern) — inline SVG line-art mortarboard (indigo stroke light / plasma dark, **tassel at REST on the LEFT** to imply the turn is already complete) above a clean definition list of the degree facts. Verlet + ScrollTrigger never initialize.
- **Risk watch:** #1 = light-mode glow washout → solid material + grounding shadow (never additive on white). #2 = per-frame GC stutter → in-place BufferAttribute, never `new TubeGeometry`. #3 = verlet whip on fast scrub → clamp velocity + fixed sub-steps + smoothed `uTasselSide`. #4 = scene coupling → clean `setEducation` API, one owner at a time. #5 = pass-through near-plane clipping → fade board as z→0. #6 = two pinned triggers (thesis+edu) → `ScrollTrigger.refresh()` after fonts/load, distinct pinned containers. Pizza egg stays a separate layer, independent of this loop.

### Act 8 — Beyond + Contact: "The Warming" → "The Constellation Signature"

The site's emotional climax and finale share one warm→cool→signed breath.

**8a — Beyond the code: "The Warming."**
- **Concept & meaning:** The cool field finally **warms**. Points drift into a low wide constellation; the brightest stars are the human contributions (Tutoring, Volunteering, Community, Honors, Languages). Faint **kindness-lines** trace between nearby stars as you read each item — service as a network, not a solo metric. At the peak, a soft warm cone blooms and particles pool into a **stage pool** spotlighting the advisor-award feature card — *the moment he stood onstage FOR someone else.* This is the one section the cool tech-plasma yields to amber-rose human heat; it cools back to neutral by Contact so warmth feels *remembered*, not a theme change. Srujay's own particles do the illuminating, and the light points AT the other person.
- **Build:** Add `aBeyond` (wide shallow Gaussian scatter, y-biased low, with ~5 denser star clusters at the 5 list-item anchors). Uniforms `uWarm`, `uBeyond`, `uSpot`, `uLines`. Frag warm ramp: when `uWarm>0`, lerp ink→plasma toward **amber `#ff9e64` → rose `#ff5c7a`** (the *family* of `--ember`, not the exact pizza color — keeps it distinct from the egg). Spotlight = low-opacity procedural `ConeGeometry` + a flat radial stage-pool plane. Kindness-lines = `LineSegments` of precomputed nearest-neighbor pairs, draw-progress via `uLines`. ScrollTrigger on `.beyond` (pinned ~1.2×vp, 1.0× mobile), scrub. Award card (`.beyond__feature`) gets a warm-glow border + GSAP scale/opacity pop synced to the bloom. A CSS `--warm-veil` token animated from JS lets the page background itself breathe warm.
- **Scroll mapping:** Enter (0–0.33): `uBeyond` 0→1, `uWarm` 0→0.6, particles settle low. Connect (0.33–0.66): `uLines` advances per list item (staggered by index). Spotlight (0.66–0.92): `uSpot` 0→1, particles tighten ~10% to the pool, `uWarm`→1, card pops. Dissolve (0.92→1): `uSpot`/`uWarm` ease to 0, field relaxes to neutral for Contact.
- **Theme:** Light — NormalBlending, **darkened** warm ink (amber `#e07a3c`, rose `#e0476a`) as warm ink dots; "spotlight" inverts to a warm light-*fall* (amber radial wash + faint vignette) so the card sits in a pool of morning light, not a glowing cone; kindness-lines warm-gray hairlines. Dark — additive theatre: near-black stage, hot amber→rose glow, volumetric cone, warm halo pool. Award card warm box-shadow both (stronger light).
- **Mobile:** 4200, single column (card top, list below, pool behind card); kindness-lines reduced to the 5 anchor links; pin ~1.0×vp.
- **Reduced-motion / no-WebGL:** Pre-baked warm SVG/CSS backdrop (sparse scatter, 5 brighter dots, faint hairlines, soft amber radial wash); award card fully revealed with static warm shadow.
- **Risk watch:** Restraint (low opacity, single source, slow eases, capped saturation — one warm beat). The dissolve back to cool is **non-optional** or warmth reads as a palette bug. Register `.beyond` trigger after thesis/edu; refresh on fonts/load. Reuse the `--ember` *family*, not the exact pizza ember.

**8b — Contact / footer: "The Constellation Signature."**
- **Concept & meaning:** The field comes home. Points gather into one quiet **signature line** — Srujay's name traced as a single continuous luminous stroke — that writes itself, then exhales into a soft orbit ring around the three contact affordances (email, LinkedIn, GitHub). Three faint plasma threads reach outward to each link (the field handing you the ways to reach him). The closing frame of a film: rigorous energy resolving into identity + an invitation. The page ends *gathered and intentional*, not trailing off. **One point near the stroke's end pulses warm ember** — the single warm note, the discoverable pizza wink (see §6).
- **Build:** Fourth target `aSign` baked at init from procedural cubic-Bézier strokes approximating "Srujay" in a script hand (hand-tuned control points in `content.js` — no font loader). Sample N points along arc-length with a small gaussian normal offset for soft stroke thickness; per-particle `aPathT`/`aDelay` for the writing-on stagger for free in the vertex shader. Uniforms `uSign` (0→1) and `uReveal` (left-to-right wipe cutoff on path-t). ScrollTrigger on `.contact`, `start "top 70%"`, scrub ~0.8 → `setSign(t)`. Phase 0→0.7 writes the stroke; 0.7→1 relaxes trailing points into the orbit ring + draws the three threads (GSAP stagger). At rest: ~0.05Hz breath, ring ~3°/s, ember point on a 4s sine. Contact DOM in the existing `[data-mount="contact"]` shell, `[data-reveal]` fade-in inside the ring. **Scrolling up un-writes the signature** (`uSign`→0 back to cluster home) — the proof it was one organism.
- **Theme:** Light — NormalBlending, signature as **INK** (darkened plasma at ~60–70% luminance, alpha 0.85–1.0, crisp dark line on white); optional second larger very-low-alpha sprite pass for ink "weight" without bloom; ring/threads in lighter cyan→violet at low alpha. Dark — AdditiveBlending, luminous monogram, glowing threads. Ember point `#FF5C39` both themes.
- **Mobile:** ~4200, simplified stroke (fewer Béziers, no per-stroke gaussian thickness), smaller ring, CTAs stacked vertical; threads drawn as a faint static gradient under the CTAs (save fill-rate); ember = larger tap target.
- **Reduced-motion / no-WebGL:** Existing clean static contact block + an inline SVG of the signature stroke with `stroke-dasharray` draw on scroll-into-view (CSS-only, gated `html:not(.reduced-motion):not(.no-webgl)`; reduced-motion shows the completed stroke). Everyone sees the signature.
- **Risk watch:** Hand-tune the path + bias more particles to the stroke (SVG fallback is canonical legible version). Tie `uReveal` to scrub, not time. **Pin the ember pizza hotspot to a fixed corner of the card**, not a chasing moving particle (simplest safe alignment on resize). Keep it one restrained stroke — resist sparkles.

---

## 4. SceneDirector Architecture

`js/webgl/director.js` exports `createSceneDirector(canvas, { acts, getTheme })`. It owns **one** of everything and enforces the art direction.

**Renderer (once):**
```js
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, alpha: true,
  powerPreference: 'high-performance', premultipliedAlpha: true
});
renderer.outputColorSpace = THREE.SRGBColorSpace; // r17x default — leave it
renderer.setClearColor(0x000000, 0);              // transparent; CSS theme bg shows through
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(w, h, false);                    // canvas fixed via CSS
```
Keep the **manual rAF loop + `ScrollTrigger.onUpdate` push** (do NOT also use `setAnimationLoop` — Lenis already drives `gsap.ticker`; double-driving = jitter). One `THREE.Clock`, `dt = Math.min(clock.getDelta(), 0.05)`.

**Shared camera + scene + uniforms:** one `PerspectiveCamera(50, w/h, 0.1, 100)`; all acts `scene.add(act.group)`; shared uniforms passed **by reference** into every material: `{ uTime, uTheme:{value:0}, uDpr, uViewport:Vector2, uReducedGlow }`.

**Act interface (the contract):**
```js
function makeAct(shared){
  const group = new THREE.Group(); group.visible = false;
  return {
    id: 'education', group, progress: 0,
    setActive(on){ /* GSAP tween uOpacity 0<->1; visible while >0; visible=false in onComplete */ },
    setProgress(p){ this.progress = p; },
    setTheme(t){ /* flip material.blending + palette uniform; needsUpdate=true; NO rebuild */ },
    update(dt){ /* time-based motion using this.progress; write uOpacity */ },
    resize(w,h){}, dispose(){ /* geo.dispose(); mat.dispose() */ }
  };
}
```

**Crossfade / single-pass compositing:** all acts share one scene + one camera, rendered in ONE `renderer.render(scene, camera)`. On `setActive(true)` GSAP-tween `uOpacity` 0→1 (~0.6s) + `group.visible=true`; on `setActive(false)` tween →0 and set `visible=false` in `onComplete` (stops costing draw calls). Overlapping acts crossfade naturally; set `transparent:true`, `depthWrite:false`, order via `group.renderOrder`. `autoClear` stays true (acts share a scene).

**Scroll wiring:** keep the canonical Lenis+GSAP pattern from `motion.js` — `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t=>lenis.raf(t*1000))`, `gsap.ticker.lagSmoothing(0)`. Per section: a ScrollTrigger (`scrub:0.6`, or a pin for thesis/education/work) whose `onUpdate(self)` calls `director.setProgress(actId, self.progress)`; `onToggle` calls `setActive(actId, on)`. The director maps active progress into the act and lerps a per-act camera target so the shared camera travels as one continuous dolly.

**Theme-awareness:** `getTheme()` resolved once on boot (localStorage → prefers-color-scheme, set on `<html>` before first paint). On toggle, the director tweens `uTheme` 0↔1 and calls each act's `setTheme` (blend-mode flip + palette uniform, `needsUpdate=true` once) — instant, flash-free.

**Perf + disposal:** device-tier counts (`innerWidth<760 ? 'mobile':'desktop'`); DPR≤2; `InstancedMesh` for repeated geometry (tassel fringe — set EVERY matrix + `instanceMatrix.needsUpdate=true`, never share its material with a plain Mesh, per r169 #17701); pause when no act is active (visibilitychange + IntersectionObserver → `running=false`); `director.dispose()` loops acts (`geo.dispose()` + `mat.dispose()`) then `renderer.dispose()`. Tube/curve rebuilds reuse a single pre-allocated buffer (rebuild the curve, not the geometry) to avoid GPU leaks.

**Director risk list:** (1) missing `#include <colorspace_fragment>` → washed colors; (2) additive on light → invisible; (3) `material.blending` change without `needsUpdate` → no effect; (4) InstancedMesh matrix pitfalls; (5) double-driving the frame; (6) back-to-back pinned triggers need `ScrollTrigger.refresh()` after `fonts.ready`/load + distinct containers; (7) per-frame geometry allocation leaks.

---

## 5. The Second AI Feature — pick **Lens** (the self-reframing portfolio)

Three candidates were proposed: **Lens** (re-composes the page per reader), **Sterling** (voice concierge), **Fit Finder** (visible agent trace + sourced brief). **Adopt Lens.**

**Why Lens over the others:**
- **vs. Sterling (voice):** Voice depends on `webkitSpeechRecognition` (Chrome/Edge/Safari only — **Firefox off**), needs mic-permission friction, and `speechSynthesis` voice quality is OS-roulette. It's a "wow" gated behind hardware/permission/browser support that *can't be the only path*. High novelty, low reliability — wrong for a portfolio whose whole pitch is *reliability*.
- **vs. Fit Finder (agent trace):** Genuinely on-brand and impressive, but it's structurally a **second chatbot-shaped surface** competing with ⌘K, it requires a multi-turn server-side loop (higher cost/latency, more failure surface), and its value is concentrated on one persona (recruiters with a JD to paste). It's the strongest *runner-up* and a great v2.
- **Lens wins because** it is *push, not pull* — the perfect complement to ⌘K's pull. It reshapes the **whole narrative proactively** for whoever is reading in the first 8 seconds (the portfolio's deepest job), it **ships functional with ZERO backend** (hand-authored presets) unlike the currently-dormant ⌘K, it is **honest by construction** (only reorders/rephrases real `content.js` facts, never invents), and it *is* the FDE thesis made interactive: "take an ambiguous human need and reshape a system around it, live." That self-referential proof outweighs any bullet point.

**Keep ⌘K chat exactly as-is** (pull / on-demand Q&A). Lens is the sibling (push / proactive reshape) on the same Worker, same knowledge base, one more capability.

### 5.1 Lens — full spec

**UX:** One calm "Reading as…" control in the nav next to the ⌘K chip + one inline chip under the hero ("Tailor this page to you →"). Never a second modal fighting ⌘K. On mobile it's a bottom-sheet, **presets-first** (one-tap, no typing). A dismissible "Viewing as {persona} · Reset" pill; Reset always restores the canonical owner-authored site.

**Data flow:** New `POST /personalize` branch in `agent-worker/worker.js` (route on `{mode:"personalize", persona}`), reusing the existing CORS lock / origin check / Turnstile / KV rate-limit (with its *own* tighter per-IP + daily counters — personalize is heavier than a chat turn). New `js/lens.js` (static import from main.js, no heavy deps; uses GSAP only if already loaded) owns the UI, calls the Worker, applies the directive, persists last persona to **sessionStorage** (reset per visit, sidesteps consent).

**Model + structured output:** Claude **Haiku 4.5** (site default) via Messages API **tool use** — a single `apply_layout` tool with `tool_choice:{type:"tool",name:"apply_layout"}`, read `tool_use.input`. Non-streaming small JSON (`max_tokens ~500`), so the Worker returns `application/json`, not SSE.

**Directive schema (`apply_layout` input):** `{ hero_headline (≤90), hero_summary (≤160), why_relevant (≤120), experience_order (string[] org keys, a permutation), project_order (string[], a permutation), spotlight_metrics ([{label,value}] max 3, VERBATIM from content), persona_label (≤24, sanitized echo) }`.

**Honesty by construction:** the client **validates every field** before applying — order arrays must be permutations of known keys (drop unknowns, append missing in original order); `spotlight_metrics` must exactly match strings present in `content.js` (reject hallucinated numbers); all strings length-clamped + HTML-escaped via the existing `esc()`. Any failure → that field falls back to the default layout, never throws.

**Prompt + injection containment:** system prompt = compact serialization of `content.js` (knowledgeBase + experience/project keys + exact metric strings) + hard rules ("re-rank and lightly rephrase ONLY the facts below; NEVER invent metrics/employers/skills; `spotlight_metrics` MUST be copied verbatim; call `apply_layout` exactly once"). User message = the sanitized persona (≤200 chars, stripped of injection patterns). The **only output channel is the typed tool schema**, re-validated against the known fact set → a hostile persona can at worst reorder real cards.

**Re-render mechanics:** refactor `renderHero()/renderExperience()/renderWork()` to accept an optional `layout` arg (default = identity → zero behavior change when dormant). `lens.js` re-renders, then runs a **FLIP** (read rects → re-render → invert with transforms → play; GSAP if present, else CSS): hero retypes via the existing split-text, cards glide to new rank with a 60ms cascade (40ms mobile), spotlight metrics get a transient `.is-spotlight` plasma underline sweep (echoing the thesis accent language). WebGL field untouched — personalization rides on top of the one journey. Reset reverses the FLIP to canonical.

**Cost guard:** (1) Worker KV cache keyed by normalized persona hash → common personas ("recruiter", "founder", "k8s engineer") are effectively free after first use, pre-seedable, TTL ~30d; (2) hard per-IP (~5/min) + daily ceiling (~200) caps → worst-case spend = cap × max_tokens; (3) client debounce + sessionStorage avoid re-spends. On 429 → silent fallback to presets.

**Dormant fallback (ships day one):** 3–4 hand-authored `content.lensPresets` (recruiter, founder, infra/k8s, generalist) with the same directive shape. When `WORKER_URL === ""` or any failure/429, the control offers presets as quick chips + a free-text box mapped to the nearest preset via keyword scoring (`recruit|hire|talent`→recruiter, `founder|startup|ceo`→founder, `k8s|kubernetes|sre|infra|latency`→infra). Fully functional and impressive with zero backend; the live agent only *upgrades* free-text to bespoke rewrites.

**Theme:** drives everything through semantic tokens (no JS theme branching). Light — frosted near-white pill (backdrop-blur, 1px `--line`), bright `--bg-raise` panel, plasma only as thin underline/border + spotlight sweep; "Viewing as" pill = `--plasma` at ~8% alpha + solid ink text. Dark — translucent dark glass + `--glow` on the accent. Spotlight never relies on color alone (also briefly bolds the metric value) for color-vision + reduced-motion.

**Mobile / reduced-motion / perf:** bottom-sheet presets-first; explicit-tap-gated debounced fetch (never fires on flaky connection unprompted; failure → keyword preset silently). Reduced-motion: instant content swap + ~150ms opacity crossfade, static underline + bold (no FLIP/typewriter/sweep) — all the *value* (right words/order/metrics) is motion-independent. Net add: ~6–8KB JS + ~3KB CSS, no new deps/renderer/font; one debounced fetch only on explicit action.

**Net new code:** `js/lens.js`, `content.lensPresets` + per-section keys/exact-metric strings in `content.js`, `layout` arg threaded through 3 render fns in `main.js`, one `/personalize` branch + tool schema in `worker.js`, ~80 lines `styles/lens.css`.

---

## 6. Pizza / Joey Easter Egg — Preserve + Integrate

**Preserve exactly:** the `pizza` ⌘K command, the Konami code (↑↑↓↓←→←→ b a), the physics food burst + "Joey doesn't share food" toast, gesture-gated audio (`assets/audio/*` only inside the user gesture — never on load/scroll). Reduced-motion shows the toast without the burst.

**Elegant integration (discoverable, not garish):** the **`--ember #FF5C39` is the one color held constant across both themes** — "Joey's slice glows the same at noon or midnight." Surface it in three restrained places:

1. **The signature finale (Act 8b):** one particle near the end of the signed stroke pulses warm ember on a slow 4s sine — the single warm pixel in a cool composition. A **transparent DOM hotspot pinned to a fixed corner of the contact card** (not chasing the moving particle) triggers `fire()` on hover/tap. Discoverable but reads as an intentional accent, never a button-with-a-pizza-on-it.
2. **⌘K command + voice/Lens reachability:** keep "Order a pizza" in `content.commands`; if Lens free-text ever maps to a "hungry" intent it can also `fire()`.
3. **Konami code:** unchanged.

In **both themes** the burst + toast use `--ember`, so the egg stays visually distinct from the cool plasma (light: warm ink on paper; dark: warm glow on near-black). The burst is a separate layer (`easter-egg.js`) above every act's loop — independent of the Education verlet and the SceneDirector, so it never entangles section state.

---

## 7. Library / Tech Recommendation (no-build, respected)

| Library / Tech | Verdict | Why |
|---|---|---|
| **three.js** (bump pin to current r17x–r18x, stay WebGLRenderer) | **KEEP** | De-facto, ESM-native, single-canvas/procedural-first. Bump = one-line importmap change for bug/perf fixes. |
| **Theme-aware blending in `scene.js`** | **FIX (P0)** | Current unconditional `AdditiveBlending` washes out on near-white. Biggest art-direction correctness bug. Add `setTheme()` + `uTheme`. |
| **GSAP + ScrollTrigger** (bump latest 3.x) | **KEEP** | Best-in-class scrub/pin/timeline; framework-agnostic, no-build. Pin version (closed-source, Webflow-owned, revocable license — fine for a portfolio, but pin protects deploy). |
| **GSAP free plugins** — SplitText, DrawSVG, MorphSVG | **ADD** | 100% free since 2025. SplitText (replace hand-rolled reveals, resize-safe), DrawSVG (tassel cord / underlines / rail ticks), MorphSVG (icon/affordance morphs). $0. |
| **Lenis** (1.1.14) | **KEEP** | The WebGL smooth-scroll standard; lighter than ScrollSmoother. Gotchas: don't mix with native CSS scroll-driven animations or scroll-snap (read raw scroll, desync); disable under reduced-motion. |
| **troika-three-text** | **ADD** | The answer to crisp 3D text (SDF, worker glyph-gen) vs. `TextGeometry`'s pathological vertex counts. For Education degree labels. Force esm.sh `?external=three` / `&deps=three@0.169.0` to dedupe the one `three`. |
| **Line2 / LineGeometry** (`examples/jsm`) | **ADD (conditional)** | Native fat lines (vs. 1px `gl.LINES`). Only if the tassel/threads are swept ribbons; if the tassel is a `TubeGeometry` (better "living" look), skip. `LineMaterial.resolution` must track resize. |
| **Self-hosted Geist (variable woff2, Fontsource)** | **ADD** | Faster (no 3rd-party connection), private (GDPR), full control; closes the HANDOFF Google-Fonts deviation. troika shares the same woff2. |
| **Anthropic API via Cloudflare Worker** | **KEEP** | Correct security model (key server-side) + CORS/rate-cap/Turnstile/token caps. Keep **raw SSE pass-through** (the SDK's `messages.stream()` has a known edge-runtime cutoff bug). Keep `SYSTEM_PROMPT` ↔ `content.js knowledgeBase` in sync. |
| **Cloudflare Web Analytics** (or Plausible) | **ADD** | Cookieless, no consent banner, ~1KB/edge. Captures ~100% (vs. 40–60% loss to "Reject All"). `defer`-loaded. Skip GA. |
| **Playwright + @axe-core/playwright** | **ADD (dev-only)** | Cross-browser render + a11y truth in one harness. Dev `devDependencies` + CI only — **never ships**, no-build runtime untouched. |
| **Lighthouse CI** | **ADD (dev-only)** | Separate CI job, perf/SEO/budget gate (target ≥90). Complements axe (perf/SEO) vs. axe (deep a11y). |
| **WebGPU / TSL** | **SKIP (WATCH v2)** | Would force a GLSL→TSL rewrite of working, degradation-tested shaders; payoff doesn't justify it for a 60fps-laptop target. TSL keeps the WebGL2 fallback when you do migrate. |
| **Motion One / Motion** | **SKIP** | Wins (bundle/INP/MIT license) matter for React apps; here you'd lose GSAP's free SplitText/DrawSVG/MorphSVG ecosystem. Documented fallback only if GSAP's license ever becomes a hard constraint. |
| **View Transitions API** | **SKIP (single-page)** — except the theme toggle | No cross-document navigations to transition. *Exception:* the optional circular "sunrise" theme-toggle reveal (feature-detected, reduced-motion-guarded, instant-swap fallback). Adopt fully if a sub-page is ever added. |
| **Native CSS scroll-driven animations** | **SKIP for the core** | Incompatible with Lenis's lerped position; uneven support outside Chromium. Optional à la carte behind `@supports` for a scroll progress bar / nav-shrink only. |
| **On-device LLM (transformers.js / WebLLM)** | **SKIP** | Hundred-MB downloads blow the mobile/perf budget; quality << Haiku. (WATCH Chrome `window.ai`.) |
| **Vercel AI SDK** | **SKIP** | Node/bundler-oriented; the direct single-provider SSE proxy is leaner and works. |
| **Web Speech API** | **SKIP (optional PE)** | Firefox off, no SLA, accuracy varies. Only a feature-detected mic in ⌘K, never the sole path — and Lens (the chosen feature) doesn't need it. |

**TL;DR action order:** (1) fix theme-aware blending; (2) inline anti-FOUC script + flip to light-first tokens; (3) add troika; (4) unlock free GSAP plugins + bump pins; (5) self-host Geist; (6) Playwright+axe + Lighthouse CI; (7) Cloudflare Analytics; (8) keep Worker raw-SSE; (9) skip the rest.

**CDN resilience:** pinned versions protect the deployed code, but consider self-hosting/mirroring the pinned three/gsap/lenis/troika bundles (or SRI) so a CDN outage can't blank the visuals; the dynamic-import static fallback already prevents a fully blank page. Verify troika doesn't pull a second `three` at runtime.

---

## 8. Edge-Case / Test Matrix

| Dimension | Must verify |
|---|---|
| **Light theme** | Every act readable on **real near-white** (not gray mockup); no additive washout; WCAG AA on all body copy (≥4.5:1) and AA-large on display (≥3:1); accent small-text uses `-ink` variants. |
| **Dark theme** | Additive glow correct; `-ink` not used where bright passes AA; `theme-color` = `#06070A`. |
| **Theme toggle** | No flash-of-wrong-theme (inline head script before first paint); no blend-mode pop (hidden under uTheme crossfade); mid-section toggle does NOT rebuild geometry; persisted choice overrides OS until reset; `<noscript>` colors retuned to light. |
| **Mobile (≤760 / ~380px)** | 4200 particles, DPR≤2, pin lengths shortened, dollies reduced/off, pointer-parallax off, cards stack, Lens bottom-sheet, rAF paused offscreen, 60fps on a real phone. |
| **Tablet** | Mid-tier layout; pinned thesis+education+work scrub feel; orientation change → `ScrollTrigger.refresh()`. |
| **Desktop** | 9000 particles @ 60fps; smooth shared-camera dolly between all 8 acts; both flagship moments (tassel turn, latency clock). |
| **Reduced-motion** | Lenis disabled (native scroll); no FLIP/typewriter/sweep; all `[data-reveal]` reveal immediately; static SVG fallbacks for hero SJ, thesis donut, education cap (tassel at rest LEFT), constellation, signature; Lens = instant swap; egg = toast, no burst. |
| **No-WebGL** | `html.no-webgl` path; canvas hidden; every section's static fallback engages in BOTH themes; CSS body gradient shows. |
| **No-JS** | `:root` light defaults render; `prefers-color-scheme` media query themes the page; `<noscript>` legible; Lens/toggle hidden. |
| **Slow / failed CDN** | Dynamic imports fail gracefully → full static document (no blank page); consider SRI/mirror; static fallbacks identical to no-WebGL. |
| **Keyboard a11y** | Tab reaches every card/link/CTA (pins must NOT trap keyboard scroll); visible focus rings; ⌘K + Lens ARIA + Esc; skip-link; citation/anchor jumps work. |
| **Long content** | Lens FLIP handles re-order of variable-length cards; thesis beats/rail tick count stay in sync if beats added (update `buildThesisTimeline` + `content.js`); text reflow doesn't break glyph sampling (recompute on resize + `fonts.ready`). |
| **AI paths** | ⌘K dormant ("resting") + 429 + error + live SSE; Lens dormant (presets) + live tool-use + validation rejecting hallucinated metrics + injection-via-persona contained; cost caps enforced. |
| **Pizza egg** | Command + Konami + finale hotspot all fire; ember color constant both themes; audio gesture-gated; independent of Education loop. |
| **a11y depth** | axe-via-Playwright per section in BOTH themes + a **manual** keyboard / screen-reader / reduced-motion pass (automation catches only ~30–57% of WCAG). |

---

## 9. Build Order & Risk List

**Build order (foundation first, flagship second):**

1. **Foundation — Theming + SceneDirector.** Rewrite `tokens.css` (two-tier, light-first), add the inline anti-FOUC head script, flip `index.html` meta to light-first, self-host Geist, route every hardcoded color through semantic tokens (audit `sections.css`/`command.css`/`<noscript>`). Build `director.js` (one renderer/scene/camera, act interface, crossfade, theme-aware uniform, perf/disposal). Fix `scene.js` blending (`uTheme` + NormalBlending + `#include <colorspace_fragment>`). Add the theme toggle (+ optional View-Transition sunrise). **Verify both themes + all fallbacks before any act art.**
2. **Flagship — Education "Turning of the Tassel."** Build it as the first real act on the new director to prove the architecture under the hardest case (verlet stability, in-place tube rebuild, pass-through camera, light-mode solid-material treatment). Add troika for degree labels.
3. **Thesis "Latency Clock"** (second flagship; reuses the morph/pin patterns).
4. **Hero "Ink Constellation" + Positioning "Ledger"** (opening breath + hinge; both pure particle morphs).
5. **Now "Orchestration Constellation"** (signal-shader graph) — and wire **Lens** alongside (it ships day-one dormant).
6. **Experience "Constellation Trail" + Work "Light Table"** (constellation + slab gallery; mind the two pinned scrub sections).
7. **Beyond "Warming" + Contact "Signature"** (warm beat + finale; ember egg integration).
8. **Polish:** Cloudflare Analytics, Playwright+axe + Lighthouse CI, fill HANDOFF §8 to-confirms (pre-pull figures, MINDS@UW permalink, résumé, sitemap, OG image), webp-encode heavy images, optional Worker flip + Lens live.

**Risk list (ranked):**

1. **Light-mode additive washout** — the pervasive failure mode; mandatory NormalBlending + ink/jewel palette per act, QA'd on real white.
2. **Flash-of-wrong-theme / blend-mode pop** — inline pre-paint script + uTheme-crossfade-hidden blend swap.
3. **Verlet instability on fast scrub** (Education) — clamp anchor velocity, fixed sub-steps, smoothed `uTasselSide`, weak stiffness-to-rest.
4. **Per-frame geometry allocation / GPU leaks** — in-place BufferAttribute updates, never `new TubeGeometry`; dispose on teardown.
5. **Two/three back-to-back pinned scrub sections** (thesis, education, work) — `ScrollTrigger.refresh()` after `fonts.ready`/load, distinct pinned containers, correct ordering.
6. **Section/scene coupling** — clean `setX(progress)` APIs, one act owns the field at a time, clean camera release after Education pass-through.
7. **Hardcoded colors leaking dark theme into light** — audit everything through semantic tokens.
8. **CDN dependency** — keep dynamic imports + static fallback; consider SRI/mirror; verify single `three` instance (troika dedupe).
9. **AI honesty/cost** — Lens tool-schema + client validation against `content.js` facts; KV cache + hard caps; injection contained to the typed channel.
10. **Don't regress graceful degradation** — keep three/gsap/lenis as dynamic imports; `[data-reveal]` discipline; gesture-gated egg audio; `SYSTEM_PROMPT` ↔ `knowledgeBase` sync.

---

*One field. Eight breaths. Light by day, luminous by night. Measured first — then made fast.*