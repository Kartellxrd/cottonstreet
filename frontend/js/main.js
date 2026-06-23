/* =========================================================
   main.js — app bootstrap, cursor, bag drawer, order form, toast
   ========================================================= */

import { initProducts, setFilter } from './products.js';
import { subscribe, getBag, removeItem, getTotal, getCount, clearBag } from './store.js';
import { submitOrder } from './api.js';
import { initChatbot } from './chatbot.js';

const WHATSAPP_NUMBER = '26776707364';

/* =========================================================
   BOOT
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  initCursor();
  initBagDrawer();
  initOrderForm();
  subscribe(renderBag); // re-render bag whenever store changes

  await initProducts();
  initChatbot();
  initSearch();
});

/* =========================================================
   CUSTOM CURSOR (desktop only — CSS hides it on touch)
   ========================================================= */

function initCursor() {
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursorRing');
  if (!cursor || !ring) return;

  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
    setTimeout(() => {
      ring.style.left = e.clientX + 'px';
      ring.style.top  = e.clientY + 'px';
    }, 80);
  });

  // Re-bind after dynamic content is added to the DOM
  document.addEventListener('click', bindCursorHover, { once: true });
  setTimeout(bindCursorHover, 1500);
}

function bindCursorHover() {
  document.querySelectorAll('a, button, .product-card, .cat-card, .tab, .chat-bubble').forEach(el => {
    if (el._cursorBound) return;
    el._cursorBound = true;
    el.addEventListener('mouseenter', () => {
      document.getElementById('cursor')?.style.setProperty('transform', 'translate(-50%,-50%) scale(2.5)');
      const r = document.getElementById('cursorRing');
      if (r) { r.style.width = '60px'; r.style.height = '60px'; }
    });
    el.addEventListener('mouseleave', () => {
      document.getElementById('cursor')?.style.setProperty('transform', 'translate(-50%,-50%) scale(1)');
      const r = document.getElementById('cursorRing');
      if (r) { r.style.width = '36px'; r.style.height = '36px'; }
    });
  });
}

/* =========================================================
   SEARCH BAR
   ========================================================= */

function initSearch() {
  const searchInput = document.getElementById('productSearch');
  if (!searchInput) return;
  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const { setSearch } = window.__csProducts || {};
      if (setSearch) setSearch(searchInput.value);
    }, 250);
  });
}

/* =========================================================
   BAG DRAWER
   ========================================================= */

function initBagDrawer() {
  document.getElementById('bagOverlay')?.addEventListener('click', closeBag);
}

export function toggleBag() {
  document.getElementById('bagDrawer')?.classList.toggle('open');
  document.getElementById('bagOverlay')?.classList.toggle('open');
}

function closeBag() {
  document.getElementById('bagDrawer')?.classList.remove('open');
  document.getElementById('bagOverlay')?.classList.remove('open');
}

function renderBag(bag) {
  // Update count badge
  const count = getCount();
  document.getElementById('bagCount').textContent = count;

  // Bag total
  const total = getTotal();
  document.getElementById('bagTotal').textContent = `P${total.toLocaleString()}`;

  const itemsEl  = document.getElementById('bagItems');
  const footerEl = document.getElementById('bagFooter');

  if (!bag.length) {
    itemsEl.innerHTML = `
      <div class="bag-empty">
        <div class="big">EMPTY</div>
        Add items to your bag
      </div>`;
    footerEl.style.display = 'none';
    return;
  }

  footerEl.style.display = 'block';
  itemsEl.innerHTML = bag.map(b => {
    const thumb = b.img
      ? `<img src="${esc(b.img)}" alt="${esc(b.name)}">`
      : `<div class="no-image">${esc(b.name).slice(0, 2).toUpperCase()}</div>`;
    return `
    <div class="bag-item">
      ${thumb}
      <div class="bag-item-info">
        <div class="bag-item-name">${esc(b.name)}</div>
        <div class="bag-item-variant">${esc(b.variant)} · Qty: ${b.qty}</div>
        <div class="bag-item-price">P${(b.price * b.qty).toLocaleString()}</div>
      </div>
      <button class="bag-item-remove" data-id="${b.id}" aria-label="Remove ${esc(b.name)}">✕</button>
    </div>`;
  }).join('');

  itemsEl.querySelectorAll('.bag-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeItem(Number(btn.dataset.id)));
  });
}

function goToCheckout() {
  const bag = getBag();
  if (!bag.length) { showToast('Your bag is empty!'); return; }
  closeBag();
  document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
  showToast('Fill in your details below to complete your order');
}

// Expose to HTML onclick attributes
window.toggleBag    = toggleBag;
window.goToCheckout = goToCheckout;

/* =========================================================
   ORDER FORM
   ========================================================= */

function initOrderForm() {
  document.getElementById('submitBtn')?.addEventListener('click', submitDirectOrder);
}

async function submitDirectOrder() {
  const fname    = document.getElementById('fname')?.value.trim();
  const lname    = document.getElementById('lname')?.value.trim();
  const phone    = document.getElementById('phone')?.value.trim();
  const town     = document.getElementById('town')?.value;
  const interest = document.getElementById('productInterest')?.value;
  const notes    = document.getElementById('notes')?.value.trim();

  if (!fname || !phone || !town) {
    showToast('Please fill in name, phone and town');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = true;

  const bag   = getBag();
  const total = getTotal();
  const bagSummary = bag.length
    ? bag.map(b => `${b.qty}× ${b.name}`).join(', ')
    : notes || interest || 'General enquiry';

  // Build WhatsApp message
  let msg = `🛒 *NEW ORDER — Cotton Street*\n\n`;
  msg += `*Customer:* ${fname} ${lname}\n`;
  msg += `*Phone:* ${phone}\n`;
  msg += `*Town:* ${town}\n\n`;
  if (bagSummary) msg += `*Items:* ${bagSummary}\n`;
  if (total > 0)  msg += `*Total:* P${total.toLocaleString()}\n`;
  if (notes)      msg += `*Notes:* ${notes}\n`;
  msg += `\n_Sent from the Cotton Street website_`;

  // Log to Supabase (non-blocking)
  await submitOrder({
    customer_name:  `${fname} ${lname}`.trim(),
    customer_phone: phone,
    customer_town:  town,
    items_json: bag.length
      ? bag.map(b => ({ id: b.id, name: b.name, variant: b.variant, qty: b.qty, price: b.price }))
      : [{ note: notes || interest || 'General enquiry' }],
    total:  total > 0 ? total : null,
    notes:  notes || null,
  });

  // Open WhatsApp
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');

  // Reset form + bag
  clearBag();
  ['fname', 'lname', 'phone', 'notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['town', 'productInterest'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  if (submitBtn) submitBtn.disabled = false;
  showToast('Order sent! Opening WhatsApp…');
}

/* =========================================================
   TOAST
   ========================================================= */

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* =========================================================
   HELPERS
   ========================================================= */

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}
