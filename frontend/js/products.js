/* =========================================================
   products.js — rendering, filtering, search
   ========================================================= */

import { fetchCategories, fetchProducts } from './api.js';
import { addItem } from './store.js';
import { showToast } from './main.js';

// Friendly big-text watermark for category cards when no image is set
const CATEGORY_LABELS = {
  sneakers:    'SNEAKERS',
  streetwear:  'STREET',
  jerseys:     'JERSEYS',
  accessories: 'EXTRAS',
  phones:      'PHONES',
};

let _categories = [];
let _products   = [];
let _filter     = 'all';
let _search     = '';

/* ---- Public init (called once from main.js) ---- */

export async function initProducts() {
  await Promise.all([loadCategories(), loadProducts()]);
}

/* ---- Data loading ---- */

async function loadCategories() {
  try {
    _categories = await fetchCategories();
  } catch (e) {
    console.error('loadCategories:', e);
    _categories = [];
  }
  renderFilterTabs();
  renderFooterShopLinks();
}

async function loadProducts() {
  setGridState('loading');
  try {
    _products = await fetchProducts({ inStock: true });
  } catch (e) {
    console.error('loadProducts:', e);
    setGridState('error');
    document.getElementById('catGrid').innerHTML =
      '<div class="empty-state">Couldn\'t load categories right now.</div>';
    return;
  }
  updateCounts();
  renderCategoryCards();
  renderProducts();
}

/* ---- Counts (hero badge + stats row) ---- */

function updateCounts() {
  const n = _products.length;
  const heroNum = document.getElementById('heroProductCount');
  const statNum = document.getElementById('statProductCount');
  if (heroNum) heroNum.textContent = n > 0 ? `${n}+` : 'NEW';
  if (statNum) statNum.innerHTML   = n > 0 ? `${n}<span class="stat-unit">+</span>` : '0';
}

/* ---- Filter tabs ---- */

function renderFilterTabs() {
  const wrap = document.getElementById('filterTabs');
  if (!wrap) return;
  let html = `<button class="tab active" data-cat="all">All</button>`;
  _categories.forEach(c => {
    html += `<button class="tab" data-cat="${esc(c.slug)}">${esc(c.name)}</button>`;
  });
  wrap.innerHTML = html;
  wrap.addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    setFilter(btn.dataset.cat, btn);
  });
}

function renderFooterShopLinks() {
  const wrap = document.getElementById('footerShopLinks');
  if (!wrap) return;
  let html = `<li><a href="#shop">All Categories</a></li>`;
  _categories.forEach(c => {
    html += `<li><a href="#drops" data-cat="${esc(c.slug)}">${esc(c.name)}</a></li>`;
  });
  wrap.innerHTML = html;
  wrap.addEventListener('click', e => {
    const a = e.target.closest('[data-cat]');
    if (a) setFilter(a.dataset.cat);
  });
}

/* ---- Category cards ---- */

function renderCategoryCards() {
  const grid = document.getElementById('catGrid');
  if (!grid) return;
  if (!_categories.length) {
    grid.innerHTML = '<div class="empty-state">Categories coming soon.</div>';
    return;
  }
  grid.innerHTML = _categories.map(c => {
    const count = _products.filter(p => p.categories?.slug === c.slug).length;
    const label = CATEGORY_LABELS[c.slug] || c.name.toUpperCase();
    const imgHtml = c.image_url
      ? `<img src="${esc(c.image_url)}" alt="${esc(c.name)}">`
      : `<div class="cat-placeholder">${esc(label)}</div>`;
    return `
    <div class="cat-card" data-cat="${esc(c.slug)}" role="button" tabindex="0">
      ${imgHtml}
      <div class="cat-info">
        <div class="cat-name">${esc(c.name)}</div>
        <div class="cat-count">${count} Item${count === 1 ? '' : 's'}</div>
      </div>
      <div class="cat-arrow">→</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.cat-card').forEach(card => {
    const handler = () => setFilter(card.dataset.cat);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
  });
}

/* ---- Product grid ---- */

export function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  let list = _products;

  if (_filter !== 'all') {
    list = list.filter(p => p.categories?.slug === _filter);
  }

  if (_search) {
    const q = _search.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.variant || '').toLowerCase().includes(q)
    );
  }

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">${
      _search ? `No results for "${esc(_search)}"` : 'No products in this category yet.'
    }</div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const price    = Number(p.price) || 0;
    const oldPrice = p.old_price ? Number(p.old_price) : null;
    const initials = esc(p.name).slice(0, 2).toUpperCase();
    const imgHtml  = p.image_url
      ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`
      : `<div class="no-image">${initials}</div>`;
    const stockBadge = !p.in_stock
      ? `<span class="product-badge sold-out">Sold Out</span>`
      : p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : '';
    return `
    <div class="product-card${!p.in_stock ? ' out-of-stock' : ''}" data-id="${p.id}">
      <div class="product-img-wrap">
        ${imgHtml}
        ${stockBadge}
        ${p.in_stock
          ? `<button class="product-quick" data-id="${p.id}">+ ADD TO BAG</button>`
          : `<div class="product-quick disabled">SOLD OUT</div>`
        }
      </div>
      <div class="product-info">
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-variant">${esc(p.variant || '')}</div>
        <div>
          <span class="product-price">P${price.toLocaleString()}</span>
          ${oldPrice ? `<span class="product-old">P${oldPrice.toLocaleString()}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  // Bind add-to-bag buttons
  grid.querySelectorAll('.product-quick[data-id]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id   = Number(btn.dataset.id);
      const prod = _products.find(p => p.id === id);
      if (!prod) return;
      addItem({
        id:      prod.id,
        name:    prod.name,
        variant: prod.variant,
        price:   prod.price,
        img:     prod.image_url,
      });
      showToast(`${prod.name} added to bag`);
    });
  });
}

/* ---- Filter + search setters ---- */

export function setFilter(cat, btn) {
  _filter = cat || 'all';
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    document.querySelectorAll('.tab').forEach(t => {
      if (t.dataset.cat === _filter) t.classList.add('active');
    });
  }
  renderProducts();
  document.getElementById('drops')?.scrollIntoView({ behavior: 'smooth' });
}

export function setSearch(query) {
  _search = query.trim();
  renderProducts();
}

export function getProducts() {
  return _products;
}

/* ---- Helpers ---- */

function setGridState(state) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  if (state === 'loading') grid.innerHTML = '<div class="loading-state">Loading products…</div>';
  if (state === 'error')   grid.innerHTML = '<div class="empty-state">Couldn\'t connect right now. Refresh to try again.</div>';
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}
