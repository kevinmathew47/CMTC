(function () {
  // ---- Header: solid once the page scrolls (transparent over the home hero) ----
  const header = document.getElementById('siteHeader');
  const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Full-screen menu ----
  const drawer = document.getElementById('drawer');
  const setDrawer = (open) => {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
    document.getElementById('menuOpen')?.setAttribute('aria-expanded', open);
  };
  document.getElementById('menuOpen')?.addEventListener('click', () => setDrawer(true));
  document.getElementById('menuClose')?.addEventListener('click', () => setDrawer(false));
  drawer?.addEventListener('click', (e) => { if (e.target.closest('a')) setDrawer(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

  // ---- Hero slideshow: counter, progress line, caption ----
  const hero = document.getElementById('hero');
  if (hero) {
    const slides = [...hero.querySelectorAll('.slide')];
    const count = document.getElementById('heroCount');
    const cap = document.getElementById('heroCap');
    const prog = document.getElementById('heroProg');
    const pad = (n) => String(n).padStart(2, '0');
    let i = 0, timer;
    const show = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('active', k === i));
      if (count) count.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
      if (cap) cap.textContent = slides[i].dataset.cap || '';
      if (prog) { prog.classList.remove('run'); void prog.offsetWidth; if (slides.length > 1) prog.classList.add('run'); }
    };
    const play = () => { clearInterval(timer); if (slides.length > 1) timer = setInterval(() => show(i + 1), 6000); };
    document.getElementById('heroPrev')?.addEventListener('click', () => { show(i - 1); play(); });
    document.getElementById('heroNext')?.addEventListener('click', () => { show(i + 1); play(); });
    let sx = 0;
    hero.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
    hero.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { show(i + (dx < 0 ? 1 : -1)); play(); } });
    show(0);
    play();
  }

  // ---- "Next service" countdown (church time = India, UTC+5:30) ----
  const card = document.getElementById('nextService');
  if (card) {
    const IST = 330 * 60000;
    const day = Number(card.dataset.day || 0);
    const [hh, mm] = (card.dataset.time || '07:30').split(':').map(Number);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const t12 = `${((hh + 11) % 12) + 1}.${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
    const set = (k, v) => { const el = card.querySelector(`[data-cd="${k}"]`); if (el) el.textContent = String(v).padStart(2, '0'); };
    const when = document.getElementById('nextWhen');
    const tick = () => {
      const now = new Date(Date.now() + IST); // UTC fields now hold India time
      const t = new Date(now);
      t.setUTCHours(hh, mm, 0, 0);
      t.setUTCDate(t.getUTCDate() + ((day - t.getUTCDay() + 7) % 7));
      const live = t <= now && now - t < 2.5 * 3600000;
      if (t <= now && !live) t.setUTCDate(t.getUTCDate() + 7);
      if (live) { when.textContent = 'happening now'; ['d', 'h', 'm'].forEach((k) => set(k, 0)); return; }
      const diff = t - now;
      set('d', Math.floor(diff / 864e5)); set('h', Math.floor(diff / 36e5) % 24); set('m', Math.floor(diff / 6e4) % 60);
      when.textContent = `${t.getUTCDate() === now.getUTCDate() ? 'today' : days[day]}, ${t12}`;
    };
    tick();
    setInterval(tick, 30000);
  }

  // ---- Reveal on scroll ----
  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -40px 0px', threshold: 0.02 });
    els.forEach((el) => io.observe(el));
  } else els.forEach((el) => el.classList.add('in'));

  // ---- Lightbox (photos + YouTube) ----
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const stage = lb.querySelector('.lb-stage');
  const counter = lb.querySelector('.lb-count');
  let group = [], idx = 0, mode = 'img';
  const render = () => {
    if (mode === 'video') {
      stage.innerHTML = `<iframe src="https://www.youtube.com/embed/${group[0]}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="Video"></iframe>`;
      counter.textContent = '';
    } else {
      stage.innerHTML = `<img src="${group[idx]}" alt="">`;
      counter.textContent = group.length > 1 ? `${idx + 1} / ${group.length}` : '';
    }
    lb.querySelector('.lb-prev').style.display = lb.querySelector('.lb-next').style.display = group.length > 1 ? '' : 'none';
  };
  const open = () => { lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; render(); };
  const close = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); stage.innerHTML = ''; document.body.style.overflow = ''; };
  const step = (d) => { idx = (idx + d + group.length) % group.length; render(); };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-lightbox], [data-video]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.video) { mode = 'video'; group = [a.dataset.video]; idx = 0; }
    else {
      mode = 'img';
      const links = [...document.querySelectorAll(`[data-lightbox="${a.dataset.lightbox}"]`)];
      group = links.map((l) => l.getAttribute('href'));
      idx = links.indexOf(a);
    }
    open();
  });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => step(-1));
  lb.querySelector('.lb-next').addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target === stage) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (mode === 'img' && e.key === 'ArrowLeft') step(-1);
    if (mode === 'img' && e.key === 'ArrowRight') step(1);
  });
  let tx = 0;
  lb.addEventListener('touchstart', (e) => (tx = e.touches[0].clientX), { passive: true });
  lb.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - tx; if (mode === 'img' && Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
})();
