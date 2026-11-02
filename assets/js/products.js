(function () {
  var $ = function (s) { return document.querySelector(s); };
  var grid = $('#pg') || $('#ug') || $('.pgrid'); if (!grid) return;
  var ugrid = $('#ug');
  var q = $('#pq'), mk = $('#pm'), chips = $('#pc'), cnt = $('#pn'), none = $('#p0'), more = $('#pmore');
  var udata = $('#udata') ? JSON.parse($('#udata').textContent) : null;
  var ui = $('#ui') ? JSON.parse($('#ui').textContent) : null;
  var cat = '', PAGE = ui && ui.table ? 100 : 48, shown = PAGE;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // hash: #c=<category>[&t=<part type>] preselects a category / part type (links from the home page and the category map)
  var pt = '', subs = $('#pt');
  var readHash = function () {
    if (location.hash === '#all') { cat = ''; pt = ''; if (mk) mk.value = ''; return true; }
    var h = location.hash.match(/[#&]c=([a-z_]+)/), t = location.hash.match(/[#&]t=([a-z_]+)/), m = location.hash.match(/[#&]m=([^&]+)/);
    if (!h && !m) {
      if (location.hash) return false;
      cat = ''; pt = ''; if (mk) mk.value = '';     // back to the page without a hash: the filter goes too
      return true;
    }
    cat = h ? h[1] : ''; pt = t ? t[1] : '';
    if (mk) { mk.value = ''; if (m) { try { mk.value = decodeURIComponent(m[1]); } catch (e) {} } }
    return true;
  };
  readHash();
  var setChip = function () { chips.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('on', b.dataset.c === cat); }); };
  // P/N list: second chip row with the part types of the chosen category
  var renderSubs = function () {
    if (!subs || !udata) return;
    if (!cat) { subs.hidden = true; subs.innerHTML = ''; return; }
    var n = {}, all = 0;
    udata.forEach(function (d) { if (d.c === cat) { n[d.k] = (n[d.k] || 0) + d.p.length; all += d.p.length; } });
    document.querySelectorAll('#pcards .pc[data-only]').forEach(function (a) { if (a.dataset.c === cat) { n[a.dataset.k] = (n[a.dataset.k] || 0) + 1; all++; } });
    subs.innerHTML = '<button type="button" class="chip' + (pt ? '' : ' on') + '" data-t="">' + esc(ui.all_pt) + '<span>' + all + '</span></button>' +
      Object.keys(ui.pts).filter(function (k) { return n[k]; }).map(function (k) {
        return '<button type="button" class="chip' + (k === pt ? ' on' : '') + '" data-t="' + k + '">' + esc(ui.pts[k]) + '<span>' + n[k] + '</span></button>';
      }).join('');
    subs.hidden = false;
  };
  var putHash = function () {
    try { history.replaceState(null, '', cat ? '#c=' + cat + (pt ? '&t=' + pt : '') : location.pathname); } catch (e) {}
  };
  var words = function () { return q.value.toLowerCase().split(/\s+/).filter(Boolean); };
  var match = function (c, m, text, k) {
    if (cat && c !== cat) return false;
    if (pt && k !== undefined && k !== pt) return false;
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
      '<div class="pc-b"><span class="pc-tag ' + (ui.tagc || 't-used') + '">' + esc(ui.used) + '</span><h3>' + esc(d.n) + '</h3><dl>' +
      (d.p.length ? '<dt>' + esc(ui.oem) + '</dt><dd>' + esc(d.p.slice(0, 3).join(' / ')) + (d.p.length > 3 ? ' <span class="pc-more">+' + (d.p.length - 3) + '</span>' : '') + '</dd>' : '') +
      '<dt>' + esc(ui.our) + '</dt><dd class="our">' + esc(d.o) + '</dd></dl>' +
      '<a class="pc-ask" href="' + esc(mail(d)) + '">' + esc(ui.ask) + '</a></div></article>';
  };
  // P/N list page: a plain table row (no photo box) per 29TECH P/N
  var urow = function (d) {
    return '<tr><td class="t-mk">' + esc(d.m || '—') + '</td><td class="t-ty">' + esc(ui.pts[d.k] || d.n) + '</td><td class="t-pn">' + esc(d.p.join(' / ')) +
      '</td><td class="t-our">' + esc(d.o) + '</td><td class="t-ask"><a href="' + esc(mail(d)) + '">' + esc(ui.ask_s || ui.ask) + '</a></td></tr>';
  };
  // left tree: open the current category, mark the current part type; heading and breadcrumb follow
  var markTree = function () {
    document.querySelectorAll('.pt-cat').forEach(function (b) { b.classList.toggle('open', b.dataset.c === cat); });
    document.querySelectorAll('.pt-c').forEach(function (a) { a.classList.toggle('on', a.dataset.c === cat && !pt); });
    document.querySelectorAll('.pt-t').forEach(function (a) { a.classList.toggle('on', a.dataset.t === pt && a.dataset.c === cat); });
    var all = $('.pt-all'); if (all) all.classList.toggle('on', !cat && !!ui && !!ui.table);
    if (!ui || !ui.table) return;
    var hd = $('#phd'), bc = $('#pbc-c'), bt = $('#pbc-t'), cl = cat ? ui.pcs[cat] : '', tl = pt ? ui.pts[pt] : '';
    if (hd) { hd.hidden = !cat; hd.textContent = tl || cl; }
    if (bc) { bc.hidden = !cat; bc.textContent = cl; }
    if (bt) { bt.hidden = !pt; bt.textContent = tl; }
  };
  var tmw = $('.ptm-w'); if (tmw) tmw.scrollLeft = (tmw.scrollWidth - tmw.clientWidth) / 2;   // phones: start at the trunk
  var treeBtn = $('.ptree-btn'), tree = $('.ptree');
  if (treeBtn && tree) treeBtn.addEventListener('click', function () { var o = tree.classList.toggle('open'); treeBtn.setAttribute('aria-expanded', o); });
  if (tree) tree.addEventListener('click', function (ev) { if (ev.target.closest('a') && treeBtn) { tree.classList.remove('open'); treeBtn.setAttribute('aria-expanded', false); } });
  var apply = function () {
    var n = 0;
    if (udata) {
      var hit = udata.filter(function (d) { return match(d.c, d.m, (d.n + ' ' + d.p.join(' ') + ' ' + d.o + ' ' + d.m).toLowerCase(), d.k); });
      n = ui.table ? hit.reduce(function (a, d) { return a + d.p.length; }, 0) : hit.length;
      var cards = document.querySelectorAll('#pcards .pc'), shownCards = 0;
      cards.forEach(function (a) {
        var ok = match(a.dataset.c, a.dataset.m, a.dataset.q, a.dataset.k); a.hidden = !ok;
        if (ok) { shownCards++; if (a.dataset.only) n++; }
      });
      var wrap = $('#pcwrap'); if (wrap) wrap.hidden = !(shownCards && (ui.always || cat || mk.value || words().length));
      (ugrid || grid).innerHTML = hit.slice(0, shown).map(ui.table ? urow : ucard).join('');
      more.hidden = hit.length <= shown;
    } else {
      document.querySelectorAll('.pgrid .pc').forEach(function (a) {
        var ok = match(a.dataset.c, a.dataset.m, a.dataset.q); a.hidden = !ok; if (ok) n++;
      });
      document.querySelectorAll('.psec').forEach(function (h) {   // hide a section heading whose grid is empty
        var g = h.nextElementSibling; if (g) h.hidden = g.hidden = !g.querySelector('.pc:not([hidden])');
      });
      document.querySelectorAll('.ptier').forEach(function (t) {  // hide a maker-tier label with no visible group under it
        var el = t.nextElementSibling, any = false;
        while (el && !el.classList.contains('ptier')) { if (el.classList.contains('pgrid') && !el.hidden) any = true; el = el.nextElementSibling; }
        t.hidden = !any;
      });
    }
    cnt.textContent = cnt.dataset.t.replace('{n}', n.toLocaleString()); none.hidden = n > 0;
    markTree();
  };
  chips.addEventListener('click', function (ev) {
    var b = ev.target.closest('.chip'); if (!b) return;
    cat = b.dataset.c; pt = ''; shown = PAGE; setChip(); renderSubs(); apply(); putHash();
  });
  if (subs) subs.addEventListener('click', function (ev) {
    var b = ev.target.closest('.chip'); if (!b) return;
    pt = b.dataset.t; shown = PAGE; renderSubs(); apply(); putHash();
  });
  // in-page links to #c=… (category map on the parts-repair page) filter the photo grid and scroll to it
  window.addEventListener('hashchange', function () {
    if (!readHash()) return;
    shown = PAGE; setChip(); renderSubs(); apply();
    var t = document.querySelector('.ptool'); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  });
  q.addEventListener('input', function () { shown = PAGE; apply(); });
  mk.addEventListener('change', function () { shown = PAGE; apply(); });
  if (more) more.addEventListener('click', function () { shown += PAGE; apply(); });
  document.querySelectorAll('.poem-g button').forEach(function (b) {
    b.addEventListener('click', function () {
      mk.value = b.dataset.mk; cat = ''; pt = ''; setChip(); renderSubs(); shown = PAGE; apply();
      var t = document.querySelector('.ptool'); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
    });
  });
  setChip(); renderSubs(); apply();

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
