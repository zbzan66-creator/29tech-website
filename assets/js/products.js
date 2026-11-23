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

  var tmw = $('.ptm-w'); if (tmw) tmw.scrollLeft = (tmw.scrollWidth - tmw.clientWidth) / 2;   // phones: start at the trunk

  // ---- filter sidebar (2026-11-13): search within results + collapsible sections of checkboxes, every count live ----
  // state: C (categories: one on nested pages, where its part types sit under it; several, OR, on 装置 / 改造 — fix3),
  // T (part types: one, nested under the category — or several on 装置 / 改造), M (makers), MT (メーカー区分)
  // URL: ?q=<search>#c=<cat>[|<cat>]&t=<type>[|<type>]&m=<maker>[|<maker>]&mt=oem|gen  (makers URL-encoded; #all = everything)
  var grid = $('#pg') || $('#ug') || $('.pgrid'); if (!grid) return;
  var ugrid = $('#ug');
  var q = $('#pq'), cnt = $('#pn'), none = $('#p0'), more = $('#pmore'), fx = $('#fx'), bar = $('#fxbar');
  if (!q || !cnt || !none || !fx) return;
  var sq = new URLSearchParams(location.search).get('q'); if (sq) q.value = sq;   // ?q= from the home page search
  var udata = $('#udata') ? JSON.parse($('#udata').textContent) : null;
  var ui = $('#ui') ? JSON.parse($('#ui').textContent) : {};
  var TABLE = !!ui.table, PAGE = TABLE ? 100 : 48, shown = PAGE, hit = [];
  var nest = fx.dataset.nest === '1';
  var noneTxt = none.textContent;
  var C = [], T = [], M = [], MT = [];
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  // search text: full-width IME input, odd hyphens and zero-width spaces are folded; '019015840' also finds 0190-15840
  var norm = function (s) {
    s = String(s || ''); if (s.normalize) s = s.normalize('NFKC');
    return s.toLowerCase().replace(/[​-‍﻿]/g, '').replace(/[‐-―−]/g, '-');
  };
  var compact = function (s) { return norm(s).replace(/[^0-9a-z぀-ヿ㐀-鿿가-힯]/g, ''); };
  var kwOf = function (k) { return (ui.kw && ui.kw[k]) || ''; };
  var alOf = function (m) { return (ui.alias && ui.alias[m]) || ''; };
  var OEM = {}; (ui.oems || []).forEach(function (m) { OEM[m] = 1; });
  var clsOf = function (ms) { var x = []; ms.forEach(function (m) { var k = OEM[m] ? 'oem' : 'gen'; if (x.indexOf(k) < 0) x.push(k); }); return x; };

  // every result in one array: table rows (udata) and photo cards. w = what it adds to the count: a row its OEM P/Ns,
  // a card 1 when its number is not in the table (data-only) or on the photo page — the page totals use the same rule
  var items = [];
  if (udata) udata.forEach(function (d) {
    if (!d.n) d.n = ((d.m || '') + ' ' + ((ui.pts && ui.pts[d.k]) || '')).trim();
    if (!d.i) d.i = '';
    d._h = norm(d.n + ' ' + d.p.join(' ') + ' ' + d.o + ' ' + d.m + ' ' + kwOf(d.k) + ' ' + alOf(d.m));
    d._c = d.p.concat([d.o, d.m, d.n]).map(compact).join('|');
    d.ms = d.m ? [d.m] : []; d.x = clsOf(d.ms); d.w = TABLE ? d.p.length : 1; d.s = true;
    items.push(d);
  });
  var cards = document.querySelectorAll(udata ? '#pcards .pc' : '.pgrid .pc');
  cards.forEach(function (a) {
    var ms = []; (a.dataset.m || '').split('|').forEach(function (m) { if (m && ms.indexOf(m) < 0) ms.push(m); });
    var al = ms.map(alOf).join(' ');
    items.push({ el: a, c: a.dataset.c || '', k: a.dataset.k || '', ms: ms, x: clsOf(ms), w: udata ? (a.dataset.only ? 1 : 0) : 1, s: true,
      _h: norm((a.dataset.q || '') + ' ' + al + ' ' + kwOf(a.dataset.k)), _c: compact(a.dataset.q || '') });
  });

  // sidebar elements
  var rowsIn = function (root, sel) {
    return [].map.call(root.querySelectorAll(sel), function (r) { var i = r.querySelector('input'); return { r: r, i: i, b: r.querySelector('b'), v: i.value }; });
  };
  var CATS = [].map.call(fx.querySelectorAll('.fx-c'), function (w) {
    var r = w.firstElementChild, sub = w.querySelector('.fx-sub');
    return { w: w, r: r, i: r.querySelector('input'), b: r.querySelector('b'), v: w.dataset.c, sub: sub, ts: sub ? rowsIn(sub, '.fx-r') : [] };
  });
  var GRPS = fx.querySelectorAll('.fx-gw');
  var SEP = rowsIn(fx, '.fx-s[data-s="t"] .fx-r'), XR = rowsIn(fx, '.fx-s[data-s="mt"] .fx-r');
  var CATV = {}, TCAT = {};      // valid categories; part type -> its category (nested pages) or '' (own section)
  CATS.forEach(function (o) { CATV[o.v] = 1; o.ts.forEach(function (t) { TCAT[t.v] = o.v; }); });
  SEP.forEach(function (o) { TCAT[o.v] = ''; });
  var TOP = 15, STEP = 50, mkBox = $('#fxm'), mkQ = $('#fxmq'), mkMore = $('#fxmore'), mk0 = $('#fxm0'), mkLim = TOP, mkLess = false;
  var HN = {}, SET = {}, ZT = fx.dataset.z || '';   // section -> count in its header / open-close setter; 「該当なし」 text
  var openBtn = $('.fx-open'), badge = openBtn ? openBtn.querySelector('.fx-badge') : null, goBtn = fx.querySelector('.fx-go'), allA = fx.querySelector('.fx-all');
  var secTitle = function (s) { var b = fx.querySelector('.fx-s[data-s="' + s + '"] .fx-tg > span:first-child'); return b ? b.textContent : ''; };
  var labOf = function (name, v) {
    var i = [].filter.call(fx.querySelectorAll('input[name="' + name + '"]'), function (x) { return x.value === v; })[0];
    return i ? i.parentNode.querySelector('span').textContent : ((name === 't' && ui.pts && ui.pts[v]) || (name === 'c' && ui.pcs && ui.pcs[v]) || v);
  };
  var tog = function (a, v, on) { a = a.filter(function (x) { return x !== v; }); if (on) a.push(v); return a; };
  var active = function () { return !!(C.length || T.length || M.length || MT.length || q.value.trim()); };
  // ticked options per section (nested part types belong to the category section)
  var secN = function (s) { return s === 'c' ? C.length + (nest ? T.length : 0) : s === 't' ? (nest ? 0 : T.length) : s === 'mt' ? MT.length : s === 'm' ? M.length : 0; };

  // hash: #c=<category>[&t=<part type>] (home page, category map), #m=<maker> (maker tiles), several values joined by '|'
  var uniq = function (v, i, a) { return a.indexOf(v) === i; };
  var readHash = function () {
    var hs = location.hash, hp = hs.replace(/%7C/gi, '|');      // a '|' that arrives encoded still separates
    if (hs === '#all') { C = []; T = []; M = []; MT = []; return true; }
    var h = hp.match(/[#&]c=([a-z_|]+)/), t = hp.match(/[#&]t=([a-z_|]+)/), m = hs.match(/[#&]m=([^&]+)/), x = hp.match(/[#&]mt=([a-z|]+)/);
    if (!h && !t && !m && !x) {
      if (hs) return false;           // #photos, #m-rf … are anchors, not filters
      C = []; T = []; M = []; MT = [];     // back to the page without a hash: the filter goes too
      return true;
    }
    C = h ? h[1].split('|').filter(function (v, i, a) { return own(CATV, v) && uniq(v, i, a); }) : [];
    T = t ? t[1].split('|').filter(function (v, i, a) { return own(TCAT, v) && uniq(v, i, a); }) : [];
    if (nest) {
      C = C.slice(0, 1);
      if (!C.length && T.length) C = [TCAT[T[0]]];                    // #t=rfgen alone: its category
      T = T.filter(function (v) { return TCAT[v] === C[0]; }).slice(0, 1);
    }
    M = [];
    if (m) m[1].split(/\||%7C/i).forEach(function (v) { try { v = decodeURIComponent(v); } catch (e) {} v = v.trim(); if (v && M.indexOf(v) < 0) M.push(v); });
    MT = x ? x[1].split('|').filter(function (v, i, a) { return uniq(v, i, a) && XR.some(function (o) { return o.v === v; }); }) : [];
    return true;
  };
  var putHash = function () {
    var h = [];
    if (C.length) h.push('c=' + C.join('|'));
    if (T.length) h.push('t=' + T.join('|'));
    if (M.length) h.push('m=' + M.map(encodeURIComponent).join('|'));
    if (MT.length) h.push('mt=' + MT.join('|'));
    var sp = new URLSearchParams(location.search), v = q.value.trim();
    if (v) sp.set('q', v); else sp.delete('q');
    var s = sp.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + (h.length ? '#' + h.join('&') : '')); } catch (e) {}
  };

  var W = [], lastQ = null;      // query words: [{w: folded word, c: alphanumerics only}]
  var searchPass = function () {
    W = norm(q.value).split(/\s+/).filter(Boolean).map(function (w) { return { w: w, c: compact(w) }; });
    var key = W.map(function (x) { return x.w; }).join(' ');
    if (key === lastQ) return;      // facet clicks reuse the last search result
    lastQ = key;
    for (var i = 0; i < items.length; i++) {
      var d = items[i], ok = true;
      for (var j = 0; j < W.length; j++) { if (d._h.indexOf(W[j].w) < 0 && !(W[j].c.length >= 4 && d._c.indexOf(W[j].c) >= 0)) { ok = false; break; } }
      d.s = ok;
    }
  };
  var mail = function (d) {
    var body = ui.body.replace('{name}', d.n).replace('{oem}', d.p.length ? ui.oem + (ui.colon || '：') + d.p.join(' / ') : '').replace('{our}', d.o);
    return 'mailto:' + ui.mail + '?subject=' + encodeURIComponent(ui.subj + ' ' + d.o) + '&body=' + encodeURIComponent(body);
  };
  var ucard = function (d) {
    var g = esc(JSON.stringify([ui.img + d.i + '.jpg']));
    return '<article class="pc"><button type="button" class="pc-ph" data-g="' + g + '" aria-label="' + esc(d.n) + '">' +
      (d.i ? '<img src="' + ui.img + d.i + '.jpg" alt="' + esc(d.n) + '" loading="lazy" decoding="async">' : '<span class="pc-noimg"><b>' + esc(d.m || 'OEM') + '</b><small>' + esc((ui.cats && ui.cats[d.c]) || '') + '</small></span>') + '</button>' +
      '<div class="pc-b"><span class="pc-tag ' + (ui.tagc || 't-used') + '">' + esc(ui.used) + '</span><h3>' + esc(d.n) + '</h3><dl>' +
      (d.p.length ? '<dt>' + esc(ui.oem) + '</dt><dd>' + esc(d.p.slice(0, 3).join(' / ')) + (d.p.length > 3 ? ' <span class="pc-more">+' + (d.p.length - 3) + '</span>' : '') + '</dd>' : '') +
      '<dt>' + esc(ui.our) + '</dt><dd class="our">' + esc(d.o) + '</dd></dl>' +
      '<a class="pc-ask" href="' + esc(mail(d)) + '">' + esc(ui.ask) + '</a></div></article>';
  };
  // P/N list page: a plain table row (no photo box) per 29TECH P/N; on phones td.t-pn shows its label (data-l)
  var urow = function (d) {
    var has = ui.th && Object.keys(ui.th).length, tn = has && ui.th[d.k] ? 'tc-' + d.k : '';
    return '<tr>' + (has ? '<td class="t-im">' + (tn ? '<button type="button" class="pc-ph" data-g="' + esc(JSON.stringify([ui.pimg + tn + '.jpg'])) + '" aria-label="' + esc(d.n) + '"><img src="' + ui.pimg + tn + '_t.jpg" alt="" loading="lazy" decoding="async"></button>' : '') + '</td>' : '') + '<td class="t-mk">' + esc(d.m || '—') + '</td><td class="t-ty">' +
      // 2026-11-17 (used.html): a row with its own reviewed photo shows a small thumbnail that opens the photo
      (d.i && !has ? '<button type="button" class="pc-ph t-uph" data-g="' + esc(JSON.stringify([ui.img + d.i + '.jpg'])) + '" aria-label="' + esc(d.ic || d.n) + '"><img src="' + ui.img + d.i + '_t.jpg" alt="' + esc(d.ic || d.n) + '" loading="lazy" decoding="async"></button>' : '') +
      esc((ui.pts && ui.pts[d.k]) || d.n) + '</td><td class="t-pn" data-l="' + esc(ui.pl || ui.oem) + '">' + esc(d.p.join(' / ')) +
      '</td><td class="t-our">' + esc(d.o) + '</td><td class="t-ask"><a href="' + esc(mail(d)) + '">' + esc(ui.ask_s || ui.ask) + '</a></td></tr>';
  };
  var rowsHtml = function (from, to) { return hit.slice(from, to).map(TABLE ? urow : ucard).join(''); };
  // nothing found: say so, and offer the same search in the other catalogs
  var noneMsg = function () {
    var v = q.value.trim(), links = '';
    if (v && ui.lk) {
      links = Object.keys(ui.lk).map(function (f) { return '<a href="' + f + '?q=' + encodeURIComponent(v) + '">' + esc(ui.lk[f]) + ' ›</a>'; }).join('');
      if (links) links = '<span class="p0-l"><b>' + esc(ui.see_in || '') + '</b>' + links + '</span>';
    } else if (v && none.dataset.l) {
      links = '<span class="p0-l"><a href="list.html?q=' + encodeURIComponent(v) + '">' + esc(none.dataset.l) + '</a></span>';
    }
    none.innerHTML = esc(noneTxt) + links;
  };

  // one pass over every result: a result failing exactly the filters a section ignores still counts in that section,
  // so each option shows what ticking it would return (search + the other sections applied)
  var CC = {}, TC = {}, MC = {}, XC = {}, N = 0;
  var apply = function () {
    searchPass();
    var Cset = {}, Mset = {}, Tset = {}, Xset = {}, i, j;
    C.forEach(function (c) { Cset[c] = 1; }); M.forEach(function (m) { Mset[m] = 1; }); T.forEach(function (t) { Tset[t] = 1; }); MT.forEach(function (x) { Xset[x] = 1; });
    var hasC = C.length > 0, hasT = T.length > 0, hasM = M.length > 0, hasX = MT.length > 0, exC = nest ? 6 : 2;   // nested: other categories ignore the part type too
    CC = {}; TC = {}; MC = {}; XC = {}; hit = [];
    var n = 0, shownCards = 0;
    for (i = 0; i < items.length; i++) {
      var d = items[i], f = d.s ? 0 : 1, ok;
      if (hasC && Cset[d.c] !== 1) f |= 2;
      if (hasT && !Tset[d.k]) f |= 4;
      if (hasM) { ok = false; for (j = 0; j < d.ms.length; j++) if (Mset[d.ms[j]]) { ok = true; break; } if (!ok) f |= 8; }
      if (hasX) { ok = false; for (j = 0; j < d.x.length; j++) if (Xset[d.x[j]]) { ok = true; break; } if (!ok) f |= 16; }
      if (d.el) { d.el.hidden = f !== 0; if (!f) shownCards++; } else if (!f) hit.push(d);
      var w = d.w; if (!w) continue;
      if (!f) n += w;
      if (!(f & ~exC)) CC[d.c] = (CC[d.c] || 0) + w;
      if (!(f & ~4)) TC[d.k] = (TC[d.k] || 0) + w;
      if (!(f & ~8)) for (j = 0; j < d.ms.length; j++) MC[d.ms[j]] = (MC[d.ms[j]] || 0) + w;
      if (!(f & ~16)) for (j = 0; j < d.x.length; j++) XC[d.x[j]] = (XC[d.x[j]] || 0) + w;
    }
    N = n;
    if (udata) {
      var wrap = $('#pcwrap'); if (wrap) wrap.hidden = !(shownCards && (ui.always || active()));
      (ugrid || grid).innerHTML = rowsHtml(0, shown);
      if (more) more.hidden = hit.length <= shown;
      var tw = $('.ptbl-w'); if (tw) tw.hidden = !hit.length;
    } else {
      document.querySelectorAll('.psec').forEach(function (h) {   // a maker heading counts its visible cards (fix3); hidden when none
        var g = h.nextElementSibling; if (!g) return;
        var k = g.querySelectorAll('.pc:not([hidden])').length, sp = h.querySelector('span');
        h.hidden = g.hidden = !k;
        if (sp && g.classList.contains('pgrid')) sp.textContent = (k === 1 && cnt.dataset.t1 ? cnt.dataset.t1 : cnt.dataset.t).replace('{n}', k.toLocaleString());
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
    renderSide(); renderBar(); markHead();
  };

  // sidebar: counts, ticks, zero options (a ticked one stays, greyed; an unticked one is hidden)
  var paint = function (o, n, on) {
    o.i.checked = on; o.r.classList.toggle('on', on); o.r.classList.toggle('z', !n);
    o.b.textContent = n.toLocaleString(); o.r.hidden = !n && !on;
  };
  var renderSide = function () {
    CATS.forEach(function (o) {
      var on = C.indexOf(o.v) >= 0;
      paint(o, CC[o.v] || 0, on); o.w.hidden = o.r.hidden; o.r.hidden = false;
      if (o.sub) {
        o.sub.hidden = !on || !o.ts.length;
        if (on) o.ts.forEach(function (t) { paint(t, TC[t.v] || 0, T.indexOf(t.v) >= 0); });
      }
    });
    [].forEach.call(GRPS, function (g) { g.hidden = !g.querySelector('.fx-c:not([hidden])'); });
    SEP.forEach(function (o) { paint(o, TC[o.v] || 0, T.indexOf(o.v) >= 0); });
    XR.forEach(function (o) { paint(o, XC[o.v] || 0, MT.indexOf(o.v) >= 0); });
    fx.querySelectorAll('.fx-s').forEach(function (s) {    // nothing left to tick: the section stays and says 「該当なし」 (the maker one has its own note)
      if (s.dataset.s === 'm') return;
      var empty = !s.querySelector('.fx-c:not([hidden]), .fx-o > .fx-r:not([hidden])'), z = s.querySelector('.fx-z');
      if (!ZT || !s.querySelector('.fx-r')) { s.hidden = empty; return; }
      if (empty && !z) { z = document.createElement('p'); z.className = 'fx-none fx-z'; z.textContent = ZT; s.querySelector('.fx-o').appendChild(z); }
      if (z) z.hidden = !empty;
    });
    Object.keys(HN).forEach(function (s) { var k = secN(s); HN[s].hidden = !k; HN[s].textContent = k ? '(' + k + ')' : ''; });
    renderMakers();
    if (allA) allA.classList.toggle('on', !active());
    if (goBtn) goBtn.textContent = goBtn.dataset.t.replace('{n}', N.toLocaleString());
    var k = C.length + T.length + M.length + MT.length;
    if (badge) { badge.hidden = !k; badge.textContent = k; }
  };
  // makers: by count, top 15 (ticked ones always shown), the rest behind 「もっと見る」 or the maker-name box
  var renderMakers = function () {
    if (!mkBox) return;
    var f = mkQ ? norm(mkQ.value).trim() : '';
    var fv = document.activeElement && document.activeElement.name === 'm' && mkBox.contains(document.activeElement) ? document.activeElement.value : null;
    var list = Object.keys(MC);
    M.forEach(function (m) { if (!(m in MC)) list.push(m); });
    list.sort(function (a, b) { return (MC[b] || 0) - (MC[a] || 0) || (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0); });
    if (f) list = list.filter(function (m) { return norm(m + ' ' + alOf(m)).indexOf(f) >= 0; });
    var lim = f ? Math.max(mkLim, STEP) : mkLim, vis = list, rest = 0;     // 1,700 makers on list.html: 50 more per click, in the sidebar's own scroll
    if (list.length > lim) {
      vis = list.slice(0, lim);
      list.slice(lim).forEach(function (m) { if (M.indexOf(m) >= 0) vis.push(m); });
      rest = list.length - vis.length;
    }
    mkBox.innerHTML = vis.map(function (m) {
      var n = MC[m] || 0, on = M.indexOf(m) >= 0;
      return '<label class="fx-r' + (on ? ' on' : '') + (n ? '' : ' z') + '"><input type="checkbox" name="m" value="' + esc(m) + '"' + (on ? ' checked' : '') + '><span>' + esc(m) + '</span><b>' + n.toLocaleString() + '</b></label>';
    }).join('');
    mkBox.classList.toggle('open', mkLim > TOP || !!f);
    if (mk0) mk0.hidden = vis.length > 0;
    if (mkMore) {
      mkLess = !rest && mkLim > TOP;
      mkMore.hidden = !rest && !mkLess;
      mkMore.textContent = mkLess ? mkMore.dataset.less : mkMore.dataset.more + ' (' + rest.toLocaleString() + ')';
      mkMore.setAttribute('aria-expanded', mkLim > TOP ? 'true' : 'false');
    }
    if (fv !== null) { var el = [].filter.call(mkBox.querySelectorAll('input'), function (x) { return x.value === fv; })[0]; if (el) el.focus(); }
  };
  // above the results: one removable pill per active filter, then 「すべてクリア」
  var renderBar = function () {
    if (!bar) return;
    var co = bar.dataset.colon || ': ', P = [], v = q.value.trim();
    if (v) P.push(['q', '', bar.dataset.q + co + v]);
    C.forEach(function (c) { P.push(['c', c, secTitle('c') + co + labOf('c', c)]); });
    T.forEach(function (t) { P.push(['t', t, (nest ? fx.dataset.tt : secTitle('t')) + co + labOf('t', t)]); });
    MT.forEach(function (x) { P.push(['mt', x, secTitle('mt') + co + labOf('mt', x)]); });
    M.forEach(function (m) { P.push(['m', m, secTitle('m') + co + m]); });
    bar.innerHTML = P.map(function (p) {
      return '<button type="button" class="fx-pill" data-f="' + p[0] + '" data-v="' + esc(p[1]) + '" aria-label="' + esc(p[2] + ' — ' + (bar.dataset.rm || '')) + '"><span>' + esc(p[2]) + '</span><i aria-hidden="true">×</i></button>';
    }).join('') + (P.length ? '<button type="button" class="fx-clr">' + esc(bar.dataset.clr || '') + '</button>' : '');
    bar.hidden = !P.length;
  };
  // table pages: heading and breadcrumb follow the category / part type / maker
  var markHead = function () {
    if (!TABLE) return;
    var hd = $('#phd'), bc = $('#pbc-c'), bt = $('#pbc-t');
    var cl = C.map(function (c) { return labOf('c', c); }).join(' / '), tl = nest && T[0] ? labOf('t', T[0]) : '';
    var ml = M.length ? M.slice(0, 3).join(' / ') + (M.length > 3 ? ' …' : '') : '';
    if (hd) { hd.hidden = !cl && !ml; hd.textContent = tl || cl || ml; }
    if (bc) { bc.hidden = !C.length; bc.textContent = cl; }
    if (bt) { bt.hidden = !tl; bt.textContent = tl; }
  };

  var hdrH = function () { var h = $('.hdr') || $('header'); return h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 86; };
  var toResults = function (always, instant) {     // after a filter change deep down the list, come back to the top of the results
    var t = $('.pmain .ptool'), a = $('.pmain .pbc') || $('#photos') || t; if (!a) return;
    var hh = hdrH(), y = a.getBoundingClientRect().top;
    // desktop: only when the count row has gone under the header (on phones the toolbar is sticky; they always pass `always`)
    if (always || (t || a).getBoundingClientRect().top < hh) window.scrollTo({ top: Math.max(0, y + window.scrollY - hh - 12), behavior: instant ? 'instant' : 'smooth' });
  };
  var update = function () { shown = PAGE; apply(); putHash(); };
  var resetAll = function () { C = []; T = []; M = []; MT = []; q.value = ''; if (mkQ) mkQ.value = ''; update(); };

  fx.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || t.type !== 'checkbox') return;
    var v = t.value, on = t.checked;
    if (t.name === 'c') {
      if (nest) { C = on ? [v] : []; T = []; }      // nested pages: one category at a time; its part types reset
      else C = tog(C, v, on);                       // 装置種別 / 改造区分: several, OR (fix3)
    }
    else if (t.name === 't') T = nest ? (on ? [v] : []) : tog(T, v, on);
    else if (t.name === 'm') M = tog(M, v, on);
    else if (t.name === 'mt') MT = tog(MT, v, on);
    else return;
    update();
    if (!fx.classList.contains('open')) toResults(false);
  });
  fx.addEventListener('click', function (ev) {
    if (ev.target === fx) { if (fx.classList.contains('open')) drawer(false); return; }    // the backdrop beside the tablet drawer
    var a = ev.target.closest('[data-all]');
    if (a) { ev.preventDefault(); resetAll(); toResults(false); return; }
    if (ev.target.closest('#fxmore')) { mkLim = mkLess ? TOP : mkLim + STEP; renderMakers(); return; }
    if (ev.target.closest('.fx-x')) { drawer(false); return; }
    if (ev.target.closest('.fx-go')) { drawer(false); toResults(true); }
  });
  if (mkQ) {
    mkQ.addEventListener('input', renderMakers);
    mkQ.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') ev.preventDefault(); });
  }
  if (bar) bar.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.classList.contains('fx-clr')) { resetAll(); q.focus(); return; }
    var f = b.dataset.f, v = b.dataset.v;
    if (f === 'q') q.value = '';
    else if (f === 'c') { C = tog(C, v, false); if (nest) T = []; }
    else if (f === 't') T = tog(T, v, false);
    else if (f === 'm') M = tog(M, v, false);
    else if (f === 'mt') MT = tog(MT, v, false);
    update();
    var nb = bar.querySelector('button'); (nb && !bar.hidden ? nb : q).focus();
  });
  var bcl = $('#pbc-l');      // breadcrumb 「修理対応品番」 (…#all): the whole list again
  if (bcl) bcl.addEventListener('click', function (ev) { ev.preventDefault(); resetAll(); toResults(false); });

  // sections fold with their +/− button; open / closed is remembered per page (works without storage too)
  var LS = 'fxo:' + (location.pathname.replace(/^.*\//, '') || 'index.html'), saved = {};
  try { saved = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { saved = {}; }
  fx.querySelectorAll('.fx-tg').forEach(function (b) {
    var s = b.closest('.fx-s').dataset.s, body = document.getElementById(b.getAttribute('aria-controls'));
    var set = function (o) { b.setAttribute('aria-expanded', o ? 'true' : 'false'); if (body) body.hidden = !o; };
    var hn = document.createElement('span'); hn.className = 'fx-hn'; hn.hidden = true; b.insertBefore(hn, b.querySelector('i'));
    HN[s] = hn; SET[s] = set;
    if (Object.prototype.hasOwnProperty.call(saved, s)) set(!!saved[s]);
    b.addEventListener('click', function () {
      var o = b.getAttribute('aria-expanded') !== 'true'; set(o); saved[s] = o ? 1 : 0;
      try { localStorage.setItem(LS, JSON.stringify(saved)); } catch (e) {}
    });
  });
  var openActive = function () { Object.keys(SET).forEach(function (s) { if (secN(s)) SET[s](true); }); };   // not written to storage

  // phones (≤900px): the sections open as a full-height sheet from the 「絞り込み」 button
  var panel = $('#fxp'), lastFocus = null;
  var drawer = function (open) {
    if (fx.classList.contains('open') === open) return;
    fx.classList.toggle('open', open); document.body.classList.toggle('fx-lock', open);
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (panel) {     // a dialog only while it covers the page; on desktop it is part of the sidebar
      if (open) { panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'fxdt'); }
      else { panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); panel.removeAttribute('aria-labelledby'); }
    }
    if (open) { lastFocus = document.activeElement; var x = fx.querySelector('.fx-x'); if (x) x.focus(); }
    else if (lastFocus && lastFocus.focus) { lastFocus.focus(); lastFocus = null; }
  };
  var focusables = function () {
    return panel ? [].filter.call(panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'), function (el) { return el.getClientRects().length > 0; }) : [];
  };
  if (panel) panel.addEventListener('keydown', function (ev) {      // Tab / Shift+Tab wrap between × and 結果を見る
    if (ev.key !== 'Tab' || !fx.classList.contains('open')) return;
    var f = focusables(); if (!f.length) return;
    var a = document.activeElement, first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && (a === first || !panel.contains(a))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && (a === last || !panel.contains(a))) { ev.preventDefault(); first.focus(); }
  });
  document.addEventListener('focusin', function (ev) {     // focus that lands behind the sheet comes back into it
    if (!panel || !fx.classList.contains('open') || panel.contains(ev.target)) return;
    var f = focusables(); if (f[0]) f[0].focus();
  });
  if (openBtn) openBtn.addEventListener('click', function () { drawer(true); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && fx.classList.contains('open')) drawer(false); });
  var mq = window.matchMedia ? window.matchMedia('(max-width:900px)') : null;
  var mqOff = function (e) { if (!e.matches) drawer(false); };
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', mqOff); else if (mq.addListener) mq.addListener(mqOff); }

  // links to #c=… / #m=… on the same page (and the browser's back / forward) filter in place and come to the results
  window.addEventListener('hashchange', function () {
    if (!readHash()) return;
    openActive(); shown = PAGE; apply();
    if (location.hash) toResults(true);
  });
  var tmr = 0;     // typing: one filter pass after a short pause, not one per keystroke over 50,000 rows
  q.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(update, 120); });
  q.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' || ev.isComposing) return;
    ev.preventDefault(); clearTimeout(tmr); update(); q.blur();     // phones: the keyboard goes away and the results show
  });
  if (more && udata) more.addEventListener('click', function () {   // Load more: add the next rows, keep the ones already shown
    var from = shown; shown += PAGE;
    (ugrid || grid).insertAdjacentHTML('beforeend', rowsHtml(from, shown));
    more.hidden = hit.length <= shown;
  });
  document.querySelectorAll('.poem-g button').forEach(function (b) {    // maker tiles as buttons (pages that filter in place)
    b.addEventListener('click', function () { C = []; T = []; MT = []; M = [b.dataset.mk]; openActive(); update(); toResults(true); });
  });
  var hf = /[#&](c|t|m|mt)=/.test(location.hash);    // readHash() is true for an empty hash too, so test the hash itself
  readHash(); openActive(); apply();
  // arriving from the home page search or a filter link (#c= / #t= / #m= / #mt=, fix3): start at the results
  if (sq || hf) toResults(true, true);
})();
