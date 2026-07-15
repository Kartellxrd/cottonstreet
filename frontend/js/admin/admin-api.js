// js/admin/admin-api.js

/**
 * Resolves the backend server endpoint automatically based on active workspace environments.
 * Aligned precisely with client-side api.js.
 */
export const API_BASE = (() => {
  const host = window.location.hostname;
  
  // 1. Check for newer Codespace preview links (.preview.app.github.dev)
  if (host.includes('.preview.app.github.dev')) {
    const apiHost = host.replace(/-\d+\.preview\.app\.github\.dev$/, '-8000.preview.app.github.dev');
    return `${window.location.protocol}//${apiHost}/api`;
  }
  
  // 2. Check for older Codespace links (.app.github.dev)
  if (host.endsWith('.app.github.dev')) {
    const apiHost = host.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev');
    return `${window.location.protocol}//${apiHost}/api`;
  }
  
  // 3. Local environments
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8000/api';
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

/* ----- Helper for connection stutters (Race conditions) ----- */
async function fetchWithRetry(url, options = {}, retries = 3, delay = 400) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return await res.json();
  } catch (err) {
    if (retries > 0) {
      console.warn(`⚠️ Connection stutter at ${url}. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw err;
  }
}

/* ===== PRODUCT API METHODS ===== */

export async function fetchCategories() {
  try {
    return await fetchWithRetry(`${API_BASE}/categories`);
  } catch (err) {
    console.error("❌ Failed to fetch categories after retries:", err);
    return [];
  }
}

export async function fetchProducts() {
  try {
    // For admin purposes, we fetch all products regardless of stock status
    return await fetchWithRetry(`${API_BASE}/products?in_stock=all`);
  } catch (err) {
    console.error("❌ Failed to fetch products after retries:", err);
    return [];
  }
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