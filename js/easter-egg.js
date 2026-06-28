/*
 * easter-egg.js — the hidden "Joey doesn't share food" moment.
 *
 * Reworked from the original script.js spawnFoodIcons/audio helpers into a
 * physics-y burst. Fires ONLY on explicit interaction (the ⌘K `pizza` command
 * or the Konami code) — never on the hero, never on load — so autoplay rules
 * are respected (audio plays inside a user gesture). Reduced-motion shows the
 * toast without the burst.
 */

const FOODS = ["🍕", "🌭", "🍔", "🍩", "🍟", "🥨", "🧀"];

function play(src, vol) {
  try {
    const a = new Audio(src);
    a.volume = vol;
    a.play().catch(() => {});
  } catch {}
}

export function initEasterEgg() {
  const layer = document.getElementById("egg-layer");
  let running = false;

  function fire() {
    if (running) return;
    running = true;
    const reduced =
      document.documentElement.classList.contains("reduced-motion") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduced && layer) {
      play("assets/audio/oven-ding.mp3", 0.2);
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight * 0.62;
      const n = 14;
      for (let i = 0; i < n; i++) {
        const el = document.createElement("div");
        el.className = "egg-food";
        el.textContent = FOODS[i % FOODS.length];
        el.style.left = cx + "px";
        el.style.top = cy + "px";
        layer.appendChild(el);

        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
        const speed = 9 + Math.random() * 8;
        const vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed - 6;
        let x = 0,
          y = 0,
          rot = 0;
        const spin = (Math.random() - 0.5) * 20;
        const t0 = performance.now();

        if (i < 5) setTimeout(() => play("assets/audio/pop.mp3", 0.25), i * 60);

        function step(now) {
          const life = (now - t0) / 1000;
          vy += 0.6; // gravity
          x += vx;
          y += vy;
          rot += spin;
          el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
          el.style.opacity = String(Math.max(0, 1 - life / 2.2));
          if (life < 2.2 && y < window.innerHeight) requestAnimationFrame(step);
          else el.remove();
        }
        requestAnimationFrame(step);
      }
      setTimeout(() => play("assets/audio/joey.mp3", 0.3), 650);
    }

    // toast (always — the line is the payoff)
    const toast = document.createElement("div");
    toast.className = "egg-toast";
    toast.innerHTML = `<span class="em">Joey</span> doesn't share food.`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-shown"));
    setTimeout(() => {
      toast.classList.remove("is-shown");
      setTimeout(() => toast.remove(), 600);
    }, 2600);

    setTimeout(() => (running = false), 1200);
  }

  // Konami code
  const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let pos = 0;
  window.addEventListener("keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === seq[pos] ? pos + 1 : k === seq[0] ? 1 : 0;
    if (pos === seq.length) {
      pos = 0;
      fire();
    }
  });

  return fire;
}
