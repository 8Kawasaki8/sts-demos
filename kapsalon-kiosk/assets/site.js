/* site.js — page interactions for every STS demo (ES5, no dependencies, no network).
   nav state, drawer, smooth anchors, scroll reveal, hero entrance, demo banner, count-up,
   lightbox, drag-to-scroll photo strip, services tabs/accordion, privacy/a11y modals. */
(function () {
  "use strict";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- nav + drawer + anchors ---------- */
  function nav() {
    var navEl = $(".nav");
    if (!navEl) return;
    function onScroll() {
      var s = window.scrollY > 40;
      navEl.classList.toggle("scrolled", s);
      document.body.classList.toggle("nav-scrolled", s);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $("#navToggle");
    var drawer = $("#drawer");
    if (toggle && drawer) {
      function setDrawer(open) {
        drawer.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
      toggle.addEventListener("click", function () { setDrawer(!drawer.classList.contains("open")); });
      $$("a", drawer).forEach(function (a) { a.addEventListener("click", function () { setDrawer(false); }); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") setDrawer(false); });
    }

    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (!id || id.length < 2 || a.hasAttribute("data-open-reserve") || a.hasAttribute("data-modal") || a.id === "cookieSettings") return;
        var t = document.getElementById(id.slice(1));
        if (!t) return;
        e.preventDefault();
        var top = t.getBoundingClientRect().top + window.scrollY - 70;
        if (window.scrollTo && !reduce) window.scrollTo({ top: top, behavior: "smooth" });
        else window.scrollTo(0, top);
      });
    });
  }

  /* ---------- scroll reveal ---------- */
  function reveal() {
    var els = $$("[data-reveal]");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var mobile = window.innerWidth < 768;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: mobile ? 0.04 : 0.12, rootMargin: mobile ? "0px" : "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
    // safety net: anything still hidden after 4 s is shown (slow image decode, odd viewports)
    setTimeout(function () { els.forEach(function (e) { e.classList.add("in"); }); }, 4000);
  }

  /* ---------- hero entrance ---------- */
  function heroReady() {
    var hero = $(".hero");
    if (!hero) return;
    var img = $(".hero__img", hero);
    function ready() { hero.classList.add("ready"); }
    if (img && !img.complete) {
      img.addEventListener("load", ready);
      img.addEventListener("error", ready);
      setTimeout(ready, 1200);
    } else {
      requestAnimationFrame(ready);
    }
  }

  /* ---------- demo banner ---------- */
  function banner() {
    var el = $("#demoBanner");
    var close = $("#bannerClose");
    if (!el) { document.body.classList.remove("banner-on"); return; }
    document.body.classList.add("banner-on");
    function setH() { document.body.style.setProperty("--banner-h", el.offsetHeight + "px"); }
    setH();
    window.addEventListener("resize", setH, { passive: true });
    window.addEventListener("load", setH);
    if (close) close.addEventListener("click", function () {
      el.classList.add("hidden");
      document.body.classList.remove("banner-on");
      document.body.style.setProperty("--banner-h", "0px");
      window.removeEventListener("resize", setH);
      // let sidepanel.js re-measure the nav position
      window.dispatchEvent(new Event("resize"));
    });
  }

  /* ---------- count-up ---------- */
  function countUp() {
    var els = $$("[data-count]");
    if (!els.length) return;
    function finish(el) { el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || ""); }
    if (!("IntersectionObserver" in window) || reduce) { els.forEach(finish); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, end = parseFloat(el.getAttribute("data-count")), suf = el.getAttribute("data-suffix") || "", t0 = null;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / 1400, 1), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * eased) + suf;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- lightbox ---------- */
  function lightbox() {
    var lb = $("#lb");
    if (!lb) return;
    var img = $(".lb__img", lb);
    var closeBtn = $(".lb__close", lb);
    var lastFocus = null;
    function open(src, alt) {
      img.src = src; img.alt = alt || "";
      lb.classList.add("open");
      lastFocus = document.activeElement;
      closeBtn.focus({ preventScroll: true });
    }
    function close() {
      lb.classList.remove("open");
      img.removeAttribute("src");
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    $$(".ph-card img, .duo img").forEach(function (im) {
      var host = im.closest(".ph-card, .frame") || im;
      host.setAttribute("tabindex", "0");
      host.setAttribute("role", "button");
      host.setAttribute("aria-label", "Foto vergroten");
      function go(e) {
        if (host.getAttribute("data-dragged") === "1") return;
        e.preventDefault();
        open(im.getAttribute("data-full") || im.currentSrc || im.src, im.alt);
      }
      host.addEventListener("click", go);
      host.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") go(e); });
    });
    closeBtn.addEventListener("click", close);
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lb.classList.contains("open")) close(); });
  }

  /* ---------- photo strip: drag to scroll + arrows ---------- */
  function strip() {
    $$(".photo-strip").forEach(function (wrap) {
      var track = $(".photo-strip__track", wrap);
      if (!track) return;
      var down = false, startX = 0, startLeft = 0, moved = false;
      track.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "touch") return;
        down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
        track.style.scrollSnapType = "none";
      });
      track.addEventListener("pointermove", function (e) {
        if (!down) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > 6) moved = true;
        track.scrollLeft = startLeft - dx;
        if (moved) $$(".ph-card", track).forEach(function (c) { c.setAttribute("data-dragged", "1"); });
      });
      function up() {
        if (!down) return;
        down = false;
        track.style.scrollSnapType = "";
        setTimeout(function () { $$(".ph-card", track).forEach(function (c) { c.removeAttribute("data-dragged"); }); }, 50);
      }
      track.addEventListener("pointerup", up);
      track.addEventListener("pointerleave", up);
      track.addEventListener("pointercancel", up);
      var card = $(".ph-card", track);
      function page(dir) {
        var w = card ? card.getBoundingClientRect().width + 14 : 300;
        track.scrollBy({ left: dir * w * 2, behavior: reduce ? "auto" : "smooth" });
      }
      var prev = $(".strip-arrow--prev", wrap), next = $(".strip-arrow--next", wrap);
      if (prev) prev.addEventListener("click", function () { page(-1); });
      if (next) next.addEventListener("click", function () { page(1); });
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (en) {
          if (!en[0].isIntersecting) return;
          io.disconnect();
          $$("img[loading='lazy']", track).forEach(function (im) { im.loading = "eager"; });
        }, { rootMargin: "600px 0px" });
        io.observe(track);
      }
    });
  }

  /* ---------- services: accordion + tabs ---------- */
  function servicesUi() {
    var groups = $$(".svc-group");
    if (!groups.length) return;
    function setOpen(group, open) {
      group.classList.toggle("open", open);
      var head = $(".svc-group__head", group);
      if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
    }
    groups.forEach(function (g) {
      var head = $(".svc-group__head", g);
      if (head) head.addEventListener("click", function () { setOpen(g, !g.classList.contains("open")); });
    });
    $$(".tab[data-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        $$(".tab[data-tab]").forEach(function (t) { t.classList.toggle("active", t === tab); });
        var target = document.getElementById(tab.getAttribute("data-tab"));
        if (!target) return;
        groups.forEach(function (g) { setOpen(g, g === target); });
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    });
  }

  /* ---------- modals (privacy, a11y) ---------- */
  function modalsUi() {
    var lastFocus = null;
    function open(id) {
      var m = document.getElementById(id);
      if (!m) return;
      lastFocus = document.activeElement;
      m.hidden = false;
      var c = $(".modal__close", m);
      if (c) c.focus({ preventScroll: true });
    }
    function closeAll() {
      $$(".modal").forEach(function (m) { m.hidden = true; });
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    document.addEventListener("click", function (e) {
      var opener = e.target.closest("[data-modal]");
      if (opener) { e.preventDefault(); open(opener.getAttribute("data-modal")); return; }
      if (e.target.closest("[data-modal-close]")) closeAll();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && $$(".modal:not([hidden])").length) closeAll();
    });
  }

  function init() {
    nav(); reveal(); heroReady(); banner(); countUp(); lightbox(); strip(); servicesUi(); modalsUi();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
