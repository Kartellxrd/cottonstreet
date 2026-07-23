/* =========================================================
   checkout.js — Dedicated Checkout & Payment Page View
   ========================================================= */

import { submitOrder } from './api.js';
import { clearBag } from './store.js';

let selectedFulfillmentType = 'delivery';

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
        
        <div class="pay-option-card selected" id="optDelivery" data-type="delivery">
          <div style="font-weight: bold; color: #fff;">🚚 Sprint Couriers Delivery</div>
          <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">Direct doorstep delivery to your address in ${orderData.customer_town}</div>
        </div>
        
        <div class="pay-option-card" id="optPickup" data-type="pickup">
          <div style="font-weight: bold; color: #fff;">📍 Free Pickup (University of Botswana)</div>
          <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">Collect directly from our secure base on UB campus</div>
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

      <!-- Local Payment Info Box -->
      <div style="font-size: 0.85rem; color: #ccc; margin-bottom: 24px; background: rgba(212,175,55,0.04); padding: 14px; border-radius: 6px; border-left: 3px solid #d4af37; line-height: 1.5;">
        <strong>Local Payment Instruction:</strong><br>
        Send your 50% deposit (<strong>P${deposit.toLocaleString()}</strong>) via Orange Money or Bank Transfer, and submit your order to lock it in. (Card payment gateway integration via backend coming soon).
      </div>

      <button class="complete-pay-btn" id="finalizeOrderBtn">CONFIRM & SUBMIT ORDER</button>
      <button id="backToFormBtn" style="background:transparent; border:none; color:#888; width:100%; margin-top:14px; cursor:pointer; font-size:0.85rem;">← Back to dispatch form</button>
    </div>
  `;

  // Handle fulfillment card clicks
  container.querySelectorAll('.pay-option-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.pay-option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedFulfillmentType = card.dataset.type;
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
    btn.textContent = 'DISPATCHING ORDER...';

    orderData.fulfillment = selectedFulfillmentType;
    orderData.notes = `[${selectedFulfillmentType.toUpperCase()}] ${orderData.notes || ''}`;
    orderData.deposit = deposit;
    orderData.balance = balance;

    await submitOrder(orderData);
    clearBag();
    alert('Order successfully placed! We will contact you shortly.');
    window.location.reload();
  });
}