/*
 * agent.js — the ⌘K command palette.
 *
 * Two modes:
 *   • commands — jump to section, copy email, open links, download résumé,
 *     toggle reduced motion. These ALWAYS work (no backend).
 *   • ask — "Ask anything about Srujay". Streams from a Cloudflare Worker
 *     (config.WORKER_URL). If the Worker is unset / unreachable / rate-limited,
 *     ask-mode shows an honest "resting" state. No fake answers.
 *
 * Typing a leading "?" (or any free-text that isn't a command match) implies
 * ask-mode. The palette is keyboard-navigable with ARIA + a focus trap.
 */

import { content } from "./content.js";
import { config } from "./config.js";

let onEgg = () => {};

export function initAgent({ onPizza } = {}) {
  onEgg = onPizza || (() => {});
  const root = document.getElementById("palette");
  if (!root) return;

  const input = root.querySelector(".palette__input");
  const list = root.querySelector(".palette__list");
  const modeTag = root.querySelector(".palette__mode");
  const answerWrap = root.querySelector(".palette__answer");
  const suggestWrap = root.querySelector(".palette__suggestions");

  // résumé command only if a file is configured AND present
  let commands = content.commands.slice();
  let activeIndex = 0;
  let mode = "command"; // "command" | "ask"
  let lastFocus = null;
  let streamAbort = null;

  // Probe résumé existence so we don't show a dead download.
  filterResume();
  async function filterResume() {
    const cmd = commands.find((c) => c.id === "download-resume");
    if (!cmd) return;
    try {
      const res = await fetch(config.RESUME_PATH, { method: "HEAD" });
      if (!res.ok) commands = commands.filter((c) => c.id !== "download-resume");
    } catch {
      commands = commands.filter((c) => c.id !== "download-resume");
    }
  }

  // ── open / close ─────────────────────────────────────────────
  function open(prefill = "") {
    lastFocus = document.activeElement;
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add("is-open"));
    root.setAttribute("aria-hidden", "false");
    input.value = prefill;
    setMode(prefill.startsWith("?") ? "ask" : "command");
    render();
    input.focus();
    document.body.style.overflow = "hidden";
  }
  function close() {
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (streamAbort) streamAbort.abort();
    setTimeout(() => {
      root.hidden = true;
      answerWrap.hidden = true;
      answerWrap.innerHTML = "";
    }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function isOpen() {
    return root.classList.contains("is-open");
  }

  // ── mode ─────────────────────────────────────────────────────
  function setMode(m) {
    mode = m;
    modeTag.textContent = m === "ask" ? "ask" : "commands";
    input.setAttribute(
      "placeholder",
      m === "ask" ? "Ask anything about Srujay…" : "Type a command, or “?” to ask anything…"
    );
    suggestWrap.hidden = m !== "ask";
    list.hidden = m === "ask";
    if (m === "ask") {
      answerWrap.hidden = true;
      answerWrap.innerHTML = "";
    }
  }

  // ── filtered command list ────────────────────────────────────
  function filtered() {
    const q = input.value.replace(/^\?/, "").trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.hint && c.hint.toLowerCase().includes(q))
    );
  }

  function render() {
    if (mode === "ask") return;
    const items = filtered();
    activeIndex = Math.max(0, Math.min(activeIndex, items.length - 1));
    list.innerHTML = "";
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "palette__item";
      li.innerHTML = `<span class="icon">?</span><span class="label">No command — press Enter to ask the agent</span>`;
      list.appendChild(li);
      return;
    }
    items.forEach((c, i) => {
      const li = document.createElement("li");
      li.className = "palette__item" + (i === activeIndex ? " is-active" : "");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
      li.dataset.id = c.id;
      li.innerHTML = `<span class="icon">${c.icon || "›"}</span><span class="label">${c.label}</span><span class="hint">${c.hint || ""}</span>`;
      li.addEventListener("click", () => runCommand(c.id));
      li.addEventListener("mousemove", () => {
        activeIndex = i;
        highlight();
      });
      list.appendChild(li);
    });
  }
  function highlight() {
    [...list.children].forEach((el, i) => {
      const on = i === activeIndex;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  // ── command actions ──────────────────────────────────────────
  function jump(sel) {
    close();
    const t = document.querySelector(sel);
    if (!t) return;
    if (window.__lenis) window.__lenis.scrollTo(t, { offset: -20 });
    else t.scrollIntoView({ behavior: "smooth" });
  }
  function runCommand(id) {
    switch (id) {
      case "go-thesis": return jump("#thesis");
      case "go-now": return jump("#now");
      case "go-experience": return jump("#experience");
      case "go-work": return jump("#work");
      case "go-contact": return jump("#contact");
      case "copy-email":
        navigator.clipboard?.writeText(content.contact.email).catch(() => {});
        flashInput("Copied ✓ " + content.contact.email);
        return;
      case "open-github": window.open(content.contact.links.find(l=>l.label==="GitHub").href, "_blank"); return close();
      case "open-linkedin": window.open(content.contact.links.find(l=>l.label==="LinkedIn").href, "_blank"); return close();
      case "download-resume": window.open(config.RESUME_PATH, "_blank"); return close();
      case "toggle-motion":
        document.documentElement.classList.toggle("reduced-motion");
        flashInput(
          document.documentElement.classList.contains("reduced-motion")
            ? "Reduced motion: on"
            : "Reduced motion: off"
        );
        return;
      case "pizza":
        close();
        onEgg();
        return;
      default:
        return;
    }
  }
  function flashInput(msg) {
    const prev = input.value;
    input.value = msg;
    input.disabled = true;
    setTimeout(() => {
      input.disabled = false;
      input.value = "";
      input.focus();
      render();
    }, 900);
  }

  // ── ask mode (streaming Worker client) ───────────────────────
  async function ask(question) {
    const q = question.trim();
    if (!q) return;

    // Easter-egg personality hook even when the Worker is dormant/unreachable.
    const eggish = /\b(pizza|hungry|food|joey|eat|snack)\b/i.test(q);

    answerWrap.hidden = false;
    answerWrap.innerHTML = "";
    const stateEl = document.createElement("div");
    stateEl.className = "palette__state is-live";
    stateEl.innerHTML = `<span class="dot-rest"></span><span class="answer-text"></span><span class="palette__cursor"></span>`;
    answerWrap.appendChild(stateEl);
    const textEl = stateEl.querySelector(".answer-text");
    const cursor = stateEl.querySelector(".palette__cursor");

    // Dormant: no Worker configured.
    if (!config.WORKER_URL) {
      stateEl.classList.remove("is-live");
      cursor.remove();
      if (eggish) {
        textEl.textContent =
          "Joey doesn't share food. 🍕 (The live agent is resting — but I had to answer that one.) Try ⌘K → “pizza”.";
      } else {
        textEl.innerHTML =
          `The live AI agent is resting right now. Once Srujay points the site at his Cloudflare Worker it answers here in real time. In the meantime, use the commands above — or reach him at <a class="link-underline" href="mailto:${content.contact.email}">${content.contact.email}</a>.`;
      }
      return;
    }

    // Live: stream from the Worker (SSE).
    streamAbort = new AbortController();
    try {
      const res = await fetch(config.WORKER_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: streamAbort.signal,
      });

      if (res.status === 429) {
        stateEl.classList.remove("is-live");
        stateEl.classList.add("is-error");
        cursor.remove();
        textEl.textContent =
          "The agent is rate-limited at the moment (a daily cap keeps the bill safe). Try again shortly — the commands above still work.";
        return;
      }
      if (!res.ok || !res.body) throw new Error("worker " + res.status);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop();
        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            if (json.text) {
              acc += json.text;
              textEl.textContent = acc;
              answerWrap.scrollTop = answerWrap.scrollHeight;
            }
          } catch {
            // tolerate non-JSON keepalive lines
          }
        }
      }
      cursor.remove();
      if (!acc) textEl.textContent = "…(no response)";
    } catch (err) {
      if (streamAbort.signal.aborted) return;
      stateEl.classList.remove("is-live");
      stateEl.classList.add("is-error");
      cursor.remove();
      textEl.innerHTML =
        `Couldn't reach the agent just now. It may be offline or rate-limited — the commands above still work, or email <a class="link-underline" href="mailto:${content.contact.email}">${content.contact.email}</a>.`;
    }
  }

  // ── input + keyboard ─────────────────────────────────────────
  input.addEventListener("input", () => {
    if (input.disabled) return;
    if (input.value.startsWith("?") && mode !== "ask") setMode("ask");
    else if (!input.value.startsWith("?") && mode === "ask" && answerWrap.hidden) setMode("command");
    activeIndex = 0;
    render();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return close();
    if (mode === "command") {
      const items = filtered();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        highlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        highlight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items.length) runCommand(items[activeIndex].id);
        else { setMode("ask"); ask(input.value.replace(/^\?/, "")); }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      ask(input.value.replace(/^\?/, ""));
    }
  });

  // Focus trap: Tab must cycle within the modal, never escape to the page behind.
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const list = [...root.querySelectorAll('input, button, [href], [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // suggestions
  suggestWrap.innerHTML = content.askSuggestions
    .map((s) => `<button class="palette__suggestion" type="button">${s}</button>`)
    .join("");
  suggestWrap.querySelectorAll(".palette__suggestion").forEach((b) => {
    b.addEventListener("click", () => {
      input.value = b.textContent;
      ask(b.textContent);
    });
  });

  // backdrop click closes
  root.addEventListener("mousedown", (e) => {
    if (e.target === root) close();
  });

  // global hotkey
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      isOpen() ? close() : open();
    } else if (e.key === "/" && !isOpen() && !isTyping()) {
      e.preventDefault();
      open();
    }
  });

  // expose openers for the visible hint chips
  document.querySelectorAll("[data-open-palette]").forEach((el) => {
    el.addEventListener("click", () => open(el.dataset.openPalette === "ask" ? "?" : ""));
  });

  function isTyping() {
    const t = document.activeElement;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }
}
