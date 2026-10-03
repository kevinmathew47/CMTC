(function () {
  const $ = (id) => document.getElementById(id);
  const fab = $('chatFab'), panel = $('chatPanel'), log = $('chatLog'), body = $('chatBody');
  const welcome = $('chatWelcome'), form = $('chatForm'), input = $('chatInput'), send = $('chatSend'), teaser = $('chatTeaser');
  if (!fab || !panel) return;

  const KEY = 'cmtc-chat-v2';
  let history = [];
  let busy = false;
  try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { history = []; }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-24))); } catch (e) {} };

  // ---------- safe mini-markdown: paragraphs, bullet lists, **bold**, *italic*, [links](url) ----------
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inline = (s) => esc(s)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\.{0,2}\/|tel:|mailto:)[^\s)]*)\)/g, (m, t, u) =>
      `<a href="${u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(\b\d{10}\b)/g, (m, n, off, str) => (str.slice(Math.max(0, off - 6), off).includes('href') ? m : `<a href="tel:${n}">${n}</a>`));
  function md(text) {
    const out = [];
    let list = null;
    for (const raw of String(text).split('\n')) {
      const line = raw.trim();
      const bullet = line.match(/^(?:•|-|\*)\s+(.*)$/);
      if (bullet) { if (!list) { list = []; } list.push(`<li>${inline(bullet[1])}</li>`); continue; }
      if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
      if (line) out.push(`<p>${inline(line)}</p>`);
    }
    if (list) out.push(`<ul>${list.join('')}</ul>`);
    return out.join('');
  }

  // ---------- rendering ----------
  const scrollDown = (smooth = true) => body.scrollTo({ top: body.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  function showWelcome(on) { welcome.hidden = !on; log.hidden = on; }

  function addUser(text, animate = true) {
    const el = document.createElement('div');
    el.className = 'm me' + (animate ? ' anim' : '');
    el.textContent = text;
    log.appendChild(el);
    return el;
  }
  function addBot(text, animate = true, suggestions = []) {
    const el = document.createElement('div');
    el.className = 'm bot';
    el.innerHTML = `<img class="m-av" src="${window.CHAT_LOGO}" alt=""><div class="m-text">${md(text)}</div>`;
    log.appendChild(el);
    if (animate) {
      // reveal each paragraph / list item in turn
      const parts = el.querySelectorAll('.m-text > p, .m-text li');
      parts.forEach((p, i) => { p.style.animationDelay = `${i * 70}ms`; p.classList.add('rv'); });
    }
    if (suggestions.length) {
      const s = document.createElement('div');
      s.className = 'm-sugg' + (animate ? ' anim' : '');
      s.innerHTML = suggestions.map((q) => `<button type="button">${esc(q)}</button>`).join('');
      s.style.animationDelay = animate ? `${Math.min(900, el.querySelectorAll('.rv').length * 70 + 150)}ms` : '0ms';
      log.appendChild(s);
    }
    return el;
  }
  function typing() {
    const el = document.createElement('div');
    el.className = 'm bot typing-row anim';
    el.innerHTML = `<img class="m-av" src="${window.CHAT_LOGO}" alt=""><div class="typing"><span></span><span></span><span></span></div>`;
    log.appendChild(el);
    return el;
  }

  function restore() {
    log.innerHTML = '';
    showWelcome(!history.length);
    history.forEach((m) => (m.role === 'user' ? addUser(m.content, false) : addBot(m.content, false)));
  }

  // ---------- open / close ----------
  function open() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    fab.classList.add('hide');
    teaser.hidden = true;
    document.documentElement.classList.add('chat-open');
    restore();
    requestAnimationFrame(() => scrollDown(false));
    setTimeout(() => input.focus({ preventScroll: true }), 250);
  }
  function close() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    fab.classList.remove('hide');
    document.documentElement.classList.remove('chat-open');
    fab.focus({ preventScroll: true });
  }
  fab.addEventListener('click', open);
  $('chatClose').addEventListener('click', close);
  $('chatReset').addEventListener('click', () => { history = []; save(); restore(); input.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  teaser.addEventListener('click', (e) => { if (e.target.closest('.x')) { teaser.hidden = true; try { sessionStorage.setItem('cmtc-teaser', '1'); } catch (x) {} } else open(); });
  let teased = false;
  try { teased = !!sessionStorage.getItem('cmtc-teaser'); } catch (e) {}
  if (!teased && !history.length) setTimeout(() => { if (!panel.classList.contains('open')) teaser.hidden = false; }, 7000);

  // ---------- input ----------
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 130) + 'px'; send.disabled = busy || !input.value.trim(); };
  input.addEventListener('input', grow);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('.cw-list button, .m-sugg button');
    if (b) ask(b.dataset.q || b.textContent);
  });

  async function ask(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    showWelcome(false);
    log.querySelectorAll('.m-sugg').forEach((s) => s.remove());
    addUser(text);
    history.push({ role: 'user', content: text });
    input.value = ''; grow();
    const t = typing();
    scrollDown();
    const started = Date.now();
    let reply = '', suggestions = [], ok = false;
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }) });
      const data = await r.json();
      reply = data.reply || 'Sorry, something went wrong.';
      suggestions = data.suggestions || [];
      ok = r.ok;
    } catch (e) {
      reply = 'Sorry, I could not connect just now. Please try again, or call the church office.';
    }
    // keep the typing dots up briefly so replies never "flash"
    const wait = Math.max(0, 450 - (Date.now() - started));
    await new Promise((res) => setTimeout(res, wait));
    t.remove();
    const el = addBot(reply, true, ok ? suggestions : []);
    if (ok) history.push({ role: 'assistant', content: reply }); else history.pop();
    save();
    busy = false; grow();
    // scroll so the start of the answer is visible
    body.scrollTo({ top: Math.max(0, el.offsetTop - 12), behavior: 'smooth' });
    input.focus({ preventScroll: true });
  }
})();
