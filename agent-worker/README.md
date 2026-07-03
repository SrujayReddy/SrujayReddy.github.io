# ⌘K Agent Worker

This Cloudflare Worker powers BOTH AI features on the site: the **“Ask anything”**
command-palette mode and the **live theme generator** (free-text “describe your own…”
in the hero restyle demo, `{mode:"vibe"}`). It holds your API key (as a Worker secret —
never in the repo), proxies to the model provider, streams answers back as SSE, and
enforces hard cost/abuse caps so the bill cannot run away.

**Two provider options — set ONE secret:**

| | Secret | Model (default) | Cost |
|---|---|---|---|
| A | `ANTHROPIC_API_KEY` | `claude-haiku-4-5` | paid key (≈$1/$5 per Mtok) |
| B | `GEMINI_API_KEY` | `gemini-2.5-flash` | **free** — key from [Google AI Studio](https://aistudio.google.com) → “Get API key” |

If both are set, Anthropic wins. With only `GEMINI_API_KEY`, chat streaming and theme
generation run on Gemini's free tier (rate-limited by Google per key; the Worker's own
caps keep usage well inside it).

The site ships with the agent **dormant**. Everything else (jump-to-section, copy email,
open links, reduced motion, preset themes) works with no backend. The AI modes light up
the moment you deploy this Worker and paste its URL into `js/config.js`.

---

## What it does

- **CORS locked** to `ALLOWED_ORIGIN` (your site origin).
- **Per-IP rate limit** — `RATE_PER_MIN` requests/minute (KV sliding window).
- **Global daily cap** — `RATE_PER_DAY` requests/day = a hard budget ceiling.
- **Input + output caps** — questions truncated to 600 chars, `max_tokens` = 400.
- **Optional Turnstile** bot-check (set `TURNSTILE_SECRET`).
- Default model: **Claude Haiku 4.5** (`claude-haiku-4-5`) — fast and cheap. Switch to
  `claude-sonnet-4-6` via the `MODEL` var for a sharper, pricier agent.

> Pricing (per 1M tokens, confirm against the latest Anthropic pricing before launch):
> Haiku 4.5 ≈ $1 in / $5 out · Sonnet 4.6 ≈ $3 in / $15 out. With the caps above, a
> day's worst-case spend is bounded by `RATE_PER_DAY × max_tokens`.

---

## Deploy (≈ 5 minutes)

Prereqs: a [Cloudflare account](https://dash.cloudflare.com/sign-up), an
[Anthropic API key](https://console.anthropic.com/), and Node.

```bash
cd agent-worker
npm install -g wrangler         # or: npx wrangler ...
wrangler login

# 1) Create the KV namespace for rate-limit counters, then paste the printed id
#    into wrangler.toml ([[kv_namespaces]] id = "...").
wrangler kv namespace create RATE_KV

# 2) Store ONE provider secret (never committed)
wrangler secret put GEMINI_API_KEY      # free key from aistudio.google.com
# ...or, if you have an Anthropic key instead:
# wrangler secret put ANTHROPIC_API_KEY
# optional bot-proofing:
# wrangler secret put TURNSTILE_SECRET

# 3) Set your site origin in wrangler.toml ([vars] ALLOWED_ORIGIN), then ship:
wrangler deploy
```

`wrangler deploy` prints a URL like `https://srujay-agent.<you>.workers.dev`.

### Turn the agent on

Open `js/config.js` in the repo root and set:

```js
WORKER_URL: "https://srujay-agent.<you>.workers.dev",
```

Commit and push. Done — the palette's ask-mode now streams live answers.

---

## Local testing

```bash
cd agent-worker
ANTHROPIC_API_KEY=sk-ant-... wrangler dev
```

Then point `WORKER_URL` at the local URL `wrangler dev` prints (e.g.
`http://127.0.0.1:8787`) and open the site from a local server. Verify:

- streaming text appears token-by-token,
- a wrong `Origin` is rejected (403),
- the rate limit trips after `RATE_PER_MIN` quick requests (429),
- with `WORKER_URL` unset, ask-mode shows the honest “resting” state.

```bash
# quick smoke test (expects an SSE stream of {"text": "..."} lines):
curl -N -X POST http://127.0.0.1:8787 \
  -H 'content-type: application/json' \
  -H 'Origin: https://srujayreddy.github.io' \
  -d '{"question":"What does Srujay do at Strada?"}'
```

---

## Notes

- The system prompt / knowledge base lives in `worker.js` (`SYSTEM_PROMPT`). Keep it in
  sync with `knowledgeBase` in `js/content.js`.
- This folder is **not** served by GitHub Pages in any meaningful way — it's source for
  Cloudflare. Nothing here contains secrets.
- KV counters are eventually consistent; the caps are intentionally *soft* ceilings for
  cost safety, not exact quotas.
