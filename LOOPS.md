# LOOPS.md

How work actually gets done in this repo — the **loops**. A loop is a cycle of
*Observe → Reason → Act → Verify → Iterate* (the agentic loop, descended from the
ReAct "reason + act" pattern). Coding agents run a tight version of it constantly:
read → decide → edit/run → check results → repeat until done. This file documents the
loops that matter *here* — the human-in-the-loop visual loop, the verify-tighten loop,
and how to use Claude Code's `/loop` and `/schedule` to automate the recurring ones.

> Background: the [agentic-loop field guide](https://dev.to/truongpx396/the-agentic-loop-a-practical-field-guide-mnc),
> [loop-engineering guide](https://datasciencedojo.com/blog/agentic-loops-explained-from-react-to-loop-engineering-2026-guide/),
> and Claude Code's own [agent loop docs](https://code.claude.com/docs/en/agent-sdk/agent-loop)
> + [/loop command guide](https://www.mindstudio.ai/blog/what-is-claude-code-loop-command-recurring-tasks).

---

## Loop 0 — The agentic loop (the substrate)

Every Claude Code turn is already a loop: it perceives (reads files, test output, your
request), reasons (decides what to change), acts (edits, runs a command), and observes
the result — repeating until the task is complete. You don't configure this; you *shape*
it by giving it a tight **stop condition** and a cheap **verify** step. The two loops
below are the project-specific versions worth being deliberate about.

## Loop 1 — The human-in-the-loop **visual loop** (the most important one here)

This is a no-build WebGL site, and **the agent cannot see WebGL headlessly** (no
reliable screenshot tool; the macOS terminal is even TCC-blocked from listing
`~/Desktop`). So the look/feel loop is human-in-the-loop:

```
 ┌──────────────────────────────────────────────────────────────┐
 │  1. Agent makes a confident, reasoned change (one focused step)│
 │  2. Agent verifies CORRECTNESS headlessly  (node tests/*.mjs)  │
 │  3. Owner reloads localhost:8137 / lab.html and SCREENSHOTS    │
 │  4. Agent reads the screenshots, diagnoses, and refines        │
 └────────────────────────────────┬─────────────────────────────┘
                                   └──────────── repeat ──────────►
```

Rules that make this loop fast and honest:
- **One meticulous step per cycle** for visual work. Don't stack five unverifiable
  visual changes — you can't tell which one regressed.
- **State what's verified vs. what needs eyes.** "Physics: 0 clip (tested). Look:
  needs a screenshot." Never claim a visual is good from imagination.
- **The owner drops screenshots on the Desktop** (any name). The agent finds them via
  `osascript`/Spotlight (terminal `ls ~/Desktop` is blocked) and opens them with the
  Read tool. Driving the page: reload → `window.__cinema` / `window.__lab` →
  `director.step()` in a loop (rAF is throttled in a hidden tab) → screenshot.
- **Each screenshot teaches an invariant.** When a shot reveals a bug, fix it *and*
  encode it as a node assertion (Loop 2) so it can't come back.

## Loop 2 — The **verify-tighten** loop (correctness ratchet)

Correctness here is a ratchet, not a vibe. The pattern:

```
 change physics/data  →  run the matching node harness  →  if it reveals a NEW
 failure mode the harness missed, add an assertion for it  →  re-run  →  green
```

Proven examples (both shipped green while the browser was visibly wrong, then got
encoded): the **rendered-tube-centerline** clip check (nodes were clean; the curve
bowed) and the **no-under-board** check (least-penetration shoved the cord out the
bottom). See `SKILLS.md` §1. Commands: `node tests/cap-physics.mjs`,
`node tests/vibe-data.mjs`, `node tests/camera-rail.mjs`.

## Loop 3 — Claude Code `/loop` & `/schedule` (automate the recurring)

`/loop` runs a prompt or slash command **on a recurring schedule** — a fixed interval,
or *self-paced* (omit the interval and the model checks its own stop condition each
turn, going again or stopping). The agent knows it's in a recurring context and can
reference prior cycles. Cap it with `max_turns` / a budget so it can't run away.
`/schedule` is the cloud-cron cousin for runs that should happen even when you're away.

Good loops for *this* repo:

| Goal | Command (sketch) | Stop condition |
|---|---|---|
| Babysit the green build after edits | `/loop  run all node tests; if any fail, fix and re-run` | self-paced; stop when all green |
| Drive a screenshot pass | `/loop 0  apply next visual tweak, then ask me for a screenshot` | you, with the next screenshot |
| Watch a deploy / PR | `/loop 5m  check the Pages deploy + open PR status, summarize changes` | merged / deployed |
| Periodic polish sweep | `/schedule`  (cron) `run /code-review on the working diff; post findings` | n/a (recurring) |

Pacing note (matters for cost): a self-paced loop that's *waiting* on something the
harness already notifies you about shouldn't poll — you're re-invoked automatically.
For external state (a deploy, CI) pick an interval matched to how fast it changes;
keep ticks under ~5 min only when actively polling, otherwise sleep long.

## When NOT to loop

- **Don't loop a visual change to "convergence" unattended** — step 3 needs a human
  screenshot. Looping blind just stacks unverifiable edits.
- **Don't loop to poll work the harness already tracks** (background tests, a spawned
  agent) — completion re-invokes you; polling burns budget.
- **Don't loop destructive/outward-facing actions** (deploys, pushes) without an
  explicit human gate each cycle.

## The loop discipline, in one line

**Make the smallest reasoned change, verify what you can headlessly, surface what
needs eyes, fold every surprise back into a test — then go again.**
