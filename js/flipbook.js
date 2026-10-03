// Flipbook: opens PDFs as interactive page-turning books.
// - Any link to a .pdf (or with data-book) opens the book instead of the raw file.
// - <div class="flipbook-inline" data-pdf="/file.pdf" data-title="…"> shows a book inside the page.
// Pages come from the PDF itself (drawn with PDF.js, only the pages being read are fetched),
// or from a prepared list of page images (data-book="…/book.json", used by the static demo).
// Page turning: StPageFlip. Phones show one page at a time; tablets/desktops show spreads.
(function () {
  const here = document.currentScript && document.currentScript.src;
  const VENDOR = new URL('../vendor/', here || location.href).href;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isPdf = (href) => /\.pdf($|[?#])/i.test(href || '');

  // ---------- libraries (loaded the first time a book opens) ----------
  let flipLib, pdfLib;
  const loadFlip = () => flipLib || (flipLib = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = VENDOR + 'page-flip.browser.js';
    s.onload = () => ok(window.St);
    s.onerror = fail;
    document.head.appendChild(s);
  }));
  const loadPdf = () => pdfLib || (pdfLib = import(VENDOR + 'pdf.min.mjs').then((m) => {
    m.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.mjs';
    return m;
  }));

  // ---------- page sources ----------
  async function openSource({ pdf, book }) {
    if (book) {
      const data = await fetch(book).then((r) => r.json());
      const base = new URL('.', new URL(book, location.href)).href;
      return {
        count: data.pages.length,
        ratio: data.width / data.height,
        draw: async (i) => { const img = new Image(); img.decoding = 'async'; img.alt = ''; img.src = base + data.pages[i]; return img; },
        zoom: async (i) => { const img = new Image(); img.alt = ''; img.src = base + (data.zoom || data.pages)[i]; return img; },
      };
    }
    const lib = await loadPdf();
    const task = lib.getDocument({ url: pdf, disableAutoFetch: true, disableStream: true });
    const doc = await task.promise;
    const first = (await doc.getPage(1)).getViewport({ scale: 1 });
    const render = async (i, targetW) => {
      const page = await doc.getPage(i + 1);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(4, targetW / base.width) });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      return c;
    };
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    return {
      count: doc.numPages,
      ratio: first.width / first.height,
      draw: (i, w) => render(i, Math.min(2000, Math.max(600, w * dpr))),
      zoom: (i) => render(i, Math.min(3200, Math.max(1400, window.innerWidth * dpr * 1.6))),
      destroy: () => task.destroy(),
    };
  }

  // ---------- the book ----------
  function Book(root, { title, pdf, book, download, inline }) {
    root.classList.add('fb', inline ? 'fb-inline' : 'fb-modal');
    root.setAttribute('role', inline ? 'region' : 'dialog');
    root.setAttribute('aria-label', title || 'Book');
    root.innerHTML = `
      <div class="fb-top">
        <span class="fb-title">${esc(title || 'Document')}</span>
        <span class="fb-count" aria-live="polite"></span>
        <span class="fb-actions">
          <button type="button" class="fb-btn fb-zoom-btn" title="Zoom in on this page">Zoom</button>
          ${download ? `<a class="fb-btn" href="${esc(download)}" download target="_blank" rel="noopener">Download</a>` : ''}
          ${inline ? '<button type="button" class="fb-btn fb-full">Full screen</button>' : '<button type="button" class="fb-btn fb-close" aria-label="Close">Close</button>'}
        </span>
      </div>
      <div class="fb-stage"><div class="fb-loading"><span></span>Opening…</div></div>
      <div class="fb-bar">
        <button type="button" class="fb-nav fb-prev" aria-label="Previous page">←</button>
        <input type="range" class="fb-scrub" min="1" value="1" aria-label="Go to page">
        <button type="button" class="fb-nav fb-next" aria-label="Next page">→</button>
      </div>
      <div class="fb-zoom" hidden><button type="button" class="fb-btn fb-zoom-close">Close zoom</button><div class="fb-zoom-body"></div></div>`;
    const $ = (s) => root.querySelector(s);
    const stage = $('.fb-stage'), count = $('.fb-count'), scrub = $('.fb-scrub');
    let src, flip, current = 0, pageW = 0, cache = [], pending = new Map(), alive = true;

    const label = () => {
      if (!src) return;
      const portrait = !flip || flip.getOrientation() === 'portrait';
      const a = current + 1;
      const b = !portrait && a > 1 && a < src.count ? a + 1 : a;
      count.textContent = (b > a ? `${a}–${b}` : a) + ' / ' + src.count;
      scrub.value = a;
    };

    function fill(i) {
      if (!src || i < 0 || i >= src.count) return;
      const slot = root.querySelector(`.fb-page[data-i="${i}"] .fb-inner`);
      if (cache[i]) { if (slot && !slot.contains(cache[i])) slot.replaceChildren(cache[i]); return; }
      if (pending.has(i)) return;
      pending.set(i, src.draw(i, pageW).then((el) => {
        pending.delete(i);
        if (!alive) return;
        cache[i] = el;
        const s = root.querySelector(`.fb-page[data-i="${i}"] .fb-inner`);
        if (s) s.replaceChildren(el);
      }).catch(() => pending.delete(i)));
    }
    const fillAround = () => { for (let k = -2; k <= 4; k++) fill(current + k); };

    async function build() {
      if (!alive || !src) return;
      const St = await loadFlip();
      const W = stage.clientWidth - 24, H = stage.clientHeight - 24;
      if (W < 50 || H < 50) return;
      const r = src.ratio;
      const twoUp = W >= 720 && W > H * r * 1.5;
      pageW = Math.floor(Math.min(twoUp ? W / 2 : W, H * r));
      const pageH = Math.floor(pageW / r);
      if (flip) { current = flip.getCurrentPageIndex(); flip.destroy(); flip = null; }
      stage.querySelectorAll('.fb-book').forEach((b) => b.remove());
      const el = document.createElement('div');
      el.className = 'fb-book';
      el.style.width = (twoUp ? pageW * 2 : pageW) + 'px';
      el.style.height = pageH + 'px';
      for (let i = 0; i < src.count; i++) {
        const p = document.createElement('div');
        p.className = 'fb-page';
        p.dataset.i = i;
        p.dataset.density = i === 0 || i === src.count - 1 ? 'hard' : 'soft';
        p.innerHTML = `<div class="fb-inner"><span class="fb-num">${i + 1}</span></div>`;
        if (cache[i]) p.firstChild.replaceChildren(cache[i]);
        el.appendChild(p);
      }
      stage.appendChild(el);
      flip = new St.PageFlip(el, {
        width: pageW, height: pageH, size: 'fixed', usePortrait: !twoUp, showCover: true,
        flippingTime: calm ? 0 : 750, maxShadowOpacity: 0.45, mobileScrollSupport: false, startPage: Math.min(current, src.count - 1),
      });
      flip.loadFromHTML(el.querySelectorAll('.fb-page'));
      flip.on('flip', (e) => { current = e.data; label(); fillAround(); });
      flip.on('changeOrientation', label);
      $('.fb-loading').hidden = true;
      label();
      fillAround();
    }

    let t;
    const onResize = () => { clearTimeout(t); t = setTimeout(build, 200); };
    window.addEventListener('resize', onResize);

    // controls
    $('.fb-prev').addEventListener('click', () => flip && flip.flipPrev());
    $('.fb-next').addEventListener('click', () => flip && flip.flipNext());
    scrub.addEventListener('change', () => { if (flip) { current = Number(scrub.value) - 1; flip.turnToPage(current); label(); fillAround(); } });
    const onKey = (e) => {
      if (!root.isConnected || (inline && !root.contains(document.activeElement))) return;
      if (!$('.fb-zoom').hidden) { if (e.key === 'Escape') closeZoom(); return; }
      if (e.key === 'ArrowRight') flip && flip.flipNext();
      if (e.key === 'ArrowLeft') flip && flip.flipPrev();
    };
    document.addEventListener('keydown', onKey);

    // zoom: the current page, large and scrollable (pinch / drag to read small print)
    const zoom = $('.fb-zoom'), zoomBody = $('.fb-zoom-body');
    async function openZoom() {
      if (!src) return;
      zoom.hidden = false;
      zoomBody.innerHTML = '<div class="fb-loading"><span></span>Loading page…</div>';
      const el = await src.zoom(current);
      zoomBody.replaceChildren(el);
    }
    function closeZoom() { zoom.hidden = true; zoomBody.replaceChildren(); }
    $('.fb-zoom-btn').addEventListener('click', openZoom);
    $('.fb-zoom-close').addEventListener('click', closeZoom);
    stage.addEventListener('dblclick', openZoom);

    const fullBtn = $('.fb-full');
    if (fullBtn) fullBtn.addEventListener('click', () => open({ title, pdf, book, download, startPage: current }));

    openSource({ pdf, book }).then((s) => {
      src = s;
      scrub.max = s.count;
      build();
    }).catch(() => {
      $('.fb-loading').innerHTML = `Sorry, this document could not be opened.${download ? ` <a href="${esc(download)}" target="_blank" rel="noopener">Open the file instead</a>` : ''}`;
    });

    return {
      root,
      goTo(n) { current = n; },
      destroy() {
        alive = false;
        clearTimeout(t);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('keydown', onKey);
        try { if (flip) flip.destroy(); if (src && src.destroy) src.destroy(); } catch (e) { /* already gone */ }
        root.remove();
      },
    };
  }

  // ---------- modal ----------
  let active = null;
  function open(opts) {
    if (active) close(true);
    const root = document.createElement('div');
    document.body.appendChild(root);
    document.documentElement.classList.add('fb-open');
    active = Book(root, opts);
    if (opts.startPage) active.goTo(opts.startPage);
    root.querySelector('.fb-close').addEventListener('click', () => close());
    requestAnimationFrame(() => root.classList.add('in'));
    root.querySelector('.fb-close').focus({ preventScroll: true });
    // Back button / swipe-back closes the book instead of leaving the page
    history.pushState({ flipbook: true }, '');
  }
  function close(fromHistory) {
    if (!active) return;
    const a = active;
    active = null;
    document.documentElement.classList.remove('fb-open');
    a.root.classList.remove('in');
    setTimeout(() => a.destroy(), calm ? 0 : 250);
    if (!fromHistory && history.state && history.state.flipbook) history.back();
  }
  window.addEventListener('popstate', () => close(true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && active && active.root.querySelector('.fb-zoom').hidden) close(); });

  // ---------- links to PDFs open as books ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.closest('.fb') || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!a.dataset.book && !isPdf(href)) return;
    e.preventDefault();
    const card = a.closest('.card, .doc');
    const title = a.dataset.title || (card && (card.querySelector('h3, strong') || {}).textContent) || a.textContent.trim() || 'Document';
    open({ title: title.trim(), book: a.dataset.book, pdf: a.dataset.book ? null : a.href, download: a.dataset.book ? a.dataset.download : a.href });
  });

  // ---------- books inside a page ----------
  document.querySelectorAll('.flipbook-inline').forEach((el) => {
    const pdf = el.dataset.pdf ? new URL(el.dataset.pdf, location.href).href : null;
    Book(el, { title: el.dataset.title, pdf: el.dataset.book ? null : pdf, book: el.dataset.book, download: el.dataset.book ? el.dataset.download : pdf, inline: true });
  });

  window.Flipbook = { open };
})();
