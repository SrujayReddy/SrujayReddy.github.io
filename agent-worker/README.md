# Portfolio AI Worker

The Worker supplies streamed Q&A in ⌘K and structured theme JSON for Vibe Studio.
The default is **Cloudflare Workers AI** through the native `AI` binding; no model
API key is required. The portfolio's controls, streaming format, theme animation,
contrast validation and preset fallback stay the same.

`AI_PROVIDER` explicitly selects `workers-ai`, `gemini`, or `anthropic`. Old provider
secrets never select a provider, and errors never fall back to a paid provider.
The retired `mode: "bench"` endpoint returns `bench_unavailable`.

## Free usage and activation

Workers AI includes **10,000 neurons per day**, resetting at 00:00 UTC. On the
**Workers Free** plan, inference fails after that allowance. A Workers Paid
account can incur overage. Check the account plan before deploying; the counters
in this Worker are abuse controls, **not a guaranteed spending ceiling**.
Other Workers/KV plan limits also apply.
[Official pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

Chat uses [Llama 3.1 8B FP8](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/);
Vibe uses [Llama 3.3 70B FP8 Fast](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/),
which supports JSON schema output. Models are configurable via `WORKERS_AI_MODEL`
and `WORKERS_AI_VIBE_MODEL`. Real answer/theme quality and latency require a live
smoke test; mocked tests do not establish those qualities.

ChatGPT Pro does not automatically fund ordinary OpenAI API-key traffic. The
[Sign in with ChatGPT flow](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)
authorizes an eligible user's own plan in participating apps; remotely hosted
apps require access. It is not a drop-in shared allowance for anonymous visitors.

From this directory, with Wrangler v4 installed:

```bash
wrangler login
wrangler whoami
# Confirm Workers Free in the Cloudflare dashboard before activating inference.
wrangler deploy --dry-run
wrangler deploy
```

The existing KV namespace and endpoint are retained. If deploying to a different
account, create its own namespace and update `wrangler.toml`. Set `ALLOWED_ORIGIN`
to the portfolio origin. The public endpoint is in `../js/config.js` and its label
is provider-neutral, so frontend and backend deployments can occur separately.
Do not paste secrets into frontend code or commit `.dev.vars` files.

For Gemini or Anthropic, deliberately change `AI_PROVIDER`, then provision only
the corresponding Worker secret with `wrangler secret put GEMINI_API_KEY` or
`wrangler secret put ANTHROPIC_API_KEY`. Their account-specific quotas/pricing
apply. No fixed Gemini daily allowance is promised here.

## Verification without inference or billing

From the repository root:

```bash
node tests/worker-ai.mjs
```

These tests mock the AI binding, external provider requests and KV. They cover
streaming/chunk boundaries, UTF-8, cancellation, timeouts, structured output,
provider selection, rate limits and error sanitization. `wrangler deploy
--dry-run` bundles without publishing or performing inference. A regular
`wrangler dev` request to the AI binding runs **remotely**, even during local
development; do not use it as a no-cost mock.

After verifying the Free plan, live checks should cover a current-Amazon question,
an unknown/private fact (the agent should decline to invent), and custom light,
dark and expressive typography themes. Verify first-token latency, theme quality
and the existing client contrast/overflow safeguards before public activation.

## Request contract

- `POST {question}` → SSE `data: {"text":"…"}` and final `[DONE]`.
- `POST {mode:"vibe",prompt}` → validated theme JSON; the browser retains its
  contrast, font and CSS guards.
- `429 daily_limit` means a confirmed daily allowance/cap; `429 rate_limited`
  means temporary throttling or capacity. Unknown provider failures stay generic.
- A stream failure sends an error event instead of presenting a partial answer as
  complete. Client cancellation and a configurable timeout stop upstream work.
- CORS restricts browser origins. It is not authentication. KV uses fixed minute
  and UTC-day windows and is eventually consistent; parallel requests can race.
- Optional `TURNSTILE_SECRET` enforces a supplied `turnstileToken` for both modes;
  enabling it requires wiring a token-producing widget in the frontend.

Keep the knowledge in `worker.js` synchronized with `js/content.js`.
