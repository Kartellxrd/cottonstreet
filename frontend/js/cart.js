// js/cart.js

// Logic for adding/updating items (Shared state via localStorage)
export function getCart() {
  return JSON.parse(localStorage.getItem('cs_cart')) || [];
}

export function saveCart(cart) {
  localStorage.setItem('cs_cart', JSON.stringify(cart));
}

export function calculateTotals(cart) {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const requiredDeposit = subtotal * 0.50;
  const balanceDue = subtotal - requiredDeposit;
  return { subtotal, requiredDeposit, balanceDue };
}

export function formatWhatsAppMessage(cart, customerDetails) {
  const { subtotal, requiredDeposit, balanceDue } = calculateTotals(cart);
  
  let itemStrings = cart.map(item => 
    `• ${item.qty}x ${item.name} (${item.variant}) — P${(item.price * item.qty).toLocaleString()}`
  ).join('\n');

  return `COTTON STREET — NEW ORDER! 🛍️
-----------------------------------------
👤 CUSTOMER: ${customerDetails.fname} ${customerDetails.lname}
📞 PHONE: ${customerDetails.phone}
📍 TOWN: ${customerDetails.town}
-----------------------------------------
🛒 ITEMS:
${itemStrings}
-----------------------------------------
💰 GRAND TOTAL: P${subtotal.toLocaleString()}
⚡ REQUIRED 50% DEPOSIT: P${requiredDeposit.toLocaleString()}
🤝 BALANCE ON DELIVERY: P${balanceDue.toLocaleString()}

*Please reply with confirmation details & deposit payment receipt to lock in order.*`;
}
// Add this to your existing cart.js
export function addToCart(product, selectedVariant = null) {
  let cart = getCart();
  const existingItemIndex = cart.findIndex(item => 
    item.id === product.id && item.variant === (selectedVariant || product.variant || 'Standard')
  );

  if (existingItemIndex > -1) {
    cart[existingItemIndex].qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image_url: product.image_url,
      variant: selectedVariant || product.variant || 'Standard',
      qty: 1
    });
  }
  saveCart(cart);
}