(async function () {
  const grid = document.getElementById('calGrid');
  const title = document.getElementById('calTitle');
  const list = document.getElementById('calList');
  const events = await fetch('/api/events').then((r) => r.json()).catch(() => []);
  const byDate = {};
  events.forEach((e) => (byDate[e.date] = byDate[e.date] || []).push(e));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayIso = iso(new Date());
  let cur = new Date(); cur.setDate(1);

  function draw() {
    const y = cur.getFullYear(), m = cur.getMonth();
    title.textContent = cur.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div class="dow">${d}</div>`).join('');
    const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
    for (let k = 0; k < 42; k++) {
      const d = new Date(start); d.setDate(start.getDate() + k);
      if (k >= 35 && d.getMonth() !== m) break;
      const key = iso(d);
      const evs = (byDate[key] || []).map((e) => `<span class="ev" title="${esc(e.title)}">${esc(e.title)}</span>`).join('');
      html += `<div class="day ${d.getMonth() !== m ? 'muted' : ''} ${key === todayIso ? 'today' : ''}"><span class="num">${d.getDate()}</span>${evs}</div>`;
    }
    grid.innerHTML = html;
    const monthEvents = events.filter((e) => e.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).sort((a, b) => a.date.localeCompare(b.date));
    list.innerHTML = monthEvents.length
      ? monthEvents.map((e) => {
          const d = new Date(e.date + 'T00:00:00');
          return `<div class="event"><div class="d"><strong>${String(d.getDate()).padStart(2, '0')}</strong><span>${d.toLocaleDateString('en-GB', { weekday: 'short' })}</span></div><div><h4>${esc(e.title)}</h4>${e.time || e.location ? `<p>${esc([e.time, e.location].filter(Boolean).join(' · '))}</p>` : ''}</div></div>`;
        }).join('')
      : '<div class="empty">No events this month.</div>';
  }
  document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { cur.setMonth(cur.getMonth() + Number(b.dataset.step)); draw(); }));
  draw();
})();
