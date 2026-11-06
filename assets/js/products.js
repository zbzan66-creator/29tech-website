(function () {
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // photo viewer — set up first and looked up on each click, so it works on every catalog page whatever the order of
  // the <dialog> and this script (2026-11-07: the dialog came after the script and no photo ever opened)
  var lbOn = false;
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('.pc-ph') : null; if (!b) return;
    var dlg = $('#plb'), big = $('#plb-img'), th = $('#plb-th');
    if (!dlg || !dlg.showModal || !big || !th || !b.querySelector('img')) return;
    var g; try { g = JSON.parse(b.dataset.g || '[]'); } catch (e) { g = []; }
    if (!g.length) return;
    if (!lbOn) {
      lbOn = true;
      th.addEventListener('click', function (e2) { var t = e2.target.closest('button'); if (!t) return; big.src = t.dataset.u; th.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === t); }); });
      dlg.addEventListener('click', function (e2) { if (e2.target === dlg || e2.target.closest('.plb-x')) dlg.close(); });
    }
    big.src = g[0]; big.alt = b.getAttribute('aria-label') || '';
    th.innerHTML = g.length > 1 ? g.map(function (u, i) { return '<button type="button" data-u="' + esc(u) + '"' + (i ? '' : ' class="on"') + '><img src="' + esc(u) + '" alt=""></button>'; }).join('') : '';
    if (!dlg.open) dlg.showModal();
  });

  var grid = $('#pg') || $('#ug') || $('.pgrid'); if (!grid) return;
  var ugrid = $('#ug');
  var q = $('#pq'), mk = $('#pm'), chips = $('#pc'), cnt = $('#pn'), none = $('#p0'), more = $('#pmore');
  if (!q || !chips || !cnt || !none) return;
  var sq = new URLSearchParams(location.search).get('q'); if (sq) q.value = sq;   // ?q= from the home page search
  var udata = $('#udata') ? JSON.parse($('#udata').textContent) : null;
  var ui = $('#ui') ? JSON.parse($('#ui').textContent) : null;
  var cat = '', PAGE = ui && ui.table ? 100 : 48, shown = PAGE, hit = [];
  var noneTxt = none.textContent;
  // search text: full-width IME input, odd hyphens and zero-width spaces are folded; '019015840' also finds 0190-15840
  var norm = function (s) {
    s = String(s || ''); if (s.normalize) s = s.normalize('NFKC');
    return s.toLowerCase().replace(/[​-‍﻿]/g, '').replace(/[‐-―−]/g, '-');
  };
  var compact = function (s) { return norm(s).replace(/[^0-9a-z぀-ヿ㐀-鿿가-힯]/g, ''); };
  var kwOf = function (k) { return (ui && ui.kw && ui.kw[k]) || ''; };
  var alOf = function (m) { return (ui && ui.alias && ui.alias[m]) || ''; };
  if (udata) udata.forEach(function (d) {
    if (!d.n) d.n = ((d.m || '') + ' ' + ((ui && ui.pts && ui.pts[d.k]) || '')).trim();
    if (!d.i) d.i = '';
    d._h = norm(d.n + ' ' + d.p.join(' ') + ' ' + d.o + ' ' + d.m + ' ' + kwOf(d.k) + ' ' + alOf(d.m));
    d._c = d.p.concat([d.o, d.m, d.n]).map(compact).join('|');
  });
  var cards = document.querySelectorAll(udata ? '#pcards .pc' : '.pgrid .pc');
  cards.forEach(function (a) {
    var al = (a.dataset.m || '').split('|').map(alOf).join(' ');
    a._h = norm((a.dataset.q || '') + ' ' + al + ' ' + kwOf(a.dataset.k)); a._c = compact(a.dataset.q || '');
  });
  // the maker <select> lists the bigger makers only; a #m= link to a smaller one adds its option
  var setMk = function (v) {
    if (!mk) return; mk.value = '';
    if (!v) return;
    if (![].some.call(mk.options, function (o) { return o.value === v; })) mk.add(new Option(v, v));
    mk.value = v;
  };
  // hash: #c=<category>[&t=<part type>] preselects a category / part type (links from the home page and the category map)
  var pt = '', subs = $('#pt');
  var readHash = function () {
    if (location.hash === '#all') { cat = ''; pt = ''; setMk(''); return true; }
    var h = location.hash.match(/[#&]c=([a-z_]+)/), t = location.hash.match(/[#&]t=([a-z_]+)/), m = location.hash.match(/[#&]m=([^&]+)/);
    if (!h && !m) {
      if (location.hash) return false;
      cat = ''; pt = ''; setMk('');     // back to the page without a hash: the filter goes too
      return true;
    }
    cat = h ? h[1] : ''; pt = t ? t[1] : '';
    var v = ''; if (m) { try { v = decodeURIComponent(m[1]); } catch (e) {} }
    setMk(v);
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
    subs.innerHTML = '<button type="button" class="chip' + (pt ? '' : ' on') + '" data-t="">' + esc(ui.all_pt) + '<span>' + all.toLocaleString() + '</span></button>' +
      Object.keys(ui.pts).filter(function (k) { return n[k]; }).map(function (k) {
        return '<button type="button" class="chip' + (k === pt ? ' on' : '') + '" data-t="' + k + '">' + esc(ui.pts[k]) + '<span>' + n[k].toLocaleString() + '</span></button>';
      }).join('');
    subs.hidden = false;
  };
  var putHash = function () {
    try { history.replaceState(null, '', cat ? '#c=' + cat + (pt ? '&t=' + pt : '') : location.pathname + location.search); } catch (e) {}
  };
  var W = [];      // query words: [{w: folded word, c: alphanumerics only}]
  var words = function () { return norm(q.value).split(/\s+/).filter(Boolean); };
  var match = function (c, m, h, cc, k) {
    if (cat && c !== cat) return false;
    if (pt && k !== undefined && k !== pt) return false;
    if (mk && mk.value && ('|' + m + '|').indexOf('|' + mk.value + '|') < 0) return false;
    for (var i = 0; i < W.length; i++) { if (h.indexOf(W[i].w) < 0 && !(W[i].c.length >= 4 && cc.indexOf(W[i].c) >= 0)) return false; }
    return true;
  };
  var mail = function (d) {
    var body = ui.body.replace('{name}', d.n).replace('{oem}', d.p.length ? ui.oem + (ui.colon || '：') + d.p.join(' / ') : '').replace('{our}', d.o);
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
  // P/N list page: a plain table row (no photo box) per 29TECH P/N; on phones td.t-pn shows its label (data-l)
  var urow = function (d) {
    var has = ui.th && Object.keys(ui.th).length, tn = has && ui.th[d.k] ? 'tc-' + d.k : '';
    return '<tr>' + (has ? '<td class="t-im">' + (tn ? '<button type="button" class="pc-ph" data-g="' + esc(JSON.stringify([ui.pimg + tn + '.jpg'])) + '" aria-label="' + esc(d.n) + '"><img src="' + ui.pimg + tn + '_t.jpg" alt="" loading="lazy" decoding="async"></button>' : '') + '</td>' : '') + '<td class="t-mk">' + esc(d.m || '—') + '</td><td class="t-ty">' + esc(ui.pts[d.k] || d.n) + '</td><td class="t-pn" data-l="' + esc(ui.pl || ui.oem) + '">' + esc(d.p.join(' / ')) +
      '</td><td class="t-our">' + esc(d.o) + '</td><td class="t-ask"><a href="' + esc(mail(d)) + '">' + esc(ui.ask_s || ui.ask) + '</a></td></tr>';
  };
  // left tree: open the current category, mark the current part type; heading and breadcrumb follow
  var markTree = function () {
    document.querySelectorAll('.pt-cat').forEach(function (b) { b.classList.toggle('open', b.dataset.c === cat); });
    document.querySelectorAll('.pt-c').forEach(function (a) { a.classList.toggle('on', a.dataset.c === cat && !pt); });
    document.querySelectorAll('.pt-t').forEach(function (a) { a.classList.toggle('on', a.dataset.t === pt && a.dataset.c === cat); });
    var all = $('.pt-all'); if (all) all.classList.toggle('on', !cat && !!ui && !!ui.table);
    if (!ui || !ui.table) return;
    var hd = $('#phd'), bc = $('#pbc-c'), bt = $('#pbc-t'), cl = cat ? ui.pcs[cat] : '', tl = pt ? ui.pts[pt] : '', mv = mk ? mk.value : '';
    if (hd) { hd.hidden = !cat && !mv; hd.textContent = tl || cl || mv; }
    if (bc) { bc.hidden = !cat; bc.textContent = cl; }
    if (bt) { bt.hidden = !pt; bt.textContent = tl; }
  };
  var tmw = $('.ptm-w'); if (tmw) tmw.scrollLeft = (tmw.scrollWidth - tmw.clientWidth) / 2;   // phones: start at the trunk
  var treeBtn = $('.ptree-btn'), tree = $('.ptree');
  if (treeBtn && tree) treeBtn.addEventListener('click', function () { var o = tree.classList.toggle('open'); treeBtn.setAttribute('aria-expanded', o); });
  if (tree) tree.addEventListener('click', function (ev) { if (ev.target.closest('a') && treeBtn) { tree.classList.remove('open'); treeBtn.setAttribute('aria-expanded', false); } });
  // nothing found: say so, and offer the same search in the other catalogs
  var noneMsg = function () {
    var v = q.value.trim(), links = '';
    if (v && ui && ui.lk) {
      links = Object.keys(ui.lk).map(function (f) { return '<a href="' + f + '?q=' + encodeURIComponent(v) + '">' + esc(ui.lk[f]) + ' ›</a>'; }).join('');
      if (links) links = '<span class="p0-l"><b>' + esc(ui.see_in || '') + '</b>' + links + '</span>';
    } else if (v && none.dataset.l) {
      links = '<span class="p0-l"><a href="list.html?q=' + encodeURIComponent(v) + '">' + esc(none.dataset.l) + '</a></span>';
    }
    none.innerHTML = esc(noneTxt) + links;
  };
  var rowsHtml = function (from, to) { return hit.slice(from, to).map(ui.table ? urow : ucard).join(''); };
  var apply = function () {
    W = words().map(function (w) { return { w: w, c: compact(w) }; });
    var n = 0, shownCards = 0;
    if (udata) {
      hit = udata.filter(function (d) { return match(d.c, d.m, d._h, d._c, d.k); });
      n = ui.table ? hit.reduce(function (a, d) { return a + d.p.length; }, 0) : hit.length;
      cards.forEach(function (a) {
        var ok = match(a.dataset.c, a.dataset.m, a._h, a._c, a.dataset.k); a.hidden = !ok;
        if (ok) { shownCards++; if (a.dataset.only) n++; }
      });
      var wrap = $('#pcwrap'); if (wrap) wrap.hidden = !(shownCards && (ui.always || cat || (mk && mk.value) || W.length));
      (ugrid || grid).innerHTML = rowsHtml(0, shown);
      if (more) more.hidden = hit.length <= shown;
      var tw = $('.ptbl-w'); if (tw) tw.hidden = !hit.length;
    } else {
      cards.forEach(function (a) {
        var ok = match(a.dataset.c, a.dataset.m, a._h, a._c); a.hidden = !ok; if (ok) { n++; shownCards++; }
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
    cnt.textContent = (n === 1 && cnt.dataset.t1 ? cnt.dataset.t1 : cnt.dataset.t).replace('{n}', n.toLocaleString());
    none.hidden = n > 0 || shownCards > 0;
    if (!none.hidden) noneMsg();
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
    if (!location.hash) return;
    var t = document.querySelector('.ptool'); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  });
  var tmr = 0;     // typing: one filter pass after a short pause, not one per keystroke over 50,000 rows
  q.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(function () { shown = PAGE; apply(); }, 120); });
  q.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' || ev.isComposing) return;
    ev.preventDefault(); clearTimeout(tmr); shown = PAGE; apply(); q.blur();     // phones: the keyboard goes away and the results show
  });
  if (mk) mk.addEventListener('change', function () { shown = PAGE; apply(); });
  if (more && udata) more.addEventListener('click', function () {   // Load more: add the next rows, keep the ones already shown
    var from = shown; shown += PAGE;
    (ugrid || grid).insertAdjacentHTML('beforeend', rowsHtml(from, shown));
    more.hidden = hit.length <= shown;
  });
  document.querySelectorAll('.poem-g button').forEach(function (b) {
    b.addEventListener('click', function () {
      setMk(b.dataset.mk); cat = ''; pt = ''; setChip(); renderSubs(); shown = PAGE; apply();
      var t = document.querySelector('.ptool'); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
    });
  });
  setChip(); renderSubs(); apply();
  if (sq && cnt.scrollIntoView) cnt.scrollIntoView({ block: 'start' });   // arriving from the home search: start at the results
})();
