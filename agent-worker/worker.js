/*
 * Portfolio AI endpoint: streamed Q&A and structured Vibe Studio themes.
 * Workers AI is the default provider, through the native AI binding. Gemini and
 * Anthropic require explicit AI_PROVIDER opt-in; secrets never select a provider
 * and errors never trigger a fallback to another provider.
 *
 * Input/output limits and optional KV counters reduce abuse. KV counters are
 * eventually consistent soft caps, NOT a billing guarantee. Workers AI is free
 * within its daily allowance on Workers Free; Workers Paid can bill overage.
 * See README.md for plan limits, model configuration, and local mocked tests.
 * Keep SYSTEM_PROMPT's KNOWLEDGE in sync with js/content.js.
 */
// KNOWLEDGE below is kept verbatim-in-sync with `knowledgeBase` in js/content.js
// (single source of truth). If you edit facts, edit them THERE and mirror here.
const SYSTEM_PROMPT = `
You are "Srujay's agent" — a concise, friendly assistant embedded on Srujay Reddy Jakkidi's
portfolio site. You answer ONLY questions about Srujay: his work, skills, thesis, experience,
projects, and how to reach him. If asked about anything unrelated, briefly say you only field
questions about Srujay and offer an example. Keep answers tight (2–4 sentences) unless asked to
expand. Never invent facts beyond the knowledge below. Speak about Srujay in the third person.

KNOWLEDGE:
Srujay Reddy Jakkidi — Software Development Engineer I at Amazon, based in Seattle;
previously a Forward Deployed Engineer at Strada (YC S23).
Recent UW–Madison graduate: B.S. Honors in Computer Science and Data Science (GPA 3.9, May 2026).

NOW — Amazon, Software Development Engineer I (Sep 2026–present), Seattle, WA: works on the Unified
Financing Offers (UFO) team in Amazon Stores Payments. Builds services that power financing offers
across Amazon shopping and product pages for millions of customers, with a focus on low latency and
reliable software. Confirmed skills: Java, Microservices.
He is driven to keep raising the bar on what he can build and its impact for stakeholders. He takes
ambiguous problems, makes them actionable, measures how the software behaves, and improves it until
it holds up. He cares about the craft, the people it reaches, and making a real difference.

SIGNATURE — Honors Thesis "Where Does the Time Go? Decomposing Kubernetes Pod Startup Latency Under
Bandwidth Constraints" (published in MINDS@UW, Jun 2026), advised by Prof. Remzi Arpaci-Dusseau
(author of OSTEP). Built a high-precision measurement system showing container image pull accounts
for 93–99% of Kubernetes cold-start latency under bandwidth constraints. Presented at the 2026 L&S
Senior Honors Thesis Symposium. He also authored and presented (onstage) the 2026 L&S Excellence in
Honors Thesis Advising Award for his advisor — one of five recipients college-wide.

EXPERIENCE:
- Strada (YC S23), Forward Deployed Engineer, San Francisco Bay Area (May–Aug 2026):
  built and deployed LLM-powered AI agents for insurance operations
  in TypeScript/Node.js. Worked hands-on with enterprise customers. Focus: agent orchestration,
  tool-calling, Temporal, reliability, latency, and cost. Stack: TypeScript, Node.js, React, Temporal.
- GE HealthCare, Software Engineer Capstone (Sep–Dec 2025): worked on hospital medical-device setup —
  QR-based headless device provisioning, Android (Kotlin)/iOS (Swift), offline-first; containerized
  Kubernetes provisioning service with an idempotent retryable state machine, BLE write-back, OpenAPI.
  Cut on-site setup to ≤15 minutes.
- OpenAI, SWE Intern (Jun–Aug 2025): primarily owned the real-time match engine over the WebSocket
  architecture, Node/Express REST APIs, PostgreSQL schema design, JWT authentication, and OpenAI API
  integration. p95 latency −55% (2000→900ms) via streaming, prompt
  batching, and Redis caching; DB p95 −62% (120→45ms) via indexing and pooling; Dockerized services +
  CI/CD (daily deploys); 500-item eval set with moderation checks that increased response accuracy.
- UW–Madison CDIS, CS Researcher (Dec 2024–May 2025): meta-analysis of 500+ cloud-storage studies in
  collaboration with other Big Ten schools; Python/Pandas pipelines.
- MOURI Tech, AI/ML Intern (May–Jul 2024): TensorFlow stock-prediction on AWS, ONNX + distributed
  EC2 training, +15% accuracy.

PROJECTS: Gym Tracking App (React/Java/MySQL, JWT, <200ms), Path Finder (Java, Dijkstra),
Custom Unix Shell wsh (C), Data Visualization Portal (Flask/AWS).

BEYOND THE CODE: GUTS tutoring (Math & CS), Badger Volunteers (health/sustainability), Cybersecurity
UW, Dean's Honor List 7 of 8 semesters. Languages: English, Telugu.

CONTACT: srujayreddy15@gmail.com, linkedin.com/in/srujay-jakkidi, github.com/SrujayReddy.

PERSONALITY: ambitious, keeps raising the bar on what he can build and its impact for stakeholders;
values the craft, rigorous measurement, and the people his work reaches. There is a running
"Joey doesn't share food" / pizza in-joke (from Friends) — if asked about pizza, food, being hungry,
or "Joey", play along briefly and in good humor, then steer back to Srujay.
`.trim();

const MAX_INPUT_CHARS = 600;

// ── Vibe Studio ({mode:"vibe"}) — free text → a generated, accessible theme ──
const VIBE_SYSTEM = `You are a senior brand / UI colour designer. Given a short "vibe" phrase,
design ONE cohesive, tasteful, ACCESSIBLE theme and return it via the generate_theme tool.
First reason about the WORLD the vibe evokes — its era, materials, lighting, and emotion — then
choose colours that feel unmistakably like that world: bold, specific, and harmonious, never
generic, muddy, or washed-out. Push for a palette that would make a designer stop and look.
Rules: every colour is #rrggbb hex; bg vs ink MUST be >= 4.5:1 WCAG contrast (dark-on-light OR
light-on-dark — your choice to fit the vibe); accent/accent2/plasma form a harmonious palette that
pops on bg; surfaces sit just off bg; ink-dim/ink-mute are legible secondary/tertiary text; particle
is the accent used behind the page.
TYPOGRAPHY — reshape the whole identity, not just colour. Use ALL of these together:
- font: the body/UI font stack; fontDisplay: the BIG hero-headline font (be expressive here);
  fontMono: the small label/eyebrow font. All three are WEB-SAFE CSS font-family stacks (e.g.
  "Georgia,'Times New Roman',serif" · "'Courier New',monospace" · "'Trebuchet MS',sans-serif") —
  NEVER a font that needs loading.
- headingCase: one of none | uppercase | lowercase.
- tracking: heading letter-spacing, e.g. "-0.02em" (tight) … "0.06em" (airy).
- radius: e.g. "0px" (sharp/brutal) … "14px" … "26px" (soft/friendly).
BACKGROUND — pick an animated backdrop that matches the world (or "none"). Choose EXACTLY one of:
  none · waves (sea / ocean / water / rain / liquid) · aurora (sky / dream / ethereal / northern
  lights / calm) · starfield (space / night / cosmic / galaxy) · grid (retro / synthwave / terminal
  / cyber / 80s). It renders behind the page in YOUR colours, with the particle field on top — so
  make bg/accent/plasma read well as that backdrop (e.g. a sea wants deep blue bg + teal/cyan plasma).
  If none of these fits the vibe, use "none".
Make the dials agree with the vibe: e.g. BRUTALIST → mono display font, uppercase headings, tight
tracking, 0px radius, grid or none; DEEP SEA → blue/teal palette, waves background, soft radius;
ELEGANT EDITORIAL → serif display, roomy tracking, soft radius, none/aurora; RETRO TERMINAL →
monospace everything, uppercase, grid. mood is a 2–4 word label. Take the time to get it right, then
call generate_theme exactly once.`;

const VIBE_TOOL = {
  name: "generate_theme",
  description:
    "Return one cohesive, accessible theme for the vibe. bg vs ink MUST be >= 4.5:1 contrast. All colours are #rrggbb.",
  input_schema: {
    type: "object",
    properties: {
      bg: { type: "string" }, ink: { type: "string" },
      bgTint: { type: "string" }, surface: { type: "string" }, surface2: { type: "string" },
      inkDim: { type: "string" }, inkMute: { type: "string" },
      accent: { type: "string" }, accent2: { type: "string" }, particle: { type: "string" },
      plasma: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
      font: { type: "string" }, fontDisplay: { type: "string" }, fontMono: { type: "string" },
      headingCase: { type: "string", enum: ["none", "uppercase", "lowercase"] },
      tracking: { type: "string" },
      background: { type: "string", enum: ["none", "waves", "aurora", "starfield", "grid"] },
      radius: { type: "string" }, mood: { type: "string" },
    },
    required: ["bg", "ink", "accent", "plasma", "font", "fontDisplay", "mood"],
  },
};

const WORKERS_CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const WORKERS_VIBE_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const VIBE_JSON_SYSTEM = VIBE_SYSTEM
  .replace("return it via the generate_theme tool.", "return only a JSON object matching the supplied schema.")
  .replace("call generate_theme exactly once.", "return only the theme JSON, without commentary or a code fence.");

export default {
  async fetch(request, env, ctx) {
    const origin = env.ALLOWED_ORIGIN || "https://srujayreddy.github.io";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);
    const reqOrigin = request.headers.get("Origin");
    if (origin !== "*" && reqOrigin && reqOrigin !== origin)
      return json({ error: "forbidden_origin" }, 403, cors);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "bad_request" }, 400, cors); }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json({ error: "bad_request" }, 400, cors);

    // The old benchmark no longer has a UI. Never run its paid Anthropic calls
    // under the free configuration, even if an old secret remains installed.
    if (body.mode === "bench") return json({ error: "bench_unavailable" }, 503, cors);
    const vibe = body.mode === "vibe";
    if (body.mode && !vibe && body.mode !== "ask")
      return json({ error: "bad_request" }, 400, cors);
    const input = String((vibe ? body.prompt : body.question) || "").trim().slice(0, vibe ? 120 : MAX_INPUT_CHARS);
    if (!input) return json({ error: vibe ? "empty_prompt" : "empty_question" }, 400, cors);

    const provider = env.AI_PROVIDER || "workers-ai";
    if (!configured(provider, env)) return json({ error: "not_configured" }, 503, cors);
    if (env.TURNSTILE_SECRET && !await verifyTurnstile(env.TURNSTILE_SECRET, body.turnstileToken, request))
      return json({ error: "turnstile_failed" }, 403, cors);

    try {
      const limited = await rateLimitReason(env, request, vibe);
      if (limited) return json({ error: limited }, 429, cors);
    } catch {
      // A broken configured limiter must not silently allow unlimited inference.
      return json({ error: "temporarily_unavailable" }, 503, cors);
    }
    const scope = requestScope(request.signal, positiveInt(env.AI_TIMEOUT_MS, 45000, 120000));
    try {
      if (vibe) {
        const theme = await generateTheme(provider, env, input, scope.signal);
        scope.dispose();
        return json(theme, 200, cors);
      }
      const upstream = await streamAnswer(provider, env, input, scope.signal);
      if (!upstream || typeof upstream.getReader !== "function") throw new Error("invalid_stream");
      return new Response(transformSSE(upstream, provider, scope), {
        headers: { ...cors, "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" },
      });
    } catch (error) {
      scope.dispose();
      const failure = publicFailure(error);
      return json({ error: failure.error }, failure.status, cors);
    }
  },
};

function configured(provider, env) {
  if (provider === "workers-ai") return typeof env.AI?.run === "function";
  if (provider === "gemini") return !!env.GEMINI_API_KEY;
  if (provider === "anthropic") return !!env.ANTHROPIC_API_KEY;
  return false;
}

async function streamAnswer(provider, env, question, signal) {
  if (provider === "workers-ai") {
    return env.AI.run(env.WORKERS_AI_MODEL || WORKERS_CHAT_MODEL, {
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: question }],
      stream: true,
      max_tokens: 400,
    }, { signal });
  }
  let response;
  if (provider === "anthropic") {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.MODEL || "claude-haiku-4-5", max_tokens: 400, stream: true,
        system: SYSTEM_PROMPT, messages: [{ role: "user", content: question }] }),
    });
  } else {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL || "gemini-2.5-flash-lite")}:streamGenerateContent?alt=sse`, {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 500, thinkingConfig: { thinkingBudget: 0 } } }),
    });
  }
  await checkResponse(response);
  return response.body;
}

async function generateTheme(provider, env, prompt, signal) {
  let theme;
  if (provider === "workers-ai") {
    const data = await env.AI.run(env.WORKERS_AI_VIBE_MODEL || WORKERS_VIBE_MODEL, {
      messages: [{ role: "system", content: VIBE_JSON_SYSTEM }, { role: "user", content: `Vibe: ${prompt}` }],
      response_format: { type: "json_schema", json_schema: VIBE_TOOL.input_schema },
      max_tokens: 1024,
    }, { signal });
    theme = data?.response;
  } else if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.MODEL || "claude-haiku-4-5", max_tokens: 1024,
        system: VIBE_SYSTEM, tools: [VIBE_TOOL], tool_choice: { type: "tool", name: "generate_theme" },
        messages: [{ role: "user", content: `Vibe: ${prompt}` }] }),
    });
    await checkResponse(response);
    const data = await response.json();
    theme = data.content?.find((part) => part.type === "tool_use" && part.name === "generate_theme")?.input;
  } else {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_VIBE_MODEL || "gemini-2.5-flash")}:generateContent`, {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: VIBE_JSON_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: `Vibe: ${prompt}` }] }],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: VIBE_TOOL.input_schema,
          temperature: 1.0, maxOutputTokens: 3072, thinkingConfig: { thinkingBudget: 8192 } } }),
    });
    await checkResponse(response);
    const data = await response.json();
    theme = data.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || "").join("");
  }
  try {
    if (typeof theme === "string") theme = JSON.parse(theme);
    if (!theme || typeof theme !== "object" || Array.isArray(theme)) throw new Error();
    for (const key of VIBE_TOOL.input_schema.required) {
      if (theme[key] == null) throw new Error();
    }
    const clean = {};
    for (const [key, rule] of Object.entries(VIBE_TOOL.input_schema.properties)) {
      if (theme[key] == null) continue;
      if (key === "plasma") {
        if (!Array.isArray(theme[key]) || theme[key].length !== 3 || !theme[key].every(isHex)) throw new Error();
      } else if (typeof theme[key] !== "string" || !theme[key] || theme[key].length > 200 || (rule.enum && !rule.enum.includes(theme[key]))) {
        throw new Error();
      }
      if (["bg", "ink", "bgTint", "surface", "surface2", "inkDim", "inkMute", "accent", "accent2", "particle"].includes(key) && !isHex(theme[key])) throw new Error();
      clean[key] = theme[key];
    }
    // Keep the browser's existing contrast, font, and CSS validation as the final
    // gate; the backend rejects malformed fields before returning theme data.
    return clean;
  } catch {
    throw Object.assign(new Error("no_theme"), { publicError: "no_theme" });
  }
}

const isHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

async function checkResponse(response) {
  if (response.ok) return;
  await response.body?.cancel().catch(() => {});
  throw Object.assign(new Error("upstream_error"), { status: response.status });
}

function publicFailure(error) {
  // Native binding errors may expose the Cloudflare internal code only in their
  // message. Inspect known codes, but never return provider messages or secrets.
  const code = Number(error?.code || error?.status || error?.statusCode);
  const detail = String(error?.message || "");
  if (code === 3036 || /\b3036\b/.test(detail))
    return { status: 429, error: "daily_limit" };
  if ([429, 3040].includes(code) || /\b(?:3040|429)\b/.test(detail))
    return { status: 429, error: "rate_limited" };
  if (error?.name === "TimeoutError" || error?.name === "AbortError" || code === 408 || code === 3007)
    return { status: 504, error: "upstream_timeout" };
  if ([401, 403, 5035, 5016].includes(code) || /\b(?:5035|5016)\b/.test(detail))
    return { status: 503, error: "not_configured" };
  return { status: 502, error: error?.publicError === "no_theme" ? "no_theme" : "upstream_error" };
}

function positiveInt(value, fallback, maximum = 100000) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, maximum) : fallback;
}

async function rateLimitReason(env, request, vibe) {
  if (!env.RATE_KV) return null;
  const prefix = vibe ? "vibe:" : "";
  const minute = Math.floor(Date.now() / 60000);
  const day = Math.floor(Date.now() / 86400000);
  const ipKey = `${prefix}ip:${request.headers.get("CF-Connecting-IP") || "anon"}:${minute}`;
  const dayKey = `${prefix}day:${day}`;
  const perMin = positiveInt(vibe ? env.VIBE_PER_MIN : env.RATE_PER_MIN, vibe ? 4 : 8);
  const perDay = positiveInt(vibe ? env.VIBE_PER_DAY : env.RATE_PER_DAY, vibe ? 200 : 800);
  const [ipCount, dayCount] = await Promise.all([env.RATE_KV.get(ipKey), env.RATE_KV.get(dayKey)]);
  const ip = Number(ipCount) || 0, daily = Number(dayCount) || 0;
  if (daily >= perDay) return "daily_limit";
  if (ip >= perMin) return "rate_limited";
  // Fixed windows, eventually consistent: these counters are abuse controls,
  // not exact quotas or a promise of free provider capacity.
  await Promise.all([
    env.RATE_KV.put(ipKey, String(ip + 1), { expirationTtl: 120 }),
    env.RATE_KV.put(dayKey, String(daily + 1), { expirationTtl: 90000 }),
  ]);
  return null;
}

function requestScope(signal, timeoutMs) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("AI request timed out", "TimeoutError")), timeoutMs);
  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    dispose() { clearTimeout(timer); signal.removeEventListener("abort", abort); },
  };
}

function readWithSignal(reader, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    reader.read().then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

// Provider SSE -> the site's stable {text}/{error} events and [DONE] marker.
// Pull-based reading keeps backpressure and cancels upstream on client abort.
function transformSSE(body, provider, scope) {
  const reader = body.getReader();
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  let buffer = "", pending = [], ended = false, cancelled = false, sawText = false;
  const emit = (value) => pending.push(`data: ${typeof value === "string" ? value : JSON.stringify(value)}\n\n`);
  function frame(raw) {
    const payload = raw.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n").trim();
    if (!payload) return;
    if (payload === "[DONE]") { ended = true; return; }
    const event = JSON.parse(payload);
    if (event.error || event.type === "error") throw Object.assign(new Error("provider_stream_error"), { code: event.error?.code, status: event.error?.status });
    let text = "";
    if (provider === "workers-ai") {
      text = typeof event.response === "string" ? event.response : event.choices?.[0]?.delta?.content || "";
      if (event.done === true) ended = true;
    } else if (provider === "anthropic") {
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") text = event.delta.text;
      if (event.type === "message_stop") ended = true;
    } else {
      const candidate = event.candidates?.[0];
      text = candidate?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || "").join("") || "";
      if (candidate?.finishReason && candidate.finishReason !== "STOP") throw new Error("incomplete_stream");
      if (candidate?.finishReason === "STOP") ended = true;
    }
    if (text) { sawText = true; emit({ text }); }
  }
  async function finish() {
    await reader.cancel().catch(() => {});
    scope.dispose();
  }
  return new ReadableStream({
    async pull(controller) {
      try {
        while (!pending.length && !ended) {
          const { value, done } = await readWithSignal(reader, scope.signal);
          if (cancelled) return;
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, "\n");
          if (buffer.length > 65536) throw new Error("oversized_stream_event");
          let boundary;
          while (!ended && (boundary = buffer.indexOf("\n\n")) >= 0) {
            frame(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
          }
          if (done) {
            if (!ended && buffer.trim()) frame(buffer);
            if (!ended) throw new Error("incomplete_stream");
          }
        }
        if (cancelled) return;
        if (pending.length) controller.enqueue(encoder.encode(pending.shift()));
        if (ended && !pending.length) {
          if (!sawText) controller.enqueue(encoder.encode('data: {"error":"empty_response"}\n\n'));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          await finish();
        }
      } catch (error) {
        if (!cancelled) {
          // Deliver already parsed text before the failure, rather than silently
          // treating a truncated stream as a complete answer.
          for (const event of pending) controller.enqueue(encoder.encode(event));
          pending = [];
          const failure = publicFailure(error);
          const errorCode = ["rate_limited", "daily_limit"].includes(failure.error) ? failure.error : "stream_interrupted";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorCode })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
        ended = true;
        await finish();
      }
    },
    async cancel() { cancelled = true; scope.abort(); await finish(); },
  });
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" } });
}

async function verifyTurnstile(secret, token, request) {
  if (!token) return false;
  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) form.append("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: form, signal: AbortSignal.timeout(10000),
    });
    return !!(await response.json()).success;
  } catch { return false; }
}
