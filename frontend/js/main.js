/* =========================================================
   main.js — app bootstrap, cursor, bag drawer, order form, toast
   ========================================================= */

import { initProducts, setFilter } from './products.js';
import { subscribe, getBag, removeItem, getTotal, getCount, clearBag } from './store.js';
import { submitOrder } from './api.js';
import { initChatbot } from './chatbot.js';
import { addToCart } from './cart.js';
import { getProducts, getCategories } from './products.js';

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
   BAG DRAWER & TROLLEY ICON
   ========================================================= */

function initBagDrawer() {
  document.getElementById('bagOverlay')?.addEventListener('click', closeBag);
  document.getElementById('bagBtn')?.addEventListener('click', toggleBag);
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
  const badge = document.getElementById('bagCountBadge');
  
  if (badge) {
    badge.textContent = count;
    if (count > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  const total = getTotal();
  const deposit = total * 0.50;
  const balance = total - deposit;

  const itemsEl  = document.getElementById('bagItems');
  const footerEl = document.getElementById('bagFooter');
  
  if (!itemsEl || !footerEl) return;

  // Professional mobile-responsive bag item CSS injection
  if (!document.getElementById('bagItemStyles')) {
    const bagStyle = document.createElement('style');
    bagStyle.id = 'bagItemStyles';
    bagStyle.innerHTML = `
      .bag-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .bag-item img, .bag-item .no-image {
        width: 64px !important;
        height: 64px !important;
        min-width: 64px !important;
        max-width: 64px !important;
        object-fit: cover !important;
        border-radius: 6px;
        background: #1a1a1a;
      }
      .bag-item-info {
        flex: 1;
        min-width: 0;
      }
      .bag-item-name {
        font-weight: 600;
        font-size: 0.9rem;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bag-item-variant, .bag-item-price {
        font-size: 0.8rem;
        color: #888;
      }
      .bag-item-price {
        color: #d4af37;
        margin-top: 2px;
      }
      .bag-item-remove {
        background: transparent;
        border: none;
        color: #888;
        font-size: 1rem;
        cursor: pointer;
        padding: 4px 8px;
        transition: color 0.2s;
      }
      .bag-item-remove:hover {
        color: #ff4d4d;
      }
    `;
    document.head.appendChild(bagStyle);
  }

  if (!bag.length) {
    itemsEl.innerHTML = `
      <div class="bag-empty" style="text-align:center; padding:40px 0; color:#888;">
        <div class="big" style="font-size:1.2rem; font-weight:bold; color:#fff; margin-bottom:6px;">YOUR BAG IS EMPTY</div>
        Add items from the store to get started
      </div>`;
    footerEl.style.display = 'none';
    return;
  }

  footerEl.style.display = 'block';
  itemsEl.innerHTML = bag.map(b => {
    const thumb = b.img
      ? `<img src="${esc(b.img)}" alt="${esc(b.name)}">`
      : `<div class="no-image" style="display:flex; align-items:center; justify-content:center; color:#d4af37; font-weight:bold; font-size:0.8rem;">${esc(b.name).slice(0, 2).toUpperCase()}</div>`;
    return `
    <div class="bag-item">
      ${thumb}
      <div class="bag-item-info">
        <div class="bag-item-name">${esc(b.name)}</div>
        <div class="bag-item-variant">${esc(b.variant || 'Standard')} · Qty: ${b.qty}</div>
        <div class="bag-item-price">P${(b.price * b.qty).toLocaleString()}</div>
      </div>
      <button class="bag-item-remove" data-id="${b.id}" aria-label="Remove ${esc(b.name)}">✕</button>
    </div>`;
  }).join('');

  footerEl.innerHTML = `
    <div style="padding:12px 0; font-size:0.85rem; border-top:1px solid rgba(255,255,255,0.1); margin-top:10px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:#888;">Subtotal:</span> <span style="color:#fff;">P${total.toLocaleString()}</span></div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#d4af37; font-weight:600;"><span>Req. 50% Deposit:</span> <span>P${deposit.toLocaleString()}</span></div>
      <div style="display:flex; justify-content:space-between;"><span style="color:#888;">Balance Due:</span> <span style="color:#fff;">P${balance.toLocaleString()}</span></div>
    </div>
    <button class="checkout-btn" onclick="goToCheckout()" style="width:100%; padding:12px; cursor:pointer; background:#d4af37; color:#000; border:none; border-radius:6px; font-weight:bold; font-size:0.9rem; margin-top:8px;">PROCEED TO CHECKOUT</button>
  `;

  itemsEl.querySelectorAll('.bag-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeItem(Number(btn.dataset.id)));
  });
}

function goToCheckout() {
  const bag = getBag();
  if (!bag.length) { showToast('Your bag is empty!'); return; }
  closeBag();
  
  // Transition trigger point for delivery/pickup modal and system checkout page
  const orderSection = document.getElementById('order');
  if (orderSection) {
    orderSection.scrollIntoView({ behavior: 'smooth' });
  } else {
    showToast('Redirecting to checkout flow...');
  }
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

  await submitOrder({ 
    customer_name: `${fname} ${lname}`, 
    customer_phone: phone, 
    customer_town: town, 
    items_json: bag, 
    total, 
    notes 
  });

  clearBag();
  if (submitBtn) submitBtn.disabled = false;
  showToast('Order successfully placed!');
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

    const categories = getCategories(); 

    select.innerHTML = '<option value="">Select Category</option>';

    categories.forEach(c => {
        const option = document.createElement('option');
        option.value = c.name; 
        option.textContent = c.name;
        select.appendChild(option);
    });
}