/* =========================================================
   api.js — all backend communication lives here
   ========================================================= */

const API_BASE = (() => {
  const host = window.location.hostname;

  // 1. Check for Codespace preview links (Forces active Codespace backend port 8000)
  if (host.includes('.app.github.dev')) {
    const apiHost = host.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev');
    return `${window.location.protocol}//${apiHost}/api`;
  }
  
  // 2. Production URL (Only use Render if NOT in a local or Codespace environment)
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return 'https://cottonstreet-3.onrender.com/api';
  }
  
  // 3. Local environments (Development)
  return 'http://localhost:8000/api';
})();

export { API_BASE };

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
    throw err; // Out of retries, bubble up the error safely
  }
}

/* ----- Categories ----- */

export async function fetchCategories() {
  try {
    return await fetchWithRetry(`${API_BASE}/categories`);
  } catch (err) {
    console.error("❌ Failed to fetch categories after retries:", err);
    return []; 
  }
}

/* ----- Products ----- */

export async function fetchProducts({ inStock = true, category = null } = {}) {
  const params = new URLSearchParams();
  if (inStock !== null) params.set('in_stock', inStock);
  if (category) params.set('category', category);
  
  try {
    return await fetchWithRetry(`${API_BASE}/products?${params}`);
  } catch (err) {
    console.error("❌ Failed to fetch products after retries:", err);
    return []; 
  }
}

/* ----- Orders ----- */

export async function submitOrder(payload) {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      console.warn('Order logging returned non-OK:', res.status);
    }
    return res.ok;
  } catch (err) {
    console.error('❌ Order submission failed:', err);
    return false;
  }
}