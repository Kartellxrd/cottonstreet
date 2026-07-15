// js/admin/admin-api.js

/**
 * Resolves the backend server endpoint automatically based on active workspace environments.
 */
export const API_BASE = (() => {
  const host = window.location.hostname;
  if (host.endsWith('.app.github.dev')) {
    return `${window.location.protocol}//${host.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev')}/api`;
  }
  return 'http://localhost:8000/api';
})();

/**
 * Generates Authorization headers dynamically using stored admin credentials.
 */
export function getAuthHeaders() {
  const token = localStorage.getItem('cs_token');
  if (!token) {
    window.location.href = 'login.html';
    return {};
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/* ===== PRODUCT API METHODS ===== */

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error('Failed to fetch product categories.');
  return res.json();
}

export async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error('Failed to fetch active products.');
  return res.json();
}

export async function saveProduct(payload, editId = null) {
  const url = editId ? `${API_BASE}/products/${editId}` : `${API_BASE}/products`;
  const method = editId ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Could not persist product configuration.');
  return res.json();
}

export async function deleteProduct(id) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete target product.');
  return true;
}

export async function toggleProductStock(id) {
  const res = await fetch(`${API_BASE}/products/${id}/stock`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to mutate stock availability.');
  return true;
}

export async function uploadProductImage(compressedFile) {
  const formData = new FormData();
  formData.append('file', compressedFile);
  
  const token = localStorage.getItem('cs_token');
  const res = await fetch(`${API_BASE}/upload/image`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) throw new Error('Could not upload image to server.');
  return res.json();
}

/* ===== ORDERS API METHODS ===== */

export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`, { headers: getAuthHeaders() });
  if (res.status === 401) {
    localStorage.removeItem('cs_token');
    window.location.href = 'login.html';
    return [];
  }
  if (!res.ok) throw new Error('Failed to sync orders ledger.');
  return res.json();
}

export async function updateOrderStatus(id, status) {
  const res = await fetch(`${API_BASE}/orders/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to update order status context.');
  return true;
}