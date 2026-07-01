# SKILLS.md

The reusable **capabilities** for working on this repo — the project's own
verification harnesses, the meta "skill-creator" for spinning up new slash commands,
and the step-by-step procedures ("how to do X here") that recur. Think of this as the
toolbox; `CLAUDE.md` is the map and `LOOPS.md` is the workflow.

A "skill" in this doc means one of three things:
1. **A Claude Code skill** — a `SKILL.md` slash command (`/name`), see *Skill-creator*.
2. **A project verification harness** — a `node tests/*.mjs` check (the most-used kind here).
3. **A procedure** — a documented "how to add/change X" recipe.

---

## 1 · Verification harnesses (the project's real "skills")

This repo can't see WebGL headlessly, so correctness is proven by **deterministic node
checks** that run the *real* code against a math-accurate `three` shim (no GPU, no
browser). Run them after the matching change; they exit non-zero on failure.

| Skill | Run | Proves | Touch which file → run it |
|---|---|---|---|
| **cap-physics** | `node tests/cap-physics.mjs` | the tassel never clips the board/skullcap, never sinks under the board, never explodes, stays a stable rope — across a slow scroll sweep **and** instantaneous fast-scrub | `js/webgl/education.js` (stepRope / collide / tumble / materials geometry) |
| **vibe-data** | `node tests/vibe-data.mjs` | every Vibe Studio preset is valid hex, routable by keyword, and **bg/ink contrast ≥ 4.5:1 (WCAG AA)**; dormant routing picks the sensible preset | `content.vibes`, `js/vibe.js` keyword logic |
| **camera-rail** | `node tests/camera-rail.mjs` | the camera spline is continuous (no jumps), visits every station, stays in front of + on the subject | `js/webgl/camera-rail.js` (STATIONS) |

**The shim pattern (how these work, and how to add one):** import the *real*
`makeXAct()` / exported data and run it against a minimal `THREE` shim where
`Vector3` / `Quaternion` / `Euler` use the **exact** three.js formulas (centripetal
Catmull-Rom, `applyQuaternion`, Euler→quaternion sync) and everything rendering
(geometries / materials / lights / PMREM / `CanvasTexture`) is a `new`-able **stub
function** (not an arrow). Drive `init()` + `update(dt)` across a progress sweep + a
fast-scrub stress, then assert invariants. This tests the **shipped** code, not a
re-implementation. (`tests/cap-physics.mjs` is the reference; it even reproduces the
real curve overshoot so it catches tube clipping the node-level check missed.)

> Why it matters: a node-only check passed while the browser visibly clipped (the
> tube bows between nodes) and while the tassel sank under the board (least-penetration
> shoved it out the bottom). The harness now asserts the **rendered tube centerline**
> and a **no-under-board** invariant. When a screenshot reveals a class of bug, encode
> it as a new assertion so it can never regress silently.

## 2 · Skill-creator (make a new `/slash-command`)

A personal meta-skill lives at `~/.claude/skills/skill-creator/` (created this project).
Invoke `/skill-creator <what the capability does>` — or just describe wanting to "build
a new capability" — and it scaffolds + installs a new skill exposed as `/<name>`:

- `scripts/new-skill.sh <name> [--project] [--type command|knowledge] [--desc "…"]`
  validates the kebab-case name, refuses to overwrite, and writes a `SKILL.md`
  skeleton under `~/.claude/skills/` (or `./.claude/skills/` with `--project`).
- `references/skill-authoring.md` holds the rules: third-person trigger description
  with concrete phrases, imperative body, progressive disclosure, validation checklist.

Use it to capture any recurring chore here as a one-tap command (e.g. a `/preview`
that boots the server, a `/verify-cap` that runs the physics test + reminds you to
screenshot).

## 3 · Procedures ("how to do X here")

**Add a Vibe Studio preset** → edit `content.vibes.presets` (full theme: `accent`,
`accent2`, `plasma[3]`, `particle`, `bg/bgTint/surface/surface2`, `ink/inkDim/inkMute`,
`line/lineStrong`, `font`, `radius`, `dark`) + add a `keywords[id]` bucket → run
`node tests/vibe-data.mjs` (it enforces hex + **contrast ≥ 4.5**). `dark:true` flips the
particle field to glow mode. Nothing else needed — `vibe.js` applies it generically.

**Add a camera station / re-order sections** → edit `STATIONS` in `camera-rail.js`
(keep deltas small for a gentle ride) and the matching section order in `index.html`;
re-run `node tests/camera-rail.mjs`. If you move a *pinned* section, set
`refreshPriority` in `motion.js` (earlier-on-page = higher).

**Add a WebGL act** → implement the act contract (`init/setProgress/setActive/
setTheme/update/dispose`, optional `group`), register it in `main.js` boot, give it a
rail station. Theme-swap blending in `setTheme` (never additive on light). If it has
physics, write a shim harness (§1) before claiming it works.

**Change cap materials/look** → keep the verlet/collision untouched, edit the material
helpers + `applyTheme` lerps in `education.js`. Re-run `cap-physics` (materials don't
affect it, but it confirms you didn't break geometry/refs), then **get a screenshot** —
material look is GPU-only and cannot be verified in node.

**Turn the AI features live** → deploy `agent-worker/` (see its README), set
`config.WORKER_URL`. For Vibe Studio, add a `{mode:"vibe"}` branch to `worker.js`
(forced tool → `{accent, accent2, plasma[3], particle, bg, ink, …, mood}`); the client
already contrast-validates the response before applying.

## 4 · Useful built-in Claude Code skills for this repo

- `/code-review` — review the working diff for bugs/cleanups before pushing.
- `/security-review` — for the Worker (CORS / rate-limit / injection containment).
- `/loop`, `/schedule` — recurring/automated runs (see `LOOPS.md`).
- `/init` — regenerate a CLAUDE.md draft (this file is the curated, kept version).

---

**Rule of thumb:** if you do a thing twice, make it a skill — a `node` harness for a
correctness invariant, a `/command` for a chore, or a procedure entry above.
