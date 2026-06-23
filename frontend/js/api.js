/* =========================================================
   api.js — all backend communication lives here
   ========================================================= */

const API_BASE = (() => {
  const host = window.location.hostname;
  if (host.endsWith('.app.github.dev')) {
    const apiHost = host.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev');
    return `${window.location.protocol}//${apiHost}/api`;
  }
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }
  // ✅ Set this before deploying to production
  // return 'https://your-backend.onrender.com/api';
  return 'http://localhost:8000/api';
})();

export { API_BASE };

/* ----- Categories ----- */

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
  return res.json();
}

/* ----- Products ----- */

export async function fetchProducts({ inStock = true, category = null } = {}) {
  const params = new URLSearchParams();
  if (inStock !== null) params.set('in_stock', inStock);
  if (category) params.set('category', category);
  const res = await fetch(`${API_BASE}/products?${params}`);
  if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
  return res.json();
}

/* ----- Orders ----- */

export async function submitOrder(payload) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.warn('Order logging returned non-OK:', res.status);
  }
  return res.ok;
}
