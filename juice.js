/* Geo – Effekte, Sounds, XP und Erfolge. Gemeinsam für alle Kapitel. */
const Juice = (() => {
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- Erfolge ---------- */
  const ACH = {
    erste:    ["✅", "Erster Treffer", "Die erste Übungsaufgabe richtig gelöst"],
    streak5:  ["🔥", "Heiße Serie", "5 Aufgaben in Folge richtig"],
    streak10: ["🌋", "Vulkan", "10 Aufgaben in Folge richtig"],
    blitz10:  ["⚡", "Blitzmerker", "10 Punkte in einer Blitzrunde"],
    blitz20:  ["🌩️", "Gewitter im Kopf", "20 Punkte in einer Blitzrunde"],
    null:     ["0️⃣", "Hoch null", "Entdeckt: a⁰ ist immer 1"],
    negativ:  ["➖", "Unter null", "Einen negativen Exponenten ausprobiert"],
    punkte:   ["🟠", "Punktesammler", "Das Punktquadrat bis 10² = 100 gebaut"],
    mond:     ["🌙", "Zum Mond!", "Papier bis zum Mond gefaltet"],
    sonne:    ["☀️", "Sonnenstürmer", "Papier bis zur Sonne gefaltet"],
    glatt:    ["💎", "Glatte Wurzel", "Eine Quadratzahl im Quadrat gefunden"],
    wuerfel:  ["🧊", "Würfelprofi", "Eine Kubikzahl im Würfel gefunden"],
    spirale:  ["🐚", "Schneckenhaus", "Die Wurzelspirale komplett gebaut"],
    heron:    ["🏛️", "Wie die alten Griechen", "Mit Heron √A auf 4 Stellen genau bestimmt"],
    spiegel:  ["🪞", "Spiegelmeister", "Alle vier Graphen gespiegelt"],
    zehner:   ["🔭", "Vom Atom zum Tera", "10⁻¹⁰ und 10¹² besucht"],
    rechter:  ["📐", "Rechter Winkel", "Im Dreieck genau 90° eingestellt"],
    lektion_wurzel: ["🌻", "Beet geplant", "Lernpfad Quadratwurzel abgeschlossen"],
    level5:   ["🏆", "Level 5", "500 XP gesammelt"],
  };
  let prog = store.get("geo-progress", { xp: 0, ach: {}, best: 0 });
  const level = () => 1 + Math.floor(prog.xp / 100);

  /* ---------- Sound ---------- */
  let ctx = null, soundOn = store.get("geo-sound", true);
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  // Gesamtlautstärke: "leise" ist Standard (ca. 40 % der ursprünglichen Lautstärke)
  const VOL = { leiser: 0.18, leise: 0.4, normal: 1 };
  function tone(f, dur = 0.12, type = "sine", vol = 0.12, when = 0, f2) {
    if (!soundOn) return;
    const c = ac(); if (!c) return;
    vol *= VOL[store.get("geo-prefs", {}).vol || "leise"] || VOL.leise;
    const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    tick(p = 0.5) { tone(500 + p * 700, 0.04, "triangle", 0.035); },
    pop(p = 0.5) { tone(400 + p * 500, 0.09, "sine", 0.12, 0, 900 + p * 600); },
    good() { [523, 659, 784].forEach((f, i) => tone(f, 0.14, "triangle", 0.12, i * 0.07)); },
    bad() { tone(220, 0.25, "sawtooth", 0.06, 0, 110); },
    whoosh() { tone(250, 0.25, "sine", 0.08, 0, 1400); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.4 : 0.13, "square", 0.05, i * 0.09)); },
    levelup() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, "triangle", 0.12, i * 0.06)); },
  };
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

  /* ---------- Konfetti ---------- */
  let canvas, cctx, parts = [], running = false;
  const COLORS = ["#2f6fde", "#d9772b", "#2e8b57", "#e84393", "#f5c518", "#8e44ad"];
  function confetti(x, y, n = 80, spread = 1) {
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "confetti";
      document.body.appendChild(canvas);
      cctx = canvas.getContext("2d");
    }
    canvas.width = innerWidth; canvas.height = innerHeight;
    if (x === undefined) { x = innerWidth / 2; y = innerHeight / 3; }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (3 + Math.random() * 7) * spread;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5 * spread, r: 3 + Math.random() * 4,
        c: COLORS[i % COLORS.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 90 + Math.random() * 40 });
    }
    if (!running) { running = true; requestAnimationFrame(step); }
  }
  function step() {
    cctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter((p) => p.life-- > 0 && p.y < canvas.height + 20);
    for (const p of parts) {
      p.vy += 0.25; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot);
      cctx.globalAlpha = Math.min(1, p.life / 30);
      cctx.fillStyle = p.c; cctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      cctx.restore();
    }
    if (parts.length) requestAnimationFrame(step);
    else { running = false; cctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  function confettiAt(el, n = 50, spread = 0.8) {
    const r = el.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2, n, spread);
  }

  /* ---------- kleine Animationen ---------- */
  function anim(el, cls) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  }
  const bump = (el) => anim(el, "j-bump");
  const shake = (el) => anim(el, "j-shake");
  const glow = (el) => anim(el, "j-glow");
  function floatText(el, text, cls = "") {
    const r = el.getBoundingClientRect(), f = document.createElement("div");
    f.className = "j-float " + cls; f.textContent = text;
    f.style.left = r.left + r.width / 2 + "px"; f.style.top = r.top + "px";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }

  /* ---------- Pop-up ---------- */
  let toastBox;
  function toast(icon, title, text) {
    if (!toastBox) { toastBox = document.createElement("div"); toastBox.className = "j-toasts"; document.body.appendChild(toastBox); }
    const t = document.createElement("div");
    t.className = "j-toast";
    t.innerHTML = `<span class="j-ticon">${icon}</span><span><b>${title}</b><br><small>${text || ""}</small></span>`;
    toastBox.appendChild(t);
    setTimeout(() => t.classList.add("out"), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  /* ---------- XP-Leiste ---------- */
  let bar;
  function buildBar() {
    bar = document.createElement("div");
    bar.className = "j-bar";
    bar.innerHTML = `<span class="j-lvl" id="j-lvl"></span>
      <span class="j-xpwrap"><span class="j-xpfill" id="j-xpfill"></span><span class="j-xptext" id="j-xptext"></span></span>
      <button class="j-btn" id="j-trophy" aria-label="Erfolge">🏆 <span id="j-achn"></span></button>
      <button class="j-btn" id="j-sound" aria-label="Ton an/aus"></button>`;
    document.body.prepend(bar);
    document.getElementById("j-sound").onclick = () => {
      soundOn = !soundOn; store.set("geo-sound", soundOn); renderBar(); if (soundOn) sfx.pop();
    };
    document.getElementById("j-trophy").onclick = showAch;
    renderBar();
  }
  function renderBar() {
    if (!bar) return;
    document.getElementById("j-lvl").textContent = "Level " + level();
    document.getElementById("j-xpfill").style.width = (prog.xp % 100) + "%";
    document.getElementById("j-xptext").textContent = prog.xp + " XP";
    document.getElementById("j-achn").textContent = `${Object.keys(prog.ach).length}/${Object.keys(ACH).length}`;
    document.getElementById("j-sound").textContent = soundOn ? "🔊" : "🔇";
  }
  function addXP(n, el) {
    const before = level();
    prog.xp += n; store.set("geo-progress", prog);
    if (el) floatText(el, `+${n} XP`, "xp");
    renderBar(); bump(document.getElementById("j-lvl"));
    if (level() > before) {
      setTimeout(() => { sfx.levelup(); confetti(undefined, undefined, 140, 1.2); toast("⭐", `Level ${level()}!`, "Weiter so!"); }, 300);
      if (level() >= 5) achieve("level5");
    }
  }
  function achieve(id) {
    if (!ACH[id] || prog.ach[id]) return false;
    prog.ach[id] = Date.now(); store.set("geo-progress", prog);
    const [icon, title, text] = ACH[id];
    sfx.fanfare(); vibrate([30, 40, 30]);
    toast(icon, "Erfolg: " + title, text);
    confetti(undefined, undefined, 100, 1);
    addXP(25);
    return true;
  }
  function showAch() {
    const ov = document.createElement("div");
    ov.className = "j-overlay";
    const items = Object.entries(ACH).map(([id, [icon, title, text]]) =>
      `<div class="j-ach ${prog.ach[id] ? "got" : ""}"><span class="j-ticon">${prog.ach[id] ? icon : "🔒"}</span><span><b>${title}</b><br><small>${text}</small></span></div>`).join("");
    ov.innerHTML = `<div class="j-sheet"><h2>Erfolge ${Object.keys(prog.ach).length}/${Object.keys(ACH).length}</h2>
      <p class="muted">Level ${level()} · ${prog.xp} XP · Blitzrunden-Rekord: ${prog.best || 0}</p>${items}
      <button class="btn primary" style="margin-top:12px;width:100%">Schließen</button></div>`;
    ov.onclick = (e) => { if (e.target === ov || e.target.tagName === "BUTTON") ov.remove(); };
    document.body.appendChild(ov);
  }

  /* ---------- Automatik: Regler-Ticks, Ergebnisse hüpfen, Karten einblenden ---------- */
  function autoWire() {
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (t.type !== "range") return;
      const p = (t.value - t.min) / ((t.max - t.min) || 1);
      sfx.tick(p);
      const sec = t.closest("section");
      if (sec) bump(sec.querySelector(".big"));
    });
    document.addEventListener("click", (e) => {
      if (e.target.closest(".chips button")) sfx.pop(0.4);
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("j-in"); io.unobserve(en.target); }
      }), { threshold: 0.08 });
      document.querySelectorAll("section.card:not(.step), a.chapter").forEach((s) => {
        if (s.getBoundingClientRect().top < innerHeight) return; // schon sichtbar: nicht verstecken
        s.classList.add("j-hide"); io.observe(s);
      });
      // Sicherheitsnetz, falls der Browser nicht meldet
      addEventListener("scroll", function reveal() {
        document.querySelectorAll(".j-hide:not(.j-in)").forEach((s) => {
          if (s.getBoundingClientRect().top < innerHeight * 0.95) s.classList.add("j-in");
        });
      }, { passive: true });
      setTimeout(() => document.querySelectorAll(".j-hide").forEach((s) => s.classList.add("j-in")), 4000);
    }
  }

  document.addEventListener("DOMContentLoaded", () => { buildBar(); autoWire(); });

  return {
    sfx, confetti, confettiAt, bump, shake, glow, floatText, toast, addXP, achieve, vibrate,
    has: (id) => !!prog.ach[id],
    best: () => prog.best || 0,
    setBest: (v) => { prog.best = v; store.set("geo-progress", prog); renderBar(); },
    store,
  };
})();
