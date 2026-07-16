// js/admin/admin-api.js

export const API_BASE = (() => {
  const host = window.location.hostname;

  // Codespace preview links
  if (host.includes('.preview.app.github.dev')) {
    const apiHost = host.replace(/-\d+\.preview\.app\.github\.dev$/, '-8000.preview.app.github.dev');
    return `${window.location.protocol}//${apiHost}/api`;
  }

  // Codespace links
  if (host.endsWith('.app.github.dev')) {
    const apiHost = host.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev');
    return `${window.location.protocol}//${apiHost}/api`;
  }

  // Local development
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  // Production (Vercel or any other host)
  return 'https://cottonstreet-3.onrender.com/api';
})();

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

export async function fetchCategories() {
  try {
    return await fetchWithRetry(`${API_BASE}/categories`);
  } catch (err) {
    console.error('❌ Failed to fetch categories after retries:', err);
    return [];
  }
}

export async function fetchProducts() {
  try {
    return await fetchWithRetry(`${API_BASE}/products?in_stock=all`);
  } catch (err) {
    console.error('❌ Failed to fetch products after retries:', err);
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