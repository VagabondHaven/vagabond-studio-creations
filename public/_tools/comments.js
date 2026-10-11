// Vagabond Studio comment tool (test site only; added to every page by functions/_middleware.js).
// General version of the vagabondhaven.com comment mode: works on any site without changes.
// Click anything (or highlight text) to leave a comment, type new wording straight into the page, and add pictures
// that explain the comment or should be used. Numbered pins show the comments; lists: This page, All open, Done.
// Storage: functions/api/comments.js (Cloudflare KV). Claude reads and closes them with tools/comments.mjs.
(function () {
  if (window.__vsComments) return; window.__vsComments = true;
  var API = '/api/comments';
  var XSVG = '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // Pop-ups opened with showModal() make the rest of the page inert; on the test site they open as normal dialogs so they can be commented on.
  if (window.HTMLDialogElement && !HTMLDialogElement.prototype.__cm) {
    var orig = HTMLDialogElement.prototype.showModal; HTMLDialogElement.prototype.__cm = true;
    HTMLDialogElement.prototype.showModal = function () {
      try { this.show(); this.classList.add('cm-modal'); } catch (e) { return orig.call(this); }
      var d = this, k = function (e) { if (e.key === 'Escape' && d.open && !document.querySelector('.cm-pop:not([hidden])')) d.close(); };
      document.addEventListener('keydown', k);
      d.addEventListener('close', function () { d.classList.remove('cm-modal'); document.removeEventListener('keydown', k); }, { once: true });
    };
  }

  var ui = document.createElement('div');
  ui.innerHTML =
    '<button type="button" class="cm-open cm-ui" aria-pressed="false" title="Comment on this page">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v11h2v2.2L8.3 16H20V5H4z"/></svg>' +
      '<span class="cm-badge" hidden></span></button>' +
    '<div class="cm-bar cm-ui" hidden>' +
      '<button type="button" class="cm-bar-t" title="Click anything to comment, or highlight text. Esc to stop." aria-expanded="true"><span class="cm-dot" aria-hidden="true"></span>Comment mode</button>' +
      '<span class="cm-bar-b"><button type="button" class="cm-list-btn">This page</button><button type="button" class="cm-all-btn">All open</button>' +
      '<button type="button" class="cm-done-btn">Done</button><button type="button" class="cm-stop">Close</button></span></div>' +
    '<div class="cm-hover cm-ui" hidden></div><div class="cm-pins cm-ui"></div>' +
    '<div class="cm-pop cm-ui" hidden role="dialog" aria-label="Comment"></div><div class="cm-list cm-ui" hidden></div>';
  ui.id = 'cm'; document.body.appendChild(ui);

  // The tool's own colours: the site's colours AS BUILT (its brand), measured once with any design being tried
  // taken off for a moment, then fixed on #cm. Fallbacks for sites without the colour variables.
  (function () {
    var root = document.documentElement, tried = {}, put = [];
    try { tried = (JSON.parse(localStorage.getItem('vs-design') || '{}').vars) || {}; } catch (e) {}
    Object.keys(tried).forEach(function (k) { var v = root.style.getPropertyValue(k); if (v) { put.push([k, v]); root.style.removeProperty(k); } });
    var probe = document.createElement('span'); probe.style.display = 'none'; ui.appendChild(probe);
    var hex = function (v, fb) {
      probe.style.color = 'var(' + v + ', ' + fb + ')';
      var c = getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(Number);
      return c;
    };
    var dark = hex('--dark', '#2b3a33'), light = hex('--light', '#eef0ec'), accent = hex('--accent', '#9a5b3a');
    put.forEach(function (p) { root.style.setProperty(p[0], p[1]); }); probe.remove();
    var lum = function (c) { return c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (a, v, i) { return a + v * [0.2126, 0.7152, 0.0722][i]; }, 0); };
    var on = function (c) { return (1.05) / (lum(c) + 0.05) >= 3 ? '#ffffff' : '#1a1a1a'; }; // white text unless the colour is too light
    var rgb = function (c, a) { return a == null ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + a + ')'; };
    if (lum(light) < 0.6) light = [239, 235, 227]; // a dark page: the light tint behind quoted text stays light, so the dark text in it stays readable
    var v = { '--cm-dark': rgb(dark), '--cm-on-dark': on(dark), '--cm-light': rgb(light), '--cm-accent': rgb(accent), '--cm-on-accent': on(accent), '--cm-hover': rgb(dark, 0.08) };
    for (var k in v) ui.style.setProperty(k, v[k]);
  })();

  var on = false, pending = null, comments = [], others = [];
  var q = function (s) { return document.querySelector(s); };
  var btn = q('.cm-open'), bar = q('.cm-bar'), hover = q('.cm-hover'), pop = q('.cm-pop'), list = q('.cm-list'), pins = q('.cm-pins');
  var page = location.pathname.replace(/\.html$/, '').replace(/\/(index)?$/, '') || '/';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function isUi(el) { return !el || !el.closest || el.closest('.cm-ui, .ds-ui, .vs-open, .vs-bar, .vs-tip, .vs-toast'); }
  function view() { var w = innerWidth; return w >= 1025 ? 'desktop' : w >= 640 ? 'tablet' : 'phone'; }
  function post(qs, body) {
    return fetch(API + qs, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Could not save (' + r.status + ')'); return j; }); });
  }
  window.VSComments = { post: function (body) { return post('', body).then(function (j) { comments.push(j); drawPins(); badge(); return j; }); } };

  // Shrink a picture in the browser (longest side at most `max` px).
  function shrink(file, max, type, quality) {
    return new Promise(function (ok, fail) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        ok({ data: c.toDataURL(type, quality) });
      };
      im.onerror = function () { URL.revokeObjectURL(url); fail(new Error('That picture could not be read.')); };
      im.src = url;
    });
  }
  // A CSS path that finds the element again: nearest unique id, then tag:nth-of-type steps.
  function cssPath(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) { parts.unshift('#' + CSS.escape(el.id)); break; }
      var tag = el.tagName.toLowerCase(), i = 1, s = el;
      while ((s = s.previousElementSibling)) if (s.tagName === el.tagName) i++;
      parts.unshift(tag + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function imageOf(el) {
    if (!el) return null;
    if (el.tagName === 'IMG') return el;
    var img = el.querySelector && el.querySelector('img');
    if (img && el.getBoundingClientRect().width - img.getBoundingClientRect().width < 40 && el.getBoundingClientRect().height - img.getBoundingClientRect().height < 40) return img;
    return null;
  }
  function place(box, el) {
    var r = el.getBoundingClientRect();
    box.style.left = r.left + scrollX + 'px'; box.style.top = r.top + scrollY + 'px'; box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
  }

  // "Replace this picture now" (only where the site offers window.VSSwap, for example a developer site that can save):
  // the new picture is saved right away, without asking Claude.
  function toastMsg(t) { var d = document.createElement('div'); d.className = 'cm-toast cm-ui'; d.textContent = t; ui.appendChild(d); setTimeout(function () { d.remove(); }, 5000); }
  function swapImage(img, f, say) {
    if (!f || !/^image\//.test(f.type)) return Promise.reject(new Error('Only pictures can be used.'));
    say('Saving the new picture...');
    return shrink(f, 2000, 'image/jpeg', 0.86).then(function (r) {
      return window.VSSwap({ img: img, page: location.pathname, oldSrc: img.getAttribute('src') || '', data: r.data, name: f.name || 'picture' }).then(function (res) {
        img.removeAttribute('srcset'); img.src = r.data;
        if (res && res.note) toastMsg(res.note);
        return res;
      });
    });
  }
  // In comment mode a picture file dropped straight onto a picture on the page replaces it.
  var dropImg = null;
  function canSwap() { return on && typeof window.VSSwap === 'function'; }
  document.addEventListener('dragover', function (e) {
    if (!canSwap() || isUi(e.target)) return;
    var img = imageOf(e.target); if (!img || !e.dataTransfer || [].indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    if (dropImg !== img) { if (dropImg) dropImg.classList.remove('cm-drop-target'); dropImg = img; img.classList.add('cm-drop-target'); }
  });
  document.addEventListener('dragleave', function (e) { if (dropImg && e.target === dropImg) { dropImg.classList.remove('cm-drop-target'); dropImg = null; } });
  document.addEventListener('drop', function (e) {
    if (!canSwap() || isUi(e.target)) return;
    var img = imageOf(e.target); if (!img) return;
    e.preventDefault(); if (dropImg) dropImg.classList.remove('cm-drop-target'); dropImg = null;
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    swapImage(img, f, toastMsg).catch(function (err) { toastMsg(err.message); });
  });

  function setMode(v) {
    on = v; btn.setAttribute('aria-pressed', v); bar.hidden = !v; bar.classList.remove('cm-mini'); document.documentElement.classList.toggle('cm-on', v);
    hover.hidden = true; if (!v) { closePop(); list.hidden = true; }
    drawPins();
  }
  btn.addEventListener('click', function () { setMode(!on); if (on) load(); });
  q('.cm-stop').addEventListener('click', function () { setMode(false); });
  var barT = q('.cm-bar-t');
  function mini(v) { bar.classList.toggle('cm-mini', v); barT.setAttribute('aria-expanded', String(!v)); }
  barT.addEventListener('click', function () { mini(!bar.classList.contains('cm-mini')); });
  var lastY = scrollY;
  addEventListener('scroll', function () { if (on && Math.abs(scrollY - lastY) > 80) { mini(true); lastY = scrollY; } }, { passive: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!pop.hidden) closePop(); else if (on) setMode(false); } });

  document.addEventListener('mouseover', function (e) {
    if (!on || !pop.hidden || isUi(e.target)) return;
    hover.hidden = false; place(hover, e.target);
  });
  // In comment mode a click opens a comment instead of following a link or pressing a button.
  document.addEventListener('click', function (e) {
    if (!on || isUi(e.target)) return;
    if (pending && pending.edited && pending.el.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    if (!pop.hidden) return;
    var sel = getSelection(); if (sel && String(sel).trim()) return;
    openPop(e.target, { x: e.pageX, y: e.pageY });
  }, true);
  document.addEventListener('mouseup', function (e) {
    if (!on || isUi(e.target) || !pop.hidden) return;
    var sel = getSelection(), text = sel ? String(sel).trim() : '';
    if (!text) return;
    var node = sel.getRangeAt(0).commonAncestorContainer; if (node.nodeType !== 1) node = node.parentElement;
    openPop(node, { x: e.pageX, y: e.pageY, highlight: text });
  });

  function openPop(el, o) {
    hover.hidden = true;
    var img = imageOf(el), textEl = !img && (el.innerText || '').trim() ? el : null;
    pending = { el: el, x: o.x, y: o.y, highlight: o.highlight || '', attachments: [],
      original: textEl ? el.innerHTML : null, originalText: textEl ? el.innerText.trim() : '', edited: false, imgSrc: img ? img.currentSrc || img.src : '' };
    var quote = o.highlight ? '<blockquote>' + esc(o.highlight.slice(0, 300)) + '</blockquote>'
      : img ? '<img class="cm-thumb" src="' + esc(pending.imgSrc) + '" alt="">'
      : textEl ? '<blockquote>' + esc(textEl.innerText.trim().slice(0, 200)) + (textEl.innerText.length > 200 ? ' ...' : '') + '</blockquote>' : '';
    pop.innerHTML = '<div class="cm-h">' + (img ? 'Picture' : o.highlight ? 'Highlighted text' : 'Element') + ' <span>' + esc(view()) + ' view</span><button type="button" class="cm-x" aria-label="Close">' + XSVG + '</button></div>' + quote +
      '<textarea class="cm-text" rows="3" placeholder="' + (img ? 'What should change? For a new picture, add it below.' : 'Your comment') + '"></textarea>' +
      (img && typeof window.VSSwap === 'function' ? '<div class="cm-swap"><label class="cm-swap-btn">Replace this picture now<input type="file" accept="image/*" hidden></label><span class="cm-note">Choose a picture or drop it here. It is swapped right away, without asking Claude.</span></div>' : '') +
      '<div class="cm-att" tabindex="0"><span>Add pictures: drop, paste or <label class="cm-att-pick">choose<input type="file" accept="image/*" multiple hidden></label></span><div class="cm-att-list"></div></div>' +
      (textEl ? '<button type="button" class="cm-edit">Edit the text on the page</button><p class="cm-note cm-edit-note" hidden>Type the new wording directly on the page, then press Save.</p>' : '') +
      '<div class="cm-acts"><button type="button" class="cm-save">Save comment</button><button type="button" class="cm-cancel">Cancel</button></div><p class="cm-msg" aria-live="polite"></p>';
    pop.hidden = false; position(o.x, o.y);
    pop.querySelector('.cm-x').onclick = pop.querySelector('.cm-cancel').onclick = closePop;
    pop.querySelector('.cm-save').onclick = save;
    var ed = pop.querySelector('.cm-edit');
    if (ed) ed.onclick = function () {
      pending.edited = true; el.setAttribute('contenteditable', 'true'); el.classList.add('cm-editing'); el.focus();
      ed.hidden = true; pop.querySelector('.cm-edit-note').hidden = false;
    };
    // "Replace this picture now": only when the site offers it (window.VSSwap, for example a developer site that can save).
    var sw = pop.querySelector('.cm-swap input'), swBox = pop.querySelector('.cm-swap');
    var doSwap = function (f) {
      var msg = pop.querySelector('.cm-msg'), p = pending;
      swapImage(img, f, function (t) { msg.textContent = t; }).then(function () { if (pending === p) closePop(); }, function (err) { if (pending === p) msg.textContent = err.message; });
    };
    if (sw) {
      sw.onchange = function () { doSwap(sw.files[0]); sw.value = ''; };
      swBox.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); swBox.classList.add('over'); });
      swBox.addEventListener('dragleave', function () { swBox.classList.remove('over'); });
      swBox.addEventListener('drop', function (e) { e.preventDefault(); e.stopPropagation(); swBox.classList.remove('over'); doSwap(e.dataTransfer.files[0]); });
    }
    var att = pop.querySelector('.cm-att'), ai = att.querySelector('input');
    ai.onchange = function () { [].forEach.call(ai.files, addAttachment); ai.value = ''; };
    att.addEventListener('dragover', function (e) { e.preventDefault(); att.classList.add('over'); });
    att.addEventListener('dragleave', function () { att.classList.remove('over'); });
    att.addEventListener('drop', function (e) { e.preventDefault(); e.stopPropagation(); att.classList.remove('over'); [].forEach.call(e.dataTransfer.files, addAttachment); });
    pop.onpaste = function (e) {
      var files = [].filter.call((e.clipboardData && e.clipboardData.files) || [], function (f) { return /^image\//.test(f.type); });
      if (files.length) { e.preventDefault(); files.forEach(addAttachment); }
    };
    setTimeout(function () { pop.querySelector('.cm-text').focus(); }, 30);
  }
  function position(x, y) {
    if (innerWidth < 640 || !pending) { pop.style.left = ''; pop.style.top = ''; return; }
    var w = 340, left = Math.min(Math.max(8, x - scrollX + 12), innerWidth - w - 8), top = Math.min(Math.max(8, y - scrollY + 12), innerHeight - pop.offsetHeight - 8);
    pop.style.left = left + 'px'; pop.style.top = Math.max(8, top) + 'px';
  }
  if (window.ResizeObserver) new ResizeObserver(function () { if (!pop.hidden && pending) position(pending.x, pending.y); }).observe(pop);
  function addAttachment(f) {
    var msg = pop.querySelector('.cm-msg'), p = pending;
    if (!/^image\//.test(f.type)) { msg.textContent = 'Only pictures can be added.'; return; }
    if (p.attachments.length >= 8) { msg.textContent = 'Up to 8 pictures per comment.'; return; }
    shrink(f, 2000, 'image/jpeg', 0.88).then(function (r) {
      if (pending !== p) return;
      var a = { data: r.data, name: f.name || 'pasted picture' }; p.attachments.push(a);
      var box = document.createElement('span'); box.className = 'cm-att-item';
      box.innerHTML = '<img src="' + r.data + '" alt=""><button type="button" aria-label="Remove">×</button>';
      box.querySelector('button').onclick = function () { p.attachments.splice(p.attachments.indexOf(a), 1); box.remove(); };
      pop.querySelector('.cm-att-list').appendChild(box);
    }, function (err) { msg.textContent = err.message; });
  }
  function closePop() {
    if (pending && pending.edited && pending.original != null) pending.el.innerHTML = pending.original;
    if (pending) { pending.el.removeAttribute('contenteditable'); pending.el.classList.remove('cm-editing'); }
    pop.hidden = true; pending = null; var s = getSelection(); if (s) s.removeAllRanges();
  }
  function save() {
    var p = pending, msg = pop.querySelector('.cm-msg'), comment = pop.querySelector('.cm-text').value.trim();
    var newText = p.edited && p.el.innerText.trim() !== p.originalText ? p.el.innerText.trim() : '';
    if (!comment && !newText && !p.attachments.length) { msg.textContent = 'Write a comment, edit the text or add a picture first.'; return; }
    var el = p.el, idEl = el.closest('[id]'), who = store.get('vs-cm-name') || '';
    var body = { author: who, page: page, lang: document.documentElement.lang, view: view(), width: innerWidth, selector: cssPath(el), elementId: idEl ? idEl.id : '',
      tag: el.tagName.toLowerCase(), elementText: (el.innerText || '').trim().slice(0, 600) || p.imgSrc, highlight: p.highlight, comment: comment, newText: newText,
      x: p.x, y: p.y, attachments: p.attachments };
    if (p.edited && p.original != null) { el.innerHTML = p.original; p.edited = false; }
    msg.textContent = 'Saving...'; pop.querySelector('.cm-save').disabled = true;
    post('', body).then(function (j) { comments.push(j); if (pending === p) closePop(); drawPins(); badge(); })
      .catch(function (err) { if (pending !== p) return; msg.textContent = err.message; pop.querySelector('.cm-save').disabled = false; });
  }

  function load() {
    return fetch(API + '?status=all&page=' + encodeURIComponent(page)).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (j) { comments = Array.isArray(j) ? j : []; drawPins(); badge(); }, function () {});
  }
  function badge() { var n = comments.filter(function (c) { return c.status === 'open'; }).length, b = q('.cm-badge'); b.hidden = !n; b.textContent = n; }
  function anchor(c) { try { var el = c.selector && document.querySelector(c.selector); if (el && el.getBoundingClientRect().width) return el; } catch (e) {} return null; }
  function drawPins() {
    pins.innerHTML = ''; if (!on) return;
    var maxY = document.documentElement.scrollHeight - 24, maxX = document.documentElement.clientWidth - 24;
    comments.forEach(function (c, i) {
      if (c.kind === 'design') return;
      var el = anchor(c), x = c.x, y = c.y;
      if (el) { var r = el.getBoundingClientRect(); x = r.left + scrollX; y = r.top + scrollY; }
      var pin = document.createElement('button'); pin.type = 'button'; pin.className = 'cm-pin' + (c.status === 'done' ? ' done' : '');
      pin.textContent = i + 1; pin.style.left = Math.min(maxX, Math.max(0, x - 10)) + 'px'; pin.style.top = Math.min(maxY, Math.max(0, y - 10)) + 'px';
      pin.title = (c.comment || c.newText || 'Picture').slice(0, 80);
      pin.onclick = function (e) { e.preventDefault(); e.stopPropagation(); showOne(c.id); };
      pins.appendChild(pin);
    });
  }
  addEventListener('resize', function () { clearTimeout(drawPins.t); drawPins.t = setTimeout(drawPins, 200); });

  function find(id) { return comments.find(function (x) { return x.id === id; }) || others.find(function (x) { return x.id === id; }); }
  function card(c, n, withPage) {
    var d = c.design;
    return '<div class="cm-card' + (c.status === 'done' ? ' done' : '') + '" data-id="' + esc(c.id) + '">' +
      '<div class="cm-meta"><b>' + (n ? n + '.' : '') + '</b> ' + esc(c.created.slice(0, 16).replace('T', ' ')) + (c.view ? ' · ' + esc(c.view) : '') + (c.author ? ' · ' + esc(c.author) : '') +
      (withPage ? ' · <a href="' + esc(c.page) + '">' + esc(c.page) + '</a>' : '') + (c.status === 'done' ? ' · done' : '') + (c.edited ? ' · edited' : '') + '</div>' +
      (d ? '<p class="cm-sub">Design to use on the whole site:</p><p class="cm-design">' + esc((d.fontsName || 'fonts as built') + ' · ' + (d.coloursName || 'colours as built')) + '</p>' : '') +
      (c.highlight ? '<blockquote>' + esc(c.highlight.slice(0, 200)) + '</blockquote>' : '') +
      '<div class="cm-body">' + (c.comment ? '<p>' + esc(c.comment) + '</p>' : '') +
      (c.newText ? '<p class="cm-sub">New text:</p><p class="cm-newtext">' + esc(c.newText) + '</p>' : '') + '</div>' +
      (c.attachments && c.attachments.length ? '<div class="cm-att-list">' + c.attachments.map(function (a) { return '<a href="' + esc(a.url) + '" target="_blank" rel="noopener" class="cm-att-item"><img src="' + esc(a.url) + '" alt=""></a>'; }).join('') + '</div>' : '') +
      (c.resolvedNote ? '<p class="cm-sub cm-reply">Claude: ' + esc(c.resolvedNote) + '</p>' : '') +
      '<div class="cm-cardacts"><button type="button" class="cm-cedit">Edit</button><button type="button" class="cm-toggle">' + (c.status === 'done' ? 'Reopen' : 'Mark done') + '</button></div></div>';
  }
  function bindCards(reload) {
    list.querySelectorAll('.cm-cedit').forEach(function (b) {
      b.onclick = function () {
        var cardEl = b.closest('.cm-card'), id = cardEl.dataset.id, body = cardEl.querySelector('.cm-body'), c = find(id) || {};
        body.innerHTML = '<textarea class="cm-edit-c" rows="4" placeholder="Comment"></textarea>' +
          (c.newText ? '<p class="cm-sub">New text:</p><textarea class="cm-edit-n" rows="4"></textarea>' : '') +
          '<div class="cm-acts"><button type="button" class="cm-edit-save">Save changes</button><button type="button" class="cm-cancel cm-edit-cancel">Cancel</button></div><p class="cm-msg" aria-live="polite"></p>';
        body.querySelector('.cm-edit-c').value = c.comment || '';
        if (c.newText) body.querySelector('.cm-edit-n').value = c.newText;
        b.hidden = true; body.querySelector('.cm-edit-c').focus();
        body.querySelector('.cm-edit-cancel').onclick = function () { reload(); };
        body.querySelector('.cm-edit-save').onclick = function () {
          var sv = this; sv.disabled = true;
          var payload = { comment: body.querySelector('.cm-edit-c').value };
          if (c.newText) payload.newText = body.querySelector('.cm-edit-n').value;
          post('?edit=' + encodeURIComponent(id), payload).then(function (j) { Object.assign(c, j); reload(); drawPins(); })
            .catch(function (err) { sv.disabled = false; body.querySelector('.cm-msg').textContent = err.message; });
        };
      };
    });
    list.querySelectorAll('.cm-toggle').forEach(function (b) {
      b.onclick = function () {
        var id = b.closest('.cm-card').dataset.id, c = find(id);
        post('?' + (b.textContent === 'Reopen' ? 'reopen' : 'resolve') + '=' + encodeURIComponent(id)).then(function (j) { if (c) Object.assign(c, j); reload(); drawPins(); badge(); });
      };
    });
  }
  function head(t) { return '<div class="cm-h">' + t + '<button type="button" class="cm-x" aria-label="Close">' + XSVG + '</button></div>'; }
  function opened() { list.hidden = false; list.querySelector('.cm-x').onclick = function () { list.hidden = true; }; }
  function showList(focusId) {
    var mine = comments.filter(function (c) { return c.kind !== 'design'; });
    list.innerHTML = head('Comments on this page') + (mine.length ? mine.map(function (c) { return card(c, comments.indexOf(c) + 1); }).join('') : '<p class="cm-note">No comments on this page yet. Click anything on the page to add one.</p>');
    opened(); bindCards(function () { showList(); });
    if (focusId) { var f = list.querySelector('[data-id="' + focusId + '"]'); if (f) { f.scrollIntoView({ block: 'nearest' }); f.classList.add('focus'); } }
  }
  function showOne(id) {
    var i = comments.findIndex(function (x) { return x.id === id; }); if (i < 0) return showList();
    list.innerHTML = head('Comment ' + (i + 1)) + card(comments[i], i + 1) + '<button type="button" class="cm-allhere">All comments on this page</button>';
    opened(); list.querySelector('.cm-allhere').onclick = function () { showList(id); };
    list.scrollTop = 0; bindCards(function () { showOne(id); });
  }
  function showStatus(status) {
    var title = status === 'done' ? 'Done' : 'All open comments';
    list.innerHTML = head(title) + '<p class="cm-note">Loading...</p>'; opened();
    fetch(API + '?status=' + status).then(function (r) { return r.json(); }).then(function (all) {
      if (!Array.isArray(all)) throw new Error(all.error);
      if (status === 'done') all.reverse();
      others = all;
      list.innerHTML = head(title + ' (' + all.length + ')') +
        (all.length ? all.map(function (c) { return card(c, 0, true); }).join('') : '<p class="cm-note">' + (status === 'done' ? 'Nothing done yet.' : 'Nothing open.') + '</p>');
      opened(); bindCards(function () { showStatus(status); });
    }).catch(function (e) { list.querySelector('.cm-note').textContent = e.message || 'Could not load comments.'; });
  }
  q('.cm-list-btn').addEventListener('click', function () { showList(); });
  q('.cm-all-btn').addEventListener('click', function () { showStatus('open'); });
  q('.cm-done-btn').addEventListener('click', function () { showStatus('done'); });
  load();
})();
