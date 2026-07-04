/*
 * content.js — single source of truth for the site.
 * All copy, metrics, links, and the thesis data-viz numbers live here.
 * Sections render from this object (see main.js). Update copy here, nowhere else.
 *
 * Facts sourced from Srujay's LinkedIn profile. Items marked `toConfirm: true`
 * are provisional and rendered with an "approx." affordance until signed off.
 */

export const content = {
  identity: {
    name: "Srujay Reddy Jakkidi",
    short: "Srujay",
    role: "Forward Deployed Engineer",
    company: "Strada",
    companyNote: "YC S23",
    secondaryRole: "Member of Technical Staff",
    location: "San Francisco Bay Area",
    education: "B.S. Honors, Computer Science & Data Science — UW–Madison",
    tagline:
      "I build high-impact AI systems that are both intelligent and measurably reliable.",
    heroLines: [
      "I design, build, and deploy",
      "LLM-powered AI agents —",
      "then measure them until they're fast.",
    ],
  },

  positioning: {
    // Split-text reveal. The emphasized words get the accent treatment.
    lead: "Intelligent systems are not enough.",
    statement:
      "I engineer AI agents designed to be observable, measurable, and resilient — because reliability is the only competitive advantage that compounds in production. My systems are built for unpredictable inputs, long-running workflows, and failure at scale, where success is measured by performance over millions of decisions.",
    emphasis: ["observable", "measurable", "resilient", "reliability"],
  },

  // ── Signature: the thesis, rendered as scroll-driven data-viz ───────────────
  thesis: {
    eyebrow: "Honors Thesis",
    title: "Where Does the Time Go?",
    subtitle:
      "Decomposing Kubernetes pod startup latency under bandwidth constraints.",
    // Plain-language context so the data-viz that follows isn't opaque.
    context:
      "When a cloud service scales up, every new container has to “cold-start” before it can serve traffic — and that wait costs real latency and money. I built a measurement system to find exactly where those seconds go.",
    advisor: {
      name: "Prof. Remzi Arpaci-Dusseau",
      note: "author of Operating Systems: Three Easy Pieces (OSTEP)",
    },
    // The dominant finding — LOCKED.
    headline: { value: 93, valueHigh: 99, unit: "%", toConfirm: false },
    headlineLabel:
      "of cold-start latency is container image pull, under bandwidth constraints.",

    // Cold-start breakdown used to assemble + size the particle bars.
    // `share` values are illustrative proportions of the timeline; the image-pull
    // segment is the locked finding. Non–image-pull splits are approximate.
    breakdown: [
      { key: "schedule", label: "Schedule", share: 0.02 },
      { key: "init", label: "Sandbox / init", share: 0.03 },
      { key: "pull", label: "Image pull", share: 0.93, dominant: true },
      { key: "start", label: "Container start", share: 0.02 },
    ],

    // The fix beat: pre-pulling collapses cold start.
    fix: {
      label: "Pre-pull the image",
      before: { value: 75, unit: "s" },
      after: { value: 2, unit: "s" },
      note: "≈ 97% faster cold start",
    },

    punchline: "Measure first. Then make it fast.",
    links: [
      { label: "Read the paper (MINDS@UW)", href: "https://minds.wisc.edu/items/934ca4c7-7f14-4347-847a-a328e0edb0a0" },
      { label: "Advisor — Remzi Arpaci-Dusseau", href: "https://pages.cs.wisc.edu/~remzi/" },
      { label: "2026 Senior Honors Thesis Symposium", href: "https://honors.ls.wisc.edu/wp-content/uploads/sites/1038/2026/04/2026-Symposium-Program.pdf" },
    ],
  },

  // ── Now: the current role, featured ─────────────────────────────────────────
  now: {
    eyebrow: "Now",
    company: "Strada",
    companyNote: "YC S23",
    title: "Forward Deployed Engineer",
    period: "May 2026 — Present · San Francisco",
    body:
      "Building and deploying LLM-powered AI agents for insurance operations in TypeScript and Node.js. I work hands-on with enterprise customers — turning ambiguous domain needs into production software that runs in live operations.",
    pillars: [
      { k: "Agent orchestration", v: "Tool-calling, multi-step workflows, Temporal." },
      { k: "Forward-deployed", v: "Embedded with customers, from need to shipped." },
      { k: "Real-world performance", v: "Latency, reliability, and cost in production." },
    ],
    stack: ["TypeScript", "Node.js", "React", "Temporal", "AI Agents"],
  },

  // ── Vibe Studio: 2nd AI feature — type a vibe, the WHOLE page redesigns live ──
  // The "AI redesigns a website, live" demo. Ships with full-theme presets (zero
  // backend); a Worker {mode:"vibe"} branch turns any free text into a generated
  // theme, contrast-validated client-side. Each vibe swaps the background, ink,
  // surfaces, borders, FONT, corner RADIUS, the whole accent/plasma palette, and the
  // WebGL particle field — a real redesign, not a recolor. `dark:true` flips the
  // field to its glow mode so it reads on a dark canvas.
  vibes: {
    eyebrow: "Adaptive by design",
    title: "This page adapts",
    blurb:
      "Good software adapts to its users. Pick a look — or describe one — and this whole page redesigns itself in place.",
    label: "Good software adapts to its users. This page does that literally:",
    placeholder: "or describe your own…",
    presets: [
      { id: "nordic", label: "Calm Nordic", mood: "calm · slate-blue · airy", dark: false,
        accent: "#2f6f9f", accent2: "#2a8c82", plasma: ["#2f6f9f", "#4a93a8", "#2a8c82"], particle: "#3b6ea5",
        bg: "#eef3f8", bgTint: "#e3eaf2", surface: "#ffffff", surface2: "#f3f7fb",
        ink: "#1a2230", inkDim: "#46566b", inkMute: "#7d8ba0",
        line: "rgba(20,30,50,.10)", lineStrong: "rgba(20,30,50,.18)",
        font: '"Geist", ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", sans-serif', radius: "16px" },
      { id: "sunset", label: "Sunset Brutalist", mood: "warm · bold · brutalist", dark: false,
        accent: "#cf4636", accent2: "#d97a23", plasma: ["#cf4636", "#dd6a2a", "#d9a521"], particle: "#cf4636",
        bg: "#fbf2e8", bgTint: "#f4e6d4", surface: "#fffaf3", surface2: "#f7ecdc",
        ink: "#2a1c14", inkDim: "#5e4636", inkMute: "#93755f",
        line: "rgba(60,40,20,.12)", lineStrong: "rgba(60,40,20,.20)",
        font: '"Arial Black", "Helvetica Neue", Impact, system-ui, sans-serif', radius: "2px" },
      { id: "neon", label: "Cyberpunk Neon", mood: "electric · neon · night-city", dark: true,
        accent: "#ff3df0", accent2: "#21d4fd", plasma: ["#ff3df0", "#9b5cff", "#21d4fd"], particle: "#ff3df0",
        bg: "#0a0a14", bgTint: "#11121f", surface: "#15172a", surface2: "#1b1d33",
        ink: "#e9e7fb", inkDim: "#a6a3d6", inkMute: "#6f6ca0",
        line: "rgba(160,150,255,.16)", lineStrong: "rgba(160,150,255,.28)",
        font: 'ui-monospace, "Geist Mono", "SFMono-Regular", Menlo, Consolas, monospace', radius: "3px" },
      { id: "forest", label: "Forest Lab", mood: "earthy · green · serif", dark: false,
        accent: "#2f7d52", accent2: "#6f8c2a", plasma: ["#2f7d52", "#4e8c3a", "#7a9a2e"], particle: "#2f7d52",
        bg: "#eef3ec", bgTint: "#e2ebde", surface: "#fbfdfa", surface2: "#eef3ea",
        ink: "#18241a", inkDim: "#44563f", inkMute: "#75876c",
        line: "rgba(20,40,20,.11)", lineStrong: "rgba(20,40,20,.20)",
        font: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif', radius: "20px" },
      { id: "mono", label: "Mono Editorial", mood: "editorial · monochrome · mono", dark: false,
        accent: "#1a1a1a", accent2: "#6a6a6a", plasma: ["#222222", "#555555", "#888888"], particle: "#555555",
        bg: "#f4f4f3", bgTint: "#e9e9e7", surface: "#ffffff", surface2: "#f0f0ee",
        ink: "#161616", inkDim: "#4a4a4a", inkMute: "#808080",
        line: "rgba(0,0,0,.12)", lineStrong: "rgba(0,0,0,.22)",
        font: 'ui-monospace, "Geist Mono", "SFMono-Regular", Menlo, Consolas, monospace', radius: "2px" },
      { id: "vintage", label: "Vintage Paper", mood: "vintage · sepia · serif", dark: false,
        accent: "#9a5a2c", accent2: "#7a8c4a", plasma: ["#9a5a2c", "#b08a4a", "#7a8c4a"], particle: "#9a6a3c",
        bg: "#f3e9d6", bgTint: "#ece0c8", surface: "#faf3e3", surface2: "#efe4ce",
        ink: "#2a2014", inkDim: "#5a4a32", inkMute: "#8a785a",
        line: "rgba(80,60,30,.14)", lineStrong: "rgba(80,60,30,.24)",
        font: 'Georgia, "Times New Roman", "Iowan Old Style", serif', radius: "8px" },
    ],
    // dormant free-text → nearest preset (keyword scoring; a live Worker upgrades this)
    keywords: {
      nordic:  ["nordic", "calm", "minimal", "scandi", "clean", "airy", "blue", "slate", "ocean", "ice", "winter", "cool"],
      sunset:  ["sunset", "warm", "bold", "brutal", "orange", "fire", "desert", "miami", "peach", "sun", "bakery"],
      neon:    ["cyber", "neon", "punk", "vapor", "future", "techno", "electric", "night", "arcade", "glow", "magenta", "synth"],
      forest:  ["forest", "nature", "green", "earth", "organic", "moss", "plant", "jungle", "sage", "eco", "lab", "leaf"],
      mono:    ["mono", "editorial", "minimal", "black", "white", "classic", "newspaper", "swiss", "grayscale", "print", "type"],
      vintage: ["vintage", "paper", "old", "sepia", "craft", "kraft", "retro", "antique", "book", "cream", "film"],
    },
  },

  // ── Experience timeline (newest → oldest) ───────────────────────────────────
  experience: [
    {
      org: "GE HealthCare",
      role: "Software Engineer (Capstone)",
      period: "Sep — Dec 2025",
      place: "Waukesha, WI · Hybrid",
      body:
        "QR-based, headless device provisioning on Android (Kotlin) and iOS (Swift) with offline-first cache, plus a containerized Kubernetes provisioning service with an idempotent, retryable state machine, BLE write-back, and OpenAPI contracts.",
      metrics: [
        { v: "≤ 15 min", k: "on-site setup" },
        { v: "Offline-first", k: "low-signal field installs" },
      ],
      stack: ["Kotlin", "Swift", "Kubernetes", "BLE", "OpenAPI"],
    },
    {
      org: "OpenAI",
      role: "Software Engineer Intern",
      period: "Jun — Aug 2025",
      place: "Madison, WI · Hybrid",
      body:
        "Owned the real-time match engine for a live QuizBowl platform through a selective UW–Madison partnership — WebSocket architecture, REST APIs in Node/Express, PostgreSQL schema design, JWT auth, and OpenAI API integration. Cut p95 latency 55% with streaming, prompt batching, and Redis caching (68% hit rate); dropped DB p95 62% with indexing and pooling; Dockerized the services and set up CI/CD for daily deploys. Built a 500-item eval set with moderation checks, lifting answer accuracy from 70% to 82%.",
      metrics: [
        { v: "−55%", k: "p95 latency (2000→900ms)" },
        { v: "−62%", k: "DB p95 (120→45ms)" },
        { v: "+12 pts", k: "answer accuracy (70→82%)" },
      ],
      stack: ["Node.js", "Express", "PostgreSQL", "WebSockets", "Redis", "Docker", "OpenAI API"],
    },
    {
      org: "UW–Madison CDIS",
      role: "Computer Science Researcher",
      period: "Dec 2024 — May 2025",
      place: "Madison, WI · On-site",
      body:
        "A meta-analysis of cloud-storage systems in collaboration with other Big Ten schools. Built Python/Pandas pipelines to clean, merge, and analyze findings from 500+ research studies into practical optimization guidance.",
      metrics: [
        { v: "500+", k: "studies analyzed" },
        { v: "Python · Pandas", k: "data pipelines" },
      ],
      stack: ["Python", "Pandas", "Statistics"],
    },
    {
      org: "MOURI Tech",
      role: "AI/ML Intern",
      period: "May — Jul 2024",
      place: "Irving, TX · On-site",
      body:
        "Built a production-ready stock-prediction model in TensorFlow on AWS — data pre-processing, neural-network experimentation, and ONNX optimization with distributed training on EC2.",
      metrics: [
        { v: "+15%", k: "forecast accuracy" },
        { v: "ONNX · EC2", k: "faster inference & training" },
      ],
      stack: ["TensorFlow", "ONNX", "AWS EC2"],
    },
  ],

  // ── Selected work ───────────────────────────────────────────────────────────
  projects: [
    {
      name: "Gym Tracking App",
      blurb:
        "Full-stack workout logging with real-time analytics. JWT auth and role-based access securing 10+ endpoints at 99.9% success; SQL tuned to <200ms responses.",
      stack: ["React", "Java", "Spring Boot", "MySQL"],
      image: "assets/images/Gym-Tracking-App.jpg",
      href: "https://github.com/SrujayReddy/Gym-Tracking-Platform",
    },
    {
      name: "Path Finder",
      blurb:
        "Shortest walking paths across the UW–Madison campus via Dijkstra's algorithm, on a graph backed by a custom hashtable for fast map storage and retrieval.",
      stack: ["Java", "Graphs", "Dijkstra"],
      image: "assets/images/path-finder.svg",
      href: "https://github.com/SrujayReddy/Path-Finder",
    },
    {
      name: "Custom Unix Shell (wsh)",
      blurb:
        "A Unix shell in C with piping, redirection, and basic job control for managing background processes — a study in processes, file descriptors, and syscalls.",
      stack: ["C", "POSIX", "Systems"],
      image: "assets/images/wsh.jpg",
      href: "https://github.com/SrujayReddy/Custom-Unix-Shell",
    },
    {
      name: "Data Visualization Portal",
      blurb:
        "A portal that lets researchers spin up dashboards quickly — Python/Flask with AWS S3 + Lambda for secure storage and fast loads.",
      stack: ["Python", "Flask", "AWS S3", "Lambda"],
      image: "assets/images/Data-Website.jpg",
      href: "https://github.com/SrujayReddy/Data-Website-Project",
    },
  ],

  // ── Education: "The Turning of the Tassel" (flagship) ────────────────────────
  education: {
    eyebrow: "Education",
    school: "University of Wisconsin–Madison",
    degree: "B.S. Honors — Computer Science & Data Science",
    period: "May 2026",
    // Each fact "rings" as the tassel swings past it (right → left).
    facts: [
      { k: "Degree", v: "B.S. Honors, Computer Science & Data Science" },
      { k: "University", v: "University of Wisconsin–Madison" },
      { k: "GPA", v: "3.9 / 4.0" },
      { k: "Thesis", v: "Honors thesis on Kubernetes cold-start latency — published in MINDS@UW" },
      { k: "Conferred", v: "May 2026" },
    ],
  },

  // ── Beyond the code ─────────────────────────────────────────────────────────
  beyond: {
    items: [
      { k: "Tutoring", v: "Free Math & CS through GUTS (Greater University Tutoring Service)." },
      { k: "Volunteering", v: "Badger Volunteers — weekly public-health & sustainability work." },
      { k: "Community", v: "Cybersecurity UW, since 2022." },
      { k: "Honors", v: "Dean's Honor List — 7 of 8 semesters." },
      { k: "Languages", v: "English & Telugu." },
    ],
  },

  contact: {
    blurb:
      "Building AI systems that have to hold up in production? Let's talk.",
    email: "srujayreddy15@gmail.com",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/srujay-jakkidi" },
      { label: "GitHub", href: "https://github.com/SrujayReddy" },
    ],
  },

  // ── Command palette: non-AI command actions (always work) ────────────────────
  // Action ids are wired in agent.js.
  commands: [
    { id: "go-thesis", label: "Jump to the thesis", hint: "Section", icon: "→" },
    { id: "go-now", label: "Jump to Strada (now)", hint: "Section", icon: "→" },
    { id: "go-experience", label: "Jump to experience", hint: "Section", icon: "→" },
    { id: "go-work", label: "Jump to projects", hint: "Section", icon: "→" },
    { id: "go-contact", label: "Jump to contact", hint: "Section", icon: "→" },
    { id: "copy-email", label: "Copy email address", hint: "srujayreddy15@gmail.com", icon: "⧉" },
    { id: "open-github", label: "Open GitHub", hint: "github.com/SrujayReddy", icon: "↗" },
    { id: "open-linkedin", label: "Open LinkedIn", hint: "in/srujay-jakkidi", icon: "↗" },
    { id: "toggle-motion", label: "Toggle reduced motion", hint: "Calmer experience", icon: "◐" },
    { id: "pizza", label: "Order a pizza", hint: "Joey doesn't share food", icon: "🍕", egg: true },
  ],

  // Suggested prompts for the AI "ask" mode.
  askSuggestions: [
    "What does Srujay do at Strada?",
    "Explain the thesis finding in one line.",
    "What's his most impressive metric?",
    "Is he open to new roles?",
  ],
};

// Knowledge base string fed to the Worker's system prompt (kept in sync with the above).
export const knowledgeBase = `
Srujay Reddy Jakkidi — Forward Deployed Engineer at Strada (YC S23), San Francisco Bay Area.
Recent UW–Madison graduate: B.S. Honors in Computer Science and Data Science (GPA 3.9, May 2026).

NOW — Strada (May 2026–present): designs, builds, and deploys LLM-powered AI agents for insurance
operations in TypeScript/Node.js. Works hands-on with enterprise customers. Focus: agent
orchestration, tool-calling, Temporal, real-world performance. Stack: TypeScript, Node, React, Temporal.

SIGNATURE — Honors Thesis "Where Does the Time Go? Decomposing Kubernetes Pod Startup Latency Under
Bandwidth Constraints" (published in MINDS@UW, Jun 2026), advised by Prof. Remzi Arpaci-Dusseau
(author of OSTEP). Built a high-precision measurement system showing container image pull accounts
for 93–99% of Kubernetes cold-start latency under bandwidth constraints. Presented at the 2026 L&S
Senior Honors Thesis Symposium. He also authored and presented (onstage) the 2026 L&S Excellence in
Honors Thesis Advising Award for his advisor — one of five recipients college-wide.

EXPERIENCE:
- GE HealthCare, Software Engineer Capstone (Sep–Dec 2025): QR-based headless device provisioning,
  Android (Kotlin)/iOS (Swift), offline-first; containerized Kubernetes provisioning service with an
  idempotent retryable state machine, BLE write-back, OpenAPI. Cut on-site setup to ≤15 minutes.
- OpenAI, SWE Intern (Jun–Aug 2025): owned the real-time match engine for a live QuizBowl platform
  (WebSocket architecture, Node/Express REST APIs, PostgreSQL schema design, JWT auth, OpenAI API).
  p95 latency −55% (2000→900ms) via streaming, prompt batching, and Redis caching (68% hit rate);
  DB p95 −62% (120→45ms) via indexing and pooling; Dockerized services + CI/CD (build/test −60%,
  daily deploys); 500-item eval set with moderation checks → answer accuracy 70→82%. ~150 concurrent players.
- UW–Madison CDIS, CS Researcher (Dec 2024–May 2025): meta-analysis of 500+ cloud-storage studies in
  collaboration with other Big Ten schools; Python/Pandas pipelines.
- MOURI Tech, AI/ML Intern (May–Jul 2024): TensorFlow stock-prediction on AWS, ONNX + distributed
  EC2 training, +15% accuracy.

PROJECTS: Gym Tracking App (React/Java/MySQL, JWT, <200ms), Path Finder (Java, Dijkstra),
Custom Unix Shell wsh (C), Data Visualization Portal (Flask/AWS).

BEYOND THE CODE: GUTS tutoring (Math & CS), Badger Volunteers (health/sustainability), Cybersecurity
UW, Dean's Honor List 7 of 8 semesters. Languages: English, Telugu.

CONTACT: srujayreddy15@gmail.com, linkedin.com/in/srujay-jakkidi, github.com/SrujayReddy.

PERSONALITY: ambitious, combines systems thinking with rigorous measurement. There is a running
"Joey doesn't share food" / pizza in-joke (from Friends) — if asked about pizza, food, being hungry,
or "Joey", play along briefly and in good humor, then steer back to Srujay.
`.trim();
