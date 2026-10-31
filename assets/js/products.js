(function () {
  var $ = function (s) { return document.querySelector(s); };
  var grid = $('#pg'); if (!grid) return;
  var q = $('#pq'), mk = $('#pm'), chips = $('#pc'), cnt = $('#pn'), none = $('#p0'), more = $('#pmore');
  var cat = '', PAGE = 48, shown = PAGE;
  var udata = $('#udata') ? JSON.parse($('#udata').textContent) : null;
  var ui = $('#ui') ? JSON.parse($('#ui').textContent) : null;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // hash: #c=<cat> preselects a category (links from the home page)
  var h = location.hash.match(/c=([a-z]+)/); if (h) cat = h[1];
  var setChip = function () { chips.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('on', b.dataset.c === cat); }); };
  var words = function () { return q.value.toLowerCase().split(/\s+/).filter(Boolean); };
  var match = function (c, m, text) {
    if (cat && c !== cat) return false;
    if (mk.value && ('|' + m + '|').indexOf('|' + mk.value + '|') < 0) return false;
    return words().every(function (w) { return text.indexOf(w) >= 0; });
  };
  var mail = function (d) {
    var body = ui.body.replace('{name}', d.n).replace('{oem}', d.p.length ? ui.oem + '：' + d.p.join(' / ') : '').replace('{our}', d.o);
    return 'mailto:' + ui.mail + '?subject=' + encodeURIComponent(ui.subj + ' ' + d.o) + '&body=' + encodeURIComponent(body);
  };
  var ucard = function (d) {
    var g = esc(JSON.stringify([ui.img + d.i + '.jpg']));
    return '<article class="pc"><button type="button" class="pc-ph" data-g="' + g + '" aria-label="' + esc(d.n) + '">' +
      (d.i ? '<img src="' + ui.img + d.i + '.jpg" alt="' + esc(d.n) + '" loading="lazy" decoding="async">' : '<span class="pc-noimg"><b>' + esc(d.m || 'OEM') + '</b><small>' + esc(ui.cats[d.c] || '') + '</small></span>') + '</button>' +
      '<div class="pc-b"><span class="pc-tag t-used">' + esc(ui.used) + '</span><h3>' + esc(d.n) + '</h3><dl>' +
      (d.p.length ? '<dt>' + esc(ui.oem) + '</dt><dd>' + esc(d.p.slice(0, 3).join(' / ')) + (d.p.length > 3 ? ' <span class="pc-more">+' + (d.p.length - 3) + '</span>' : '') + '</dd>' : '') +
      '<dt>' + esc(ui.our) + '</dt><dd class="our">' + esc(d.o) + '</dd></dl>' +
      '<a class="pc-ask" href="' + esc(mail(d)) + '">' + esc(ui.ask) + '</a></div></article>';
  };
  var apply = function () {
    var n = 0;
    if (udata) {
      var hit = udata.filter(function (d) { return match(d.c, d.m, (d.n + ' ' + d.p.join(' ') + ' ' + d.o + ' ' + d.m).toLowerCase()); });
      n = hit.length; grid.innerHTML = hit.slice(0, shown).map(ucard).join('');
      more.hidden = hit.length <= shown;
    } else {
      grid.querySelectorAll('.pc').forEach(function (a) {
        var ok = match(a.dataset.c, a.dataset.m, a.dataset.q); a.hidden = !ok; if (ok) n++;
      });
    }
    cnt.textContent = cnt.dataset.t.replace('{n}', n); none.hidden = n > 0;
  };
  chips.addEventListener('click', function (ev) {
    var b = ev.target.closest('.chip'); if (!b) return;
    cat = b.dataset.c; shown = PAGE; setChip(); apply();
    try { history.replaceState(null, '', cat ? '#c=' + cat : location.pathname); } catch (e) {}
  });
  q.addEventListener('input', function () { shown = PAGE; apply(); });
  mk.addEventListener('change', function () { shown = PAGE; apply(); });
  if (more) more.addEventListener('click', function () { shown += PAGE; apply(); });
  document.querySelectorAll('.poem-g button').forEach(function (b) {
    b.addEventListener('click', function () {
      mk.value = b.dataset.mk; cat = ''; setChip(); shown = PAGE; apply();
      var t = document.querySelector('.ptool'); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
    });
  });
  setChip(); apply();

  // photo viewer
  var dlg = $('#plb'), big = $('#plb-img'), th = $('#plb-th');
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('.pc-ph'); if (!b || !dlg || !dlg.showModal) return;
    if (!b.querySelector('img')) return;
    var g = JSON.parse(b.dataset.g || '[]'); if (!g.length) return;
    big.src = g[0]; big.alt = b.getAttribute('aria-label') || '';
    th.innerHTML = g.length > 1 ? g.map(function (u, i) { return '<button type="button" data-u="' + esc(u) + '"' + (i ? '' : ' class="on"') + '><img src="' + esc(u) + '" alt=""></button>'; }).join('') : '';
    dlg.showModal();
  });
  if (dlg) {
    th.addEventListener('click', function (ev) { var t = ev.target.closest('button'); if (!t) return; big.src = t.dataset.u; th.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === t); }); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg || ev.target.closest('.plb-x')) dlg.close(); });
  }
})();
