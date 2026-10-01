/*
 * config.js — deploy-time configuration for the AI features.
 *
 * Both AI features (⌘K "ask anything" and the live "describe your own…" theme
 * generator) are powered by the Cloudflare Worker in agent-worker/. When
 * WORKER_URL is empty they run DORMANT (⌘K shows an honest "resting" state,
 * restyle falls back to keyword→preset). Everything else works with no backend.
 *
 * Nothing here is secret — the API key lives only inside the Worker, never here.
 */

export const config = {
  // Cloudflare Worker endpoint. Empty string = AI features dormant (graceful).
  WORKER_URL: "https://srujay-agent.srujay.workers.dev",

  // Optional Cloudflare Turnstile site key (bot-proofing). Empty = disabled.
  TURNSTILE_SITE_KEY: "",

  // Provider-neutral until the separately deployed Worker selects its model.
  MODEL_LABEL: "Portfolio AI",
};
