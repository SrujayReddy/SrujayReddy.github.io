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
      "I ship AI agents that hold up in live operations — and I instrument them until reliability is a number, not a hope.",
    emphasis: ["intelligent", "measurably reliable"],
  },

  // ── Signature: the thesis, rendered as scroll-driven data-viz ───────────────
  thesis: {
    eyebrow: "Honors Thesis · MINDS@UW",
    title: "Where Does the Time Go?",
    subtitle:
      "Decomposing Kubernetes pod startup latency under bandwidth constraints.",
    advisor: {
      name: "Prof. Remzi Arpaci-Dusseau",
      note: "co-author of Operating Systems: Three Easy Pieces (OSTEP)",
    },
    // The dominant finding — LOCKED.
    headline: { value: 93, valueHigh: 99, unit: "%", toConfirm: false },
    headlineLabel:
      "of cold-start latency is container image pull, under bandwidth constraints.",

    // Cold-start breakdown used to assemble + size the particle bars.
    // `share` values are illustrative proportions of the timeline; the image-pull
    // segment is the locked finding. Non–image-pull splits are approximate.
    breakdown: [
      { key: "schedule", label: "Schedule", share: 0.02, toConfirm: true },
      { key: "init", label: "Sandbox / init", share: 0.03, toConfirm: true },
      { key: "pull", label: "Image pull", share: 0.93, dominant: true, toConfirm: false },
      { key: "start", label: "Container start", share: 0.02, toConfirm: true },
    ],

    // The fix beat: pre-pulling collapses cold start. Provisional figures.
    fix: {
      label: "Pre-pull the image",
      before: { value: 75, unit: "s", toConfirm: true },
      after: { value: 2, unit: "s", toConfirm: true },
      note: "≈ 97% faster cold start",
    },

    punchline: "Measure first. Then make it fast.",
    links: [
      // Permalink to confirm — placeholder points at the repository search.
      { label: "Read the paper (MINDS@UW)", href: "https://minds.wisconsin.edu/", toConfirm: true },
      { label: "Advisor — Remzi Arpaci-Dusseau", href: "https://pages.cs.wisc.edu/~remzi/" },
      { label: "2026 Senior Honors Thesis Symposium", href: "#" , toConfirm: true},
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
        "Built a real-time AI QuizBowl platform end-to-end (React/TS, Node/Express, Postgres, WebSockets, OpenAI API) through a selective UW–Madison partnership. Shipped an MVP in 8 weeks with daily deploys.",
      metrics: [
        { v: "−55%", k: "p95 latency (2000→900ms)" },
        { v: "−60%", k: "build/test time (CI/CD)" },
        { v: "+12 pts", k: "answer accuracy (70→82%)" },
      ],
      stack: ["React", "TypeScript", "Node", "PostgreSQL", "WebSockets", "AWS ECS"],
    },
    {
      org: "UW–Madison CDIS",
      role: "Computer Science Researcher",
      period: "Dec 2024 — May 2025",
      place: "Madison, WI · On-site",
      body:
        "On Prof. Arpaci-Dusseau's team: a meta-analysis of cloud-storage systems across Big Ten schools. Built Python/Pandas pipelines to clean, merge, and analyze findings from 500+ research studies into practical optimization guidance.",
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
      image: null, // styled card, no photo
      href: "https://github.com/SrujayReddy",
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

  // ── Beyond the code ─────────────────────────────────────────────────────────
  beyond: {
    feature: {
      title: "Onstage for an advisor",
      body:
        "I authored the nomination and presented the 2026 L&S Excellence in Honors Thesis Advising Award to Prof. Arpaci-Dusseau onstage — one of five recipients college-wide.",
    },
    items: [
      { k: "Tutoring", v: "Free Math & CS through GUTS (Greater University Tutoring Service)." },
      { k: "Volunteering", v: "Badger Volunteers — weekly public-health & sustainability work." },
      { k: "Community", v: "Cybersecurity UW, since 2022." },
      { k: "Honors", v: "Dean's Honor List, Fall 2024 & Spring 2025." },
      { k: "Languages", v: "English & Hindi (full professional proficiency)." },
    ],
  },

  contact: {
    blurb:
      "Building something at the intersection of AI, systems, and real-world impact? Let's talk.",
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
    { id: "go-work", label: "Jump to selected work", hint: "Section", icon: "→" },
    { id: "go-contact", label: "Jump to contact", hint: "Section", icon: "→" },
    { id: "copy-email", label: "Copy email address", hint: "srujayreddy15@gmail.com", icon: "⧉" },
    { id: "open-github", label: "Open GitHub", hint: "github.com/SrujayReddy", icon: "↗" },
    { id: "open-linkedin", label: "Open LinkedIn", hint: "in/srujay-jakkidi", icon: "↗" },
    { id: "download-resume", label: "Download résumé", hint: "PDF", icon: "▼", requiresResume: true },
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
(co-author of OSTEP). Built a high-precision measurement system showing container image pull accounts
for 93–99% of Kubernetes cold-start latency under bandwidth constraints. Presented at the 2026 L&S
Senior Honors Thesis Symposium. He also authored and presented (onstage) the 2026 L&S Excellence in
Honors Thesis Advising Award for his advisor — one of five recipients college-wide.

EXPERIENCE:
- GE HealthCare, Software Engineer Capstone (Sep–Dec 2025): QR-based headless device provisioning,
  Android (Kotlin)/iOS (Swift), offline-first; containerized Kubernetes provisioning service with an
  idempotent retryable state machine, BLE write-back, OpenAPI. Cut on-site setup to ≤15 minutes.
- OpenAI, SWE Intern (Jun–Aug 2025): real-time AI QuizBowl (React/TS, Node/Express, Postgres,
  WebSockets, OpenAI API). p95 latency −55% (2000→900ms), CI/CD build/test −60%, answer accuracy
  +12 points (70→82%) on a 500-item eval set. ~150 concurrent players.
- UW–Madison CDIS, CS Researcher (Dec 2024–May 2025): meta-analysis of 500+ cloud-storage studies,
  Python/Pandas pipelines, on Arpaci-Dusseau's team.
- MOURI Tech, AI/ML Intern (May–Jul 2024): TensorFlow stock-prediction on AWS, ONNX + distributed
  EC2 training, +15% accuracy.

SELECTED WORK: Gym Tracking App (React/Java/MySQL, JWT, <200ms), Path Finder (Java, Dijkstra),
Custom Unix Shell wsh (C), Data Visualization Portal (Flask/AWS).

BEYOND THE CODE: GUTS tutoring (Math & CS), Badger Volunteers (health/sustainability), Cybersecurity
UW, Dean's List x2. Languages: English, Hindi.

CONTACT: srujayreddy15@gmail.com, linkedin.com/in/srujay-jakkidi, github.com/SrujayReddy.

PERSONALITY: ambitious, combines systems thinking with rigorous measurement. There is a running
"Joey doesn't share food" / pizza in-joke (from Friends) — if asked about pizza, food, being hungry,
or "Joey", play along briefly and in good humor, then steer back to Srujay.
`.trim();
