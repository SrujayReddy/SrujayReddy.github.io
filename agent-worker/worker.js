/*
 * worker.js — Cloudflare Worker that proxies the ⌘K agent to the Anthropic
 * Messages API and streams the answer back as SSE.
 *
 * It holds the ANTHROPIC_API_KEY (a Worker secret — never in the site), stays
 * in character as "Srujay's agent", and enforces hard cost/abuse caps so the
 * bill cannot run away:
 *   • CORS locked to ALLOWED_ORIGIN
 *   • per-IP sliding window (RATE_PER_MIN / minute)
 *   • global daily cap (RATE_PER_DAY / day) — a hard budget ceiling
 *   • input length + max_tokens caps
 *   • optional Cloudflare Turnstile bot-check
 *
 * Bindings (see wrangler.toml + README):
 *   secret  ANTHROPIC_API_KEY        (required)
 *   var     ALLOWED_ORIGIN           e.g. https://srujayreddy.github.io
 *   var     MODEL                    default claude-haiku-4-5
 *   var     RATE_PER_MIN             default 8
 *   var     RATE_PER_DAY             default 800
 *   kv      RATE_KV                  (required for rate limiting)
 *   secret  TURNSTILE_SECRET         (optional)
 *
 * Keep SYSTEM_PROMPT in sync with `knowledgeBase` in js/content.js.
 */

const SYSTEM_PROMPT = `
You are "Srujay's agent" — a concise, friendly assistant embedded on Srujay Reddy Jakkidi's
portfolio site. You answer ONLY questions about Srujay: his work, skills, thesis, experience,
projects, and how to reach him. If asked about anything unrelated, briefly say you only field
questions about Srujay and offer an example. Keep answers tight (2–4 sentences) unless asked to
expand. Never invent facts beyond the knowledge below. Speak about Srujay in the third person.

KNOWLEDGE:
Srujay Reddy Jakkidi — Forward Deployed Engineer at Strada (YC S23), San Francisco Bay Area.
Recent UW–Madison graduate: B.S. Honors in Computer Science and Data Science (GPA 3.9, May 2026).

NOW — Strada (May 2026–present): designs, builds, and deploys LLM-powered AI agents for insurance
operations in TypeScript/Node.js. Works hands-on with enterprise customers. Focus: agent
orchestration, tool-calling, Temporal, real-world performance. Stack: TypeScript, Node, React, Temporal.

THESIS — "Where Does the Time Go? Decomposing Kubernetes Pod Startup Latency Under Bandwidth
Constraints" (published in MINDS@UW, Jun 2026), advised by Prof. Remzi Arpaci-Dusseau (co-author of
OSTEP). Built a high-precision measurement system showing container image pull accounts for 93–99%
of Kubernetes cold-start latency under bandwidth constraints. Presented at the 2026 L&S Senior Honors
Thesis Symposium. He also authored and presented (onstage) the 2026 L&S Excellence in Honors Thesis
Advising Award for his advisor — one of five recipients college-wide.

EXPERIENCE:
- GE HealthCare, SWE Capstone (Sep–Dec 2025): QR-based headless device provisioning, Android (Kotlin)/
  iOS (Swift), offline-first; containerized Kubernetes provisioning service with an idempotent
  retryable state machine, BLE write-back, OpenAPI. Cut on-site setup to ≤15 minutes.
- OpenAI, SWE Intern (Jun–Aug 2025): real-time AI QuizBowl (React/TS, Node/Express, Postgres,
  WebSockets, OpenAI API). p95 latency −55% (2000→900ms), CI/CD build/test −60%, answer accuracy
  +12 points (70→82%) on a 500-item eval set. ~150 concurrent players.
- UW–Madison CDIS, CS Researcher (Dec 2024–May 2025): meta-analysis of 500+ cloud-storage studies,
  Python/Pandas pipelines, on Arpaci-Dusseau's team.
- MOURI Tech, AI/ML Intern (May–Jul 2024): TensorFlow stock-prediction on AWS, ONNX + distributed
  EC2 training, +15% accuracy.

SELECTED WORK: Gym Tracking App (React/Java/MySQL, JWT, <200ms), Path Finder (Java, Dijkstra),
Custom Unix Shell wsh (C), Data Visualization Portal (Flask/AWS).

BEYOND THE CODE: GUTS tutoring (Math & CS), Badger Volunteers, Cybersecurity UW, Dean's List x2.
Languages: English, Hindi.

CONTACT: srujayreddy15@gmail.com, linkedin.com/in/srujay-jakkidi, github.com/SrujayReddy.

PERSONALITY: ambitious; combines systems thinking with rigorous measurement. Running "Joey doesn't
share food" / pizza in-joke (Friends) — if asked about pizza, food, being hungry, or "Joey", play
along briefly in good humor, then steer back to Srujay.
`.trim();

const MAX_INPUT_CHARS = 600;

// ── The Build Bench ({mode:"bench"}) — assemble→run→MEASURE ──────────────────
const BENCH_RULES = `

BENCH MODE: You are the measured agent on "The Build Bench". Answer the question about Srujay in at most 2 sentences using ONLY the knowledge above. Call the tool answer_with_citations exactly once. For every factual claim, cite the exact source phrase. If the knowledge does not contain the answer (e.g. salary, personal/private data), set refused=true and give a one-line refusal — NEVER invent a number, employer, metric, or fact.`;

const BENCH_TOOL = {
  name: "answer_with_citations",
  description:
    "Answer the question about Srujay using ONLY the provided knowledge, citing the exact source phrase for each claim. If the knowledge lacks the answer, refuse instead of inventing.",
  input_schema: {
    type: "object",
    properties: {
      answer: { type: "string", description: "At most 2 sentences, grounded only in the knowledge." },
      citations: {
        type: "array",
        items: {
          type: "object",
          properties: { claim: { type: "string" }, source_fact: { type: "string" } },
          required: ["claim", "source_fact"],
        },
      },
      refused: { type: "boolean", description: "true if the knowledge does not contain the answer." },
    },
    required: ["answer", "refused"],
  },
};

const BENCH_RATES = { input: 1.0, output: 5.0, cacheRead: 0.1 }; // Haiku 4.5 $/Mtok

// ── Vibe Studio ({mode:"vibe"}) — free text → a generated, accessible theme ──
const VIBE_SYSTEM = `You are a senior brand / UI colour designer. Given a short "vibe" phrase,
design ONE cohesive, tasteful, ACCESSIBLE theme and return it via the generate_theme tool.
Rules: every colour is #rrggbb hex; bg vs ink MUST be >= 4.5:1 WCAG contrast (dark-on-light OR
light-on-dark — your choice to fit the vibe); accent/accent2/plasma form a harmonious palette that
pops on bg; surfaces sit just off bg; ink-dim/ink-mute are legible secondary/tertiary text; particle
is the accent used behind the page; font is a WEB-SAFE CSS font-family stack (e.g.
"Georgia, 'Times New Roman', serif") — never a font that needs loading; radius like "14px"; mood is a
2–4 word label. Call generate_theme exactly once.`;

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
      font: { type: "string" }, radius: { type: "string" }, mood: { type: "string" },
    },
    required: ["bg", "ink", "accent", "plasma", "mood"],
  },
};

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST")
      return json({ error: "method_not_allowed" }, 405, cors);

    // Origin lockdown (defense in depth beyond CORS headers).
    const reqOrigin = request.headers.get("Origin");
    if (origin !== "*" && reqOrigin && reqOrigin !== origin)
      return json({ error: "forbidden_origin" }, 403, cors);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad_request" }, 400, cors);
    }

    // The Build Bench + Vibe Studio reuse this CORS/origin envelope, own branches.
    if (body.mode === "bench") return handleBench(body, env, cors, request);
    if (body.mode === "vibe") return handleVibe(body, env, cors, request);

    const question = String(body.question || "").trim().slice(0, MAX_INPUT_CHARS);
    if (!question) return json({ error: "empty_question" }, 400, cors);

    // Optional Turnstile bot-check.
    if (env.TURNSTILE_SECRET) {
      const ok = await verifyTurnstile(env.TURNSTILE_SECRET, body.turnstileToken, request);
      if (!ok) return json({ error: "turnstile_failed" }, 403, cors);
    }

    // Rate limiting (soft, KV-backed).
    if (env.RATE_KV) {
      const ip = request.headers.get("CF-Connecting-IP") || "anon";
      const perMin = parseInt(env.RATE_PER_MIN || "8", 10);
      const perDay = parseInt(env.RATE_PER_DAY || "800", 10);
      const minute = Math.floor(Date.now() / 60000);
      const day = Math.floor(Date.now() / 86400000);

      const ipKey = `ip:${ip}:${minute}`;
      const dayKey = `day:${day}`;
      const [ipCount, dayCount] = await Promise.all([
        env.RATE_KV.get(ipKey).then((v) => parseInt(v || "0", 10)),
        env.RATE_KV.get(dayKey).then((v) => parseInt(v || "0", 10)),
      ]);
      if (ipCount >= perMin || dayCount >= perDay)
        return json({ error: "rate_limited" }, 429, cors);

      // best-effort increment (KV is eventually consistent — fine for soft caps)
      await Promise.all([
        env.RATE_KV.put(ipKey, String(ipCount + 1), { expirationTtl: 120 }),
        env.RATE_KV.put(dayKey, String(dayCount + 1), { expirationTtl: 90000 }),
      ]);
    }

    if (!env.ANTHROPIC_API_KEY)
      return json({ error: "not_configured" }, 503, cors);

    // Call Anthropic Messages API (streaming).
    let upstream;
    try {
      upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: env.MODEL || "claude-haiku-4-5",
          max_tokens: 400,
          stream: true,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: question }],
        }),
      });
    } catch {
      return json({ error: "upstream_unreachable" }, 502, cors);
    }
    if (!upstream.ok || !upstream.body) {
      return json({ error: "upstream_error", status: upstream.status }, 502, cors);
    }

    // Transform Anthropic SSE -> simple { text } SSE for the browser.
    const stream = transformAnthropicSSE(upstream.body);
    return new Response(stream, {
      headers: {
        ...cors,
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  },
};

// The Build Bench: run the assembled agent N times, timing each upstream Haiku
// call and returning the latency distribution + REAL token usage. Prompt-caches
// the shared knowledge so the "optimize" (warm cache) path is genuinely cheaper.
async function handleBench(body, env, cors, request) {
  const question = String(body.question || "").trim().slice(0, MAX_INPUT_CHARS);
  if (!question) return json({ error: "empty_question" }, 400, cors);

  // Bench has its OWN tighter caps (each run = N upstream calls — heavier than chat).
  if (env.RATE_KV) {
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const perMin = parseInt(env.BENCH_PER_MIN || "2", 10);
    const perDay = parseInt(env.BENCH_PER_DAY || "120", 10);
    const minute = Math.floor(Date.now() / 60000);
    const day = Math.floor(Date.now() / 86400000);
    const ipKey = `bench:ip:${ip}:${minute}`;
    const dayKey = `bench:day:${day}`;
    const [ipC, dayC] = await Promise.all([
      env.RATE_KV.get(ipKey).then((v) => parseInt(v || "0", 10)),
      env.RATE_KV.get(dayKey).then((v) => parseInt(v || "0", 10)),
    ]);
    if (ipC >= perMin || dayC >= perDay) return json({ error: "rate_limited" }, 429, cors);
    await Promise.all([
      env.RATE_KV.put(ipKey, String(ipC + 1), { expirationTtl: 120 }),
      env.RATE_KV.put(dayKey, String(dayC + 1), { expirationTtl: 90000 }),
    ]);
  }

  if (!env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503, cors);

  const N = Math.min(parseInt(env.BENCH_RUNS || "6", 10), 8);
  const warm = !!(body.optimize && body.optimize.cache);
  // Warm: a stable cached system prefix → runs 2..N are cache_read.
  // Cold: a fresh nonce PER CALL → every call misses the cache.
  const warmSystem = [{ type: "text", text: SYSTEM_PROMPT + BENCH_RULES, cache_control: { type: "ephemeral" } }];

  const latencyMs = [];
  let lastUsage = null, answer = "", refused = false;
  for (let i = 0; i < N; i++) {
    const system = warm
      ? warmSystem
      : [{ type: "text", text: SYSTEM_PROMPT + BENCH_RULES + `\n[cold-${i}-${Math.random().toString(36).slice(2)}]`, cache_control: { type: "ephemeral" } }];
    const t0 = Date.now();
    let r;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31",
        },
        body: JSON.stringify({
          model: env.MODEL || "claude-haiku-4-5",
          max_tokens: 200,
          system,
          tools: [BENCH_TOOL],
          tool_choice: { type: "tool", name: "answer_with_citations" },
          messages: [{ role: "user", content: question }],
        }),
      });
    } catch {
      return json({ error: "upstream_unreachable" }, 502, cors);
    }
    if (!r.ok) return json({ error: "upstream_error", status: r.status }, 502, cors);
    const data = await r.json();
    latencyMs.push(Date.now() - t0);
    lastUsage = data.usage || lastUsage;
    const tu = (data.content || []).find((c) => c.type === "tool_use");
    if (tu && tu.input) { answer = String(tu.input.answer || ""); refused = !!tu.input.refused; }
  }

  const u = lastUsage || {};
  const tokens = {
    inputTokens: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0),
    cacheReadTokens: u.cache_read_input_tokens || 0,
    outputTokens: u.output_tokens || 0,
  };
  const costPerRun =
    (tokens.inputTokens * BENCH_RATES.input +
      tokens.cacheReadTokens * BENCH_RATES.cacheRead +
      tokens.outputTokens * BENCH_RATES.output) / 1e6;

  return json({ latencyMs, tokens, costPerRun, answer, refused }, 200, cors);
}

// Vibe Studio: one Anthropic call, tool-forced to emit a theme JSON. Returns the
// raw theme; the client (js/vibe.js validate()) hex-checks + contrast-gates it
// before it ever touches the page, so a bad model output can only fall back safely.
async function handleVibe(body, env, cors, request) {
  const prompt = String(body.prompt || "").trim().slice(0, 120);
  if (!prompt) return json({ error: "empty_prompt" }, 400, cors);

  // Vibe has its OWN modest caps (heavier than a chat turn, lighter than bench).
  if (env.RATE_KV) {
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const perMin = parseInt(env.VIBE_PER_MIN || "4", 10);
    const perDay = parseInt(env.VIBE_PER_DAY || "200", 10);
    const minute = Math.floor(Date.now() / 60000);
    const day = Math.floor(Date.now() / 86400000);
    const ipKey = `vibe:ip:${ip}:${minute}`;
    const dayKey = `vibe:day:${day}`;
    const [ipC, dayC] = await Promise.all([
      env.RATE_KV.get(ipKey).then((v) => parseInt(v || "0", 10)),
      env.RATE_KV.get(dayKey).then((v) => parseInt(v || "0", 10)),
    ]);
    if (ipC >= perMin || dayC >= perDay) return json({ error: "rate_limited" }, 429, cors);
    await Promise.all([
      env.RATE_KV.put(ipKey, String(ipC + 1), { expirationTtl: 120 }),
      env.RATE_KV.put(dayKey, String(dayC + 1), { expirationTtl: 90000 }),
    ]);
  }

  if (!env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503, cors);

  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.MODEL || "claude-haiku-4-5",
        max_tokens: 500,
        system: VIBE_SYSTEM,
        tools: [VIBE_TOOL],
        tool_choice: { type: "tool", name: "generate_theme" },
        messages: [{ role: "user", content: `Vibe: ${prompt}` }],
      }),
    });
  } catch {
    return json({ error: "upstream_unreachable" }, 502, cors);
  }
  if (!r.ok) return json({ error: "upstream_error", status: r.status }, 502, cors);
  const data = await r.json();
  const tu = (data.content || []).find((c) => c.type === "tool_use");
  if (!tu || !tu.input) return json({ error: "no_theme" }, 502, cors);
  return json(tu.input, 200, cors);
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

async function verifyTurnstile(secret, token, request) {
  if (!token) return false;
  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) form.append("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await r.json();
    return !!data.success;
  } catch {
    return false;
  }
}

function transformAnthropicSSE(upstreamBody) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      const send = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop();
          for (const chunk of chunks) {
            const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const payload = dataLine.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload);
              if (
                evt.type === "content_block_delta" &&
                evt.delta &&
                evt.delta.type === "text_delta"
              ) {
                send({ text: evt.delta.text });
              }
            } catch {
              /* ignore keepalive / non-JSON */
            }
          }
        }
      } catch {
        send({ error: "stream_interrupted" });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}
