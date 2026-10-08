/* Selvedge theme script, no dependencies */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const debounce = (fn, wait = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const theme = (window.theme = window.theme || {});
  theme.routes = theme.routes || {};
  theme.strings = theme.strings || {};

  /* ---------- Money ---------- */
  theme.formatMoney = function (cents) {
    const fmt = theme.moneyFormat || '{{amount}}';
    const value = cents / 100;
    const delim = (n, dec, th, de) => { const p = n.toFixed(dec).split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, th); return p.join(de); };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (m, key) => {
      switch (key) {
        case 'amount_no_decimals': return delim(value, 0, ',', '.');
        case 'amount_with_comma_separator': return delim(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return delim(value, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return delim(value, 2, "'", '.');
        default: return delim(value, 2, ',', '.');
      }
    });
  };

  /* ---------- Toast ---------- */
  function toast(message) {
    const el = $('#Toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  /* ---------- Text: split headings into lines ---------- */
  function splitLines(root = document) {
    $$('[data-split-lines]:not(.split-lines)', root).forEach((el) => {
      if (!document.body.classList.contains('has-split') || reduceMotion || el.children.length) {
        el.classList.add('reveal');
        return;
      }
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w) => `<span class="w">${w.replace(/</g, '&lt;')}</span>`).join(' ');
      const spans = $$('.w', el);
      const lines = [];
      let top = null;
      spans.forEach((s) => {
        if (s.offsetTop !== top) { lines.push([]); top = s.offsetTop; }
        lines[lines.length - 1].push(s.textContent);
      });
      el.setAttribute('aria-label', words.join(' '));
      el.innerHTML = lines.map((l, i) => `<span class="line" aria-hidden="true"><span style="--i:${i}">${l.join(' ')}</span></span>`).join('');
      el.classList.add('split-lines');
    });
  }

  /* ---------- Stagger ---------- */
  function stagger(root = document) {
    $$('[data-stagger]', root).forEach((wrap) => {
      const step = parseFloat(wrap.dataset.stagger) || 0.07;
      Array.from(wrap.children).forEach((child, i) => {
        child.style.setProperty('--d', `${Math.min(i, 8) * step}s`);
        if (!child.classList.contains('reveal')) child.classList.add('reveal');
      });
    });
  }

  /* ---------- Reveal / count ---------- */
  let io;
  function observe(root = document) {
    const targets = $$('.reveal:not(.is-visible), .reveal-clip:not(.is-visible), .split-lines:not(.is-visible), [data-observe]:not(.is-visible), [data-count]:not(.is-counted)', root);
    if (!('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('is-visible')); return; }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const list = e.target._revealProxy ? e.target._revealProxy : [e.target];
          list.forEach((t) => {
            t.classList.add('is-visible');
            if (t.hasAttribute('data-count')) countUp(t);
          });
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    }
    targets.forEach((t) => {
      // A fully clipped element has no visible area, so watch its parent instead.
      if (t.classList.contains('reveal-clip') && t.parentElement) {
        const host = t.parentElement;
        (host._revealProxy = host._revealProxy || []).push(t);
        io.observe(host);
      } else io.observe(t);
    });
  }
  function countUp(el) {
    el.classList.add('is-counted');
    const end = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduceMotion || isNaN(end)) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 1500);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4))).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Buttons: rolling label + magnetic ---------- */
  function initButtons(root = document) {
    $$('.button:not(.button--link):not([data-add-button]):not(.is-rolled)', root).forEach((btn) => {
      btn.classList.add('is-rolled');
      if (reduceMotion) return;
      Array.from(btn.childNodes).forEach((n) => {
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        const t = n.textContent.trim();
        const roll = document.createElement('span');
        roll.className = 'btn-roll';
        roll.innerHTML = `<span>${t}</span><span aria-hidden="true">${t}</span>`;
        n.replaceWith(roll);
      });
    });
    if (!theme.magnetic || !finePointer || reduceMotion) return;
    $$('[data-magnetic]:not(.is-magnetic)', root).forEach((el) => {
      el.classList.add('is-magnetic');
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    const cursor = $('[data-cursor].cursor, .cursor[data-cursor]');
    if (!cursor || !finePointer || reduceMotion) return;
    const label = $('span', cursor);
    let x = -100, y = -100, cx = -100, cy = -100;
    window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; cursor.classList.add('is-active'); }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
    const loop = () => {
      cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
      cursor.style.setProperty('--cx', `${cx}px`); cursor.style.setProperty('--cy', `${cy}px`);
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-cursor]:not(.cursor)');
      const field = e.target.closest('input, textarea, select, iframe');
      cursor.classList.toggle('is-hidden', !!field);
      if (t && !e.target.closest('.card__actions, button, .button')) { label.textContent = t.dataset.cursor; cursor.classList.add('has-label'); }
      else cursor.classList.remove('has-label');
    });
  }

  /* ---------- Overlays (drawers, palette, modal) ---------- */
  let lastFocus = null;
  function openOverlay(id) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el) return;
    closeIsland();
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
    const panel = $('.drawer__panel, .cmdk__panel, .modal__panel', el) || el;
    const focusable = $('input:not([type=hidden]), button:not(.drawer__overlay), a[href]', panel);
    setTimeout(() => focusable && focusable.focus({ preventScroll: true }), 80);
  }
  function closeOverlay(el) {
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    if (!$('.drawer.is-open, .cmdk.is-open, .modal.is-open')) document.body.classList.remove('overflow-hidden');
    $$('video', el).forEach((v) => v.pause());
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  theme.openDrawer = openOverlay;
  theme.closeDrawer = closeOverlay;

  function initOverlays() {
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-drawer-open]');
      if (opener && document.getElementById(opener.dataset.drawerOpen)) { e.preventDefault(); openOverlay(opener.dataset.drawerOpen); return; }
      const closer = e.target.closest('[data-drawer-close]');
      if (closer) { e.preventDefault(); closeOverlay(closer.closest('.drawer, .cmdk, .modal')); }
    });
    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k' && theme.searchShortcut !== false && $('#SearchPalette')) { e.preventDefault(); openOverlay('SearchPalette'); return; }
      if (e.key === 'Escape') { $$('.drawer.is-open, .cmdk.is-open, .modal.is-open').forEach(closeOverlay); closeIsland(); closeLightbox(); }
      if (e.key === 'Tab') {
        const open = $('.drawer.is-open, .cmdk.is-open, .modal.is-open, .lightbox.is-open');
        if (!open) return;
        const items = $$('a[href], button:not([disabled]), input:not([type=hidden]), select, textarea', open).filter((n) => n.offsetParent !== null && !n.classList.contains('drawer__overlay'));
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Header: sticky, hide on scroll down, dropdowns ---------- */
  let header;
  function closeDropdowns(except) {
    $$('[data-dropdown-toggle]').forEach((b) => {
      if (b === except) return;
      b.setAttribute('aria-expanded', 'false');
      const d = document.getElementById(b.getAttribute('aria-controls')); if (d) d.classList.remove('is-open');
    });
  }
  function initHeader() {
    header = $('[data-site-header]');
    const toTop = $('[data-back-to-top]');
    const progress = $('[data-reading-progress]');
    const h = () => header ? header.offsetHeight : 0;
    if (header) document.documentElement.style.setProperty('--header-h', `${h()}px`);
    let lastY = scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (header) {
        const overlay = header.hasAttribute('data-overlay');
        header.classList.toggle('is-scrolled', y > (overlay ? Math.max(40, innerHeight * 0.6) : 4));
        const down = y > lastY && y > 400 && !header.classList.contains('is-open');
        header.classList.toggle('is-hidden', down && !$('.dropdown.is-open'));
      }
      lastY = y;
      if (toTop) toTop.classList.toggle('is-visible', y > 1000);
      if (progress) { const ht = document.documentElement.scrollHeight - innerHeight; progress.style.setProperty('--read', ht > 0 ? (y / ht).toFixed(3) : 0); }
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
    if (!header) return;
    let hoverT;
    $$('[data-dropdown-toggle]', header).forEach((btn) => {
      const dd = document.getElementById(btn.getAttribute('aria-controls'));
      const open = () => { closeDropdowns(btn); btn.setAttribute('aria-expanded', 'true'); dd && dd.classList.add('is-open'); header.classList.add('is-open'); };
      const close = () => { btn.setAttribute('aria-expanded', 'false'); dd && dd.classList.remove('is-open'); header.classList.remove('is-open'); };
      btn.addEventListener('click', () => (btn.getAttribute('aria-expanded') === 'true' ? close() : open()));
      const li = btn.parentElement;
      [li, dd].forEach((el) => {
        if (!el) return;
        el.addEventListener('mouseenter', () => { if (finePointer) { clearTimeout(hoverT); open(); } });
        el.addEventListener('mouseleave', () => { if (finePointer) hoverT = setTimeout(close, 200); });
      });
    });
    document.addEventListener('click', (e) => { if (!header.contains(e.target)) { closeDropdowns(); header.classList.remove('is-open'); } });
  }
  function closeIsland() { closeDropdowns(); if (header) header.classList.remove('is-open'); }
  function islandNotice(item) {
    const notice = $('[data-cart-notice]');
    if (!notice) { openOverlay('CartDrawer'); return; }
    const imageUrl = item.image ? escapeHtml(`${item.image}${item.image.includes('?') ? '&' : '?'}width=160`) : '';
    const img = imageUrl ? `<img src="${imageUrl}" alt="">` : '';
    const productTitle = escapeHtml(item.product_title || item.title || '');
    const variantTitle = item.variant_title && item.variant_title !== 'Default Title' ? `<span class="caption">${escapeHtml(item.variant_title)}</span>` : '';
    notice.innerHTML = `<div class="cart-notice__item">${img}<div><span class="data muted">${escapeHtml(theme.strings.added || 'Added')}</span><strong>${productTitle}</strong>${variantTitle}</div></div>
      <div class="button-group"><a href="${escapeHtml(theme.routes.cart)}" class="button button--secondary button--small" data-drawer-open="CartDrawer">${escapeHtml(theme.strings.viewCart || 'View cart')}</a><a href="${escapeHtml(theme.routes.checkout || '/checkout')}" class="button button--small">${escapeHtml(theme.strings.checkout || 'Check out')}</a></div>`;
    header.classList.remove('is-hidden');
    notice.classList.add('is-open');
    clearTimeout(notice._t);
    notice._t = setTimeout(() => notice.classList.remove('is-open'), 5000);
  }
  theme.islandNotice = islandNotice;

  /* ---------- Announcement rotator ---------- */
  function initAnnouncement() {
    $$('[data-announcement]').forEach((bar) => {
      const items = $$('.announcement__item', bar);
      if (items.length < 2 || reduceMotion) return;
      let i = 0;
      setInterval(() => { items[i].classList.remove('is-active'); i = (i + 1) % items.length; items[i].classList.add('is-active'); }, (parseInt(bar.dataset.speed, 10) || 5) * 1000);
    });
  }

  /* ---------- Rails (drag scroller) ---------- */
  function setupRail(rail) {
    if (rail._init) return; rail._init = true;
    let down = false, startX = 0, startLeft = 0, moved = false;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { moved = true; rail.classList.add('is-dragging'); }
      rail.scrollLeft = startLeft - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return; down = false;
      setTimeout(() => rail.classList.remove('is-dragging'), 0);
    });
    rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    rail.addEventListener('dragstart', (e) => e.preventDefault());
  }
  function activeRail(scope) { return $$('[data-rail]', scope).find((r) => r.offsetParent !== null); }
  function updateRailUi(scope) {
    const rail = activeRail(scope);
    if (!rail) return;
    const bar = $('.rail-progress span', scope);
    const max = rail.scrollWidth - rail.clientWidth;
    const ratio = rail.clientWidth / rail.scrollWidth;
    if (bar) {
      bar.style.setProperty('--w', `${Math.max(ratio * 100, 10)}%`);
      bar.style.setProperty('--x', `${max > 0 ? (rail.scrollLeft / max) * (100 / Math.max(ratio, 0.1) - 100) : 0}%`);
    }
    const prev = $('[data-rail-prev]', scope), next = $('[data-rail-next]', scope);
    if (prev) prev.disabled = rail.scrollLeft < 4;
    if (next) next.disabled = rail.scrollLeft > max - 4;
    const footer = $('.rail-footer', scope);
    if (footer) footer.style.visibility = max > 4 ? '' : 'hidden';
  }
  function initRails(root = document) {
    $$('[data-rail]', root).forEach(setupRail);
    $$('[data-rail-scope]', root).forEach((scope) => {
      if (scope._init) return; scope._init = true;
      const step = (dir) => {
        const rail = activeRail(scope);
        if (!rail) return;
        const item = rail.children[0];
        const w = item ? item.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 16) : rail.clientWidth;
        rail.scrollBy({ left: dir * w * Math.max(1, Math.floor(rail.clientWidth / w) - 1), behavior: 'smooth' });
      };
      const prev = $('[data-rail-prev]', scope), next = $('[data-rail-next]', scope);
      prev && prev.addEventListener('click', () => step(-1));
      next && next.addEventListener('click', () => step(1));
      $$('[data-rail]', scope).forEach((r) => r.addEventListener('scroll', () => requestAnimationFrame(() => updateRailUi(scope)), { passive: true }));
      addEventListener('resize', debounce(() => updateRailUi(scope), 150));
      updateRailUi(scope);
    });
  }

  /* ---------- Segmented tabs ---------- */
  function initSegmented(root = document) {
    $$('[data-segmented]', root).forEach((seg) => {
      if (seg._init) return; seg._init = true;
      const thumb = $('.segmented__thumb', seg);
      const tabs = $$('[role="tab"]', seg);
      const scope = seg.closest('[data-rail-scope]') || document;
      const place = (btn) => { thumb.style.setProperty('--x', `${btn.offsetLeft}px`); thumb.style.setProperty('--w', `${btn.offsetWidth}px`); };
      const select = (btn, focus) => {
        tabs.forEach((t) => {
          const on = t === btn;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) { panel.hidden = !on; if (on) { $$('.reveal', panel).forEach((r) => r.classList.add('is-visible')); } }
        });
        place(btn);
        if (focus) btn.focus();
        updateRailUi(scope);
      };
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(t));
        t.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          select(tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length], true);
        });
      });
      requestAnimationFrame(() => place(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]));
      addEventListener('resize', debounce(() => place(tabs.find((t) => t.getAttribute('aria-selected') === 'true')), 150));
    });
  }

  /* ---------- Before / after ---------- */
  function initCompare(root = document) {
    $$('[data-compare]', root).forEach((wrap) => {
      if (wrap._init) return; wrap._init = true;
      const input = $('input[type="range"]', wrap);
      const set = () => wrap.style.setProperty('--pos', `${input.value}%`);
      input.addEventListener('input', set);
      set();
    });
  }

  /* ---------- Runway hero ---------- */
  function initRunway(root = document) {
    $$('[data-runway]', root).forEach((rw) => {
      if (rw._init) return; rw._init = true;
      const looks = $$('[data-look]', rw), panels = $$('[data-look-panel]', rw), thumbs = $$('[data-look-thumb]', rw);
      const num = $('[data-runway-num]', rw), count = $('[data-look-count]', rw);
      const speed = (parseFloat(rw.dataset.speed) || 0) * 1000;
      const pad = (n) => String(n).padStart(2, '0');
      let i = 0, start = performance.now(), paused = false, visible = true;
      const setNum = (n) => { if (num) num.innerHTML = pad(n).split('').map((d) => `<span>${d}</span>`).join(''); };
      const show = (n) => {
        const prev = i;
        i = (n + looks.length) % looks.length;
        if (prev !== i) { looks[prev].classList.remove('is-active'); looks[prev].classList.add('is-leaving'); setTimeout(() => looks[prev].classList.remove('is-leaving'), 600); }
        looks.forEach((l, k) => l.classList.toggle('is-active', k === i));
        panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
        thumbs.forEach((t, k) => { t.setAttribute('aria-current', k === i ? 'true' : 'false'); t.style.setProperty('--p', 0); });
        if (thumbs[i] && thumbs[i].scrollIntoView && rw.getBoundingClientRect().top < innerHeight && rw.getBoundingClientRect().bottom > 0) { const lu = thumbs[i].parentElement; lu.scrollTo({ left: thumbs[i].offsetLeft - lu.clientWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' }); }
        setNum(i + 1);
        if (count) count.textContent = `${pad(i + 1)} / ${pad(looks.length)}`;
        start = performance.now();
      };
      setNum(1);
      const stage = $('.runway__stage', rw);
      stage && stage.addEventListener('click', () => show(i + 1));
      const prev = $('[data-look-prev]', rw), next = $('[data-look-next]', rw);
      prev && prev.addEventListener('click', () => show(i - 1));
      next && next.addEventListener('click', () => show(i + 1));
      thumbs.forEach((t) => t.addEventListener('click', () => show(parseInt(t.dataset.lookThumb, 10))));
      rw.addEventListener('mouseenter', () => { paused = true; });
      rw.addEventListener('mouseleave', () => { paused = false; start = performance.now() - (parseFloat(thumbs[i] && thumbs[i].style.getPropertyValue('--p')) || 0) * speed; });
      rw.addEventListener('focusin', () => { paused = true; });
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(rw);
      if (!speed || looks.length < 2 || reduceMotion) return;
      const tick = (now) => {
        if (!paused && visible && !document.hidden) {
          const p = Math.min(1, (now - start) / speed);
          if (thumbs[i]) thumbs[i].style.setProperty('--p', p.toFixed(3));
          if (p >= 1) show(i + 1);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Shop the look ---------- */
  function initShopLook(root = document) {
    $$('[data-shop-look]', root).forEach((wrap) => {
      if (wrap._init) return; wrap._init = true;
      const dots = $$('[data-look-dot]', wrap), rows = $$('[data-look-row]', wrap);
      const on = (n) => { dots.forEach((d) => d.classList.toggle('is-on', d.dataset.lookDot === n)); rows.forEach((r) => r.classList.toggle('is-on', r.dataset.lookRow === n)); };
      dots.forEach((d) => { d.addEventListener('mouseenter', () => on(d.dataset.lookDot)); d.addEventListener('click', () => { on(d.dataset.lookDot); const r = rows.find((x) => x.dataset.lookRow === d.dataset.lookDot); if (r) r.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); }); });
      rows.forEach((r) => r.addEventListener('mouseenter', () => on(r.dataset.lookRow)));
      wrap.addEventListener('mouseleave', () => on(null));
      const add = $('[data-look-add]', wrap);
      if (add) add.addEventListener('click', () => {
        const items = rows.map((r) => ({ id: parseInt(r.dataset.variant, 10), quantity: 1 })).filter((x) => x.id);
        if (items.length) addItems(items, add);
      });
    });
  }

  /* ---------- Press quotes ---------- */
  function initPress(root = document) {
    $$('[data-press]', root).forEach((wrap) => {
      if (wrap._init) return; wrap._init = true;
      const quotes = $$('[data-press-quote]', wrap), names = $$('[data-press-name]', wrap);
      if (quotes.length < 2) return;
      let i = 0, timer;
      const show = (n) => { i = (n + quotes.length) % quotes.length; quotes.forEach((q, k) => q.classList.toggle('is-active', k === i)); names.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false')); };
      const speed = parseInt(wrap.dataset.speed, 10) || 0;
      const play = () => { clearInterval(timer); if (speed && !reduceMotion) timer = setInterval(() => show(i + 1), speed * 1000); };
      names.forEach((b) => { b.addEventListener('click', () => { show(parseInt(b.dataset.pressName, 10)); play(); }); b.addEventListener('mouseenter', () => show(parseInt(b.dataset.pressName, 10))); });
      wrap.addEventListener('mouseenter', () => clearInterval(timer));
      wrap.addEventListener('mouseleave', play);
      play();
    });
  }

  /* ---------- Card colour swatches preview the variant image ---------- */
  function initCardSwatches(root = document) {
    $$('.card__swatches', root).forEach((row) => {
      if (row._init) return; row._init = true;
      const card = row.closest('.card');
      const media = $('.card__media .media', card);
      if (!media) return;
      let layer = null;
      const showImg = (src) => {
        if (!src) return;
        if (!layer) { layer = document.createElement('img'); layer.className = 'card__swatch-img'; layer.alt = ''; media.appendChild(layer); }
        layer.src = src; layer.classList.add('is-on');
      };
      $$('.swatch-dot', row).forEach((b) => {
        b.addEventListener('mouseenter', () => showImg(b.dataset.swatch));
        b.addEventListener('focus', () => showImg(b.dataset.swatch));
        b.addEventListener('click', () => { $$('.swatch-dot', row).forEach((x) => x.classList.toggle('is-on', x === b)); showImg(b.dataset.swatch); });
      });
      row.addEventListener('mouseleave', () => { if (layer && !$('.swatch-dot.is-on', row)) layer.classList.remove('is-on'); });
    });
  }

  /* ---------- Size guide: units, tape, finder ---------- */
  function initSizeGuide(root = document) {
    $$('[data-size-guide]', root).forEach((g) => {
      if (g._init) return; g._init = true;
      const cells = $$('td[data-cm]', g), tape = $('[data-tape]', g), tapeVal = $('[data-tape-value]', g);
      const a = $('[data-finder-a]', g), b = $('[data-finder-b]', g), result = $('[data-finder-result]', g);
      const heads = $$('thead th', g).map((t) => t.textContent.trim());
      const hint = result ? result.innerHTML : '';
      let unit = 'cm';
      const fmt = (cm) => (unit === 'cm' ? String(Math.round(cm)) : (cm / 2.54).toFixed(1));
      const setUnit = (u) => {
        unit = u;
        $$('[data-unit-btn]', g).forEach((x) => x.setAttribute('aria-pressed', x.dataset.unitBtn === u ? 'true' : 'false'));
        cells.forEach((c) => { const v = parseFloat(c.dataset.cm); c.textContent = isNaN(v) ? c.dataset.cm : fmt(v); });
        $$('[data-unit-label]', g).forEach((l) => { l.textContent = u; });
        find();
      };
      const moveTape = (cm) => { if (!tape) return; tape.style.setProperty('--tape', cm * 10); if (tapeVal) tapeVal.textContent = cm ? `${fmt(cm)} ${unit}` : ''; };
      const find = () => {
        if (!a || !result) return;
        const toCm = (v) => (unit === 'cm' ? v : v * 2.54);
        const va = parseFloat(a.value), vb = parseFloat(b.value);
        $$('tbody tr', g).forEach((r) => r.classList.remove('is-match'));
        if (isNaN(va) && isNaN(vb)) { result.innerHTML = hint; moveTape(0); return; }
        moveTape(toCm(!isNaN(va) ? va : vb));
        const rows = $$('tbody tr', g);
        const match = rows.find((r) => {
          const tds = $$('td', r);
          const ca = parseFloat(tds[0] && tds[0].dataset.cm), cb = parseFloat(tds[1] && tds[1].dataset.cm);
          return (isNaN(va) || toCm(va) <= ca + 1) && (isNaN(vb) || toCm(vb) <= cb + 1);
        }) || rows[rows.length - 1];
        if (!match) return;
        match.classList.add('is-match');
        const size = $('th', match).textContent.trim();
        result.innerHTML = `<strong>${size}</strong>${(theme.strings.sizeResult || '').replace('[size]', size).replace('[a]', heads[1] || '').replace('[b]', heads[2] || '')}`;
      };
      $$('[data-unit-btn]', g).forEach((x) => x.addEventListener('click', () => setUnit(x.dataset.unitBtn)));
      [a, b].forEach((inp) => inp && inp.addEventListener('input', find));
    });
  }

  /* ---------- Boutiques open now ---------- */
  function initStores(root = document) {
    $$('[data-store]', root).forEach((s) => {
      if (s._init) return; s._init = true;
      const el = $('[data-store-status]', s);
      const city = el.textContent.trim();
      const render = () => {
        const now = new Date(Date.now() + (parseFloat(s.dataset.offset) || 0) * 3600000);
        const h = now.getUTCHours() + now.getUTCMinutes() / 60;
        const closedDay = s.dataset.closedDay;
        const open = h >= parseFloat(s.dataset.open) && h < parseFloat(s.dataset.close) && String(now.getUTCDay()) !== closedDay;
        el.textContent = `${city}, ${open ? theme.strings.storeOpen || 'open now' : theme.strings.storeClosed || 'closed now'}`;
        el.classList.toggle('is-closed', !open);
      };
      render(); setInterval(render, 60000);
    });
  }

  /* ---------- Wishlist (saved in this browser) ---------- */
  const WKEY = 'selvedge-wishlist';
  const wishRead = () => { try { return JSON.parse(localStorage.getItem(WKEY) || '[]'); } catch (e) { return []; } };
  const wishWrite = (l) => { try { localStorage.setItem(WKEY, JSON.stringify(l)); } catch (e) { /* ignore */ } };
  function wishSync() {
    const list = wishRead(); const handles = list.map((x) => x.handle);
    $$('[data-wish]').forEach((b) => b.setAttribute('aria-pressed', handles.includes(b.dataset.handle) ? 'true' : 'false'));
    $$('[data-wish-count]').forEach((c) => { c.textContent = list.length || ''; });
    const page = $('[data-wishlist-page]');
    if (page) {
      const grid = $('[data-wishlist-grid]', page), empty = $('[data-wishlist-empty]', page);
      empty.hidden = list.length > 0;
      grid.innerHTML = list.map((p) => `<li><div class="card"><div class="card__media"><div class="media media--portrait">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy">` : ''}</div></div><div class="card__wish"><button type="button" class="wish-btn" aria-pressed="true" data-wish data-handle="${escapeHtml(p.handle)}" aria-label="${escapeHtml(page.dataset.remove || 'Remove')}"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button></div><div class="card__info"><h3 class="card__title"><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a></h3><span class="price">${escapeHtml(p.price || '')}</span></div></div></li>`).join('');
    }
  }
  function initWishlist() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-wish]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      let list = wishRead();
      const h = b.dataset.handle;
      if (list.some((x) => x.handle === h)) list = list.filter((x) => x.handle !== h);
      else { list.unshift({ handle: h, title: b.dataset.title, url: b.dataset.url, price: b.dataset.price, image: b.dataset.image }); toast(theme.strings.wishAdded || 'Saved'); }
      wishWrite(list);
      wishSync();
      $$('[data-wish-count]').forEach((c) => { c.classList.remove('is-bumped'); void c.offsetWidth; c.classList.add('is-bumped'); });
    });
    wishSync();
  }

  /* ---------- Recently viewed ---------- */
  function initRecent() {
    const RKEY = 'selvedge-recent';
    let list = [];
    try { list = JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch (e) { list = []; }
    const cur = $('[data-product-recent]');
    if (cur) {
      try {
        const p = JSON.parse(cur.dataset.productRecent);
        list = [p].concat(list.filter((x) => x.handle !== p.handle)).slice(0, 16);
        localStorage.setItem(RKEY, JSON.stringify(list));
      } catch (e) { /* ignore */ }
    }
    $$('[data-recent]').forEach((sec) => {
      const items = list.filter((x) => x.handle !== sec.dataset.current).slice(0, parseInt(sec.dataset.limit, 10) || 6);
      if (!items.length) return;
      $('[data-recent-list]', sec).innerHTML = items.map((p) => `<li><a href="${escapeHtml(p.url)}" class="card" style="text-decoration:none"><span class="card__media"><span class="media media--portrait">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy">` : ''}</span></span><span class="card__info"><span class="card__title">${escapeHtml(p.title)}</span><span class="price">${escapeHtml(p.price || '')}</span></span></a></li>`).join('');
      sec.hidden = false;
      initRails(sec);
    });
  }

  /* ---------- Lightbox ---------- */
  let lb = null;
  function closeLightbox() {
    if (!lb || !lb.el.classList.contains('is-open')) return;
    lb.el.classList.remove('is-open'); lb.el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
    $('[data-lightbox-stage]', lb.el).innerHTML = '';
    if (lb.opener) lb.opener.focus({ preventScroll: true });
  }
  function initLightbox() {
    const el = $('[data-lightbox]');
    if (!el) return;
    lb = { el, items: [], index: 0, opener: null };
    const stage = $('[data-lightbox-stage]', el), cap = $('[data-lightbox-caption]', el), exif = $('[data-lightbox-exif]', el), count = $('[data-lightbox-count]', el);
    const pad = (n) => String(n).padStart(2, '0');
    const show = (i) => {
      lb.index = (i + lb.items.length) % lb.items.length;
      const it = lb.items[lb.index];
      const thumb = $('img', it);
      const src = it.dataset.src || (thumb && (thumb.currentSrc || thumb.src));
      stage.innerHTML = src ? `<img src="${src}" alt="${thumb ? thumb.alt.replace(/"/g, '&quot;') : ''}">` : '';
      if (cap) cap.textContent = it.dataset.caption || '';
      if (exif) exif.innerHTML = (it.dataset.exif || '').split(/\s{2,}/).filter(Boolean).map((p) => `<span>${p.replace(/</g, '&lt;')}</span>`).join('');
      if (count) count.textContent = `${pad(lb.index + 1)} / ${pad(lb.items.length)}`;
      const multi = lb.items.length > 1;
      $$('[data-lightbox-prev], [data-lightbox-next]', el).forEach((b) => { b.hidden = !multi; });
    };
    document.addEventListener('click', (e) => {
      const item = e.target.closest('[data-lightbox-item]');
      if (!item) return;
      e.preventDefault();
      const group = item.closest('[data-lightbox-group]') || document;
      lb.items = $$('[data-lightbox-item]', group).filter((n) => n.offsetParent !== null);
      lb.opener = item;
      el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('overflow-hidden');
      show(lb.items.indexOf(item));
      $('[data-lightbox-close]', el).focus();
    });
    $('[data-lightbox-close]', el).addEventListener('click', closeLightbox);
    $('[data-lightbox-prev]', el).addEventListener('click', () => show(lb.index - 1));
    $('[data-lightbox-next]', el).addEventListener('click', () => show(lb.index + 1));
    stage.addEventListener('click', (e) => { if (e.target === stage) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (!el.classList.contains('is-open')) return;
      if (e.key === 'ArrowRight') show(lb.index + 1);
      if (e.key === 'ArrowLeft') show(lb.index - 1);
    });
    let sx = null;
    stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    stage.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; if (Math.abs(dx) > 40) show(lb.index + (dx < 0 ? 1 : -1)); sx = null; });
  }

  /* ---------- Slide-in newsletter ---------- */
  function initSlideIn() {
    $$('[data-slide-in]').forEach((el) => {
      const key = 'selvedge-slidein-' + (el.dataset.version || '1');
      let seen = false;
      try { seen = !!localStorage.getItem(key); } catch (e) { /* ignore */ }
      const close = () => { el.classList.remove('is-open'); try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ } };
      $$('[data-slide-in-close]', el).forEach((b) => b.addEventListener('click', close));
      const form = $('form', el); if (form) form.addEventListener('submit', () => { try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ } });
      if ($('[data-slide-in-success]', el)) { el.classList.add('is-open'); return; }
      if (seen && !document.body.classList.contains('shopify-design-mode')) return;
      setTimeout(() => el.classList.add('is-open'), (parseInt(el.dataset.delay, 10) || 12) * 1000);
    });
  }

  /* ---------- Quantity buttons ---------- */
  function initQuantity() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-qty]');
      if (!btn) return;
      const input = $('input', btn.closest('.quantity'));
      const min = parseInt(input.min || '0', 10);
      input.value = Math.max(min, parseInt(input.value || '0', 10) + (btn.dataset.qty === 'plus' ? 1 : -1));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /* ---------- Cart ---------- */
  async function refreshCartCount() {
    try {
      const cart = await fetch(theme.routes.cart + '.js').then((r) => r.json());
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = cart.item_count > 0 ? cart.item_count : '';
        el.classList.remove('is-bumped'); void el.offsetWidth; el.classList.add('is-bumped');
      });
    } catch (err) { /* ignore */ }
  }
  theme.refreshCartCount = refreshCartCount;
  function renderCartDrawer(sections) {
    const html = sections && sections['cart-drawer'];
    if (!html) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const fresh = $('[data-cart-drawer-inner]', doc);
    const current = $('[data-cart-drawer-inner]');
    if (fresh && current) current.replaceWith(fresh);
  }
  function afterAdd(data, sourceEl) {
    const inDrawer = sourceEl && sourceEl.closest('[data-cart-drawer]');
    const modal = sourceEl && sourceEl.closest('.modal');
    if (modal) closeOverlay(modal);
    renderCartDrawer(data.sections);
    refreshCartCount();
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));
    if (inDrawer) return;
    if (theme.cartType === 'page') { location.href = theme.routes.cart; return; }
    if (theme.cartType === 'drawer' || !$('[data-cart-notice]')) { openOverlay('CartDrawer'); return; }
    const item = data.items ? data.items[0] : data;
    islandNotice(item);
  }
  async function addItems(items, button) {
    button && button.classList.add('is-loading');
    try {
      const res = await fetch(theme.routes.cart_add + '.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items, sections: 'cart-drawer' }) });
      const data = await res.json();
      if (!res.ok || data.status) { toast(data.description || theme.strings.cartError); return; }
      afterAdd(data, button);
    } catch (err) { toast(theme.strings.cartError); }
    finally { button && button.classList.remove('is-loading'); }
  }
  theme.addItems = addItems;
  async function addForm(form, button) {
    button && button.classList.add('is-loading');
    const body = button && button.name === 'id' ? new FormData(form, button) : new FormData(form);
    body.append('sections', 'cart-drawer');
    try {
      const res = await fetch(theme.routes.cart_add + '.js', { method: 'POST', body, headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (!res.ok || data.status) { toast(data.description || data.message || theme.strings.cartError); return; }
      afterAdd(data, form);
    } catch (err) { toast(theme.strings.cartError); }
    finally { button && button.classList.remove('is-loading'); }
  }
  function initProductForms() {
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form[data-product-form]');
      if (!form || theme.cartType === 'page') return;
      e.preventDefault();
      addForm(form, e.submitter || $('[type=submit]', form));
    });
  }
  async function changeLine(line, quantity, container) {
    container && container.classList.add('is-updating');
    try {
      const res = await fetch(theme.routes.cart_change + '.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ line, quantity, sections: ['cart-drawer'] }) });
      const data = await res.json();
      if (data.status) toast(data.description || theme.strings.cartError);
      renderCartDrawer(data.sections);
      refreshCartCount();
    } catch (err) { toast(theme.strings.cartError); }
    finally { container && container.classList.remove('is-updating'); }
  }
  function initCart() {
    document.addEventListener('change', (e) => {
      const input = e.target.closest('[data-cart-drawer] .quantity input');
      if (input) changeLine(parseInt(input.dataset.line, 10), parseInt(input.value, 10), input.closest('.cart-item'));
    });
    document.addEventListener('click', (e) => {
      const remove = e.target.closest('[data-cart-drawer] [data-remove-line]');
      if (!remove) return;
      e.preventDefault();
      changeLine(parseInt(remove.dataset.removeLine, 10), 0, remove.closest('.cart-item'));
    });
    document.addEventListener('change', debounce((e) => {
      const note = e.target.closest('[data-cart-drawer] [name="note"]');
      if (note) fetch(theme.routes.cart + '/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: note.value }) });
    }, 400));
    const page = $('[data-cart-page-form]');
    if (page) page.addEventListener('change', debounce((e) => { if (e.target.matches('.quantity input')) page.submit(); }, 500));
  }

  /* ---------- Quick view ---------- */
  function initQuickView() {
    const modal = $('[data-quick-view]');
    if (!modal) return;
    const content = $('[data-quick-view-content]', modal);
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-quick-view-url]');
      if (!btn) return;
      e.preventDefault();
      content.innerHTML = '<div class="quick-view-loading"></div>';
      openOverlay(modal);
      try {
        const html = await fetch(btn.dataset.quickViewUrl).then((r) => r.text());
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const section = $('[data-section-id] .product', doc);
        if (!section) { location.href = btn.dataset.quickViewUrl; return; }
        const wrap = section.closest('[data-section-id]');
        content.innerHTML = '';
        content.appendChild(document.importNode(wrap, true));
        $$('[data-sticky-atc]', content).forEach((n) => n.remove());
        initAll(content);
        $$('.reveal, .reveal-clip, .split-lines', content).forEach((n) => n.classList.add('is-visible'));
      } catch (err) { location.href = btn.dataset.quickViewUrl; }
    });
  }

  /* ---------- Variant picker ---------- */
  function initVariantPickers(root = document) {
    $$('[data-variant-picker]', root).forEach((picker) => {
      if (picker._init) return; picker._init = true;
      const section = picker.closest('[data-section-id]');
      const json = $('[data-variants-json]', section);
      if (!json) return;
      const variants = JSON.parse(json.textContent);
      const sectionId = section.dataset.sectionId;
      const productUrl = picker.dataset.url;
      picker.addEventListener('change', async () => {
        const selected = $$('fieldset', picker).map((fs) => { const c = $('input:checked', fs); return c ? c.value : null; });
        const variant = variants.find((v) => v.options.every((o, i) => o === selected[i]));
        $$('fieldset', picker).forEach((fs, index) => {
          const span = $('[data-option-value]', fs) || $('legend span', fs); if (span) span.textContent = selected[index];
          $$('input', fs).forEach((input) => {
            const ok = variants.some((v) => v.available && v.options[index] === input.value && v.options.every((o, k) => k === index || o === selected[k]));
            input.classList.toggle('is-unavailable', !ok);
          });
        });
        const buttons = $$('[data-add-button]', section);
        if (!variant) { buttons.forEach((b) => { b.disabled = true; const s = $('span', b); if (s) s.textContent = theme.strings.unavailable; }); return; }
        $$('input[name="id"]', section).forEach((i) => { i.value = variant.id; });
        if (picker.dataset.updateUrl === 'true') history.replaceState({}, '', `${productUrl}?variant=${variant.id}`);
        if (variant.featured_media) {
          const media = $(`[data-media-id="${sectionId}-${variant.featured_media.id}"]`, section);
          const grid = media && media.closest('.product__grid-media');
          if (grid) { if (grid.firstElementChild !== media) { grid.prepend(media); media.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450 }); } }
          else if (media) media.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        }
        buttons.forEach((b) => { b.disabled = !variant.available; const s = $('span', b); if (s) s.textContent = variant.available ? theme.strings.addToCart : theme.strings.soldOut; });
        try {
          const html = await fetch(`${productUrl}?variant=${variant.id}&section_id=${sectionId}`).then((r) => r.text());
          const doc = new DOMParser().parseFromString(html, 'text/html');
          ['[data-price]', '[data-inventory]', '[data-sku]', '[data-sticky-price]', '[data-selling-plan]', '[data-pickup-availability]'].forEach((sel) => {
            const fresh = $$(sel, doc), cur = $$(sel, section);
            cur.forEach((el, n) => { if (fresh[n]) el.innerHTML = fresh[n].innerHTML; });
          });
        } catch (err) { /* keep */ }
      });
    });
  }

  /* ---------- Product gallery ---------- */
  function initGallery(root = document) {
    $$('.product__gallery', root).forEach((g) => {
      if (g._init) return; g._init = true;
      const thumbs = $$('[data-thumb]', g);
      thumbs.forEach((t) => t.addEventListener('click', () => {
        const target = $(`[data-media-id="${t.dataset.thumb}"]`, g);
        if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }));
      if ('IntersectionObserver' in window && thumbs.length) {
        const obs = new IntersectionObserver((entries) => entries.forEach((en) => {
          if (!en.isIntersecting) return;
          thumbs.forEach((t) => t.setAttribute('aria-current', t.dataset.thumb === en.target.dataset.mediaId ? 'true' : 'false'));
        }), { threshold: 0.6 });
        $$('[data-media-id]', g).forEach((m) => obs.observe(m));
      }
      if (!finePointer) return;
      $$('[data-zoom]', g).forEach((item) => {
        item.addEventListener('mouseenter', () => item.classList.add('is-zooming'));
        item.addEventListener('mouseleave', () => item.classList.remove('is-zooming'));
        item.addEventListener('mousemove', (e) => {
          const r = item.getBoundingClientRect();
          item.style.setProperty('--zx', `${((e.clientX - r.left) / r.width) * 100}%`);
          item.style.setProperty('--zy', `${((e.clientY - r.top) / r.height) * 100}%`);
        });
      });
    });
  }

  /* ---------- Delivery estimate ---------- */
  function initDelivery(root = document) {
    $$('[data-delivery]', root).forEach((el) => {
      const min = parseInt(el.dataset.min, 10) || 2, max = parseInt(el.dataset.max, 10) || 5, cutoff = parseInt(el.dataset.cutoff, 10);
      const tpl = el.dataset.template;
      const text = $('[data-delivery-text]', el);
      if (!tpl || !text) return;
      const addBusiness = (d, n) => { const r = new Date(d); while (n > 0) { r.setDate(r.getDate() + 1); if (r.getDay() !== 0 && r.getDay() !== 6) n--; } return r; };
      const render = () => {
        const now = new Date();
        let start = new Date(now);
        const cut = new Date(now); cut.setHours(isNaN(cutoff) ? 14 : cutoff, 0, 0, 0);
        if (now > cut || now.getDay() === 0 || now.getDay() === 6) { start = addBusiness(now, 1); cut.setTime(start.getTime()); cut.setHours(isNaN(cutoff) ? 14 : cutoff, 0, 0, 0); }
        const from = addBusiness(start, min), to = addBusiness(start, max);
        const fmt = (d) => d.toLocaleDateString(document.documentElement.lang || undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        const diff = Math.max(0, cut - now);
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
        const time = diff > 0 && diff < 86400000 ? `${h}h ${m}m` : `${Math.ceil(diff / 3600000)}h`;
        text.innerHTML = tpl.replace('[time]', time).replace('[date]', min === max ? fmt(to) : `${fmt(from)} – ${fmt(to)}`);
      };
      render();
      setInterval(render, 60000);
    });
  }

  /* ---------- Sticky add to cart ---------- */
  function initStickyAtc() {
    const bar = $('[data-sticky-atc]');
    const target = $('[data-main-buy-buttons]');
    if (!bar || !target || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([e]) => {
      const show = !e.isIntersecting && e.boundingClientRect.top < 0;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    }).observe(target);
  }

  /* ---------- Related products ---------- */
  function initRecommendations() {
    $$('[data-recommendations]').forEach(async (wrap) => {
      if (wrap.querySelector('.rail')) return;
      try {
        const html = await fetch(wrap.dataset.recommendations).then((r) => r.text());
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const fresh = $('[data-recommendations]', doc);
        if (fresh && fresh.querySelector('.rail')) { wrap.innerHTML = fresh.innerHTML; wrap.hidden = false; wrap._init = false; initAll(wrap.parentElement); $$('.reveal, .split-lines', wrap).forEach((n) => n.classList.add('is-visible')); }
      } catch (err) { /* ignore */ }
    });
  }

  /* ---------- Collection ---------- */
  function initCollection() {
    $$('[data-filter-form]').forEach((form) => form.addEventListener('change', debounce(() => {
      const params = new URLSearchParams(new FormData(form));
      for (const [k, v] of Array.from(params.entries())) if (v === '') params.delete(k);
      location.search = params.toString();
    }, 500)));
    $$('[data-sort-select]').forEach((s) => s.addEventListener('change', () => {
      const params = new URLSearchParams(location.search); params.set('sort_by', s.value); params.delete('page'); location.search = params.toString();
    }));
    const grid = $('[data-product-grid]');
    const btns = $$('[data-grid-cols]');
    if (!grid || !btns.length) return;
    const apply = (btn) => { btns.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false')); grid.style.setProperty('--cols', btn.dataset.gridCols); try { localStorage.setItem('selvedge-grid', btns.indexOf(btn)); } catch (e) { /* ignore */ } };
    btns.forEach((b) => b.addEventListener('click', () => apply(b)));
    try { const saved = localStorage.getItem('selvedge-grid'); if (saved && btns[saved]) apply(btns[saved]); } catch (e) { /* ignore */ }
  }

  /* ---------- Predictive search ---------- */
  function initPredictiveSearch() {
    $$('[data-predictive-search]').forEach((wrap) => {
      const input = $('input[name="q"]', wrap);
      const results = $('[data-predictive-results]', wrap);
      if (!input || !results) return;
      const initial = results.innerHTML;
      input.addEventListener('input', debounce(async () => {
        const q = input.value.trim();
        if (q.length < 2) { results.innerHTML = initial; return; }
        try {
          const url = `${theme.routes.search}/suggest?q=${encodeURIComponent(q)}&section_id=predictive-search&resources[type]=product,collection,article,page&resources[limit]=6`;
          const html = await fetch(url).then((r) => r.text());
          const fresh = $('[data-predictive-inner]', new DOMParser().parseFromString(html, 'text/html'));
          if (fresh) results.innerHTML = fresh.innerHTML;
        } catch (err) { /* ignore */ }
      }, 250));
    });
  }

  /* ---------- Misc ---------- */
  function initMisc() {
    document.addEventListener('click', async (e) => {
      const poster = e.target.closest('[data-video-poster]');
      if (poster) { const tpl = poster.parentElement.querySelector('template'); if (tpl) { poster.parentElement.appendChild(tpl.content.cloneNode(true)); poster.remove(); } return; }
      const share = e.target.closest('[data-share]');
      if (share) {
        if (navigator.share) { try { await navigator.share({ url: share.dataset.share, title: document.title }); } catch (err) { /* cancelled */ } }
        else if (navigator.clipboard) { await navigator.clipboard.writeText(share.dataset.share); toast(share.dataset.copied || 'Link copied'); }
      }
    });
    $$('[data-localization] select').forEach((s) => s.addEventListener('change', () => s.form.submit()));
  }

  function initAll(root = document) {
    splitLines(root); stagger(root); observe(root); initButtons(root);
    initRails(root); initSegmented(root); initCompare(root); initVariantPickers(root); initGallery(root); initDelivery(root);
    initRunway(root); initShopLook(root); initPress(root); initCardSwatches(root); initSizeGuide(root); initStores(root);
  }
  theme.initAll = initAll;

  function init() {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => initAll()); else initAll();
    initOverlays(); initHeader(); initAnnouncement(); initCursor(); initSlideIn(); initLightbox(); initWishlist(); initRecent();
    initQuantity(); initProductForms(); initCart(); initQuickView(); initStickyAtc();
    initRecommendations(); initCollection(); initPredictiveSearch(); initMisc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  /* Theme editor */
  document.addEventListener('shopify:section:load', (e) => {
    initAll(e.target);
    $$('.reveal, .reveal-clip, .split-lines, [data-observe]', e.target).forEach((n) => n.classList.add('is-visible'));
    if (e.target.querySelector('[data-slide-in]')) { initSlideIn(); $('[data-slide-in]', e.target).classList.add('is-open'); }
  });
  document.addEventListener('shopify:section:select', (e) => { const s = $('[data-slide-in]', e.target); if (s) s.classList.add('is-open'); });
  document.addEventListener('shopify:section:deselect', (e) => { const s = $('[data-slide-in]', e.target); if (s) s.classList.remove('is-open'); });
  document.addEventListener('shopify:block:select', (e) => {
    const item = e.target.closest('.rail > *');
    if (item) item.parentElement.scrollTo({ left: item.offsetLeft - item.parentElement.offsetLeft, behavior: 'smooth' });
    const ann = e.target.closest('.announcement__item');
    if (ann) { $$('.announcement__item', ann.parentElement).forEach((i) => i.classList.remove('is-active')); ann.classList.add('is-active'); }
  });
})();
