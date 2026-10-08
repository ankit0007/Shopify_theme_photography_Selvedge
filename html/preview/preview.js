/* Selvedge preview helpers: preset switcher and simulated store actions (not used on Shopify) */
(function () {
  'use strict';
  var KEY = 'selvedge-preset';
  var CARD = { atelier: 'editorial', noir: 'editorial', denim: 'boxed', linen: 'editorial', mono: 'minimal' };
  var GRAIN = {};
  var html = document.documentElement;
  function get() { try { return localStorage.getItem(KEY) || 'atelier'; } catch (e) { return 'atelier'; } }
  function apply(p) {
    if (!CARD[p]) p = 'atelier';
    html.setAttribute('data-preset', p);
    try { localStorage.setItem(KEY, p); } catch (e) { /* ignore */ }
    document.body.className = document.body.className.replace(/card-style--\w+/, 'card-style--' + CARD[p]);
    document.body.classList.toggle('has-grain', !!GRAIN[p]);
    document.querySelectorAll('[data-preset-btn]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.presetBtn === p ? 'true' : 'false'); });
  }
  function toast(msg) { var t = document.getElementById('Toast'); if (!t) return; t.textContent = msg; t.classList.add('is-visible'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('is-visible'); }, 3000); }

  document.addEventListener('DOMContentLoaded', function () {
    apply(get());
    document.querySelectorAll('[data-preset-btn]').forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.presetBtn); }); });
    var nav = document.querySelector('.preview-bar select');
    if (nav) nav.addEventListener('change', function () { location.href = nav.value; });
    // predictive search simulation
    var input = document.getElementById('PaletteInput');
    var results = document.querySelector('[data-predictive-results]');
    if (input && results) {
      var initial = results.innerHTML;
      input.addEventListener('input', function (e) {
        e.stopImmediatePropagation();
        var q = input.value.trim().toLowerCase();
        if (q.length < 2) { results.innerHTML = initial; return; }
        var hits = (window.PREVIEW_PRODUCTS || []).filter(function (p) { return (p.t + ' ' + p.k).toLowerCase().indexOf(q) > -1; }).slice(0, 6);
        results.innerHTML = '<p class="cmdk__group">Products</p><ul>' + hits.map(function (p) { return '<li><a href="' + p.u + '"><img src="' + p.i + '" alt=""><span><strong>' + p.t + '</strong><br><span class="price">' + p.p + '</span></span></a></li>'; }).join('') + '</ul>' + (hits.length ? '' : '<p class="cmdk__group">No matches in the demo</p>');
      }, true);
    }
  });

  // Simulated cart actions
  function bump(n) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) { el.textContent = (parseInt(el.textContent, 10) || 0) + n; el.classList.remove('is-bumped'); void el.offsetWidth; el.classList.add('is-bumped'); });
  }
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.matches('form[data-product-form]')) {
      e.preventDefault(); e.stopImmediatePropagation();
      var btn = form.querySelector('[type=submit]') || document.querySelector('[form="' + form.id + '"]');
      if (btn) btn.classList.add('is-loading');
      setTimeout(function () { if (btn) btn.classList.remove('is-loading'); bump(1); var m = form.closest('.modal'); if (m) window.theme.closeDrawer(m); window.theme.openDrawer('CartDrawer'); }, 450);
      return;
    }
    if (form.hasAttribute('data-preview-form')) {
      e.preventDefault(); e.stopImmediatePropagation();
      var modal = form.closest('.modal'); if (modal) window.theme.closeDrawer(modal);
      toast('Preview: on Shopify this form is delivered to your inbox.');
      return;
    }
    if (form.action && /cart|login|register|search|localization/.test(form.getAttribute('action') || '')) {
      if (/search/.test(form.getAttribute('action'))) return;
      e.preventDefault(); toast('Preview: this runs on Shopify.');
    }
  }, true);
  document.addEventListener('click', function (e) {
    var qv = e.target.closest('[data-quick-view-url]');
    if (qv) { e.preventDefault(); e.stopImmediatePropagation(); location.href = qv.dataset.quickViewUrl; return; }
    var rm = e.target.closest('[data-remove-line]');
    if (rm) { e.preventDefault(); e.stopImmediatePropagation(); var li = rm.closest('.cart-item'); if (li) li.remove(); bump(-1); }
  }, true);
  document.addEventListener('change', function (e) {
    if (e.target.closest('[data-cart-drawer] .quantity input, [data-cart-page-form] .quantity input')) { e.stopImmediatePropagation(); toast('Preview: cart totals update on Shopify.'); return; }
    if (e.target.closest('[data-filter-form]') || e.target.matches('[data-sort-select]')) { e.stopImmediatePropagation(); toast('Preview: filters run on Shopify.'); return; }
  }, true);
  // Variant picker: avoid network fetch in preview, still let wall preview react
  window.fetch = (function (orig) { return function (url) { if (typeof url === 'string' && /variant=|section_id=|recommendations|\.js$/.test(url)) return Promise.reject(new Error('preview')); return orig.apply(this, arguments); }; })(window.fetch);
})();
