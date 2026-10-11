// Vagabond Studio font and colour switcher: apply the design being tried before the page paints (test site only).
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('vs-design') || 'null');
    if (!s || !s.vars) return;
    var root = document.documentElement;
    for (var k in s.vars) if (/^--[\w-]+$/.test(k)) root.style.setProperty(k, s.vars[k]);
    if (s.href && /^https:\/\/fonts\.googleapis\.com\/css2\?[\w+%:;@&=.,-]+$/.test(s.href)) {
      var l = document.createElement('link'); l.id = 'ds-fonts'; l.rel = 'stylesheet'; l.href = s.href; document.head.appendChild(l);
    }
  } catch (e) {}
})();
