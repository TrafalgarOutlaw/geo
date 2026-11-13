/* Geo – Gerüst für geführte Lernpfade (Schritte, Weiter-Leiste, Fortschritt, Tastatur, Vorlesen).
   Einbinden am Ende von <body>, nach der Leiste .lessonnav. Die Seite ruft am Schluss lessonStart() auf.
   Die Lektions-ID kommt aus <body data-lesson="...">; die Datei muss <ID>.html heißen. */
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const de = (v, d = 2) => Number(v).toLocaleString("de-DE", { maximumFractionDigits: d });
const parseDe = (s) => { s = String(s).trim().replace(/\s/g, "").replace(",", "."); return s === "" ? NaN : +s; };
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n) => String(n).replace(/\d/g, (d) => SUP[d]).replace("-", "⁻");

/* ---------- Lektions-Gerüst ---------- */
const LESSON_ID = document.body.dataset.lesson;
const steps = [...document.querySelectorAll(".step")];
const ready = steps.map(() => false);
const inits = [];
let cur = 0, maxStep = 0;
const saved = App.lessonState(LESSON_ID);
let lessonDone = !!saved.done;
steps.forEach(() => $("dots").appendChild(document.createElement("i")));

function show(i) {
  cur = i;
  steps.forEach((s, k) => s.classList.toggle("active", k === i));
  [...$("dots").children].forEach((d, k) => { d.className = k === i ? "on" : k < i ? "seen" : ""; });
  $("prev").disabled = i === 0;
  $("next").disabled = !ready[i] && !App.prefs.beamer;
  $("next").classList.toggle("pulse", ready[i] && i < steps.length - 1);
  $("next").textContent = i === steps.length - 1 ? "Fertig ✓" : "Weiter →";
  steps[i].scrollTop = 0;
  if (inits[i]) { inits[i](); inits[i] = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  $("speak").classList.remove("on");
  maxStep = Math.max(maxStep, i);
  if (i === steps.length - 1) lessonDone = true;
  App.saveLesson(LESSON_ID, { step: i, max: maxStep, total: steps.length, done: lessonDone });
}
function unlock(i) {
  if (ready[i]) return;
  ready[i] = true;
  if (i === cur) { $("next").disabled = false; $("next").classList.add("pulse"); }
  Juice.sfx.good();
}
$("next").onclick = () => {
  if (cur < steps.length - 1) { Juice.sfx.pop(cur / steps.length); show(cur + 1); }
  else location.href = "./";
};
$("prev").onclick = () => cur > 0 && show(cur - 1);

/* Tastatur (auch Präsentations-Klicker), Vorlesen, Beamer */
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea") || document.querySelector(".j-overlay")) return;
  if (["ArrowRight", "PageDown"].includes(e.key) && !$("next").disabled && cur < steps.length - 1) { e.preventDefault(); $("next").click(); }
  if (["ArrowLeft", "PageUp"].includes(e.key) && cur > 0) { e.preventDefault(); $("prev").click(); }
});
if (App.canSpeak) $("speak").onclick = () => App.speak(App.readVisible(steps[cur]), $("speak"));
else $("speak").hidden = true;
document.addEventListener("geo-prefs", () => { $("next").disabled = !ready[cur] && !App.prefs.beamer; });

/* Aufdeck-Karten: Klick zeigt die Antwort; sind alle Karten eines Schritts offen, ist er geschafft */
document.querySelectorAll(".reveal").forEach((r) => r.onclick = () => {
  r.classList.add("hidden"); $(r.dataset.target).classList.remove("hidden"); Juice.sfx.pop(0.7);
  const st = r.closest(".step");
  if (!st.querySelector(".reveal:not(.hidden)")) unlock(steps.indexOf(st));
});

/* Wiederverwendbarer Abschluss-Check: [{ q, ok(a), hint(a), sol }] */
function makeCheck(boxId, checks, stepIndex, doneText) {
  let ci = 0, tries = 0;
  const box = $(boxId);
  function render() {
    const c = checks[ci];
    box.innerHTML = `<p class="muted">Aufgabe ${ci + 1} von ${checks.length}</p><div class="big" style="font-size:1.1rem">${c.q}</div>
      <div class="row"><input class="answer" id="${boxId}-a" inputmode="${c.mode || "decimal"}" autocomplete="off"><button class="btn primary" id="${boxId}-c">Prüfen</button></div><div id="${boxId}-f"></div>`;
    $(boxId + "-c").onclick = check;
    $(boxId + "-a").addEventListener("keydown", (e) => e.key === "Enter" && check());
  }
  function next(delay) { ci++; tries = 0; if (ci < checks.length) setTimeout(render, delay); }
  function check() {
    const c = checks[ci], a = parseDe($(boxId + "-a").value), f = $(boxId + "-f");
    if (isNaN(a)) { Juice.shake(box); return; }
    if (c.ok(a)) {
      Juice.sfx.good(); Juice.addXP(10, $(boxId + "-c"));
      f.innerHTML = `<div class="good">Richtig!</div>`;
      next(900);
      if (ci >= checks.length) { f.innerHTML = `<div class="good"><b>Alle Aufgaben gelöst!</b> ${doneText}</div>`; Juice.confetti(); unlock(stepIndex); }
    } else {
      tries++;
      Juice.sfx.bad(); Juice.shake(box);
      f.innerHTML = `<div class="hint">${c.hint(a)}</div>` + (tries >= 3 ? `<button class="btn" id="${boxId}-s">Lösung zeigen</button>` : "");
      if (tries >= 3) $(boxId + "-s").onclick = () => {
        f.innerHTML = `<div class="hint">Lösung: <b>${c.sol}</b>. Schau dir die Aufgabe noch einmal in Ruhe an.</div>`;
        next(2200);
        if (ci >= checks.length) unlock(stepIndex);
      };
    }
  }
  return render;
}

/* Start: weitermachen, wo man aufgehört hat */
function lessonStart() {
  if (!saved.done && saved.step > 0 && saved.step < steps.length) {
    maxStep = saved.max || saved.step;
    for (let k = 0; k < maxStep; k++) ready[k] = true;
    show(saved.step);
  } else show(0);
}
