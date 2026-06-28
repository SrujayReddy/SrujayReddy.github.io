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
orchestration, tool-calling, Temporal, real-world performance.

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
  +12 points (70→82%) on a 500-item eval set.
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
