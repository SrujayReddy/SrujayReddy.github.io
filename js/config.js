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

  // Cosmetic: model label shown in the palette footer. The real model is
  // chosen in the Worker (Gemini 2.5 Flash on the free tier, or Claude Haiku 4.5).
  MODEL_LABEL: "Gemini 2.5 Flash",
};
