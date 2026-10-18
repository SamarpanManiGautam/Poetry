// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// ---------------------------------------------------------
// The book: cover, foreword, contents and poems become leaves.
// Long poems are split across pages to fit the page size.
// Turn pages with the buttons, arrow keys, or a swipe.
// ---------------------------------------------------------
(function () {
  var main = document.querySelector('main');
  var pager = main && main.querySelector('.pager');
  if (!main || !pager) return;

  var prevBtn = document.getElementById('prev');
  var nextBtn = document.getElementById('next');
  var count = document.getElementById('count');

  // Lite mode: no 3D page flip, just a quick fade. Used on Android and weaker
  // devices, where 3D layers with scrolling text are slow and can fail to paint.
  // Test with ?lite=1 (force on) or ?lite=0 (force off) in the address.
  var q = (location.search.match(/[?&]lite=([01])/) || [])[1];
  var ua = navigator.userAgent || '';
  var LITE = q ? q === '1' :
    (/Android/i.test(ua) ||
     (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
     (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
  if (LITE) document.documentElement.classList.add('lite');

  var small = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  var DUR = LITE ? 300 : (small ? 600 : 1100); // must match the CSS transition on .leaf
  var DELAY = LITE ? 0 : 120;    // stagger when several pages turn at once
  var DEV = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

  function dev(n) { return String(n).replace(/\d/g, function (d) { return DEV[d]; }); }
  function mk(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }

  // take the source pages out of the document; we clone them per build
  var sources = [].slice.call(main.children).filter(function (e) { return e !== pager; });

  var book = mk('div', 'book');
  main.insertBefore(book, pager);

  // an invisible leaf used to measure what fits on a page
  var mLeaf = mk('div', 'leaf measure');
  var mFront = mk('div', 'face front');
  var mInner = mk('div', 'page-inner');
  mFront.appendChild(mInner);
  mLeaf.appendChild(mFront);
  book.appendChild(mLeaf);

  var leaves = [], state = [], timers = [];
  var cur = 0, N = 0, seenTimer, rebuildTimer, lastW = 0, lastH = 0;

  function fits() { return mInner.scrollHeight <= mInner.clientHeight + 1; }

  function paginate(src, out) {
    var stanzas = [].slice.call(src.querySelectorAll('.poem-body > p'));
    var end = src.querySelector('.poem-end');
    var num = src.querySelector('.poem-num');
    var head = src.querySelector('.poem-head');
    var title = src.querySelector('.poem-title');

    function make(cont) {
      var art = document.createElement('article');
      art.className = (cont ? src.className.replace(/\bpoem\b/, 'poem is-cont') : src.className);
      art.dataset.key = src.id;
      if (!cont) {
        art.id = src.id;
        if (num) art.appendChild(num.cloneNode(true));
        if (head) art.appendChild(head.cloneNode(true));
      } else {
        var run = mk('p', 'poem-run');
        run.textContent = title ? title.textContent : '';
        art.appendChild(run);
      }
      var body = mk('div', 'poem-body');
      art.appendChild(body);
      mInner.innerHTML = '';
      mInner.appendChild(art);
      return { art: art, body: body };
    }

    var p = make(false);
    out.push(p.art);
    stanzas.forEach(function (s) {
      var c = s.cloneNode(true);
      p.body.appendChild(c);
      if (!fits() && p.body.children.length > 1) {
        var carry = [c];
        p.body.removeChild(c);
        // keep a closing single line with the stanza before it
        if (c.classList.contains('alone') && p.body.children.length > 1) {
          var prev = p.body.lastElementChild;
          p.body.removeChild(prev);
          carry.unshift(prev);
        }
        p = make(true);
        out.push(p.art);
        carry.forEach(function (n) { p.body.appendChild(n); });
      }
    });
    if (end) p.art.appendChild(end.cloneNode(true));
  }

  function buildPages() {
    var out = [];
    sources.forEach(function (src) {
      if (src.classList.contains('poem')) {
        paginate(src, out);
      } else {
        var c = src.cloneNode(true);
        c.dataset.key = src.id;
        out.push(c);
      }
    });
    mInner.innerHTML = '';
    return out;
  }

  function makeLeaf(pageEl, i) {
    pageEl.classList.add('page');
    var leaf = mk('section', 'leaf');
    leaf.dataset.key = pageEl.dataset.key || '';
    var front = mk('div', 'face front');
    var inner = mk('div', 'page-inner');
    var back = mk('div', 'face back');
    inner.appendChild(pageEl);
    front.appendChild(inner);
    if (i > 0) {
      var f = mk('div', 'folio');
      f.textContent = dev(i);
      front.appendChild(f);
    }
    leaf.appendChild(front);
    leaf.appendChild(back);
    [].forEach.call(pageEl.querySelectorAll('.reveal'), function (r, k) {
      r.style.setProperty('--i', k);
    });
    return leaf;
  }

  function indexOfKey(key) {
    for (var i = 0; i < leaves.length; i++) if (leaves[i].dataset.key === key) return i;
    return -1;
  }

  function settle(leaf, i, flipped) {
    leaf.style.transitionDelay = '';
    leaf.style.zIndex = flipped ? i : N - i;
    leaf.style.visibility = flipped ? 'hidden' : 'visible';
  }

  function ui() {
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === N - 1;
    count.textContent = cur === 0 ? 'Cover' : dev(cur) + ' / ' + dev(N - 1);
    try { history.replaceState(null, '', '#' + leaves[cur].dataset.key); } catch (e) {}
  }

  // hide pages far from the current one so only a few 3D layers exist (big win on phones)
  function cull() {
    leaves.forEach(function (l, i) {
      l.style.display = Math.abs(i - cur) > (LITE ? 1 : 2) ? 'none' : '';
    });
  }

  function goTo(n, animate) {
    if (!N) return;
    n = Math.max(0, Math.min(N - 1, n));
    if (animate === undefined) animate = true;
    var prev = cur, fwd = n > prev;
    cur = n;

    leaves.forEach(function (l) { l.style.display = ''; });
    clearTimeout(goTo.cullTimer);
    goTo.cullTimer = setTimeout(cull, animate ? Math.abs(n - prev) * DELAY + DUR + 150 : 0);

    leaves.forEach(function (leaf, i) {
      var flipped = i < n;
      if (flipped === state[i]) return;
      state[i] = flipped;
      clearTimeout(timers[i]);
      leaf.style.visibility = 'visible';
      leaf.classList.toggle('is-flipped', flipped);
      if (!animate) { settle(leaf, i, flipped); return; }
      var order = fwd ? (i - prev) : (prev - 1 - i);
      leaf.style.zIndex = N + 100 + (fwd ? -i : (prev - i));
      leaf.style.transitionDelay = (order * DELAY) + 'ms';
      timers[i] = setTimeout(function () { settle(leaf, i, flipped); }, order * DELAY + DUR + 80);
    });

    leaves.forEach(function (l, i) {
      l.inert = i !== n;
      l.setAttribute('aria-hidden', i !== n ? 'true' : 'false');
    });

    var leaf = leaves[n];
    if (n !== prev || !leaf.classList.contains('is-seen')) {
      leaf.querySelector('.page-inner').scrollTop = 0;
    }
    clearTimeout(seenTimer);
    if (!leaf.classList.contains('is-seen')) {
      var wait = animate ? Math.max(0, Math.abs(n - prev) - 1) * DELAY : 0;
      seenTimer = setTimeout(function () { leaf.classList.add('is-seen'); }, wait);
    }
    ui();
  }

  function build() {
    var key = null, off = 0;
    if (leaves.length) {
      key = leaves[cur].dataset.key;
      for (var j = cur - 1; j >= 0 && leaves[j].dataset.key === key; j--) off++;
    }
    leaves.forEach(function (l, i) {
      clearTimeout(timers[i]);
      if (l.parentNode) book.removeChild(l);
    });
    leaves = []; state = []; timers = [];

    var pages = buildPages();
    N = pages.length;
    pages.forEach(function (el, i) {
      var leaf = makeLeaf(el, i);
      leaf.style.zIndex = N - i;
      book.appendChild(leaf);
      leaves.push(leaf);
      state.push(false);
    });

    var idx = 0;
    if (key !== null) {
      var first = indexOfKey(key);
      if (first > -1) {
        var cnt = 0;
        leaves.forEach(function (l) { if (l.dataset.key === key) cnt++; });
        idx = first + Math.min(off, cnt - 1);
      }
    } else if (location.hash) {
      var h = indexOfKey(location.hash.slice(1));
      if (h > -1) idx = h;
    }

    cur = 0;
    book.classList.add('no-anim');
    goTo(idx, false);
    void book.offsetWidth;
    book.classList.remove('no-anim');
    lastW = book.clientWidth; lastH = book.clientHeight;
  }

  // ---------- controls ----------
  prevBtn.addEventListener('click', function () { goTo(cur - 1); });
  nextBtn.addEventListener('click', function () { goTo(cur + 1); });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { goTo(cur + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { goTo(cur - 1); e.preventDefault(); }
    else if (e.key === 'Home') { goTo(0); e.preventDefault(); }
    else if (e.key === 'End') { goTo(N - 1); e.preventDefault(); }
  });

  var tx = 0, ty = 0;
  book.addEventListener('touchstart', function (e) {
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  book.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) goTo(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // in-page links (cover, contents, nav) turn to the right page
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (id === 'top') id = 'cover';
    var i = indexOfKey(id);
    if (i > -1) { e.preventDefault(); goTo(i); }
  });
  window.addEventListener('hashchange', function () {
    var i = indexOfKey(location.hash.slice(1));
    if (i > -1 && i !== cur) goTo(i);
  });

  // re-flow the pages if the window changes
  function rebuildSoon() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(build, 150);
  }
  window.addEventListener('resize', function () {
    if (book.clientWidth !== lastW || book.clientHeight !== lastH) rebuildSoon();
  });

  // Build only after the fonts are ready, so pages are measured with the real
  // font. If anything goes wrong, the poems fall back to a plain readable page.
  function start() {
    try {
      sources.forEach(function (e) { if (e.parentNode === main) main.removeChild(e); });
      document.documentElement.classList.add('js');
      build();
    } catch (err) {
      N = 0;
      document.documentElement.classList.remove('js');
      if (book.parentNode) main.removeChild(book);
      sources.forEach(function (s) { main.insertBefore(s, pager); });
      if (window.console) console.error(err);
    }
  }
  var started = false, fontsDone = false, builtEarly = false;
  function once() { if (!started) { started = true; start(); } }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      fontsDone = true;
      once();
      if (builtEarly) rebuildSoon(); // fonts arrived late: re-flow once with the real font
    });
  } else {
    fontsDone = true;
  }
  setTimeout(function () {       // don't wait forever on slow networks
    if (!started) builtEarly = !fontsDone;
    once();
  }, 1500);
})();
