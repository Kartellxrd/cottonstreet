// js/admin/products-form.js
import { classifyProductName, compressImage } from './admin-intel.js';
import { fetchCategories, fetchProducts, saveProduct, deleteProduct, toggleProductStock, uploadProductImage } from './admin-api.js';

let allProducts = [];
let categories = [];
let uploadedImageUrl = '';
let uploadedPublicId = '';
let activeCompressedFile = null;

export async function initProductsPanel() {
  await loadCategories();
  await loadProducts();
  setupDragAndDrop();
  setupNLPAssistant();
}

async function loadCategories() {
  try {
    categories = await fetchCategories();
    const sel = document.getElementById('pCategory');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select category…</option>';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  } catch (e) {
    showToast('Failed to load categories', true);
  }
}

async function loadProducts() {
  try {
    allProducts = await fetchProducts();
    renderProducts(allProducts);
  } catch (e) {
    showToast('Failed to load products', true);
  }
}

function setupNLPAssistant() {
  const pNameInput = document.getElementById('pName');
  const pVariantInput = document.getElementById('pVariant');
  const pCategorySelect = document.getElementById('pCategory');
  const pBadgeSelect = document.getElementById('pBadge');

  if (!pNameInput) return;

  pNameInput.addEventListener('input', (e) => {
    const prediction = classifyProductName(e.target.value);
    if (prediction) {
      if (pCategorySelect) {
        for (let option of pCategorySelect.options) {
          if (option.text.toLowerCase().includes(prediction.category) || option.value === prediction.category) {
            pCategorySelect.value = option.value;
            break;
          }
        }
      }
      if (pBadgeSelect && pBadgeSelect.value === "") {
        pBadgeSelect.value = prediction.suggestedBadge;
      }
      if (pVariantInput && !pVariantInput.value.trim()) {
        pVariantInput.value = prediction.defaultVariant;
      }
    }
  });
}

function setupDragAndDrop() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('imgFile');

  if (!uploadArea || !fileInput) return;

  uploadArea.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(name => {
    uploadArea.addEventListener(name, (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = 'var(--accent)';
      uploadArea.style.background = 'rgba(200,169,110,0.05)';
    }, false);
  });

  ['dragleave', 'drop'].forEach(name => {
    uploadArea.addEventListener(name, (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      uploadArea.style.background = '';
    }, false);
  });

  uploadArea.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      fileInput.files = files;
      await handleImageSelect(fileInput);
    }
  });
}

function renderProducts(list) {
  const countEl = document.getElementById('productCount');
  if (countEl) countEl.textContent = `${list.length} products`;
  
  const container = document.getElementById('productList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-list">No products found</div>';
    return;
  }
  
  container.innerHTML = list.map(p => {
    const thumb = p.image_url
      ? `<div class="product-thumb"><img src="${p.image_url}" alt="${p.name}"></div>`
      : `<div class="product-thumb">${p.name.slice(0,2).toUpperCase()}</div>`;
    const catName = categories.find(c => c.id === p.category_id)?.name || '—';
    return `
    <div class="product-row" id="row-${p.id}">
      ${thumb}
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${catName} · ${p.variant || '—'}</div>
        <div class="product-price">P${Number(p.price).toLocaleString()}${p.old_price ? ` <span style="text-decoration:line-through;color:var(--light);font-size:11px;">P${Number(p.old_price).toLocaleString()}</span>` : ''}</div>
      </div>
      <div class="product-actions">
        <button class="stock-toggle" onclick="toggleStock(${p.id}, ${p.in_stock})" title="${p.in_stock ? 'In Stock' : 'Out of Stock'}">${p.in_stock ? '✅' : '❌'}</button>
        <button class="btn-edit" onclick="editProduct(${p.id})">Edit</button>
        <button class="btn-delete" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Del</button>
      </div>
    </div>`;
  }).join('');
}

// Global scope exposures for inline markup elements
window.searchProducts = function(q) {
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.variant || '').toLowerCase().includes(q.toLowerCase())
  );
  renderProducts(filtered);
};

window.handleImageSelect = async function(input) {
  const file = input.files[0];
  if (!file) return;

  const progress = document.getElementById('uploadProgress');
  progress.style.display = 'block';
  progress.textContent = '⚡ Optimizing photo...';

  activeCompressedFile = await compressImage(file);
  const originalSize = (file.size / 1024).toFixed(1);
  const newSize = (activeCompressedFile.size / 1024).toFixed(1);

  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('imgPreview');
    if (preview) {
      preview.src = e.target.result;
      preview.style.display = 'block';
    }
  };
  reader.readAsDataURL(activeCompressedFile);

  progress.textContent = `Optimized image (${originalSize} KB ➡️ ${newSize} KB). Uploading…`;

  try {
    const data = await uploadProductImage(activeCompressedFile);
    uploadedImageUrl = data.url;
    uploadedPublicId = data.public_id;
    progress.textContent = `✅ Upload complete! Saved ${Math.round(100 - (newSize/originalSize * 100))}% storage cost.`;
    setTimeout(() => progress.style.display = 'none', 3000);
  } catch (e) {
    progress.textContent = '❌ Upload failed. Try again.';
    showToast('Image upload failed', true);
  }
};

window.saveProduct = async function() {
  const name = document.getElementById('pName').value.trim();
  const variant = document.getElementById('pVariant').value.trim();
  const price = document.getElementById('pPrice').value;
  const oldPrice = document.getElementById('pOldPrice').value;
  const categoryId = document.getElementById('pCategory').value;
  const badge = document.getElementById('pBadge').value;
  const editId = document.getElementById('editId').value;

  if (!name || !price || !categoryId) {
    showToast('Name, price and category are required', true);
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'SAVING…';

  const payload = {
    name,
    variant: variant || null,
    price: parseFloat(price),
    old_price: oldPrice ? parseFloat(oldPrice) : null,
    category_id: parseInt(categoryId),
    badge: badge || null,
    image_url: uploadedImageUrl || null,
    cloudinary_id: uploadedPublicId || null,
    in_stock: true
  };

  try {
    await saveProduct(payload, editId || null);
    showToast(editId ? 'Product updated!' : 'Product added!');
    clearForm();
    await loadProducts();
  } catch (e) {
    showToast('Failed to save product', true);
  }

  btn.disabled = false;
  btn.textContent = 'SAVE PRODUCT';
};

window.editProduct = function(id) {
  const p = allProducts.find(p => p.id === id);
  if (!p) return;
  document.getElementById('editId').value = p.id;
  document.getElementById('formTitle').textContent = 'EDIT PRODUCT';
  document.getElementById('pName').value = p.name;
  document.getElementById('pVariant').value = p.variant || '';
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pOldPrice').value = p.old_price || '';
  document.getElementById('pCategory').value = p.category_id || '';
  document.getElementById('pBadge').value = p.badge || '';
  
  if (p.image_url) {
    const preview = document.getElementById('imgPreview');
    preview.src = p.image_url;
    preview.style.display = 'block';
    uploadedImageUrl = p.image_url;
    uploadedPublicId = p.cloudinary_id || '';
  }
  
  document.getElementById('saveBtn').textContent = 'UPDATE PRODUCT';
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'block';
  
  document.querySelectorAll('.product-row').forEach(r => r.classList.remove('editing'));
  document.getElementById(`row-${id}`)?.classList.add('editing');
  document.querySelector('.form-panel').scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = async function(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await deleteProduct(id);
    showToast('Product deleted');
    await loadProducts();
  } catch (e) {
    showToast('Failed to delete product', true);
  }
};

window.toggleStock = async function(id, currentStatus) {
  try {
    await toggleProductStock(id);
    showToast(currentStatus ? 'Marked as out of stock' : 'Marked as in stock');
    await loadProducts();
  } catch (e) {
    showToast('Failed to update stock', true);
  }
};

window.clearForm = function() {
  document.getElementById('editId').value = '';
  document.getElementById('formTitle').textContent = 'ADD PRODUCT';
  document.getElementById('pName').value = '';
  document.getElementById('pVariant').value = '';
  document.getElementById('pPrice').value = '';
  document.getElementById('pOldPrice').value = '';
  document.getElementById('pCategory').value = '';
  document.getElementById('pBadge').value = '';
  document.getElementById('imgPreview').style.display = 'none';
  document.getElementById('imgFile').value = '';
  document.getElementById('saveBtn').textContent = 'SAVE PRODUCT';
  
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  
  uploadedImageUrl = '';
  uploadedPublicId = '';
  activeCompressedFile = null;
  document.querySelectorAll('.product-row').forEach(r => r.classList.remove('editing'));
};

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast${isError ? ' error' : ''} show`;
  setTimeout(() => t.className = `toast${isError ? ' error' : ''}`, 3000);
}