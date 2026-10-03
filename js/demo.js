// Demo-only helpers (static copy of the site).
(function () {
  var root = window.DEMO_ROOT || './';
  var toDemo = function (text) { return String(text).replace(/\]\(\/([a-z0-9-]*)\)/g, function (m, slug) { return '](' + root + (slug ? slug + '/' : '') + ')'; }); };
  var loadAssistant = null;
  var realFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    url = String(url);
    if (url === '/api/events') return realFetch(root + 'api/events.json');
    if (url === '/api/chat') {
      loadAssistant = loadAssistant || new Promise(function (ok, fail) { var s = document.createElement('script'); s.src = root + 'js/assistant.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
      return loadAssistant.then(function () {
        var msgs = JSON.parse(opts.body).messages; var q = msgs[msgs.length - 1].content;
        var out = window.DEMO_ASSISTANT.answer(q); out.reply = toDemo(out.reply);
        return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
      });
    }
    return realFetch(url, opts);
  };
  document.addEventListener('submit', function (e) {
    if (!e.target.closest('form[action*="contact"]')) return;
    e.preventDefault();
    var box = e.target.parentNode.querySelector('.demo-alert') || document.createElement('div');
    box.className = 'alert ok demo-alert';
    box.textContent = 'This is a design demo, so messages are not sent. On the live website this form delivers your message to the church office.';
    e.target.parentNode.insertBefore(box, e.target);
  });
})();
