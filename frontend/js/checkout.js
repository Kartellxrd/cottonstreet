/* =========================================================
   checkout.js — Dedicated Checkout & Payment Page View (Embedded Stripe Checkout)
   ========================================================= */

import { submitOrder, API_BASE } from './api.js';
import { clearBag } from './store.js';

let selectedFulfillmentType = 'delivery';
let selectedPaymentMethod = 'orangemoney'; 
let stripeInstance = null;
let embeddedCheckout = null;

export function initCheckoutPage(containerId, orderData, onBack) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Inject styles if not present
  if (!document.getElementById('checkoutPageViewStyles')) {
    const style = document.createElement('style');
    style.id = 'checkoutPageViewStyles';
    style.innerHTML = `
      .checkout-page-container {
        max-width: 650px;
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
          <div style="font-weight: bold; color: #fff;">💳 Credit / Debit Card (Official Stripe Checkout)</div>
          <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">Loads the professional embedded Stripe layout on-page</div>
        </div>
      </div>

      <!-- Stripe Embedded Checkout Container (Hidden by default) -->
      <div id="checkout" style="display: none; margin-bottom: 24px; min-height: 350px;"></div>

      <!-- Financial Breakdown -->
      <div id="financialBreakdownBox" style="background: #181818; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.06);">
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

  // Helper function to show a polished success card view with a fully functional PDF receipt downloader
  function renderSuccessView(orderRef, method) {
    container.innerHTML = `
      <div class="checkout-page-container" style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 3rem; margin-bottom: 12px;">✅</div>
        <h2 style="color:#d4af37; margin-bottom: 8px; font-size: 1.5rem;">ORDER PLACED SUCCESSFULLY!</h2>
        <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 24px;">Your order has been queued and is now being processed by Cotton Street Apparel.</p>
        
        <div style="background: #181818; text-align: left; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.06); font-size: 0.9rem; line-height: 1.6;">
          <div style="margin-bottom: 6px;"><span style="color: #888;">Order Reference:</span> <strong style="color: #fff;">#${orderRef}</strong></div>
          <div style="margin-bottom: 6px;"><span style="color: #888;">Payment Method:</span> <strong style="color: #fff;">${method.toUpperCase()}</strong></div>
          <div style="margin-bottom: 6px;"><span style="color: #888;">50% Deposit Settled:</span> <strong style="color: #d4af37;">P${deposit.toLocaleString()}</strong></div>
          <div style="margin-bottom: 6px;"><span style="color: #888;">Balance Due on ${selectedFulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}:</span> <strong style="color: #fff;">P${balance.toLocaleString()}</strong></div>
        </div>

        <div style="background: rgba(212,175,55,0.08); padding: 14px; border-radius: 6px; border: 1px solid rgba(212,175,55,0.3); font-size: 0.85rem; color: #ddd; margin-bottom: 24px; line-height: 1.5;">
          ℹ️ <strong>Next Steps:</strong> The remaining balance of <strong>P${balance.toLocaleString()}</strong> will be fulfilled right before your apparel is delivered or collected.
        </div>

        <button id="downloadReceiptBtn" class="complete-pay-btn" style="margin-bottom: 12px;">📥 DOWNLOAD OFFICIAL DEPOSIT RECEIPT (PDF)</button>
        <button id="returnStoreBtn" style="background: transparent; border: 1px solid #444; color: #ccc; width: 100%; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Return to Store</button>
      </div>
    `;

    // Handle PDF Receipt Download button click
    container.querySelector('#downloadReceiptBtn').addEventListener('click', async () => {
      try {
        const receiptRes = await fetch(`${API_BASE}/receipts/download-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderRef,
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            customer_town: orderData.customer_town,
            items: orderData.items || orderData.items_json || [],
            total: orderData.total,
            deposit: deposit,
            balance: balance,
            payment_method: method,
            fulfillment: selectedFulfillmentType
          })
        });

        if (receiptRes.ok) {
          const blob = await receiptRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Receipt-${orderRef}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          alert('Could not generate receipt PDF.');
        }
      } catch (err) {
        console.error('Receipt download error:', err);
        alert('Error downloading receipt.');
      }
    });

    // Handle return to store button
    container.querySelector('#returnStoreBtn').addEventListener('click', () => {
      clearBag();
      window.location.reload();
    });
  }

  // Mount Stripe Embedded Checkout Session
  async function mountEmbeddedStripeCheckout() {
    const checkoutDiv = container.querySelector('#checkout');
    checkoutDiv.style.display = 'block';
    container.querySelector('#financialBreakdownBox').style.display = 'none';
    container.querySelector('#paymentInstructionsBox').style.display = 'none';
    container.querySelector('#finalizeOrderBtn').style.display = 'none';

    if (typeof Stripe === 'undefined') {
      alert('Stripe library script is not loaded in your HTML header. Please add <script src="https://js.stripe.com/v3/"></script>');
      return;
    }

    if (!stripeInstance) {
      stripeInstance = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx'); 
    }

    try {
      const response = await fetch(`${API_BASE}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: orderData.total,
          deposit_amount: deposit,
          customer_name: orderData.customer_name,
          customer_email: orderData.customer_email || ''
        })
      });
      
      const result = await response.json();
      if (!result.clientSecret) {
        throw new Error(result.detail || 'Could not initialize Stripe checkout session.');
      }

      embeddedCheckout = await stripeInstance.initEmbeddedCheckout({
        clientSecret: result.clientSecret,
      });

      embeddedCheckout.mount('#checkout');
    } catch (err) {
      alert('Checkout Error: ' + err.message);
    }
  }

  // Automatically trigger card view if card option is pre-selected or click listener handles it
  container.querySelectorAll('.pay-option-card').forEach(card => {
    card.addEventListener('click', async () => {
      const group = card.dataset.group;
      container.querySelectorAll(`.pay-option-card[data-group="${group}"]`).forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      if (group === 'fulfillment') {
        selectedFulfillmentType = card.dataset.type;
      } else if (group === 'payment') {
        selectedPaymentMethod = card.dataset.type;
        const infoBox = container.querySelector('#paymentInstructionsBox');
        const checkoutDiv = container.querySelector('#checkout');
        const submitBtn = container.querySelector('#finalizeOrderBtn');
        const breakdownBox = container.querySelector('#financialBreakdownBox');

        if (selectedPaymentMethod === 'orangemoney') {
          if (embeddedCheckout) {
            embeddedCheckout.destroy();
            embeddedCheckout = null;
          }
          checkoutDiv.style.display = 'none';
          breakdownBox.style.display = 'block';
          infoBox.style.display = 'block';
          submitBtn.style.display = 'block';
          infoBox.innerHTML = `
            <strong>Orange Money Instructions:</strong><br>
            Send your 50% deposit (<strong>P${deposit.toLocaleString()}</strong>) to Orange Money Number: <span style="color:#d4af37; font-weight:bold;">+267 78 637 243</span> (Cotton Street Apparel). Keep your transaction SMS or screenshot as proof.
          `;
        } else {
          await mountEmbeddedStripeCheckout();
        }
      }
    });
  });

  // Handle back button
  container.querySelector('#backToFormBtn').addEventListener('click', () => {
    if (typeof onBack === 'function') onBack();
  });

  // Handle manual order submission (Orange Money fallback)
  container.querySelector('#finalizeOrderBtn').addEventListener('click', async () => {
    const btn = container.querySelector('#finalizeOrderBtn');
    btn.disabled = true;
    btn.textContent = 'PROCESSING ORDER...';

    const generatedOrderRef = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Explicitly package payload ensuring items are passed under both aliases for backend compatibility
    const payload = {
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      customer_town: orderData.customer_town,
      items: orderData.items || orderData.items_json || [],
      items_json: orderData.items || orderData.items_json || [],
      total: orderData.total,
      deposit: deposit,
      balance: balance,
      fulfillment: selectedFulfillmentType,
      payment_method: selectedPaymentMethod,
      notes: `[${selectedFulfillmentType.toUpperCase()}] [PAY: ${selectedPaymentMethod.toUpperCase()}] ${orderData.notes || ''}`
    };

    try {
      await submitOrder(payload);
      renderSuccessView(generatedOrderRef, 'orangemoney');
    } catch (err) {
      console.error('Order submission failed:', err);
      alert('Order submission failed: ' + (err.message || 'Please try again.'));
      btn.disabled = false;
      btn.textContent = 'CONFIRM & SUBMIT ORDER';
    }
  });

  // If the user lands or clicks on card mode straight away, load it
  if (selectedPaymentMethod === 'card') {
    mountEmbeddedStripeCheckout();
  }
}