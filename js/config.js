/*
 * config.js — deploy-time configuration for the ⌘K agent.
 *
 * The site ships with the AI agent DORMANT. Command-palette actions (jump,
 * copy, links, résumé, theme) work with no backend. The "ask anything" mode
 * only lights up once you:
 *   1) deploy agent-worker/  (see agent-worker/README.md), and
 *   2) paste its URL into WORKER_URL below.
 *
 * Until then, ask-mode shows an honest "resting" state. Nothing here is secret —
 * your Anthropic API key lives only inside the Cloudflare Worker, never here.
 */

export const config = {
  // Cloudflare Worker endpoint. Empty string = agent dormant (graceful).
  // Example: "https://srujay-agent.<you>.workers.dev"
  WORKER_URL: "",

  // Optional Cloudflare Turnstile site key (bot-proofing). Empty = disabled.
  TURNSTILE_SITE_KEY: "",

  // Cosmetic: model label shown in the palette footer. The real model is
  // chosen in the Worker (default: Claude Haiku 4.5).
  MODEL_LABEL: "Claude Haiku 4.5",
};
