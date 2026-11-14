/* FirVet — comportamiento compartido: header, menú, reveal, scroll-spy y service worker */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Cartel de versión demo ----------
     Poner DEMO = false (y quitar el <meta name="robots" noindex> de cada página) al publicar el sitio final. */
  var DEMO = true;
  if (DEMO) {
    var demo = document.createElement('div');
    demo.className = 'demo-banner';
    demo.setAttribute('role', 'note');
    demo.innerHTML = 'Versión demo<span class="demo-extra"> · sitio en desarrollo</span>';
    document.body.appendChild(demo);
  }

  /* ---------- Header con fondo al scrollear ---------- */
  var header = document.getElementById('siteHeader');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal ---------- */
  var revealObserver = ('IntersectionObserver' in window && !reduceMotion)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
        });
      }, { threshold: 0.12 })
    : null;
  window.siteReveal = function (el) {
    if (revealObserver) revealObserver.observe(el); else el.classList.add('visible');
  };
  document.querySelectorAll('.reveal').forEach(window.siteReveal);

  /* ---------- Menú overlay ---------- */
  var toggle = document.getElementById('menuToggle');
  var panel = document.getElementById('menuPanel');
  var lastFocus = null;

  function focusables() {
    return [toggle].concat(Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null; }));
  }
  function openMenu() {
    lastFocus = document.activeElement;
    panel.classList.add('open');
    panel.removeAttribute('inert');
    document.body.classList.add('menu-open');
    document.documentElement.style.overflow = 'hidden';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Cerrar menú');
    var first = panel.querySelector('a[href]');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function closeMenu(restoreFocus) {
    if (!panel.classList.contains('open')) return;
    panel.classList.remove('open');
    panel.setAttribute('inert', '');
    document.body.classList.remove('menu-open');
    document.documentElement.style.overflow = '';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    if (restoreFocus !== false) (lastFocus && lastFocus.focus ? lastFocus : toggle).focus();
  }
  window.siteMenu = { open: openMenu, close: closeMenu };

  if (toggle && panel) {
    panel.setAttribute('inert', '');
    toggle.addEventListener('click', function () {
      panel.classList.contains('open') ? closeMenu() : openMenu();
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a[href]')) closeMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!panel.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key !== 'Tab') return;
      var items = focusables();
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
      if (mq.matches) closeMenu(false);
    });
  }

  /* ---------- Página actual / scroll-spy ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.main-nav a, .menu-links a'));
  var here = location.pathname.split('/').pop() || 'index.html';
  navLinks.forEach(function (a) {
    var url = new URL(a.getAttribute('href'), location.href);
    var page = url.pathname.split('/').pop() || 'index.html';
    a.dataset.page = page;
    a.dataset.hash = url.hash;
    if (page === here && !url.hash) a.setAttribute('aria-current', 'page');
  });
  if (here === 'index.html' && 'IntersectionObserver' in window) {
    var sections = navLinks
      .map(function (a) { return a.dataset.page === 'index.html' && a.dataset.hash ? document.querySelector(a.dataset.hash) : null; })
      .filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.dataset.hash === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
          else if (a.dataset.page === 'index.html') a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Service worker ---------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) { console.error('SW registration failed:', err); });
    });
  }
})();
