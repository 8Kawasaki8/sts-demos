/* ============================================================
   Side panel (forked verbatim from Avenues sidepanel.js).
   Desktop (from 1100px): opens on the right shortly after the site loads and
   collapses to a tab once the visitor scrolls past the hero.
   Smaller screens: starts closed; the fixed bar at the bottom opens it.
   Default request type comes from window.SITE_CONFIG.defaultMode.
   ============================================================ */
(function () {
  "use strict";

  var panel = document.getElementById("sidePanel");
  if (!panel) return;
  var inner = panel.querySelector(".sidepanel__inner");
  var tab = document.getElementById("spTab");
  var closeBtn = document.getElementById("spClose");
  if (!inner || !tab || !closeBtn) return;
  var desk = window.matchMedia("(min-width: 1100px)");
  var hero = document.querySelector(".hero");
  var busy = false;   // visitor is using the panel: never auto-collapse
  var DEFAULT_MODE = (window.SITE_CONFIG && window.SITE_CONFIG.defaultMode) || "tafel";

  function pastHero() { return window.scrollY > (hero ? hero.offsetHeight * 0.55 : 450); }

  // desktop: the panel starts right below the nav so the menu stays fully visible
  var nav = document.querySelector(".nav");
  function placeTop() {
    if (!desk.matches || !nav) { panel.style.top = ""; return; }
    panel.style.top = Math.max(0, Math.round(nav.getBoundingClientRect().bottom)) + "px";
  }
  // the nav animates (scroll, banner close): follow it for a moment
  var followUntil = 0, following = false;
  function followNav() {
    followUntil = Date.now() + 700;
    if (following) return;
    following = true;
    (function step() {
      placeTop();
      if (Date.now() < followUntil) requestAnimationFrame(step); else following = false;
    })();
  }
  placeTop();
  document.addEventListener("DOMContentLoaded", followNav);
  window.addEventListener("load", followNav);
  window.addEventListener("scroll", followNav, { passive: true });
  window.addEventListener("resize", followNav);
  document.addEventListener("click", function (e) { if (e.target.closest("#vakClose,.banner__close")) followNav(); });

  function setOpen(open) {
    if (open) followNav();
    panel.classList.toggle("open", open);
    inner.inert = !open;
    inner.setAttribute("aria-hidden", open ? "false" : "true");
    tab.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("sp-open", open && desk.matches);
    document.body.classList.toggle("sp-lock", open && !desk.matches);
  }
  function openPanel(mode) {
    busy = true;
    if (window.AVReserve) window.AVReserve.mode(mode || DEFAULT_MODE);
    setOpen(true);
    closeBtn.focus({ preventScroll: true });
  }

  tab.addEventListener("click", function () { openPanel(); });
  closeBtn.addEventListener("click", function () {
    setOpen(false);
    if (desk.matches) tab.focus({ preventScroll: true });
  });
  panel.addEventListener("pointerdown", function () { busy = true; });
  panel.addEventListener("focusin", function () { busy = true; });

  // every request button on the site opens the panel in the right request type
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-open-reserve]");
    if (!el) return;
    e.preventDefault();
    openPanel(el.getAttribute("data-open-reserve") || DEFAULT_MODE);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) setOpen(false);
  });

  // desktop: open as soon as the site opens (mobile: closed, the bottom bar is there)
  setOpen(desk.matches && !pastHero());

  // desktop: collapse by itself past the hero so it does not cover the rest of the site
  window.addEventListener("scroll", function () {
    if (!busy && desk.matches && panel.classList.contains("open") && pastHero()) setOpen(false);
  }, { passive: true });

  function sync() { placeTop(); setOpen(panel.classList.contains("open")); }
  if (desk.addEventListener) desk.addEventListener("change", sync);
  else if (desk.addListener) desk.addListener(sync);
})();
