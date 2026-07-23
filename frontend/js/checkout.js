/* =========================================================
   checkout.js — Dedicated Checkout & Payment Page View
   ========================================================= */

import { submitOrder } from './api.js';
import { clearBag } from './store.js';

let selectedFulfillmentType = 'delivery';
let selectedPaymentMethod = 'orangemoney'; // Default to Orange Money for Botswana market

export function initCheckoutPage(containerId, orderData, onBack) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Inject styles if not present
  if (!document.getElementById('checkoutPageViewStyles')) {
    const style = document.createElement('style');
    style.id = 'checkoutPageViewStyles';
    style.innerHTML = `
      .checkout-page-container {
        max-width: 600px;
        margin: 40px auto;
        background: #121212;
        border: 1px solid rgba(212,175,55,0.3);
        border-radius: 12px;
        padding: 30px;
        color: #fff;
        font-family: inherit;
      }
      .pay-option-card {
        background: #1a1a1a;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .pay-option-card.selected {
        border-color: #d4af37;
        background: rgba(212,175,55,0.06);
      }
      .pay-summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 0.95rem;
      }
      .complete-pay-btn {
        background: #d4af37;
        color: #000;
        border: none;
        width: 100%;
        padding: 14px;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        margin-top: 20px;
        font-size: 1rem;
        transition: background 0.2s;
      }
      .complete-pay-btn:hover { background: #e5c158; }
    `;
    document.head.appendChild(style);
  }

  const deposit = orderData.total * 0.50;
  const balance = orderData.total - deposit;

  container.innerHTML = `
    <div class="checkout-page-container">
      <h2 style="color:#d4af37; margin-bottom: 8px; font-size: 1.4rem; letter-spacing: 1px;">COMPLETE YOUR ORDER</h2>
      <p style="color: #888; font-size: 0.85rem; margin-bottom: 24px;">Review your fulfillment preference and secure your 50% deposit.</p>
      
      <!-- Fulfillment Method Selection -->
      <div style="margin-bottom: 24px;">
        <label style="font-size: 0.85rem; color: #aaa; display: block; margin-bottom: 10px; font-weight: 600;">SELECT FULFILLMENT METHOD</label>
        
        <div class="pay-option-card selected" id="optDelivery" data-group="fulfillment" data-type="delivery">
          <div style="font-weight: bold; color: #fff;">🚚 Sprint Couriers Delivery</div>
          <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">Direct doorstep delivery to your address in ${orderData.customer_town}</div>
        </div>
        
        <div class="pay-option-card" id="optPickup" data-group="fulfillment" data-type="pickup">
          <div style="font-weight: bold; color: #fff;">📍 Free Pickup (University of Botswana)</div>
          <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">Collect directly from our secure base on UB campus</div>
        </div>
      </div>

      <!-- Payment Method Selection -->
      <div style="margin-bottom: 24px;">
        <label style="font-size: 0.85rem; color: #aaa; display: block; margin-bottom: 10px; font-weight: 600;">SELECT PAYMENT METHOD</label>
        
        <div class="pay-option-card selected" id="payOrange" data-group="payment" data-type="orangemoney">
          <div style="font-weight: bold; color: #fff;">🟠 Orange Money (Botswana)</div>
          <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">Send manual deposit & keep receipt / screenshot</div>
        </div>
        
        <div class="pay-option-card" id="payCard" data-group="payment" data-type="card">
          <div style="font-weight: bold; color: #fff;">💳 Credit / Debit Card (Stripe)</div>
          <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">Secure instant payment online</div>
        </div>
      </div>

      <!-- Financial Breakdown -->
      <div style="background: #181818; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.06);">
        <div class="pay-summary-row"><span style="color:#888;">Order Total:</span> <span>P${orderData.total.toLocaleString()}</span></div>
        <div class="pay-summary-row" style="color:#d4af37; font-weight:bold; font-size: 1rem; margin: 8px 0; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
          <span>Required 50% Deposit:</span> <span>P${deposit.toLocaleString()}</span>
        </div>
        <div class="pay-summary-row"><span style="color:#888;">Balance Due on Receipt:</span> <span>P${balance.toLocaleString()}</span></div>
      </div>

      <!-- Dynamic Payment Instructions Box -->
      <div id="paymentInstructionsBox" style="font-size: 0.85rem; color: #ccc; margin-bottom: 24px; background: rgba(212,175,55,0.04); padding: 14px; border-radius: 6px; border-left: 3px solid #d4af37; line-height: 1.5;">
        <strong>Orange Money Instructions:</strong><br>
        Send your 50% deposit (<strong>P${deposit.toLocaleString()}</strong>) to Orange Money Number: <span style="color:#d4af37; font-weight:bold;">+267 78 637 243</span> (Cotton Street Apparel). Keep your transaction SMS or screenshot as proof.
      </div>

      <button class="complete-pay-btn" id="finalizeOrderBtn">CONFIRM & SUBMIT ORDER</button>
      <button id="backToFormBtn" style="background:transparent; border:none; color:#888; width:100%; margin-top:14px; cursor:pointer; font-size:0.85rem;">← Back to dispatch form</button>
    </div>
  `;

  // Handle option card clicks dynamically
  container.querySelectorAll('.pay-option-card').forEach(card => {
    card.addEventListener('click', () => {
      const group = card.dataset.group;
      container.querySelectorAll(`.pay-option-card[data-group="${group}"]`).forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      if (group === 'fulfillment') {
        selectedFulfillmentType = card.dataset.type;
      } else if (group === 'payment') {
        selectedPaymentMethod = card.dataset.type;
        
        // Update instructions box text dynamically
        const infoBox = container.querySelector('#paymentInstructionsBox');
        if (selectedPaymentMethod === 'orangemoney') {
          infoBox.innerHTML = `
            <strong>Orange Money Instructions:</strong><br>
            Send your 50% deposit (<strong>P${deposit.toLocaleString()}</strong>) to Orange Money Number: <span style="color:#d4af37; font-weight:bold;">+267 78 637 243</span> (Cotton Street Apparel). Keep your transaction SMS or screenshot as proof.
          `;
        } else {
          infoBox.innerHTML = `
            <strong>Card Payment (Stripe):</strong><br>
            You will be redirected securely to complete your 50% deposit payment via Stripe using your credit or debit card.
          `;
        }
      }
    });
  });

  // Handle back button
  container.querySelector('#backToFormBtn').addEventListener('click', () => {
    if (typeof onBack === 'function') onBack();
  });

  // Handle final order submission
  container.querySelector('#finalizeOrderBtn').addEventListener('click', async () => {
    const btn = container.querySelector('#finalizeOrderBtn');
    btn.disabled = true;
    btn.textContent = 'PROCESSING ORDER...';

    orderData.fulfillment = selectedFulfillmentType;
    orderData.payment_method = selectedPaymentMethod;
    orderData.notes = `[${selectedFulfillmentType.toUpperCase()}] [PAY: ${selectedPaymentMethod.toUpperCase()}] ${orderData.notes || ''}`;
    orderData.deposit = deposit;
    orderData.balance = balance;

    if (selectedPaymentMethod === 'card') {
      try {
        // First save the order record in the database via API, or pass details directly to Stripe session
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_amount: orderData.total,
            deposit_amount: deposit,
            customer_name: orderData.customer_name
          })
        });
        
        const result = await response.json();
        if (result.url) {
          clearBag();
          window.location.href = result.url; // Secure redirect to Stripe Checkout
        } else {
          throw new Error(result.detail || 'Could not initialize Stripe checkout session.');
        }
      } catch (err) {
        alert('Stripe Error: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'CONFIRM & SUBMIT ORDER';
      }
      return;
    }

    // Submit Orange Money / Standard manual order
    try {
      await submitOrder(orderData);
      clearBag();
      alert('Order successfully placed! Please ensure you send your Orange Money deposit screenshot/receipt.');
      window.location.reload();
    } catch (err) {
      alert('Order submission failed: ' + (err.message || 'Please try again.'));
      btn.disabled = false;
      btn.textContent = 'CONFIRM & SUBMIT ORDER';
    }
  });
}