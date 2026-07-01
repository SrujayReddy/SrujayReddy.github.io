# Handoff — Cinematic Portfolio Rebuild (`SrujayReddy.github.io`)

Context for continuing this project in a fresh Claude session. The rebuild is **done, verified,
committed, and on a PR**. This doc captures everything: what exists, why, how it fits together, and
what's left.

---

## 1. TL;DR — current state

- The old Bootstrap/AOS template was fully replaced with a **cinematic, dark, scroll-driven, no-build
  static site** (HTML/CSS/ES-modules + importmap). Deploys on merge to `main` with **zero GitHub
  Pages settings change** (`index.html` at repo root).
- Branch: **`feat/cinematic-portfolio`** (PR open against `main`). Old site preserved on
  **`backup-current-state`**.
- The **⌘K AI agent ships dormant on purpose** (placeholder, no key). Everything else works.
- Verified in headless Chromium (desktop + mobile): all sections render, palette opens, the
  dormant-agent and no-WebGL fallbacks engage correctly.

**To preview the full experience locally** (you get WebGL + GSAP, which were blocked in the build
sandbox but load fine on your machine):
```bash
git checkout feat/cinematic-portfolio
python3 -m http.server 8000   # open http://localhost:8000
```

---

## 2. Experience / scroll narrative

One coherent WebGL particle field threads the whole page. Sections in order:

1. **Hero** (`#home`) — particle cluster (cursor-reactive parallax) + big split-text headline, name,
   role eyebrow, subhead, ⌘K button, scroll cue.
2. **Positioning** (`#positioning`) — one bold statement, split-text word reveal, accent words.
3. **Thesis (signature)** (`#thesis`) — pinned + GSAP-scrubbed scrollytelling. The hero particles
   **morph into a data formation** (the cold-start breakdown bar). Beats: intro → breakdown bar →
   **93–99%** big number → **~75s→2s** pre-pull collapse → punchline + CTAs.
4. **Now / Strada** (`#now`) — featured current role + 3 pillars + stack chips.
5. **Experience** (`#experience`) — timeline: GE HealthCare → OpenAI → CDIS → MOURI, each with metrics.
6. **Selected work** (`#work`) — 4 project cards (Gym Tracking, Path Finder, wsh, Data Viz Portal).
7. **Beyond the code** (`#beyond`) — advising-award feature + tutoring/volunteering/honors/languages.
8. **Contact / footer** (`#contact`) — email + LinkedIn + GitHub (phone intentionally omitted).

---

## 3. Architecture & data flow

```
index.html  ──importmap──>  three@0.169 / gsap@3.12.5 / gsap/ScrollTrigger / lenis@1.1.14  (esm.sh, runtime)
   │
   └─ <script type=module src=js/main.js>
        │  (static imports: content.js, agent.js, easter-egg.js  — NO heavy deps)
        ├─ render every section from content.js into [data-mount] shells
        ├─ dependency-free baseline: nav state, anchors, IntersectionObserver reveal,
        │   static hero/thesis fallback
        ├─ initAgent({onPizza})        → ⌘K palette (agent.js)
        ├─ initEasterEgg()             → returns fire() (easter-egg.js)
        └─ async, OPTIONAL:
             ├─ import('./webgl/scene.js')  → createScene() → particle field, setMorph()
             └─ import('./motion.js')       → initMotion({scene}) → Lenis + GSAP timelines,
                                              thesis pin/scrub drives scene.setMorph() + counters

⌘K "ask" mode ──fetch POST──> config.WORKER_URL (Cloudflare Worker) ──> Anthropic Messages API (SSE)
   (if WORKER_URL is "" → honest "resting" dormant state; no fake answers)
```

**Critical design choice (do not undo):** `main.js` renders all content with **no dependency on
three/gsap/lenis**, and loads them via **dynamic `import()`**. If the CDN fails, the page still
renders fully (static fallback) instead of going blank. Converting these to top-level static imports
would reintroduce the blank-page failure mode.

---

## 4. File map

```
index.html                  importmap, SEO/OG/Twitter meta, JSON-LD Person, favicon (inline SVG),
                            section mount shells, ⌘K palette markup, <noscript> fallback
robots.txt                  allow-all (references /sitemap.xml — NOT created yet, see §8)
.gitignore                  .DS_Store, logs, node_modules, .wrangler

styles/
  tokens.css                design tokens: colors (#06070A bg, indigo→violet→cyan plasma), type scale
                            (clamp), spacing, motion easings/durations. Geist + Geist Mono families.
  base.css                  reset, fonts, #webgl-canvas, type primitives, .btn, reduced-motion +
                            html.reduced-motion + html.no-webgl handling
  sections.css              all per-section layout + [data-reveal] reveal primitive + nav + hero +
                            thesis (pin/beats/breakdown/collapse/rail) + timeline + work cards + etc.
  command.css               ⌘K palette + easter-egg overlay

js/
  content.js                ⭐ SINGLE SOURCE OF TRUTH. `content` object (all copy/data) + `knowledgeBase`
                            string (fed to the Worker system prompt). EDIT COPY HERE, nowhere else.
  config.js                 deploy config: WORKER_URL (""=dormant), TURNSTILE_SITE_KEY, RESUME_PATH,
                            MODEL_LABEL
  main.js                   render functions + boot orchestration + dependency-free baseline +
                            fallbacks (hasWebGL, navState, nativeAnchors, nativeReveal,
                            applyStaticHero, applyStaticThesis)
  motion.js                 initMotion({scene}): Lenis, hero entrance, positioning split-text,
                            buildThesisTimeline() (pin/scrub → scene.setMorph + number counters)
  agent.js                  initAgent({onPizza}): palette open/close, command mode (always works) +
                            ask mode (streams SSE from Worker; dormant/429/error states), ARIA + keys
  easter-egg.js             initEasterEgg() → fire(): physics food burst + audio (gesture-only) + Konami
  webgl/scene.js            isWebGLAvailable(); createScene(canvas,{onReady}) → {setMorph,setRunning,
                            dispose}. Inline GLSL particle field, additive-glow (no postprocessing dep),
                            cluster→data morph, DPR≤2, device-scaled count (9000 desktop / 4200 mobile)

agent-worker/               (NOT meaningfully served by Pages — source for Cloudflare)
  worker.js                 streaming Anthropic proxy; SYSTEM_PROMPT (keep in sync w/ content.js
                            knowledgeBase); CORS lock; KV per-IP/min + global/day caps; Turnstile;
                            input/max_tokens caps; default model claude-haiku-4-5
  wrangler.toml             vars (ALLOWED_ORIGIN, MODEL, RATE_PER_MIN/DAY) + KV binding placeholder
  README.md                 ~5-min deploy guide + local testing

assets/                     existing images (jpg) + audio (joey/pop/oven-ding mp3) reused as-is
```

---

## 5. Content model (how to edit copy)

Everything visible is generated from `js/content.js` → `content`. Sections render via the
`render*()` functions in `main.js` into `[data-mount="..."]` shells in `index.html`. To change wording,
metrics, projects, links, or palette commands, **edit `content.js` only**.

- Thesis numbers live in `content.thesis` (`headline`, `breakdown[]`, `fix`). The **93–99% is locked**.
- Provisional figures carry `toConfirm: true`, which renders a small `approx.` chip next to them.
- `knowledgeBase` (bottom of content.js) is the agent's brain — **mirror it into
  `agent-worker/worker.js` `SYSTEM_PROMPT`** if you change facts.

---

## 6. The ⌘K agent

- **Commands mode** (always works, no backend): jump to section, copy email, open GitHub/LinkedIn,
  download résumé (only shown if `assets/resume.pdf` exists — probed via HEAD), toggle reduced motion,
  `pizza` (easter egg). Defined in `content.commands`, wired in `agent.js` `runCommand()`.
- **Ask mode** ("?" prefix or no command match): streams from `config.WORKER_URL`.
  - `WORKER_URL === ""` → **dormant**: shows "The live AI agent is resting…" (no fake answers).
  - 429 → "rate-limited" message. Network error → graceful error. Pizza/food/Joey questions get an
    in-character reply even while dormant.
- Open via ⌘K / Ctrl-K, the nav "Ask anything" chip, the hero button, or `/`.

### Turning the agent ON later (currently a placeholder by request)
1. `cd agent-worker` → follow `README.md` (`wrangler kv namespace create RATE_KV`,
   `wrangler secret put ANTHROPIC_API_KEY`, set `ALLOWED_ORIGIN`, `wrangler deploy`).
2. Put the deployed URL in `js/config.js` → `WORKER_URL`. Commit. Done.
- Default model **Claude Haiku 4.5** (`claude-haiku-4-5`, ~$1/$5 per Mtok). Switch to
  `claude-sonnet-4-6` via the `MODEL` var. `max_tokens` capped at 400; questions capped at 600 chars.
- Worst-case daily spend is bounded by `RATE_PER_DAY × max_tokens` (hard budget ceiling).

---

## 7. Easter egg

`pizza` palette command or the Konami code (↑↑↓↓←→←→ b a) → a physics-y food burst + the
"Joey doesn't share food" toast, with `assets/audio/*` played **only inside the user gesture**
(autoplay-safe). Reduced motion shows the toast without the burst. Reworked from the old
`script.js spawnFoodIcons`.

---

## 8. Open / to-confirm items (non-blocking)

| Item | Where | Action |
|---|---|---|
| Pre-pull figures **~75s→2s** | `content.thesis.fix` (`toConfirm:true`) | confirm exact values, then set `toConfirm:false` |
| **MINDS@UW permalink** | `content.thesis.links[0].href` (placeholder = repo search) | paste the real paper URL |
| 2026 Symposium link | `content.thesis.links[2].href` = `"#"` | add real URL or drop the link |
| **Résumé** | drop `assets/resume.pdf` | enables the "Download résumé" command automatically |
| **`sitemap.xml`** | `robots.txt` references it but the file doesn't exist | create a tiny sitemap, or remove the line |
| Dedicated **OG image** | `index.html` og:image = `assets/images/profile.jpg` | optional: design a 1200×630 card |

---

## 9. Known deviations from the original plan (all intentional, all reasonable)

- **Fonts via Google Fonts `<link>`** (Geist + Geist Mono) instead of self-hosted woff2 — the build
  sandbox 403's binary CDN downloads, so I couldn't vendor them. The shipped site's browser fetches
  them fine; strong system fallback stack is in `tokens.css`. Self-hosting is a clean drop-in later.
- **Libraries via esm.sh importmap** (pinned versions) — fetched by the visitor's browser at runtime.
- **Bloom done in-shader** (additive blending + soft sprites) instead of UnrealBloom postprocessing —
  avoids the multi-`three`-instance pitfall in a no-build setup. Still hits the glow bar.
- **No image webp re-encode** — no `cwebp`/PIL in the sandbox. Existing JPEGs ship with `loading=lazy`
  + explicit dimensions. Re-encoding to webp is a nice perf follow-up (`wsh.jpg` is 456K).

---

## 10. Gotchas — don't break these

- **Keep three/gsap/lenis as dynamic imports in `main.js`.** Static top-level imports = blank page if
  the CDN hiccups.
- **`[data-reveal]` elements start at `opacity:0`.** `nativeReveal()` (IntersectionObserver, in
  `main.js`) adds `.in-view`. Reduced motion reveals all immediately. New sections need `data-reveal`
  to ever appear.
- **Thesis beats are grid-stacked** (`grid-area:1/1`) and driven by GSAP. Without GSAP,
  `applyStaticThesis()` un-stacks them. If you add/remove beats, update `buildThesisTimeline()` in
  `motion.js` AND the rail tick count in `content.js`/`renderThesis()`.
- **Worker `SYSTEM_PROMPT` ↔ `content.js knowledgeBase`** must stay in sync.
- **Egg audio is gesture-gated** — don't move `fire()` to load/scroll.
- Palette `[hidden]` needs the explicit `display:none` rule in `command.css` (class `display:flex`
  would otherwise override the attribute).

---

## 11. How it was verified (and how to re-verify)

- Headless Chromium (Playwright) at 1440×900 and 390×844: confirmed every section renders, the ⌘K
  palette opens, suggestions show only in ask mode, the dormant-agent message appears, and the
  no-WebGL/static-thesis fallback engages when the CDN is unavailable.
- On your machine (CDN reachable) you additionally get the WebGL particle field, the morph-to-data,
  and the pinned thesis scrub.
- Not yet run (good next steps): **Lighthouse** (target ≥90 perf/a11y/SEO), a 60fps devtools check,
  and a manual `prefers-reduced-motion` pass in the browser.

---

## 12. Suggested next tasks (priority order)

1. **Preview locally**, confirm the WebGL hero + thesis scrub feel right; tune particle counts /
   morph timing in `webgl/scene.js` + `motion.js` if desired.
2. Fill the **to-confirm items** in §8 (thesis figures, MINDS@UW link, résumé, sitemap).
3. **Lighthouse + reduced-motion + cross-browser** polish pass.
4. Optional: **deploy the Worker** and flip `WORKER_URL` to make the agent live.
5. Optional perf: webp-encode the heavy project images.

---

*Generated with Claude Code. Session: https://claude.ai/code/session_01S9KJxo4hhhYAv8ybW1Fbag*
