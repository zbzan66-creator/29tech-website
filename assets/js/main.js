(function () {
  var hdr = document.querySelector('.hdr');
  var burger = document.querySelector('.burger');
  var onScroll = function () { hdr.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // mobile menu
  var setMenu = function (open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) {   // final-fix (RD-01): a closed menu keeps no sub-menu open, so nothing of it can take a later tap
      document.querySelectorAll('.nav .ni.open').forEach(function (n) {
        n.classList.remove('open'); var t = n.querySelector('.dd-t'); if (t) t.setAttribute('aria-expanded', 'false');
      });
    }
  };
  burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  // final-fix (RM-10): a tap on the page below the open menu closes it and does nothing else
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (document.body.classList.contains('menu-open') && t && t.closest && !t.closest('.hdr')) { e.preventDefault(); e.stopPropagation(); setMenu(false); }
  }, true);
  document.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  // burger menu (<=1180px): sub-menus fold; the chevron button opens one, the parent label stays a link
  document.querySelectorAll('.dd-t').forEach(function (b) {
    b.addEventListener('click', function () { var o = b.closest('.ni').classList.toggle('open'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  });
  // footer sitemap: columns fold on phones (open in the HTML, so they stay open without JS)
  var fmq = window.matchMedia('(max-width:680px)');
  var setFoot = function () { document.querySelectorAll('.ftr details.fd').forEach(function (d) { d.open = !fmq.matches; }); };
  setFoot();
  if (fmq.addEventListener) fmq.addEventListener('change', setFoot);

  window.addEventListener('beforeprint', function () { document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); }); });
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    return;
  }
  // reveal on scroll
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  // active nav item (sub-sections map to their parent nav entry)
  var groups = { 'cmp-systems': 'cmp', base: 'network', facility: 'cmp', case: 'cmp', 'cmp-parts': 'cmp', upgrade: 'cmp', consumables: 'parts', test: 'vacuum', why: 'quality' };
  var links = {};
  document.querySelectorAll('.nav a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var id = groups[en.target.id] || en.target.id;
      Object.keys(links).forEach(function (k) { links[k].classList.toggle('on', k === id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });
})();
