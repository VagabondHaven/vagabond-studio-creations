// Vagabond Studio font and colour switcher (test site only; added to every page by functions/_middleware.js).
// General version of the vagabondhaven.com design switcher (version of 9 October 2026). It works on any site that
// follows the design contract in public/_tools/README.md: colour variables (--bg, --text, --muted, --dark, --light,
// --accent and derived ones) and seven text roles with the variables --fN --sN --wN --iN --tN --lN --hN --cN
// (N = 1..7) and --c-light.
// - "0. As built" font set and colour set apply nothing at all, so they always equal the site as built.
// - The panel takes its look from this site's own fonts and colours AS BUILT, measured once when the page opens
//   (with any tested design taken off for that moment) and then frozen into fixed --ds-* values on #ds.
//   It never follows the design being tested. Every rule in design.css starts with #ds.
// - "Hold to see as built" (press and hold, or hold Space on it), Undo and Redo (last 20 changes, Ctrl/Cmd+Z),
//   a bottom sheet on phones, sections folded at start, A/B compare, saved sets for everyone (functions/api/designs.js).
// - Fonts are previewed from Google Fonts on the test site only. A chosen design is sent to Claude as a comment
//   ("Make this the standard design"); Claude writes it into the stylesheet and self-hosts the fonts.
// - Checked by tools/design-check.mjs before every publish (classes ds-open, ds-qp, ds-qpbtn, ds-qpi, ds-hold,
//   ds-reset, ds-undo, ds-redo; storage key vs-design).
(function () {
  if (window.__vsDesign) return; window.__vsDesign = true;
  var root = document.documentElement, API = '/api/designs', KEY = 'vs-design';
  var ROLES = [[1, 'Large headings'], [2, 'Subheadings'], [3, 'Lead text'], [4, 'Body text'], [5, 'Small print'], [6, 'Menu'], [7, 'Buttons']];
  var COLOURS = [['bg', 'Page background', '--bg'], ['text', 'Text', '--text'], ['dark', 'Dark sections', '--dark'], ['light', 'Light sections', '--light'], ['accent', 'Accent and buttons', '--accent']];
  var CATS = [['', 'All'], ['serif', 'Serif'], ['sans', 'Sans serif'], ['display', 'Decorative'], ['hand', 'Handwriting']];
  // Presets. "asbuilt" applies nothing. A site can bring its own list as window.VS_DESIGN_PRESETS (same shape).
  var P = window.VS_DESIGN_PRESETS || {
    pairs: [
      ['asbuilt', '0. As built'], ['raleway', 'Raleway only (calm, modern)', 'Raleway', 'Raleway'],
      ['jost', 'Source Serif 4 + Jost (classic and clear)', 'Source Serif 4', 'Jost'], ['cormorant', 'Cormorant Garamond + Mulish (dreamy)', 'Cormorant Garamond', 'Mulish'],
      ['fraunces', 'Fraunces + Figtree (soft and warm)', 'Fraunces', 'Figtree'], ['lora', 'Lora + Source Sans 3 (very readable)', 'Lora', 'Source Sans 3'],
      ['playfair', 'Playfair Display + Lato (classic luxury)', 'Playfair Display', 'Lato'], ['spectral', 'Spectral + Albert Sans (light and clear)', 'Spectral', 'Albert Sans'],
      ['newsreader', 'Newsreader + Outfit (calm editorial)', 'Newsreader', 'Outfit'], ['marcellus', 'Marcellus + Karla (spa calm)', 'Marcellus', 'Karla'],
      ['garamond', 'EB Garamond + Nunito Sans (heritage)', 'EB Garamond', 'Nunito Sans'], ['dm', 'DM Serif Display + DM Sans (modern contrast)', 'DM Serif Display', 'DM Sans'],
      ['manrope', 'Manrope only (quiet)', 'Manrope', 'Manrope'], ['quicksand', 'Quicksand + Nunito (friendly, rounded)', 'Quicksand', 'Nunito']
    ],
    schemes: [
      ['asbuilt', '0. As built'],
      ['forest', 'Forest and clay', { dark: '#1F3D2B', bg: '#FAF7F2', light: '#E8DFCF', accent: '#B8683C', text: '#1E2620' }],
      ['nordic', 'Nordic mist (slate blue, rust)', { dark: '#2F4550', bg: '#F6F7F5', light: '#E3E7E4', accent: '#A0634A', text: '#1F2A30' }],
      ['sage', 'Sage and linen (soft green, caramel)', { dark: '#44574A', bg: '#F7F4EE', light: '#E6E3D6', accent: '#A06E45', text: '#22291F' }],
      ['dusk', 'Dusk (deep violet, dusty rose)', { dark: '#3E3A56', bg: '#F8F6F4', light: '#E9E4EC', accent: '#9C5F70', text: '#24222E' }],
      ['fjord', 'Fjord and sand (deep blue, copper)', { dark: '#1E3A4C', bg: '#FAF7F1', light: '#EDE3D2', accent: '#B06A38', text: '#1B2730' }],
      ['stone', 'Warm stone (charcoal, walnut)', { dark: '#3B3631', bg: '#FAF8F5', light: '#EEE8E0', accent: '#8F6246', text: '#2A2622' }],
      ['lake', 'Lake morning (navy, pale blue, gold)', { dark: '#2C3E57', bg: '#F7F8FA', light: '#E4E9EF', accent: '#8C6A2F', text: '#1E2633' }],
      ['heather', 'Heather and oat (plum, oat)', { dark: '#5A4552', bg: '#FAF7F3', light: '#EDE5DC', accent: '#8A5A5E', text: '#2A2226' }],
      ['pine', 'Pine and birch (dark pine, moss)', { dark: '#24382F', bg: '#FBFAF6', light: '#ECEBE3', accent: '#66703A', text: '#1D2420' }],
      ['sun', 'Algarve sun (earth brown, terracotta)', { dark: '#6B3F2A', bg: '#FBF6EF', light: '#F1E3D3', accent: '#B25A33', text: '#2B1F19' }],
      ['seaglass', 'Sea glass (soft teal, copper)', { dark: '#2E5450', bg: '#F6F8F6', light: '#DFE9E6', accent: '#A9653F', text: '#1C2826' }],
      ['mono', 'Black and white', { dark: '#1A1A1A', bg: '#FFFFFF', light: '#F0F0F0', accent: '#1A1A1A', text: '#1A1A1A' }]
    ]
  };

  function blank() { return { fonts: { all: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {} }, colours: {}, pair: 'p:asbuilt', scheme: 'c:asbuilt' }; }
  var s = blank();
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.fonts) s = Object.assign(blank(), sv); } catch (e) {}
  var catalogue = null, catIndex = {}, saved = [], abState = null, loadedPrev = {};
  var $ = function (c, el) { return (el || document).querySelector(c); };
  var $$ = function (c, el) { return [].slice.call((el || document).querySelectorAll(c)); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // ---------- page elements ----------
  var box = document.createElement('div'); box.id = 'ds'; box.className = 'ds-ui';
  box.innerHTML =
    '<button type="button" class="ds-open" aria-label="Fonts and colours" title="Try fonts and colours">Aa</button>' +
    '<div class="ds-panel" role="dialog" aria-label="Fonts and colours" tabindex="-1" hidden>' +
      '<div class="ds-grab" aria-hidden="true"><span></span></div>' +
      '<div class="ds-head"><div class="ds-title"><strong>Fonts and colours</strong><span class="ds-note">Test site only</span></div><button type="button" class="ds-x ds-close" aria-label="Close">×</button></div>' +
      '<div class="ds-tools"><button type="button" class="ds-tb ds-undo" title="Undo (Ctrl+Z)" aria-label="Undo" disabled>↶ Undo</button>' +
        '<button type="button" class="ds-tb ds-redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled>↷ Redo</button>' +
        '<button type="button" class="ds-tb ds-hold" title="Press and hold (or hold Space) to see the site as built">Hold to see as built</button></div>' +
      '<div class="ds-body">' +
        '<details class="ds-sec"><summary>Fonts</summary><div class="ds-qp" data-kind="fonts"><button type="button" class="ds-qpbtn" aria-expanded="false"></button><div class="ds-qplist" role="listbox" hidden></div></div><div class="ds-roles"></div>' +
          '<div class="ds-saveas"><input class="ds-name" data-kind="fonts" placeholder="Name this font set" maxlength="60"><button type="button" class="ds-b ds-save" data-kind="fonts">Save</button></div></details>' +
        '<details class="ds-sec"><summary>Colours</summary><div class="ds-qp" data-kind="colours"><button type="button" class="ds-qpbtn" aria-expanded="false"></button><div class="ds-qplist" role="listbox" hidden></div></div><div class="ds-colors"></div>' +
          '<p class="ds-hint">"auto" means as built. Press and hold the ◉ eye to see where a colour is used.</p>' +
          '<div class="ds-saveas"><input class="ds-name" data-kind="colours" placeholder="Name this colour set" maxlength="60"><button type="button" class="ds-b ds-save" data-kind="colours">Save</button></div></details>' +
        '<details class="ds-sec"><summary>Compare A/B</summary><div class="ds-ab">' +
          '<span>Fonts</span><select class="ds-absel" data-kind="fonts" data-side="A" aria-label="Fonts A"></select><select class="ds-absel" data-kind="fonts" data-side="B" aria-label="Fonts B"></select>' +
          '<span>Colours</span><select class="ds-absel" data-kind="colours" data-side="A" aria-label="Colours A"></select><select class="ds-absel" data-kind="colours" data-side="B" aria-label="Colours B"></select>' +
          '<button type="button" class="ds-b ds-flip">Show A</button></div></details>' +
        '<p class="ds-msg" aria-live="polite"></p><div class="ds-warn" aria-live="polite"></div>' +
        '<div class="ds-actions"><button type="button" class="ds-b ds-use">Make this the standard design</button><button type="button" class="ds-b ds-reset">Back to the design as built</button></div>' +
      '</div>' +
    '</div>' +
    '<div class="ds-picker" hidden><div class="ds-ph"><input class="ds-search" placeholder="Search fonts" autocomplete="off"><button type="button" class="ds-x ds-pclose" aria-label="Close">×</button></div>' +
      '<div class="ds-cats"></div><div class="ds-flist" role="listbox"></div></div>' +
    '<div class="ds-marks"></div>';
  document.body.appendChild(box);
  var panel = $('.ds-panel'), picker = $('.ds-picker');
  function msg(t) { var m = $('.ds-msg'); m.textContent = t || ''; if (t) setTimeout(function () { if (m.textContent === t) m.textContent = ''; }, 3500); }

  // ---------- colour helpers ----------
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function rgb2hex(c) { return '#' + c.map(function (v) { return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'); }).join(''); }
  function mix(a, b, p) { var x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map(function (v, i) { return v * p + y[i] * (1 - p); })); }
  function lum(h) { return hex2rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (a, v, i) { return a + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  var probe = document.createElement('span'); probe.style.display = 'none'; box.appendChild(probe);
  function resolved(v, fallback) {
    probe.style.color = 'var(' + v + ', ' + (fallback || '#000') + ')';
    var c = getComputedStyle(probe).color.match(/[\d.]+/g);
    return c ? rgb2hex(c.slice(0, 3).map(Number)) : '#000000';
  }

  // ---------- taking the tested design off (hold, measuring the look as built) ----------
  var BASE = {}; // custom properties the page itself sets on <html>; they are part of the design as built
  (function () { var early = s.vars || {}; for (var i = 0; i < root.style.length; i++) { var n = root.style[i]; if (n.indexOf('--') === 0 && !(n in early)) BASE[n] = root.style.getPropertyValue(n); } })();
  function strip() {
    var vars = [], sheets = [];
    for (var i = root.style.length - 1; i >= 0; i--) { var n = root.style[i]; if (n.indexOf('--') === 0 && !(n in BASE)) vars.push([n, root.style.getPropertyValue(n)]); }
    vars.forEach(function (v) { root.style.removeProperty(v[0]); });
    var l = document.getElementById('ds-fonts'); if (l && l.sheet && !l.sheet.disabled) { l.sheet.disabled = true; sheets.push(l.sheet); }
    return function () { vars.forEach(function (v) { root.style.setProperty(v[0], v[1]); }); sheets.forEach(function (sh) { sh.disabled = false; }); };
  }
  // The look as built: fonts of this page and the theme colours, measured once with the tested design taken off.
  var AB = (function () {
    var put = strip(), vis = function (el) { return el && !el.closest('#ds, .cm-ui') && el.getClientRects().length; };
    var h = $$('main h1, main h2, h1, h2').filter(vis)[0], b = $$('main p, p').filter(vis)[0] || document.body;
    var o = { head: getComputedStyle(h || document.body).fontFamily, body: getComputedStyle(b).fontFamily,
      bg: resolved('--bg', '#ffffff'), text: resolved('--text', '#222222'), dark: resolved('--dark', '#333333'), light: resolved('--light', '#eeeeee'), accent: resolved('--accent', '#555555') };
    o.muted = resolved('--muted', mix(o.text, o.bg, 0.7));
    put();
    return o;
  })();
  // The panel's own fixed look, from the site as built (its brand), never from the design being tested.
  // A dark page (light text on a dark background, like a night-time poster) would make the panel unreadable: its
  // fields are white. Then the panel keeps light neutral surfaces and takes only the brand's dark and accent colours,
  // and only where they are readable.
  (function () {
    var white = '#ffffff';
    var lightPage = lum(AB.bg) > 0.5 && contrast(AB.text, white) >= 7 && contrast(AB.text, AB.light) >= 4.5;
    var bg = lightPage ? AB.bg : '#faf8f4', light = lightPage ? AB.light : '#efebe3', text = lightPage ? AB.text : '#1f2422';
    var muted = lightPage && contrast(AB.muted, AB.bg) >= 4.5 ? AB.muted : mix(text, bg, 0.72);
    var dark = contrast(AB.dark, light) >= 4.5 && contrast(AB.dark, white) >= 4.5 ? AB.dark : (contrast(AB.text, white) >= 7 ? AB.text : '#2b3330');
    var accent = contrast(AB.accent, white) >= 3 ? AB.accent : mix(AB.accent, '#000000', 0.6);
    var onAcc = contrast(white, accent) >= 3 ? white : text, onDark = contrast(bg, dark) >= 4.5 ? bg : white;
    var v = { '--ds-dark': dark, '--ds-dark-2': mix(dark, '#000000', 0.8), '--ds-on-dark': onDark, '--ds-on-dark-2': mix(onDark, dark, 0.75),
      '--ds-bg': bg, '--ds-light': light, '--ds-light-2': mix(light, text, 0.85), '--ds-line': mix(light, text, 0.78),
      '--ds-accent': accent, '--ds-accent-2': mix(accent, '#000000', 0.85), '--ds-on-accent': onAcc,
      '--ds-text': text, '--ds-muted': muted, '--ds-white': white,
      '--ds-font': AB.body, '--ds-head': AB.head };
    for (var k in v) box.style.setProperty(k, v[k]);
  })();

  // ---------- fonts ----------
  function fontInfo(name) { return catIndex[name] || null; }
  function hasItalic(name) { var f = fontInfo(name); return f ? f[3].length > 0 : true; }
  function famCss(name) { var f = fontInfo(name); return '"' + name + '", ' + (f && f[1] === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif'); }
  function familyQuery(name) {
    var f = fontInfo(name), fam = 'family=' + encodeURIComponent(name).replace(/%20/g, '+');
    if (!f) return fam;
    if (f[4]) { var r = f[2][0] + '..' + f[2][1]; return fam + (f[3].length ? ':ital,wght@0,' + r + ';1,' + f[3][0] + '..' + f[3][1] : ':wght@' + r); }
    var ws = f[2].slice().sort(function (a, b) { return a - b; });
    if (f[3].length) return fam + ':ital,wght@' + ws.map(function (w) { return '0,' + w; }).concat(f[3].slice().sort(function (a, b) { return a - b; }).map(function (w) { return '1,' + w; })).join(';');
    return fam + (ws.length > 1 || ws[0] !== 400 ? ':wght@' + ws.join(';') : '');
  }
  function loadCatalogue() {
    if (catalogue) return Promise.resolve(catalogue);
    return fetch('/_tools/fonts.json').then(function (r) { return r.json(); }).then(function (j) { catalogue = j; j.forEach(function (f) { catIndex[f[0]] = f; }); return j; }, function () { catalogue = []; return []; });
  }

  // ---------- apply ----------
  function compute() {
    var vars = {}, fams = [], A = s.fonts.all || {}, c = s.colours || {};
    ROLES.forEach(function (r) {
      var n = r[0], f = s.fonts[n] || {};
      if (f.family) { vars['--f' + n] = famCss(f.family); if (fams.indexOf(f.family) < 0) fams.push(f.family); }
      if (f.size && f.size !== 100) vars['--s' + n] = String(f.size / 100);
      if (f.weight) vars['--w' + n] = String(f.weight);
      if (f.italic) vars['--i' + n] = f.italic === 'on' ? 'italic' : 'normal';
      if (f.caps) vars['--t' + n] = f.caps === 'on' ? 'uppercase' : 'none';
      if (f.spacing != null && f.spacing !== '') vars['--l' + n] = f.spacing + 'em';
      if (f.lh) vars['--h' + n] = String(f.lh);
      if (f.color) vars['--c' + n] = f.color;
    });
    if (A.light) vars['--c-light'] = A.light;
    var bg = c.bg || AB.bg, text = c.text || AB.text;
    if (c.bg) vars['--bg'] = c.bg;
    if (c.text) vars['--text'] = c.text;
    if (c.bg || c.text) vars['--muted'] = mix(text, bg, 0.7);
    if (c.dark) { vars['--dark'] = c.dark; vars['--dark-2'] = mix(c.dark, '#000000', 0.78); }
    if (c.dark || c.bg) vars['--on-dark'] = mix(bg, c.dark || AB.dark, 0.75);
    if (c.light) { vars['--light'] = c.light; vars['--light-2'] = mix(c.light, text, 0.85); vars['--line'] = mix(c.light, text, 0.8); }
    if (c.accent) { vars['--accent'] = c.accent; vars['--accent-2'] = mix(c.accent, '#000000', 0.85); vars['--accent-soft'] = mix(c.accent, '#ffffff', 0.35); }
    return { vars: vars, href: fams.length ? 'https://fonts.googleapis.com/css2?' + fams.map(familyQuery).join('&') + '&display=swap' : '' };
  }
  function apply(persist) {
    if (held) holdOff();
    var r = compute();
    for (var i = root.style.length - 1; i >= 0; i--) { var n = root.style[i]; if (n.indexOf('--') === 0 && !(n in BASE)) root.style.removeProperty(n); }
    for (var k in r.vars) root.style.setProperty(k, r.vars[k]);
    var link = document.getElementById('ds-fonts');
    if (r.href) {
      if (!link) { link = document.createElement('link'); link.id = 'ds-fonts'; link.rel = 'stylesheet'; document.head.appendChild(link); }
      if (link.getAttribute('href') !== r.href) { link.onload = refit; link.href = r.href; }
    } else if (link) link.remove();
    s.vars = r.vars; s.href = r.href;
    if (persist !== false) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
    record();
    refit(); clearTimeout(apply.t); apply.t = setTimeout(checks, 700);
  }
  function refit() { (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { window.dispatchEvent(new Event('resize')); }); }

  // ---------- fonts UI ----------
  function opt(v, label, cur) { return '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + label + '</option>'; }
  function colourRow(k, val, auto, label) {
    return '<div class="ds-tc" data-ck="' + k + '"><input type="color" value="' + val + '" aria-label="' + esc(label) + '"><span>' + esc(label) + '</span>' +
      (auto ? '<em>auto</em>' : '<button type="button" class="ds-auto" title="Back to auto">reset</button>') + '</div>';
  }
  function roleBlock(r) {
    var n = r[0], f = s.fonts[n] || {}, fam = f.family || '', autoCol = resolved('--c' + n, resolved('--text'));
    var changed = Object.keys(f).some(function (k) { return f[k] != null && f[k] !== ''; });
    return '<details class="ds-role" data-r="' + n + '"' + (changed ? ' open' : '') + '><summary><span>' + n + ' ' + r[1] + '</span><em>' + esc(fam || 'as built') + '</em></summary>' +
      '<button type="button" class="ds-font' + (fam ? '' : ' is-design') + '" style="font-family:' + esc(fam ? famCss(fam) : 'inherit') + '">' + esc(fam || 'Font as built') + '</button>' +
      '<div class="ds-grid">' +
      '<label>Size<select data-k="size">' + [70, 80, 90, 95, 100, 105, 110, 120, 130, 145, 160].map(function (v) { return opt(v, v + ' %' + (v === 100 ? ' (as built)' : ''), f.size || 100); }).join('') + '</select></label>' +
      '<label>Weight<select data-k="weight">' + [[-300, 'Much lighter'], [-200, 'Lighter'], [-100, 'A bit lighter'], [0, 'As built'], [100, 'A bit bolder'], [200, 'Bolder'], [300, 'Much bolder']].map(function (w) { return opt(w[0], w[1], f.weight || 0); }).join('') + '</select></label>' +
      '<label>Italic<select data-k="italic">' + opt('', 'As built', f.italic || '') + opt('off', 'Normal', f.italic || '') + (hasItalic(fam) ? opt('on', 'Italic', f.italic || '') : '') + '</select></label>' +
      '<label>Capitals<select data-k="caps">' + opt('', 'As built', f.caps || '') + opt('off', 'Normal', f.caps || '') + opt('on', 'ALL CAPITALS', f.caps || '') + '</select></label>' +
      '<label>Letter spacing (em)<input type="number" data-k="spacing" min="-0.1" max="0.4" step="0.01" placeholder="as built" value="' + (f.spacing == null ? '' : f.spacing) + '"></label>' +
      '<label>Line height<input type="number" data-k="lh" min="0.8" max="2.4" step="0.05" placeholder="as built" value="' + (f.lh == null ? '' : f.lh) + '"></label>' +
      '</div>' + colourRow('c' + n, f.color || autoCol, !f.color, 'Colour on light backgrounds') + '</details>';
  }
  function renderRoles() {
    var fams = ROLES.map(function (r) { return (s.fonts[r[0]] || {}).family || null; });
    var same = fams.every(function (f) { return f === fams[0]; }), A = s.fonts.all = s.fonts.all || {};
    $('.ds-roles').innerHTML = '<div class="ds-all"><div class="ds-rh">All text</div>' +
      '<button type="button" class="ds-font ds-allfont" style="font-family:' + esc(same && fams[0] ? famCss(fams[0]) : 'inherit') + '">' + esc(same ? (fams[0] || 'Font as built') : 'Mixed: pick one for all') + '</button>' +
      colourRow('light', A.light || AB.bg, !A.light, 'Text on dark backgrounds') + '</div>' + ROLES.map(roleBlock).join('');
    $('.ds-allfont').onclick = function () { openPicker('all'); };
    $$('.ds-role').forEach(bindRole);
    bindColourRows($('.ds-all'));
  }
  function bindRole(el) {
    var n = el.dataset.r;
    $('.ds-font', el).onclick = function () { openPicker(n); };
    $$('[data-k]', el).forEach(function (inp) {
      inp.addEventListener(inp.type === 'number' ? 'input' : 'change', function () {
        var f = s.fonts[n] = s.fonts[n] || {}, k = inp.dataset.k, v = inp.value;
        if (inp.type === 'number') { var x = parseFloat(v); f[k] = isNaN(x) ? null : x; }
        else if (k === 'size' || k === 'weight') f[k] = +v || null;
        else f[k] = v || null;
        markCustom('fonts'); apply();
      });
    });
    bindColourRows(el);
  }
  function bindColourRows(scope) {
    $$('.ds-tc', scope).forEach(function (row) {
      var k = row.dataset.ck, inp = $('input', row);
      var setC = function (val) { if (k === 'light') s.fonts.all.light = val; else { var f = s.fonts[k.slice(1)] = s.fonts[k.slice(1)] || {}; f.color = val; } };
      inp.addEventListener('input', function () { setC(inp.value); markCustom('fonts'); apply(); });
      inp.addEventListener('change', function () { renderRoles(); });
      var a = $('.ds-auto', row); if (a) a.onclick = function () { setC(null); markCustom('fonts'); apply(); renderRoles(); };
    });
  }

  // ---------- font picker ----------
  var pickRole = null, cat = '', io = null;
  function openPicker(n) {
    pickRole = n; picker.hidden = false; $('.ds-search').value = ''; cat = '';
    $('.ds-cats').innerHTML = CATS.map(function (c) { return '<button type="button" data-c="' + c[0] + '"' + (c[0] === cat ? ' class="on"' : '') + '>' + c[1] + '</button>'; }).join('');
    $$('.ds-cats button').forEach(function (b) { b.onclick = function () { cat = b.dataset.c; $$('.ds-cats button').forEach(function (x) { x.classList.toggle('on', x === b); }); list(); }; });
    loadCatalogue().then(function () { list(); });
    if (innerWidth > 760) setTimeout(function () { $('.ds-search').focus(); }, 30);
  }
  function list(limit) {
    limit = limit || 120;
    var q = $('.ds-search').value.trim().toLowerCase();
    var items = catalogue.filter(function (f) { return (!cat || f[1] === cat) && (!q || f[0].toLowerCase().indexOf(q) > -1); });
    var fl = $('.ds-flist');
    fl.innerHTML = '<button type="button" class="ds-fi" data-f="">As built</button>' + items.slice(0, limit).map(function (f) {
      return '<button type="button" class="ds-fi" data-f="' + esc(f[0]) + '" style="font-family:' + esc(famCss(f[0])) + '"><span>' + esc(f[0]) + '</span><small>' + ({ serif: 'serif', sans: 'sans serif', display: 'decorative', hand: 'handwriting', mono: 'monospace' })[f[1]] + '</small></button>';
    }).join('') + (items.length > limit ? '<button type="button" class="ds-more">Show more (' + (items.length - limit) + ')</button>' : '') + (q && !items.length ? '<p class="ds-hint">No font with that name.</p>' : '');
    var mb = $('.ds-more', fl); if (mb) mb.onclick = function () { list(limit + 200); };
    $$('.ds-fi', fl).forEach(function (b) {
      b.onclick = function () {
        (pickRole === 'all' ? ROLES.map(function (r) { return r[0]; }) : [pickRole]).forEach(function (n) {
          var f = s.fonts[n] = s.fonts[n] || {}; f.family = b.dataset.f || null; if (f.italic === 'on' && !hasItalic(f.family || '')) f.italic = null;
        });
        markCustom('fonts'); picker.hidden = true; renderRoles(); apply();
      };
    });
    // Each name is shown in its own font; only names scrolled into view are loaded (test site only).
    if (io) io.disconnect();
    io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return; var n = e.target.dataset.f; io.unobserve(e.target);
        if (!n || loadedPrev[n]) return; loadedPrev[n] = 1;
        var l = document.createElement('link'); l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(n).replace(/%20/g, '+') + '&text=' + encodeURIComponent(n) + '&display=swap';
        document.head.appendChild(l);
      });
    }, { root: fl });
    $$('.ds-fi[data-f]', fl).forEach(function (b) { if (b.dataset.f) io.observe(b); });
  }
  $('.ds-search').addEventListener('input', function () { list(); });
  $('.ds-pclose').onclick = function () { picker.hidden = true; };

  // ---------- colours UI ----------
  function renderColours() {
    var c = s.colours || {};
    $('.ds-colors').innerHTML = COLOURS.map(function (p) {
      var val = c[p[0]] || resolved(p[2]);
      return '<div class="ds-c" data-c="' + p[0] + '"><input type="color" value="' + val + '" aria-label="' + p[1] + '"><span>' + p[1] + '</span>' +
        (c[p[0]] ? '<button type="button" class="ds-auto" title="Back to auto">reset</button>' : '<em>auto</em>') +
        '<button type="button" class="ds-eye" title="Show where it is used" aria-label="Show where ' + p[1] + ' is used">◉</button></div>';
    }).join('');
    $$('.ds-c').forEach(function (row) {
      var k = row.dataset.c, inp = $('input', row);
      inp.addEventListener('input', function () { s.colours[k] = inp.value; markCustom('colours'); apply(); });
      inp.addEventListener('change', function () { renderColours(); });
      var a = $('.ds-auto', row); if (a) a.onclick = function () { delete s.colours[k]; markCustom('colours'); apply(); renderColours(); };
      var eye = $('.ds-eye', row);
      eye.addEventListener('pointerdown', function (e) { e.preventDefault(); showWhere(k); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { eye.addEventListener(ev, clearMarks); });
    });
  }
  function clearMarks() { $('.ds-marks').innerHTML = ''; }
  function showWhere(k) {
    clearMarks();
    var p = COLOURS.find(function (x) { return x[0] === k; }), want = 'rgb(' + hex2rgb((s.colours || {})[k] || resolved(p[2])).join(', ') + ')';
    var props = k === 'text' ? ['color'] : k === 'accent' ? ['color', 'backgroundColor'] : ['backgroundColor'];
    var n = 0, marks = $('.ds-marks');
    $$('body *').forEach(function (el) {
      if (n > 300 || el.closest('#ds, .cm-ui')) return;
      var r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return;
      var cs = getComputedStyle(el), hit = props.some(function (pr) {
        if (cs[pr] !== want) return false;
        return pr !== 'color' || [].some.call(el.childNodes, function (c) { return c.nodeType === 3 && c.textContent.trim(); });
      });
      if (!hit) return;
      var m = document.createElement('div'); m.className = 'ds-mark';
      m.style.left = r.left + 'px'; m.style.top = r.top + 'px'; m.style.width = r.width + 'px'; m.style.height = r.height + 'px';
      marks.appendChild(m); n++;
    });
    if (!n) { var m = document.createElement('div'); m.className = 'ds-mark-none'; m.textContent = 'Not used on the part of the page you can see'; marks.appendChild(m); }
  }

  // ---------- readability ----------
  function checks() {
    var out = [], body = parseFloat(getComputedStyle(document.body).fontSize);
    if (body < 15.5) out.push('Body text is about ' + Math.round(body) + ' px on this screen. 16 px or more reads more easily.');
    var bg = resolved('--bg', '#ffffff'), ink = resolved('--text'), mut = resolved('--muted', ink), acc = resolved('--accent'), dark = resolved('--dark'), onDark = resolved('--c-light', bg);
    var c1 = contrast(ink, bg), c2 = contrast(mut, bg), c3 = contrast('#ffffff', acc), c4 = contrast(onDark, dark);
    if (c1 < 4.5) out.push('Text on the page background has low contrast (' + c1.toFixed(1) + ':1, aim for 4.5 or more).');
    if (c2 < 4.5) out.push('Grey text has low contrast (' + c2.toFixed(1) + ':1, aim for 4.5 or more).');
    if (c3 < 3) out.push('White text on the accent colour has low contrast (' + c3.toFixed(1) + ':1, aim for 3 or more).');
    if (c4 < 4.5) out.push('Text on dark sections has low contrast (' + c4.toFixed(1) + ':1, aim for 4.5 or more).');
    $('.ds-warn').innerHTML = out.length ? out.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') : '<p class="ok">Readability checks pass on this screen.</p>';
  }

  // ---------- presets: cards, saving, A/B ----------
  // A set is 'p:<id>' / 'c:<id>' (built in), 's:<id>' (saved on this test site) or 'custom'.
  function builtIn(kind) { return kind === 'fonts' ? P.pairs.map(function (p) { return ['p:' + p[0], p[1]]; }) : P.schemes.map(function (p) { return ['c:' + p[0], p[1]]; }); }
  function savedOf(kind) { return saved.filter(function (d) { return d.kind === kind; }).sort(function (a, b) { return a.name.localeCompare(b.name); }); }
  function curId(kind) { return (kind === 'fonts' ? s.pair : s.scheme) || 'custom'; }
  function nameOf(kind, id) {
    if (id === 'custom') return 'Your changes (not saved)';
    var b = builtIn(kind).find(function (x) { return x[0] === id; }); if (b) return b[1];
    var d = saved.find(function (x) { return 's:' + x.id === id; }); return d ? d.name : 'Your changes (not saved)';
  }
  function setOf(kind, id) {
    var t = id.slice(0, 2), k = id.slice(2);
    if (t === 's:') { var d = saved.find(function (x) { return x.id === k; }); return d ? JSON.parse(JSON.stringify(d.settings)) : null; }
    if (kind === 'fonts') {
      var p = P.pairs.find(function (x) { return x[0] === k; }); if (!p) return null;
      var f = blank().fonts; if (p[2]) ROLES.forEach(function (r) { f[r[0]] = { family: r[0] === 1 ? p[2] : p[3] }; });
      return f;
    }
    var c = P.schemes.find(function (x) { return x[0] === k; }); return c ? Object.assign({}, c[2] || {}) : null;
  }
  function useSet(kind, id, quiet) {
    var o = setOf(kind, id); if (!o) return;
    if (kind === 'fonts') { s.fonts = o; s.pair = id; renderRoles(); } else { s.colours = o; s.scheme = id; renderColours(); }
    apply(); renderQuick(); if (!quiet) msg('Using "' + nameOf(kind, id) + '".');
  }
  function markCustom(kind) { if (kind === 'fonts') s.pair = 'custom'; else s.scheme = 'custom'; renderQuick(); }
  // Cards: font sets show "Aa" in their heading and body fonts, colour sets their five main colours.
  function fontsOf(id) {
    var t = id.slice(0, 2), k = id.slice(2);
    if (t === 'p:') { var p = P.pairs.find(function (x) { return x[0] === k; }); if (!p || !p[2]) return { head: AB.head, body: AB.body }; return { head: famCss(p[2]), body: famCss(p[3]), names: [p[2], p[3]] }; }
    var d = saved.find(function (x) { return 's:' + x.id === id; }), f = (d && d.settings) || {};
    var h = (f[1] || {}).family, bd = (f[4] || {}).family;
    return { head: h ? famCss(h) : AB.head, body: bd ? famCss(bd) : AB.body, names: [h, bd].filter(Boolean) };
  }
  function dotsOf(id) {
    var t = id.slice(0, 2), k = id.slice(2), ab = [AB.dark, AB.bg, AB.light, AB.accent, AB.text], c = {};
    if (t === 'c:') { var p = P.schemes.find(function (x) { return x[0] === k; }); c = (p && p[2]) || {}; }
    else { var d = saved.find(function (x) { return 's:' + x.id === id; }); c = (d && d.settings) || {}; }
    return [c.dark, c.bg, c.light, c.accent, c.text].map(function (v, i) { return v || ab[i]; });
  }
  function loadSamples(ids) {
    ids.forEach(function (id) {
      (fontsOf(id).names || []).forEach(function (n) {
        if (!n || loadedPrev['Aa:' + n]) return; loadedPrev['Aa:' + n] = 1;
        var l = document.createElement('link'); l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(n).replace(/%20/g, '+') + '&text=Aa&display=swap';
        document.head.appendChild(l);
      });
    });
  }
  function sample(kind, id) {
    if (kind === 'fonts') { var f = fontsOf(id); return '<span class="ds-smp ds-smpf" aria-hidden="true"><b style="font-family:' + esc(f.head) + '">Aa</b><i style="font-family:' + esc(f.body) + '">Aa</i></span>'; }
    return '<span class="ds-smp ds-smpc" aria-hidden="true">' + dotsOf(id).map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join('') + '</span>';
  }
  function card(kind, id, name, cur, rm) {
    return '<div class="ds-qpi' + (id === cur ? ' on' : '') + '" data-id="' + id + '" role="option" tabindex="0" aria-selected="' + (id === cur) + '">' + sample(kind, id) +
      '<span class="ds-qpn">' + esc(name) + '</span>' + (rm ? '<button type="button" class="ds-rm" title="Remove this saved set" aria-label="Remove ' + esc(name) + '">×</button>' : '') + '</div>';
  }
  function renderQuick() {
    $$('.ds-qp').forEach(function (qp) {
      var kind = qp.dataset.kind, cur = curId(kind), lst = $('.ds-qplist', qp), btn = $('.ds-qpbtn', qp);
      var bh = (cur === 'custom' ? '' : sample(kind, cur)) + '<span class="ds-qpn">' + esc(nameOf(kind, cur)) + '</span>';
      if (btn.dataset.html !== bh) { btn.innerHTML = bh; btn.dataset.html = bh; }
      if (lst.hidden) return;
      var team = savedOf(kind);
      lst.innerHTML = '<div class="ds-qpg">Saved on this test site</div>' + (team.length ? team.map(function (d) { return card(kind, 's:' + d.id, d.name, cur, true); }).join('')
        : '<div class="ds-qpnone">Nothing saved yet. Adjust below, give it a name and press Save.</div>') +
        '<div class="ds-qpg">Built in</div>' + builtIn(kind).map(function (x) { return card(kind, x[0], x[1], cur, false); }).join('');
      $$('.ds-qpi', lst).forEach(function (it) {
        var go = function () { lst.hidden = true; btn.setAttribute('aria-expanded', 'false'); useSet(kind, it.dataset.id); btn.focus(); };
        it.onclick = function (e) { if (e.target.closest('.ds-rm')) return; go(); };
        it.onkeydown = function (e) { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.ds-rm')) { e.preventDefault(); go(); } };
      });
      $$('.ds-rm', lst).forEach(function (b) {
        b.onclick = function () {
          var id = b.parentNode.dataset.id.slice(2);
          if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Remove?'; b.classList.add('sure'); setTimeout(function () { b.dataset.sure = ''; b.textContent = '×'; b.classList.remove('sure'); }, 3000); return; }
          post('?delete=' + encodeURIComponent(id)).then(function (j) {
            saved = j; if (curId('fonts') === 's:' + id) s.pair = 'custom'; if (curId('colours') === 's:' + id) s.scheme = 'custom';
            renderQuick(); renderAB(); msg('Removed.');
          }, function (e) { msg(e.message); });
        };
      });
    });
  }
  $$('.ds-qpbtn').forEach(function (b) {
    b.onclick = function () {
      var l = b.nextElementSibling, open = l.hidden, kind = b.parentNode.dataset.kind;
      $$('.ds-qplist').forEach(function (x) { x.hidden = true; }); l.hidden = !open; b.setAttribute('aria-expanded', String(open));
      if (open) { loadSamples(builtIn(kind).map(function (x) { return x[0]; }).concat(savedOf(kind).map(function (d) { return 's:' + d.id; }))); renderQuick(); }
    };
  });
  document.addEventListener('click', function (e) { if (!e.composedPath().some(function (n) { return n.classList && n.classList.contains('ds-qp'); })) $$('.ds-qplist').forEach(function (x) { x.hidden = true; }); });
  function renderAB() {
    $$('.ds-absel').forEach(function (sel) {
      var kind = sel.dataset.kind, v = sel.value, team = savedOf(kind);
      sel.innerHTML = '<option value="">' + sel.dataset.side + ': not compared</option>' +
        (team.length ? '<optgroup label="Saved">' + team.map(function (d) { return '<option value="s:' + d.id + '">' + esc(d.name) + '</option>'; }).join('') + '</optgroup>' : '') +
        '<optgroup label="Built in">' + builtIn(kind).map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + '</option>'; }).join('') + '</optgroup>';
      sel.value = v || '';
    });
  }
  function post(qs, body) {
    return fetch(API + qs, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Could not save'); return j; }); });
  }
  function loadSaved() { return fetch(API).then(function (r) { return r.ok ? r.json() : []; }).then(function (j) { saved = Array.isArray(j) ? j : []; renderQuick(); renderAB(); }, function () {}); }
  $$('.ds-save').forEach(function (b) {
    b.onclick = function () {
      var kind = b.dataset.kind, inp = $('.ds-name[data-kind="' + kind + '"]'), name = inp.value.trim();
      if (!name) { msg('Give it a name first.'); inp.focus(); return; }
      post('', { name: name, kind: kind, settings: kind === 'fonts' ? s.fonts : s.colours }).then(function (j) {
        saved = j; inp.value = '';
        var d = saved.find(function (x) { return x.name.toLowerCase() === name.toLowerCase() && x.kind === kind; });
        if (d) { if (kind === 'fonts') s.pair = 's:' + d.id; else s.scheme = 's:' + d.id; apply(); }
        renderQuick(); renderAB(); msg('Saved as "' + name + '". Everyone on the test site can now pick it.');
      }, function (e) { msg(e.message); });
    };
  });
  $$('.ds-name').forEach(function (inp) { inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') $('.ds-save[data-kind="' + inp.dataset.kind + '"]').click(); }); });
  $('.ds-flip').onclick = function () {
    var pairs = ['fonts', 'colours'].map(function (k) { return [k, $('.ds-absel[data-kind="' + k + '"][data-side="A"]').value, $('.ds-absel[data-kind="' + k + '"][data-side="B"]').value]; })
      .filter(function (x) { return x[1] && x[2]; });
    if (!pairs.length) { msg('Choose A and B for fonts or for colours first.'); return; }
    abState = abState === 'A' ? 'B' : 'A';
    pairs.forEach(function (x) { useSet(x[0], abState === 'A' ? x[1] : x[2], true); });
    $('.ds-flip').textContent = 'Showing ' + abState + '. Switch to ' + (abState === 'A' ? 'B' : 'A');
  };

  // Send the design to Claude as a comment, so it becomes the site's own design.
  $('.ds-use').onclick = function () {
    var r = compute();
    if (!Object.keys(r.vars).length) { msg('Nothing changed yet: this is the design as built.'); return; }
    if (!window.VSComments) { msg('The comment tool is not loaded on this page.'); return; }
    var who = ''; try { who = localStorage.getItem('vs-cm-name') || ''; } catch (e) {}
    var b = this; b.disabled = true;
    window.VSComments.post({ kind: 'design', author: who, page: location.pathname, view: innerWidth >= 1025 ? 'desktop' : innerWidth >= 640 ? 'tablet' : 'phone', width: innerWidth,
      comment: 'Please use this font and colour design for the whole site.',
      design: { fontsName: nameOf('fonts', curId('fonts')), coloursName: nameOf('colours', curId('colours')), fonts: s.fonts, colours: s.colours, vars: r.vars, href: r.href } })
      .then(function () { msg('Sent to Claude as a comment. It shows under "All open" in comment mode.'); }, function (e) { msg(e.message); })
      .then(function () { b.disabled = false; });
  };

  // ---------- hold to see as built ----------
  var held = null, holdBtn = $('.ds-hold');
  function holdOn() { if (held) return; held = strip(); panel.classList.add('is-holding'); holdBtn.classList.add('on'); holdBtn.textContent = 'Showing the site as built'; refit(); }
  function holdOff() { if (!held) return; var h = held; held = null; h(); panel.classList.remove('is-holding'); holdBtn.classList.remove('on'); holdBtn.textContent = 'Hold to see as built'; refit(); }
  holdBtn.addEventListener('pointerdown', function (e) { if (e.button > 0) return; e.preventDefault(); holdOn(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { holdBtn.addEventListener(ev, holdOff); });
  holdBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  holdBtn.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holdOn(); } else if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
  holdBtn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); holdOff(); } });
  holdBtn.addEventListener('blur', holdOff);
  window.addEventListener('blur', holdOff);

  // ---------- undo and redo (last 20 changes) ----------
  // Every apply() records the choice; typing in one field or dragging one colour within a second counts as one change.
  var hist = { past: [], future: [], cur: null, key: null, t: 0, quiet: false }, groupKey = null;
  function stateNow() { return JSON.stringify({ fonts: s.fonts, colours: s.colours, pair: s.pair, scheme: s.scheme }); }
  function record() {
    var now = stateNow(), g = groupKey, t = Date.now(); groupKey = null;
    if (hist.quiet || now === hist.cur) { hist.cur = now; return; }
    if (!(g && g === hist.key && t - hist.t < 1000)) { hist.past.push(hist.cur); if (hist.past.length > 20) hist.past.shift(); }
    hist.cur = now; hist.future = []; hist.key = g; hist.t = t; histButtons();
  }
  function histButtons() { $('.ds-undo').disabled = !hist.past.length; $('.ds-redo').disabled = !hist.future.length; }
  function goTo(state) {
    var o = JSON.parse(state); s.fonts = o.fonts; s.colours = o.colours; s.pair = o.pair; s.scheme = o.scheme;
    hist.quiet = true; apply(); hist.quiet = false; hist.cur = state; hist.key = null; sync();
  }
  function undo() { if (!hist.past.length) return; hist.future.push(hist.cur); goTo(hist.past.pop()); histButtons(); msg('Undone.'); }
  function redo() { if (!hist.future.length) return; hist.past.push(hist.cur); goTo(hist.future.pop()); histButtons(); msg('Redone.'); }
  $('.ds-undo').onclick = undo; $('.ds-redo').onclick = redo;
  panel.addEventListener('input', function (e) {
    var t = e.target, bx = t.closest('[data-r], .ds-all'), row = t.closest('[data-ck], [data-c]');
    groupKey = row && t.type === 'color' ? 'c' + (row.dataset.ck || row.dataset.c) : t.dataset.k ? 'r' + ((bx && bx.dataset.r) || 'all') + t.dataset.k : null;
  }, true);
  panel.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    var k = e.key.toLowerCase(), t = e.target;
    if (t.matches('input[type=text], input:not([type]), textarea')) return; // text fields keep their own undo
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
  });

  // ---------- general ----------
  function sync() { renderQuick(); renderAB(); renderRoles(); renderColours(); }
  $('.ds-reset').onclick = function () { s = blank(); try { localStorage.removeItem(KEY); } catch (e) {} apply(false); sync(); msg('Back to the design as built.'); };
  function openPanel() { panel.hidden = false; panel.style.transform = ''; sync(); loadCatalogue().then(sync); loadSaved(); setTimeout(checks, 300); }
  function closePanel() { holdOff(); panel.hidden = true; picker.hidden = true; }
  $('.ds-open').onclick = function () { if (panel.hidden) openPanel(); else closePanel(); };
  $('.ds-close').onclick = closePanel;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !picker.hidden) picker.hidden = true; });
  // Phones: the panel is a bottom sheet; drag its handle (or the header) down to close it.
  [$('.ds-grab'), $('.ds-head')].forEach(function (h) {
    var y0 = null, dy = 0;
    h.addEventListener('pointerdown', function (e) { if (innerWidth > 639 || e.target.closest('button')) return; y0 = e.clientY; dy = 0; panel.classList.add('is-dragging'); h.setPointerCapture(e.pointerId); });
    h.addEventListener('pointermove', function (e) { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); panel.style.transform = 'translateY(' + dy + 'px)'; });
    var end = function () { if (y0 == null) return; y0 = null; panel.classList.remove('is-dragging'); panel.style.transform = ''; if (dy > 80) closePanel(); };
    h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
  });
  if (s.vars && Object.keys(s.vars).length) loadCatalogue().then(function () { hist.quiet = true; apply(false); hist.quiet = false; });
  hist.cur = stateNow(); hist.past = []; histButtons();
})();
