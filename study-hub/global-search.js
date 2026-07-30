// Global search — searches every chapter of every course (not just the
// current page) using study-hub/search-index.json, and jumps straight to
// the matching chapter, in this course or any other.
// Included via <script src="global-search.js"></script> on every study-hub
// page (course pages + the dashboard). Re-generate the index with
// `node scripts/build-search-index.js` whenever a course's chapters change.
(function () {
  'use strict';

  var CURRENT_FILE = (location.pathname.split('/').pop() || 'index.html');
  var MAX_RESULTS = 18;

  var STYLE = '' +
    '.gs-wrap{position:relative;margin:0 0 14px}' +
    '.gs-wrap-dashboard{margin:0 0 24px}' +
    '.gs-label{font-size:11.5px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:var(--accent2);margin:0 2px 6px}' +
    '.gs-input-row{position:relative}' +
    '.gs-input{width:100%;background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:9px;padding:10px 14px;font-size:13.5px;font-family:inherit;outline:none;transition:border-color .15s;box-sizing:border-box}' +
    '.gs-wrap-dashboard .gs-input{padding:13px 16px;font-size:15px;border-radius:12px}' +
    '.gs-input:focus{border-color:var(--accent2)}' +
    '.gs-input::placeholder{color:var(--muted)}' +
    '.gs-dropdown{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:80;background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.45);max-height:420px;overflow-y:auto;padding:6px}' +
    '.gs-item{display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border-radius:8px;cursor:pointer}' +
    '.gs-item:hover,.gs-item.gs-active{background:var(--panel2)}' +
    '.gs-item-icon{font-size:17px;flex:0 0 auto;margin-top:1px}' +
    '.gs-item-body{display:flex;flex-direction:column;gap:2px;min-width:0}' +
    '.gs-item-title{font-size:13.5px;color:var(--text);line-height:1.4}' +
    '.gs-item-course{font-size:11.5px;color:var(--muted)}' +
    '.gs-hl{background:#fde047;color:#1a1a1a;padding:0 1px;border-radius:3px}' +
    '.gs-empty{padding:14px;text-align:center;color:var(--muted);font-size:13px}' +
    '.gs-meta{padding:4px 8px 8px;font-size:11px;color:var(--muted);border-bottom:1px solid var(--border);margin-bottom:4px}';

  function injectStyle() {
    var tag = document.createElement('style');
    tag.textContent = STYLE;
    document.head.appendChild(tag);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    var idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) +
      '<mark class="gs-hl">' + escapeHtml(text.slice(idx, idx + q.length)) + '</mark>' +
      escapeHtml(text.slice(idx + q.length));
  }

  var indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('search-index.json')
        .then(function (r) { return r.json(); })
        .catch(function (e) {
          console.error('global-search: failed to load search-index.json', e);
          return { courses: [], chapters: [] };
        });
    }
    return indexPromise;
  }

  function search(chapters, qRaw) {
    var q = qRaw.trim().toLowerCase();
    if (!q) return [];
    var words = q.split(/\s+/).filter(Boolean);
    var scored = [];
    for (var i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      var titleL = ch.title.toLowerCase();
      var courseL = ch.courseTitle.toLowerCase();
      var textL = ch.text.toLowerCase();
      var ok = true, score = 0;
      for (var w = 0; w < words.length; w++) {
        var word = words[w];
        var inTitle = titleL.indexOf(word) !== -1;
        var inCourse = courseL.indexOf(word) !== -1;
        var inText = textL.indexOf(word) !== -1;
        if (!inTitle && !inCourse && !inText) { ok = false; break; }
        if (inTitle) score += 10;
        if (inCourse) score += 4;
        if (inText) score += 1;
      }
      if (!ok) continue;
      if (titleL.indexOf(q) !== -1) score += 20;
      if (ch.file === CURRENT_FILE) score += 2;
      scored.push({ ch: ch, score: score });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, MAX_RESULTS).map(function (s) { return s.ch; });
  }

  function goTo(ch) {
    if (ch.file === CURRENT_FILE) {
      var btn = document.querySelector('.navbtn[data-target="' + ch.id + '"]');
      if (btn) { btn.click(); return; }
    }
    window.location.href = ch.file + '#' + ch.id;
  }

  function mount(container, opts) {
    var wrap = document.createElement('div');
    wrap.className = 'gs-wrap ' + (opts.dashboard ? 'gs-wrap-dashboard' : 'gs-wrap-sidebar');
    wrap.innerHTML =
      '<div class="gs-label">' + opts.label + '</div>' +
      '<div class="gs-input-row">' +
        '<input type="text" class="gs-input" placeholder="' + escapeHtml(opts.placeholder) + '" autocomplete="off">' +
      '</div>' +
      '<div class="gs-dropdown" hidden></div>';

    if (opts.before) container.insertBefore(wrap, opts.before);
    else container.appendChild(wrap);

    var input = wrap.querySelector('.gs-input');
    var dropdown = wrap.querySelector('.gs-dropdown');
    var results = [];
    var activeIndex = -1;
    var debounceTimer = null;

    function renderEmpty(msg) {
      dropdown.innerHTML = '<div class="gs-empty">' + escapeHtml(msg) + '</div>';
      dropdown.hidden = false;
    }

    function render(q) {
      if (!results.length) { renderEmpty('কোনো টপিক পাওয়া যায়নি'); return; }
      var metaHtml = '<div class="gs-meta">' + results.length + 'টা ফলাফল — এন্টার চাপুন প্রথমটা খুলতে</div>';
      dropdown.innerHTML = metaHtml;
      results.forEach(function (ch, i) {
        var item = document.createElement('div');
        item.className = 'gs-item' + (i === activeIndex ? ' gs-active' : '');
        var courseLabel = (ch.file === CURRENT_FILE ? 'এই কোর্সে • ' : '') + (ch.courseIcon || '') + ' ' + escapeHtml(ch.courseTitle);
        item.innerHTML =
          '<span class="gs-item-icon">' + (ch.icon || '📄') + '</span>' +
          '<span class="gs-item-body">' +
            '<span class="gs-item-title">' + highlight(ch.title, q) + '</span>' +
            '<span class="gs-item-course">' + courseLabel + '</span>' +
          '</span>';
        item.addEventListener('mousedown', function (e) {
          e.preventDefault();
          goTo(ch);
          dropdown.hidden = true;
        });
        dropdown.appendChild(item);
      });
      dropdown.hidden = false;
    }

    function runSearch() {
      var q = input.value;
      if (!q.trim()) { dropdown.hidden = true; results = []; activeIndex = -1; return; }
      loadIndex().then(function (data) {
        results = search(data.chapters || [], q);
        activeIndex = -1;
        render(q);
      });
    }

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 120);
    });

    input.addEventListener('focus', function () {
      if (input.value.trim() && results.length) dropdown.hidden = false;
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        input.value = '';
        dropdown.hidden = true;
        results = [];
        input.blur();
        return;
      }
      if (!results.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, results.length - 1);
        render(input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        render(input.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var pick = results[activeIndex >= 0 ? activeIndex : 0];
        if (pick) { goTo(pick); dropdown.hidden = true; }
      }
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) dropdown.hidden = true;
    });
  }

  function init() {
    injectStyle();
    var grid = document.getElementById('grid');
    var controls = document.querySelector('.controls');
    var hero = document.querySelector('.hero');

    if (grid && controls && hero) {
      // Dashboard page: mount a prominent global chapter-search above the
      // existing course-card filter.
      mount(hero.parentNode, {
        dashboard: true,
        before: controls,
        label: '🌐 সব কোর্সের সব চ্যাপ্টারে খুঁজুন',
        placeholder: 'যেকোনো টপিক লিখুন... (যেমন: API, idempotency, sharding, rate limit)',
      });
      return;
    }

    var brand = document.querySelector('.sidebar .brand');
    if (brand) {
      var localSearch = brand.querySelector('.search-wrap');
      mount(brand, {
        dashboard: false,
        before: localSearch,
        label: '🌐 সব কোর্সে খুঁজুন',
        placeholder: 'যেকোনো টপিক লিখুন... (যেমন: API, rate limit)',
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
