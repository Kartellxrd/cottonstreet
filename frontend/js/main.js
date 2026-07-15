/* =========================================================
   main.js — app bootstrap, cursor, bag drawer, order form, toast
   ========================================================= */

import { initProducts, setFilter } from './products.js';
import { subscribe, getBag, removeItem, getTotal, getCount, clearBag } from './store.js';
import { submitOrder } from './api.js';
import { initChatbot } from './chatbot.js';
import { addToCart } from './cart.js';
import { getProducts, getCategories } from './products.js';

const WHATSAPP_NUMBER = '26776707364';

/* =========================================================
   BOOT
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  initCursor();
  initBagDrawer();
  initOrderForm();
  subscribe(renderBag); 

  await initProducts(); // Wait for data to load
  populateCategories(); // Now populate the dropdown
  initChatbot();
  initSearch();
});

/* =========================================================
   CUSTOM CURSOR
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
  const count = getCount();
  document.getElementById('bagCount').textContent = count;

  // Deposit Logic (Local calculation)
  const total = getTotal();
  const deposit = total * 0.50;
  const balance = total - deposit;

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

  footerEl.innerHTML = `
    <div style="padding:10px; font-size:0.9em; border-top:1px solid #eee;">
      <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span> <span>P${total.toLocaleString()}</span></div>
      <div style="display:flex; justify-content:space-between; color:#c8a96e; font-weight:bold;"><span>Req. 50% Deposit:</span> <span>P${deposit.toLocaleString()}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>Balance Due:</span> <span>P${balance.toLocaleString()}</span></div>
    </div>
    <button class="checkout-btn" onclick="goToCheckout()" style="width:100%; padding:12px; cursor:pointer;">CHECKOUT VIA WHATSAPP</button>
  `;

  itemsEl.querySelectorAll('.bag-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeItem(Number(btn.dataset.id)));
  });
}

function goToCheckout() {
  const bag = getBag();
  if (!bag.length) { showToast('Your bag is empty!'); return; }
  closeBag();
  document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
}

window.toggleBag = toggleBag;
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
  const notes    = document.getElementById('notes')?.value.trim();

  if (!fname || !phone || !town) {
    showToast('Please fill in name, phone and town');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = true;

  const bag   = getBag();
  const total = getTotal();
  const deposit = total * 0.50;
  const balance = total - deposit;
  const bagSummary = bag.map(b => `${b.qty}× ${b.name}`).join(', ');

  // WhatsApp Message
  let msg = `🛒 *NEW ORDER — Cotton Street*\n\n`;
  msg += `*Customer:* ${fname} ${lname}\n*Phone:* ${phone}\n*Town:* ${town}\n\n`;
  msg += `*Items:* ${bagSummary}\n\n`;
  msg += `*Grand Total:* P${total.toLocaleString()}\n`;
  msg += `⚡ *REQUIRED 50% DEPOSIT:* P${deposit.toLocaleString()}\n`;
  msg += `🤝 *BALANCE ON DELIVERY:* P${balance.toLocaleString()}\n\n`;
  if (notes) msg += `*Notes:* ${notes}\n`;
  msg += `_Sent from the Cotton Street website_`;

  await submitOrder({ customer_name: `${fname} ${lname}`, customer_phone: phone, customer_town: town, items_json: bag, total, notes });

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  clearBag();
  if (submitBtn) submitBtn.disabled = false;
  showToast('Order sent!');
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

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}


function populateCategories() {
    const select = document.getElementById('productInterest');
    if (!select) return;

    // Get the master list of categories
    const categories = getCategories(); 

    // Clear and reset
    select.innerHTML = '<option value="">Select Category</option>';

    // Add them dynamically
    categories.forEach(c => {
        const option = document.createElement('option');
        option.value = c.name; // Use the name from the object
        option.textContent = c.name;
        select.appendChild(option);
    });
}