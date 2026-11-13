/* Geo – App-Rahmen: Kapitelmenü, Fortschritt, Weitermachen, Darstellung, Beamer-Modus, Vorlesen. */
const App = (() => {
  const S = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const CHAPTERS = [
    { file: "wurzel.html", icon: "🌻", title: "Lernpfad: Die Quadratwurzel", lesson: "wurzel" },
    { file: "potenzen.html", icon: "🧮", title: "Potenzen und Wurzeln" },
    { file: "dreieck.html", icon: "📐", title: "Dreieck" },
  ];
  const page = location.pathname.split("/").pop() || "index.html";
  const isIndex = page === "index.html" || page === "";

  /* ---------- Einstellungen (vor dem Rendern anwenden, damit nichts flackert) ---------- */
  const prefs = Object.assign({ theme: "auto", text: "normal", beamer: false, hideQ: false, vol: "leise" }, S.get("geo-prefs", {}));
  const root = document.documentElement;
  function applyPrefs() {
    if (prefs.theme === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", prefs.theme);
    root.classList.toggle("bigtext", prefs.text === "big");
    root.classList.toggle("beamer", !!prefs.beamer);
    root.classList.toggle("hide-q", !!(prefs.beamer && prefs.hideQ));
    document.dispatchEvent(new CustomEvent("geo-prefs", { detail: prefs }));
  }
  function setPref(k, v) { prefs[k] = v; S.set("geo-prefs", prefs); applyPrefs(); renderMenu(); }
  applyPrefs();

  /* ---------- Fortschritt ---------- */
  const visits = S.get("geo-visits", {});
  function lessonState(id) { return S.get("geo-lesson-" + id, { step: 0, max: 0, total: 0, done: false }); }
  function saveLesson(id, st) {
    S.set("geo-lesson-" + id, st);
    S.set("geo-last", { file: id + ".html", step: st.step, t: Date.now() });
  }
  function progressOf(ch) {
    if (ch.lesson) {
      const st = lessonState(ch.lesson);
      if (st.done) return { pct: 100, text: "Abgeschlossen ✓" };
      if (!st.total) return { pct: 0, text: "Noch nicht begonnen" };
      return { pct: Math.round(100 * (st.max + 1) / st.total), text: `Schritt ${st.max + 1} von ${st.total}` };
    }
    return visits[ch.file] ? { pct: 100, text: "Schon besucht ✓" } : { pct: 0, text: "Noch nicht besucht" };
  }
  if (!isIndex) {
    visits[page] = Date.now(); S.set("geo-visits", visits);
    if (!CHAPTERS.find((c) => c.file === page)?.lesson) S.set("geo-last", { file: page, t: Date.now() });
  }
  function resumeInfo() {
    const last = S.get("geo-last", null);
    if (!last) return null;
    const ch = CHAPTERS.find((c) => c.file === last.file);
    if (!ch) return null;
    if (ch.lesson && lessonState(ch.lesson).done) return null;
    return { ch, text: ch.lesson ? `${ch.title}, Schritt ${(last.step || 0) + 1}` : ch.title };
  }

  /* ---------- Vorlesen ---------- */
  const canSpeak = "speechSynthesis" in window;
  function speakable(text) {
    return text
      .replace(/√\s*\(/g, " Wurzel aus ( ").replace(/√/g, " Wurzel aus ")
      .replace(/·/g, " mal ").replace(/≈/g, " ungefähr ").replace(/≠/g, " ungleich ")
      .replace(/²/g, " hoch 2 ").replace(/³/g, " hoch 3 ").replace(/m2\b/g, "Quadratmeter")
      .replace(/−/g, " minus ").replace(/</g, " kleiner als ").replace(/>/g, " größer als ")
      .replace(/→|←/g, " ").replace(/[📌✓✔🌱🌻🎯]/gu, " ");
  }
  function speak(text, btn) {
    if (!canSpeak) return;
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); if (btn) btn.classList.remove("on"); return; }
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.lang = "de-DE"; u.rate = 0.95;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith("de"));
    if (v) u.voice = v;
    if (btn) { btn.classList.add("on"); u.onend = u.onerror = () => btn.classList.remove("on"); }
    speechSynthesis.speak(u);
  }
  function readVisible(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll(".hidden, [hidden], svg, button, input, script, style").forEach((n) => n.remove());
    return clone.innerText || clone.textContent;
  }
  function addReadButtons() {
    if (!canSpeak) return;
    document.querySelectorAll("section.card:not(.step) > h2").forEach((h) => {
      const b = document.createElement("button");
      b.className = "readbtn"; b.type = "button"; b.textContent = "🔈"; b.setAttribute("aria-label", "Abschnitt vorlesen");
      b.onclick = (e) => { e.stopPropagation(); speak(readVisible(h.closest("section")), b); };
      h.appendChild(b);
    });
  }

  /* ---------- Menü ---------- */
  let sheet;
  function seg(key, opts) {
    return `<div class="seg" role="group">${opts.map(([v, l]) =>
      `<button type="button" data-k="${key}" data-v="${v}" class="${String(prefs[key]) === String(v) ? "on" : ""}" aria-pressed="${String(prefs[key]) === String(v)}">${l}</button>`).join("")}</div>`;
  }
  function renderMenu() {
    if (!sheet) return;
    const r = resumeInfo();
    sheet.querySelector(".m-body").innerHTML = `
      ${r ? `<a class="m-resume" href="${r.ch.file}">▶ Weitermachen<small>${r.text}</small></a>` : ""}
      <h3>Kapitel</h3>
      <a class="m-ch ${isIndex ? "cur" : ""}" href="./"><span>🏠</span><b>Übersicht</b></a>
      ${CHAPTERS.map((c) => { const p = progressOf(c); return `<a class="m-ch ${c.file === page ? "cur" : ""}" href="${c.file}">
        <span>${c.icon}</span><b>${c.title}<small>${p.text}</small><i class="pbar"><i style="width:${p.pct}%"></i></i></b></a>`; }).join("")}
      <h3>Darstellung</h3>
      <label>Farben</label>${seg("theme", [["auto", "Automatisch"], ["light", "☀️ Hell"], ["dark", "🌙 Dunkel"]])}
      <label>Schrift</label>${seg("text", [["normal", "Normal"], ["big", "Groß"]])}
      <label>Lautstärke der Töne</label>${seg("vol", [["leiser", "Sehr leise"], ["leise", "Leise"], ["normal", "Normal"]])}
      <h3>Unterricht</h3>
      <label>Beamer-Modus <small>große Schrift, Pfeiltasten ← →, alle Schritte frei</small></label>${seg("beamer", [[false, "Aus"], [true, "📽️ An"]])}
      ${prefs.beamer ? `<label>Schülerfragen <small>Aufgaben und Eingaben ausblenden (Taste F)</small></label>${seg("hideQ", [[false, "Zeigen"], [true, "Ausblenden"]])}` : ""}
    `;
    sheet.querySelectorAll(".seg button").forEach((b) => b.onclick = () => {
      const v = b.dataset.v; setPref(b.dataset.k, v === "true" ? true : v === "false" ? false : v);
      if (b.dataset.k === "vol") Juice.sfx.good();
    });
  }
  function openMenu() {
    const ov = document.createElement("div");
    ov.className = "j-overlay app-menu";
    ov.innerHTML = `<div class="j-sheet" role="dialog" aria-modal="true" aria-label="Menü">
      <div class="m-head"><h2>Menü</h2><button class="btn" type="button" aria-label="Menü schließen">✕</button></div>
      <div class="m-body"></div></div>`;
    sheet = ov.querySelector(".j-sheet");
    const close = () => { ov.remove(); sheet = null; document.removeEventListener("keydown", esc); menuBtn && menuBtn.focus(); };
    const esc = (e) => e.key === "Escape" && close();
    ov.onclick = (e) => { if (e.target === ov || e.target.closest(".m-head button")) close(); };
    document.addEventListener("keydown", esc);
    document.body.appendChild(ov);
    renderMenu();
    sheet.querySelector(".m-head button").focus();
  }
  let menuBtn;
  function addMenuButton() {
    const bar = document.querySelector(".j-bar");
    if (!bar) return;
    menuBtn = document.createElement("button");
    menuBtn.className = "j-btn"; menuBtn.type = "button"; menuBtn.textContent = "☰"; menuBtn.setAttribute("aria-label", "Menü öffnen");
    menuBtn.onclick = openMenu;
    bar.prepend(menuBtn);
  }

  /* ---------- Übersicht: Fortschritt und Weitermachen ---------- */
  function decorateIndex() {
    document.querySelectorAll("a.chapter").forEach((a) => {
      const ch = CHAPTERS.find((c) => c.file === a.getAttribute("href"));
      if (!ch) return;
      const p = progressOf(ch);
      const d = document.createElement("div");
      d.className = "chprog";
      d.innerHTML = `<i class="pbar"><i style="width:${p.pct}%"></i></i><small>${p.text}</small>`;
      a.appendChild(d);
    });
    const r = resumeInfo();
    if (r) {
      const a = document.createElement("a");
      a.className = "chapter resume"; a.href = r.ch.file;
      a.innerHTML = `<h2>▶ Weitermachen</h2><p>${r.text}</p>`;
      const first = document.querySelector("a.chapter");
      first.parentNode.insertBefore(a, first);
    }
  }

  /* ---------- Beamer: Taste F blendet Schülerfragen aus ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (prefs.beamer && (e.key === "f" || e.key === "F")) setPref("hideQ", !prefs.hideQ);
  });

  document.addEventListener("DOMContentLoaded", () => {
    // juice.js baut die Leiste ebenfalls bei DOMContentLoaded; danach einhängen
    setTimeout(() => { addMenuButton(); }, 0);
    if (isIndex) decorateIndex();
    addReadButtons();
  });

  return { prefs, setPref, lessonState, saveLesson, speak, readVisible, canSpeak };
})();
