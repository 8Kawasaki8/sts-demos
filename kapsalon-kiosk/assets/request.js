(function () {
/* ============================================================
   request.js (1/3: state) — appointment / request widget in the side panel.
   Forked from Avenues reserve.js. Everything is a REQUEST: nothing is confirmed
   automatically. Demo mode: no network at all, the OK screen says so.

   Concatenated by the renderer as: state.js + views.js + submit.js inside ONE IIFE
   (the opening "(function () {" and closing "})();" are added at render time).
   Plain ES5 script; all labels come from window.SITE_CONFIG (see vocab/types.ts).
   ============================================================ */
"use strict";

var HOST = document.getElementById("reserveWidget");
if (!HOST) return;

/* ---------- config from SITE_CONFIG ---------- */
var CFG = window.SITE_CONFIG || {};
var NAME = CFG.name || "";
var PHONE = CFG.phone && (CFG.phone.tel || CFG.phone.display) ? CFG.phone : null;
var WA_NR = PHONE && PHONE.wa ? String(PHONE.wa).replace(/\D/g, "") : "";
var HOURS = CFG.hours || {};
var CLOSED = HOURS.closed || [];                 // 0 = zo … 6 = za
var OPEN = HOURS.open || {};
var LASTC = HOURS.last || {};
var DEF_OPEN = "09:00", DEF_LAST = "18:00";       // when the business has no known hours
var SLOT = +CFG.slotMinutes > 0 ? +CFG.slotMinutes : 30;
var W = CFG.widget || {};
var MODES = W.modes && W.modes.length ? W.modes : [["tafel", ""], ["vraag", ""]];
var HEADS = W.heads || {};
var STEPS = W.steps || {};
var OPTIONS = W.options || {};
var OCCASIONS = W.occasions || [];
var PERSONS = W.personRanges || [];
var WA_INTRO = W.waIntro || {};
var T = CFG.t || {};
var LOC = CFG.locale || document.documentElement.lang || "nl-BE";
var DEFAULT_MODE = modeOrDefault(CFG.defaultMode);
var AGENDA = {};   // blocked dates { "2026-10-12": "reason" } from assets/agenda.js

var OCC_ICONS = ["❧", "✦", "❀", "❦", "◆", "✶"];
var WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';

/* ---------- strings ---------- */
function tx(key, vars) {
  var s = T[key];
  if (s === undefined || s === null) s = "";
  return String(s).replace(/\{(name|district)\}/g, function (_, k) {
    if (k === "name") return NAME;
    return (vars && vars[k]) || "";
  });
}
function stepLabel(kind) { return tx("step" + kind.charAt(0).toUpperCase() + kind.slice(1)); }
function modeLabel(m) {
  for (var i = 0; i < MODES.length; i++) if (MODES[i][0] === m) return MODES[i][1];
  return "";
}
function hasMode(m) {
  for (var i = 0; i < MODES.length; i++) if (MODES[i][0] === m) return true;
  return false;
}
function modeOrDefault(m) {
  if (m && hasMode(m) && STEPS[m] && STEPS[m].length) return m;
  for (var i = 0; i < MODES.length; i++) if (STEPS[MODES[i][0]] && STEPS[MODES[i][0]].length) return MODES[i][0];
  return MODES[0][0];
}

/* ---------- state ---------- */
var S = blank(DEFAULT_MODE);
var view = firstOfMonth(new Date());

function blank(mode, keep) {
  return { mode: mode, step: 0, done: null, date: null, time: null, choice: null, count: null, occ: null, msg: "",
           naam: keep ? keep.naam : "", email: keep ? keep.email : "", tel: keep ? keep.tel : "" };
}
function curSteps() { var st = STEPS[S.mode]; return st && st.length ? st : ["details"]; }
function curKind() { return curSteps()[Math.min(S.step, curSteps().length - 1)]; }

/* ---------- dates (labels via Intl, so no language literals live here) ---------- */
function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function todayISO() { return iso(new Date()); }
function parseISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fmt(d, opts) {
  try { return new Intl.DateTimeFormat(LOC, opts).format(d); } catch (e) { return iso(d); }
}
function prettyDate(s) { return fmt(parseISO(s), { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function shortDate(s) { return fmt(parseISO(s), { weekday: "short", day: "numeric", month: "short" }); }
function monthLabel(d) { return fmt(d, { month: "long", year: "numeric" }); }
function dowLabels() {   // Monday first, matches the calendar grid
  var out = [];
  for (var i = 0; i < 7; i++) out.push(fmt(new Date(2024, 0, 1 + i), { weekday: "short" }));   // 2024-01-01 is a Monday
  return out;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function firstName() { return (S.naam || "").trim().split(/\s+/)[0] || ""; }

/* ---------- opening hours → time slots ---------- */
function isClosedDow(dow) { return CLOSED.indexOf(dow) >= 0; }
function openFor(dow) { return OPEN[dow] || DEF_OPEN; }
function lastFor(dow) { return LASTC[dow] || DEF_LAST; }
function toMin(hhmm) { var p = String(hhmm).split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
function toHHMM(min) { return pad(Math.floor(min / 60) % 24) + ":" + pad(min % 60); }
function slotsFor(dateISO) {
  var d = parseISO(dateISO), dow = d.getDay();
  if (isClosedDow(dow)) return [];
  var from = toMin(openFor(dow)), to = toMin(lastFor(dow)), out = [];
  if (to <= from) to = from + 8 * 60;
  var now = new Date(), isToday = dateISO === todayISO(), nowMin = now.getHours() * 60 + now.getMinutes();
  for (var m = from; m + SLOT <= to; m += SLOT) {
    if (isToday && m <= nowMin) continue;
    out.push(toHHMM(m));
  }
  return out;
}
function hoursLabel(dateISO) {
  var dow = parseISO(dateISO).getDay();
  return openFor(dow) + " – " + lastFor(dow);
}
function dayOff(dt) {
  var di = iso(dt), t = todayISO();
  if (di < t || isClosedDow(dt.getDay()) || AGENDA[di]) return true;
  // today without a remaining slot is off too (only when the flow asks for a time)
  return di === t && curSteps().indexOf("time") >= 0 && !slotsFor(di).length;
}

/* ============================================================
   request.js (2/3: views) — HTML builders. Markup/classes follow Avenues reserve.js
   (.rw__*), plus .rw__pills/.rw__pill for option pills and .rw__chips on the OK screen.
   ============================================================ */

function render() {
  var html = headHTML();
  if (S.done) { HOST.innerHTML = html + okHTML(); return; }
  html += toggleHTML() + (curSteps().length > 1 ? progressHTML() : "") +
          '<div class="rw__panel">' + panelHTML() + "</div>";
  HOST.innerHTML = html;
}

function headHTML() {
  return '<div class="rw__head"><span class="rw__eyebrow">' + esc(tx("panelTitle")) + "</span><h3>" +
         esc(HEADS[S.mode] || modeLabel(S.mode)) + "</h3><p>" + esc(tx("panelSub")) + "</p></div>";
}
function toggleHTML() {
  var out = "", idx = 0, n = MODES.length;
  for (var i = 0; i < n; i++) {
    if (MODES[i][0] === S.mode) idx = i;
    out += '<button type="button" data-mode="' + esc(MODES[i][0]) + '" class="' + (S.mode === MODES[i][0] ? "active" : "") + '">' + esc(MODES[i][1]) + "</button>";
  }
  return '<div class="rw__toggle" style="--i:' + idx + ";grid-template-columns:repeat(" + n + ',1fr)"><span class="rw__thumb" style="width:calc((100% - 10px) / ' + n + ')"></span>' + out + "</div>";
}
function progressHTML() {
  var st = curSteps(), out = '<div class="rw__steps">';
  for (var i = 0; i < st.length; i++) {
    var cls = i < S.step ? "done" : (i === S.step ? "active" : "");
    out += '<div class="rw__dot ' + cls + '"><span class="c">' + (i < S.step ? "✓" : (i + 1)) + '</span><span class="l">' + esc(stepLabel(st[i])) + "</span></div>";
    if (i < st.length - 1) out += '<span class="rw__bar ' + (i < S.step ? "done" : "") + '"></span>';
  }
  return out + "</div>";
}
function panelHTML() {
  var fn = { date: dateHTML, time: timeHTML, details: detailsHTML, choice: choiceHTML, count: countHTML }[curKind()];
  return (fn || detailsHTML)();
}

/* ---------- summary chips ---------- */
function chip(i, t) { return '<span class="rw__chip">' + (i ? i + " " : "") + esc(t) + "</span>"; }
function summaryChips(cls) {
  var c = [];
  if (S.choice) c.push(chip("", S.choice));
  if (S.occ) c.push(chip("❧", S.occ));
  if (S.count) c.push(chip("◆", S.count));
  if (S.date) c.push(chip("✦", shortDate(S.date)));
  if (S.time) c.push(chip("◷", S.time));
  return c.length ? '<div class="' + (cls || "rw__summary") + '">' + c.join("") + "</div>" : "";
}
function title(t, sub) {
  return '<div class="rw__panel-title">' + esc(t) + "</div>" + (sub ? '<div class="rw__panel-sub">' + esc(sub) + "</div>" : "");
}
function phoneLink() {
  if (!PHONE) return "";
  var tel = PHONE.tel || PHONE.display;
  return '<a href="tel:' + esc(tel) + '">' + esc(PHONE.display || tel) + "</a>";
}

/* ---------- step: choice (option pills from widget.options[mode]) ---------- */
function choiceHTML() {
  var opts = OPTIONS[S.mode] || [], t = summaryChips() + title(tx("labelChoice"), "");
  t += '<div class="rw__pills">';
  for (var i = 0; i < opts.length; i++)
    t += '<button type="button" class="rw__pill ' + (S.choice === opts[i] ? "sel" : "") + '" data-choice="' + esc(opts[i]) + '">' + esc(opts[i]) + "</button>";
  t += "</div>";
  return t + actionsHTML(S.step > 0, false);
}

/* ---------- step: date ---------- */
function dateHTML() {
  return summaryChips() + title(tx("labelDate"), "") + calHTML() + actionsHTML(S.step > 0, false);
}
function calHTML() {
  var y = view.getFullYear(), m = view.getMonth();
  var startDow = (new Date(y, m, 1).getDay() + 6) % 7;   // Monday = 0
  var days = new Date(y, m + 1, 0).getDate();
  var tISO = todayISO(), now = new Date(), dows = dowLabels();
  var canPrev = !(y === now.getFullYear() && m === now.getMonth());
  var out = '<div class="rw__cal"><div class="rw__cal-head">' +
    '<button type="button" class="rw__nav" data-cal="prev" aria-label="' + esc(tx("back")) + '" ' + (canPrev ? "" : "disabled") + ">‹</button>" +
    '<span class="m">' + esc(monthLabel(view)) + "</span>" +
    '<button type="button" class="rw__nav" data-cal="next" aria-label="' + esc(tx("next")) + '">›</button></div><div class="rw__dow">';
  for (var d = 0; d < 7; d++) out += "<span>" + esc(dows[d]) + "</span>";
  out += '</div><div class="rw__days">';
  for (var s = 0; s < startDow; s++) out += "<span></span>";
  for (var day = 1; day <= days; day++) {
    var dt = new Date(y, m, day), di = iso(dt), reason = AGENDA[di], closed = isClosedDow(dt.getDay());
    var off = dayOff(dt);
    var cls = "rw__day" + (off ? " off" : "") + (reason ? " full" : "") + (di === tISO ? " today" : "") + (S.date === di ? " sel" : "");
    var tip = reason ? ' title="' + esc(reason) + '"' : (closed ? ' title="' + esc(tx("closedDay")) + '"' : (di === tISO ? ' title="' + esc(tx("today")) + '"' : ""));
    out += off ? '<span class="' + cls + '"' + tip + ">" + day + "</span>"
               : '<button type="button" class="' + cls + '"' + tip + ' data-date="' + di + '">' + day + "</button>";
  }
  return out + "</div></div>";
}

/* ---------- step: time ---------- */
function timeHTML() {
  if (!S.date) return dateHTML();
  var slots = slotsFor(S.date);
  var t = summaryChips() + title(tx("labelTime"), hoursLabel(S.date));
  if (!slots.length) {
    t += '<div class="rw__note"><b>◷</b><div>' + esc(tx("noSlots")) + (PHONE ? " " + phoneLink() : "") + "</div></div>";
    return t + actionsHTML(true, false);
  }
  t += '<div class="rw__slots">';
  for (var i = 0; i < slots.length; i++)
    t += '<button type="button" class="rw__slot ' + (S.time === slots[i] ? "sel" : "") + '" data-time="' + slots[i] + '"><span class="dot"></span>' + slots[i] + "</button>";
  return t + "</div>" + actionsHTML(true, false);
}

/* ---------- step: count (occasions optional + person ranges) ---------- */
function countHTML() {
  var t = summaryChips();
  if (OCCASIONS.length) {
    t += title(tx("labelOccasion"), tx("optional")) + '<div class="rw__occ">';
    for (var o = 0; o < OCCASIONS.length; o++)
      t += '<button type="button" data-occ="' + esc(OCCASIONS[o]) + '" class="' + (S.occ === OCCASIONS[o] ? "sel" : "") + '"><span class="i">' + OCC_ICONS[o % OCC_ICONS.length] + "</span><span>" + esc(OCCASIONS[o]) + "</span></button>";
    t += "</div>";
  }
  t += '<div class="rw__panel-title"' + (OCCASIONS.length ? ' style="margin-top:26px"' : "") + ">" + esc(tx("labelPersons")) + "</div>" +
       '<div class="rw__panel-sub"></div><div class="rw__pills">';
  for (var i = 0; i < PERSONS.length; i++)
    t += '<button type="button" class="rw__pill ' + (S.count === PERSONS[i] ? "sel" : "") + '" data-count="' + esc(PERSONS[i]) + '">' + esc(PERSONS[i]) + "</button>";
  return t + "</div>" + actionsHTML(S.step > 0, false);
}

/* ---------- step: details (all modes) ---------- */
function detailsHTML() {
  var m = S.mode, t = summaryChips();
  if (curSteps().length > 1) t += title(tx("stepDetails"), "");
  var opt = " (" + tx("optional") + ")";
  t += '<form id="rwForm" novalidate>';
  t += field("naam", tx("labelName"), "text", tx("phName"), true, S.naam, "name");
  t += field("tel", tx("labelPhone"), "tel", tx("phPhone"), true, S.tel, "tel");
  t += field("email", tx("labelEmail") + opt, "email", tx("phEmail"), false, S.email, "email");
  t += '<div class="field"><label for="rw_msg">' + esc(tx("labelMessage")) + (m === "vraag" ? "" : opt) + "</label>" +
       '<textarea id="rw_msg" name="msg" placeholder="' + esc(tx("phMessage")) + '"' + (m === "vraag" ? " required" : "") + ">" + esc(S.msg) + "</textarea></div>";
  t += '<p class="form__err" id="rwErr" hidden></p>';
  t += actionsHTML(curSteps().length > 1, true);
  return t + "</form>";
}
function field(name, label, type, ph, req, val, ac) {
  return '<div class="field"><label for="rw_' + name + '">' + esc(label) + '</label><input id="rw_' + name + '" name="' + name + '" type="' + type +
         '" placeholder="' + esc(ph) + '" autocomplete="' + ac + '" ' + (req ? "required" : "") + ' value="' + esc(val || "") + '"></div>';
}
function actionsHTML(back, submit) {
  if (!back && !submit) return "";
  var out = '<div class="rw__actions">';
  if (back) out += '<button type="button" class="rw__back" data-back>‹ ' + esc(tx("back")) + "</button>";
  if (submit) out += '<button type="submit" class="btn btn--solid btn--lg">' + esc(tx("submit")) + "</button>";
  return out + "</div>";
}

/* ---------- OK screen (demo) ---------- */
function okHTML() {
  var first = firstName();
  var head = first ? first + ", " + lower(tx("okTitle")) : tx("okTitle");
  var out = '<div class="rw__ok"><div class="ic">✦</div><h3>' + esc(head) + "</h3>" + summaryChips("rw__chips") +
            "<p>" + esc(tx("okBody")) + "</p>";
  if (WA_NR) out += '<a class="rw__wa" style="margin-top:22px" href="' + esc(waLink(WA_NR, waMessage())) + '" target="_blank" rel="noopener" data-wa-link>' + WA_ICON + esc(tx("okWhatsapp")) + "</a>";
  if (PHONE) out += '<p class="rw__ok-call">' + esc(tx("okCall")) + " " + phoneLink() + "</p>";
  out += '<button type="button" class="rw__back" id="rwReset" style="margin-top:22px">' + esc(tx("okAgain")) + "</button></div>";
  return out;
}

/* ============================================================
   request.js (3/3: submit) — interactions, validation, demo submit, WhatsApp link,
   agenda loading and the window.AVReserve hook used by sidepanel.js.
   DEMO: there is no e-mail/Web3Forms/EmailJS here and no fetch() at all.
   ============================================================ */

/* ---------- interactions ---------- */
HOST.addEventListener("click", function (e) {
  var el = e.target.closest("[data-mode],[data-cal],[data-date],[data-time],[data-choice],[data-count],[data-occ],[data-back],#rwReset");
  if (!el) return;
  if (el.dataset.mode) { if (S.mode !== el.dataset.mode) { saveForm(); reset(el.dataset.mode); } return; }
  if (el.id === "rwReset") { reset(S.mode); return; }
  if (el.hasAttribute("data-back")) { saveForm(); if (S.step > 0) S.step--; render(); return; }
  if (el.dataset.cal) { view.setMonth(view.getMonth() + (el.dataset.cal === "next" ? 1 : -1)); render(); return; }
  if (el.dataset.date) { S.date = el.dataset.date; S.time = null; next(); return; }
  if (el.dataset.time) { S.time = el.dataset.time; next(); return; }
  if (el.dataset.choice) { S.choice = el.dataset.choice; next(); return; }
  if (el.dataset.occ) { S.occ = S.occ === el.dataset.occ ? null : el.dataset.occ; render(); return; }
  if (el.dataset.count) { S.count = el.dataset.count; next(); return; }
});

HOST.addEventListener("submit", function (e) {
  e.preventDefault();
  saveForm();
  var problem = validate();
  if (problem) { showErr(problem.msg, problem.field); return; }
  submit();
});

function saveForm() {
  var f = document.getElementById("rwForm");
  if (!f) return;
  S.naam = f.naam.value; S.email = f.email.value; S.tel = f.tel.value; S.msg = f.msg.value;
}
function next() { if (S.step < curSteps().length - 1) S.step++; render(); }
function reset(mode) { S = blank(modeOrDefault(mode), S); view = firstOfMonth(new Date()); render(); }

/* ---------- validation (messages from SITE_CONFIG.t) ---------- */
function validate() {
  var st = curSteps();
  if (!S.naam.trim()) return { msg: tx("errName"), field: "naam" };
  if (String(S.tel).replace(/\D/g, "").length < 8) return { msg: tx("errPhone"), field: "tel" };
  if (S.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.email.trim())) return { msg: tx("errEmail"), field: "email" };
  if (S.mode === "vraag" && !S.msg.trim()) return { msg: tx("errRequired"), field: "msg" };
  if (st.indexOf("choice") >= 0 && !S.choice) return { msg: tx("errChoice"), step: st.indexOf("choice") };
  if (st.indexOf("date") >= 0 && !S.date) return { msg: tx("errDate"), step: st.indexOf("date") };
  if (st.indexOf("time") >= 0 && !S.time) return { msg: tx("errTime"), step: st.indexOf("time") };
  if (st.indexOf("count") >= 0 && !S.count) return { msg: tx("errCount"), step: st.indexOf("count") };
  return null;
}
function showErr(msg, fieldName) {
  var err = document.getElementById("rwErr");
  if (err) { err.hidden = false; err.textContent = msg; }
  var f = document.getElementById("rwForm");
  if (f) {
    var inputs = f.querySelectorAll("input,textarea");
    for (var i = 0; i < inputs.length; i++) inputs[i].removeAttribute("aria-invalid");
    var el = fieldName && f.elements[fieldName];
    if (el) { el.setAttribute("aria-invalid", "true"); el.focus({ preventScroll: true }); }
  }
}

/* ---------- WhatsApp (opened by the visitor from the OK screen; never automatic) ---------- */
function waLink(nr, text) { return "https://wa.me/" + nr + "?text=" + encodeURIComponent(text); }
function waMessage() {
  var L = [fillName(WA_INTRO[S.mode] || "")];
  if (S.choice) L.push("• " + S.choice);
  if (S.occ) L.push("• " + S.occ);
  if (S.count) L.push("• " + tx("labelPersons") + ": " + S.count);
  if (S.date) L.push("• " + cap(prettyDate(S.date)) + (S.time ? ", " + S.time : ""));
  if (S.msg.trim()) L.push("", S.msg.trim());
  L.push("", tx("labelName") + ": " + S.naam.trim());
  if (S.tel.trim()) L.push(tx("labelPhone") + ": " + S.tel.trim());
  return L.join("\n");
}
function fillName(s) { return String(s).replace(/\{name\}/g, NAME); }

/* ---------- submit: demo → straight to the OK screen, nothing leaves the browser ---------- */
function submit() {
  var problem = validate();
  if (problem) {
    if (problem.step !== undefined) { S.step = problem.step; render(); }
    else showErr(problem.msg, problem.field);
    return;
  }
  S.done = { via: "demo" };
  render();
}

/* ---------- blocked dates: window.AV_AGENDA when present, else fetch assets/agenda.js ---------- */
(function loadAgenda() {
  function apply() {
    AGENDA = (window.AV_AGENDA && window.AV_AGENDA.geblokkeerd) || {};
    if (!S.done && curKind() === "date") render();
  }
  if (window.AV_AGENDA) { apply(); return; }
  var s = document.createElement("script");
  s.src = "./assets/agenda.js?t=" + Math.floor(Date.now() / 60000);
  s.onload = apply;
  document.head.appendChild(s);
})();

/* ---------- sidepanel.js picks the request type with this ---------- */
window.AVReserve = {
  mode: function (m) {
    m = modeOrDefault(m);
    if (S.mode !== m || S.done) { saveForm(); reset(m); }
  }
};

render();

})();
