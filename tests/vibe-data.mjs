/*
 * tests/vibe-data.mjs — verifies the Vibe Studio presets + keyword routing.
 *   • Every preset has valid 6-digit hex for accent / accent2 / particle and a
 *     3-stop hex plasma (so nothing malformed ever reaches the page).
 *   • Every preset id has a keyword bucket, and the dormant resolver routes a few
 *     sample prompts to the sensible preset.
 *
 * Run:  node tests/vibe-data.mjs   (exit 0 = pass, 1 = fail)
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const { content } = await import(pathToFileURL(join(here, "..", "js", "content.js")).href);
const v = content.vibes;

const HEX = /^#[0-9a-f]{6}$/i;
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (h) => { const [r, g, b] = rgb(h).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const la = lum(a), lb = lum(b), hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05); };
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

ok(!!v, "content.vibes missing");
ok(Array.isArray(v.presets) && v.presets.length >= 4, "need >= 4 presets");

const ids = new Set();
for (const p of v.presets) {
  ok(!ids.has(p.id), `duplicate preset id ${p.id}`); ids.add(p.id);
  ok(!!p.label && !!p.mood, `preset ${p.id} missing label/mood`);
  ok(HEX.test(p.accent), `preset ${p.id} bad accent ${p.accent}`);
  ok(HEX.test(p.accent2), `preset ${p.id} bad accent2 ${p.accent2}`);
  ok(HEX.test(p.particle), `preset ${p.id} bad particle ${p.particle}`);
  ok(Array.isArray(p.plasma) && p.plasma.length === 3 && p.plasma.every((c) => HEX.test(c)), `preset ${p.id} bad plasma`);
  for (const c of ["bg", "bgTint", "surface", "surface2", "ink", "inkDim", "inkMute"]) ok(HEX.test(p[c]), `preset ${p.id} bad ${c} ${p[c]}`);
  ok(typeof p.font === "string" && p.font.length > 3, `preset ${p.id} missing font`);
  ok(/^[0-9]{1,2}px$/.test(p.radius), `preset ${p.id} bad radius ${p.radius}`);
  // the whole-page restyle must stay readable — text vs background ≥ WCAG AA (4.5:1)
  const cr = contrast(p.bg, p.ink);
  ok(cr >= 4.5, `preset ${p.id} bg/ink contrast ${cr.toFixed(2)} < 4.5`);
  ok(Array.isArray(v.keywords[p.id]) && v.keywords[p.id].length > 0, `preset ${p.id} has no keyword bucket`);
}

// dormant resolver (mirror of vibe.js resolveDormant)
function resolveDormant(text) {
  const t = text.toLowerCase();
  let best = v.presets[0], score = -1;
  for (const [id, kws] of Object.entries(v.keywords)) {
    const s = kws.reduce((acc, k) => acc + (t.includes(k) ? 1 : 0), 0);
    if (s > score) { score = s; best = v.presets.find((p) => p.id === id) || best; }
  }
  return best;
}
const cases = [
  ["cyberpunk bakery", "neon"],
  ["calm nordic studio", "nordic"],
  ["vintage paper zine", "vintage"],
  ["forest research lab", "forest"],
  ["bold sunset poster", "sunset"],
  ["minimal black & white editorial", "mono"],
];
for (const [prompt, want] of cases) {
  const got = resolveDormant(prompt).id;
  ok(got === want, `"${prompt}" → ${got} (expected ${want})`);
}

console.log("── Vibe Studio data verification ──");
console.log(`presets: ${v.presets.length} | keyword buckets: ${Object.keys(v.keywords).length} | routing cases: ${cases.length}`);
if (fails.length === 0) {
  console.log("\n✅ PASS — presets are valid hex, every preset is routable, dormant routing is sensible.");
} else {
  console.log(`\n❌ FAIL — ${fails.length} issue(s):`);
  for (const f of fails) console.log("  • " + f);
  process.exit(1);
}
