/* consent.js — cookie consent for the one third-party embed a demo has (Google Maps).
   localStorage key "sts-demo-<slug>" = "all" | "essential". No analytics, no network calls. */
(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};
  var KEY = "sts-demo-" + (cfg.slug || (location.pathname.split("/").filter(Boolean).pop() || "site"));
  var bar = document.getElementById("cookieBar");
  var frames = Array.prototype.slice.call(document.querySelectorAll("iframe[data-mapsrc]"));
  var placeholder = document.getElementById("mapConsent");

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: keep in memory only */ } }

  function showMap() {
    frames.forEach(function (f) { if (!f.getAttribute("src")) f.setAttribute("src", f.getAttribute("data-mapsrc")); });
    if (placeholder) placeholder.hidden = true;
  }
  function hideMap() {
    frames.forEach(function (f) { f.removeAttribute("src"); });
    if (placeholder) placeholder.hidden = false;
  }
  function showBar() { if (bar) bar.hidden = false; }
  function hideBar() { if (bar) bar.hidden = true; }

  function apply(choice) {
    if (choice === "all") { showMap(); hideBar(); }
    else if (choice === "essential") { hideMap(); hideBar(); }
    else { hideMap(); if (frames.length) showBar(); else hideBar(); }
  }
  function choose(choice) { write(choice); apply(choice); }

  var accept = document.getElementById("cookieAccept");
  var decline = document.getElementById("cookieDecline");
  var mapAccept = document.getElementById("mapAccept");
  var settings = document.getElementById("cookieSettings");
  if (accept) accept.addEventListener("click", function () { choose("all"); });
  if (decline) decline.addEventListener("click", function () { choose("essential"); });
  if (mapAccept) mapAccept.addEventListener("click", function () { choose("all"); });
  if (settings) settings.addEventListener("click", function (e) { e.preventDefault(); showBar(); });

  apply(read());
})();
