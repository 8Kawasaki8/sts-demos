/* =========================================================
   ALEX CREATIVE — main.js
   Features: mobile nav · portfolio filter · lightbox · scroll FX
   ========================================================= */
'use strict';

/* ─── Nav: scroll shadow + mobile toggle ─── */
(function initNav() {
  const nav    = document.querySelector('.nav');
  const burger = document.querySelector('.nav__burger');
  const links  = document.querySelector('.nav__links');

  /* Scroll shadow */
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Hamburger */
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    links.classList.toggle('is-open', !open);
  });

  /* Close menu on link click */
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      burger.setAttribute('aria-expanded', 'false');
      links.classList.remove('is-open');
    });
  });

  /* Close menu on outside click */
  document.addEventListener('click', e => {
    if (!nav.contains(e.target)) {
      burger.setAttribute('aria-expanded', 'false');
      links.classList.remove('is-open');
    }
  });
})();

/* ─── Portfolio filter + lightbox state ─── */
const portfolioItems = Array.from(document.querySelectorAll('.portfolio__item'));
let visibleItems = portfolioItems.slice(); // items currently shown
let lbIndex = 0;

(function initFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.removeAttribute('aria-current');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'true');

      const cat = btn.dataset.filter;

      portfolioItems.forEach(item => {
        const match = cat === 'all' || item.dataset.category === cat;
        item.classList.toggle('is-hidden', !match);
      });

      visibleItems = portfolioItems.filter(item => !item.classList.contains('is-hidden'));
    });
  });
})();

/* ─── Lightbox ─── */
(function initLightbox() {
  const lb       = document.getElementById('lightbox');
  const backdrop = document.getElementById('lbBackdrop');
  const art      = document.getElementById('lbArt');
  const title    = document.getElementById('lbTitle');
  const cat      = document.getElementById('lbCat');
  const btnClose = document.getElementById('lbClose');
  const btnPrev  = document.getElementById('lbPrev');
  const btnNext  = document.getElementById('lbNext');

  function open(index) {
    lbIndex = index;
    render();
    lb.hidden = false;
    // Force reflow for transition
    lb.getBoundingClientRect();
    lb.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    btnClose.focus();
  }

  function close() {
    lb.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    lb.hidden = true;
    document.body.style.overflow = '';
    // Return focus to the item that opened the lightbox
    const trigger = visibleItems[lbIndex] && visibleItems[lbIndex].querySelector('.portfolio__btn');
    if (trigger) trigger.focus();
  }

  function render() {
    const item  = visibleItems[lbIndex];
    const thumb = item.querySelector('.portfolio__thumb');
    art.innerHTML   = thumb.innerHTML;
    title.textContent = item.querySelector('.portfolio__name').textContent;
    cat.textContent   = item.querySelector('.portfolio__label').textContent;
    btnPrev.disabled  = lbIndex === 0;
    btnNext.disabled  = lbIndex === visibleItems.length - 1;
  }

  function prev() { if (lbIndex > 0) { lbIndex--; render(); } }
  function next() { if (lbIndex < visibleItems.length - 1) { lbIndex++; render(); } }

  /* Open on item click */
  portfolioItems.forEach(item => {
    item.querySelector('.portfolio__btn').addEventListener('click', () => {
      const idx = visibleItems.indexOf(item);
      if (idx !== -1) open(idx);
    });
  });

  btnClose.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);

  /* Keyboard navigation */
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    switch (e.key) {
      case 'Escape':     close(); break;
      case 'ArrowLeft':  prev();  break;
      case 'ArrowRight': next();  break;
    }
  });

  /* Focus trap inside lightbox */
  lb.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(lb.querySelectorAll('button:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();

/* ─── Contact form: demo feedback ─── */
(function initForm() {
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.querySelector('#fname').value.trim();
    if (!name) return;
    note.textContent = `Thanks ${name}! Message received. (Backend integration coming in the full build.)`;
    form.reset();
  });
})();

/* ─── Scroll reveal (IntersectionObserver) ─── */
(function initReveal() {
  const targets = document.querySelectorAll(
    '.section-header, .about__visual, .about__text, .contact__cta-block, .contact__form, .portfolio__item'
  );
  targets.forEach(el => el.classList.add('reveal'));

  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => io.observe(el));
})();
