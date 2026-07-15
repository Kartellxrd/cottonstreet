// js/admin/orders-control.js
import { calculateGeographicHotspots } from './admin-intel.js';
import { fetchOrders, updateOrderStatus, API_BASE } from './admin-api.js';

let allOrders = [];
let currentFilter = 'all';

export async function initOrdersPanel() {
  await loadOrders();
  setupBulkBarUI();
}

async function loadOrders() {
  try {
    allOrders = await fetchOrders();
    updateStats();
    renderOrders(allOrders);
  } catch (e) {
    const listEl = document.getElementById('ordersList');
    if (listEl) listEl.innerHTML = '<div class="empty-state">Failed to load orders</div>';
  }
}

function updateStats() {
  const total = document.getElementById('statTotal');
  const pending = document.getElementById('statPending');
  const confirmed = document.getElementById('statConfirmed');
  const delivered = document.getElementById('statDelivered');

  if (total) total.textContent = allOrders.length;
  if (pending) pending.textContent = allOrders.filter(o => o.status === 'pending').length;
  if (confirmed) confirmed.textContent = allOrders.filter(o => o.status === 'confirmed').length;
  if (delivered) delivered.textContent = allOrders.filter(o => o.status === 'delivered').length;

  const hotspots = calculateGeographicHotspots(allOrders);
  console.log("📍 Botswana Regional Order Hotspots:", hotspots);
}

window.filterOrders = function(status, btn) {
  currentFilter = status;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const filtered = status === 'all' ? allOrders : allOrders.filter(o => o.status === status);
  renderOrders(filtered);
};

function renderOrders(list) {
  const container = document.getElementById('ordersList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">No orders found</div>';
    return;
  }

  container.innerHTML = list.map(o => {
    const date = new Date(o.created_at).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const items = Array.isArray(o.items_json)
      ? o.items_json.map(i => i.name ? `<strong>${i.qty || 1}× ${i.name}</strong>${i.variant ? ` — ${i.variant}` : ''}` : `<strong>${i.note || JSON.stringify(i)}</strong>`).join('<br>')
      : JSON.stringify(o.items_json);
    const waMsg = encodeURIComponent(`Hi ${o.customer_name}, your Cotton Street order has been confirmed! 🔥\n\nWe'll be in touch shortly to arrange delivery.\n\nThank you for shopping with us! 🛍️`);
    
    return `
    <div class="order-card" data-id="${o.id}" style="position: relative; padding-left: 56px;">
      <input type="checkbox" class="bulk-select" value="${o.id}" style="position: absolute; left: 20px; top: 24px; width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent);">
      <div class="order-top">
        <div>
          <div class="order-id">Order #${o.id}</div>
          <div class="order-customer">${o.customer_name}</div>
          <div class="order-contact">📞 ${o.customer_phone} · 📍 ${o.customer_town}</div>
        </div>
        <div class="order-date">${date}</div>
      </div>
      <div class="order-items">${items}${o.notes ? `<br><em>Note: ${o.notes}</em>` : ''}</div>
      <div class="order-bottom">
        <div class="order-total">${o.total ? `P${Number(o.total).toLocaleString()}` : 'No total'}</div>
        <div class="order-actions">
          <span class="status-badge status-${o.status}">${o.status}</span>
          <select class="status-select" onchange="updateStatus(${o.id}, this.value)">
            <option value="">Update status…</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <a class="btn-wa" href="https://wa.me/${o.customer_phone.replace(/\D/g,'')}?text=${waMsg}" target="_blank">WhatsApp</a>
        </div>
      </div>
    </div>`;
  }).join('');

  setupBulkCheckboxListeners();
}

function setupBulkBarUI() {
  let bulkBar = document.getElementById('floating-bulk-bar');
  if (!bulkBar) {
    bulkBar = document.createElement('div');
    bulkBar.id = 'floating-bulk-bar';
    bulkBar.style.cssText = `
      position: fixed; bottom: -100px; left: 50%; transform: translateX(-50%);
      background: var(--grey); border: 1px solid var(--accent); padding: 16px 28px;
      border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex;
      align-items: center; gap: 24px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 1000;
    `;
    bulkBar.innerHTML = `
      <span style="color: var(--white); font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 1px;" id="bulk-select-count">0 SELECTED</span>
      <div style="display:flex; gap:8px;">
        <button id="bulk-btn-confirm" style="background: rgba(37,211,102,0.15); color: #25D366; border: 1px solid rgba(37,211,102,0.4); padding: 6px 14px; font-family: 'Space Mono', monospace; font-size: 10px; cursor: pointer;">CONFIRM ALL</button>
        <button id="bulk-btn-deliver" style="background: var(--accent); color: var(--black); border: none; padding: 6px 14px; font-family: 'Space Mono', monospace; font-size: 10px; font-weight:bold; cursor: pointer;">DELIVER ALL</button>
      </div>
    `;
    document.body.appendChild(bulkBar);

    document.getElementById('bulk-btn-confirm').addEventListener('click', () => executeBulkUpdate('confirmed'));
    document.getElementById('bulk-btn-deliver').addEventListener('click', () => executeBulkUpdate('delivered'));
  }
}

function setupBulkCheckboxListeners() {
  const checkboxes = document.querySelectorAll('.bulk-select');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = document.querySelectorAll('.bulk-select:checked');
      const count = checked.length;
      const bar = document.getElementById('floating-bulk-bar');
      
      const selectCountEl = document.getElementById('bulk-select-count');
      if (selectCountEl) selectCountEl.textContent = `${count} SELECTED`;

      if (bar) {
        if (count > 0) {
          bar.style.bottom = '32px';
        } else {
          bar.style.bottom = '-100px';
        }
      }
    });
  });
}

async function executeBulkUpdate(targetStatus) {
  const checked = document.querySelectorAll('.bulk-select:checked');
  const ids = Array.from(checked).map(cb => parseInt(cb.value));

  if (!ids.length) return;
  showToast(`Processing ${ids.length} orders...`);

  try {
    const token = localStorage.getItem('cs_token');
    await Promise.all(ids.map(id => 
      fetch(`${API_BASE}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      })
    ));

    showToast(`Marked ${ids.length} orders as ${targetStatus}!`);
    await loadOrders();
  } catch (e) {
    showToast('Failed to update orders');
  }

  const bar = document.getElementById('floating-bulk-bar');
  if (bar) bar.style.bottom = '-100px';
}

window.updateStatus = async function(id, status) {
  if (!status) return;
  try {
    await updateOrderStatus(id, status);
    showToast(`Order #${id} marked as ${status}`);
    await loadOrders();
  } catch (e) {
    showToast('Failed to update status');
  }
};

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}