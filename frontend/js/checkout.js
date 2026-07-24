/* =========================================================
   checkout.js — Production-Ready Branded Botswana Checkout View
   ========================================================= */

import { submitOrder, API_BASE } from './api.js';
import { clearBag } from './store.js';

let selectedFulfillmentType = 'delivery';
let selectedPaymentMethod = 'orangemoney'; 

export function initCheckoutPage(containerId, orderData, onBack) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Inject enhanced styling for brand cards & layout
  if (!document.getElementById('checkoutBrandedStyles')) {
    const style = document.createElement('style');
    style.id = 'checkoutBrandedStyles';
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
      .pay-brand-card {
        background: #1a1a1a;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 14px;
        transition: all 0.2s ease;
      }
      .pay-brand-card:hover {
        border-color: rgba(212,175,55,0.5);
      }
      .pay-brand-card.selected {
        border-color: #d4af37;
        background: rgba(212,175,55,0.06);
        box-shadow: 0 0 12px rgba(212,175,55,0.15);
      }
      .brand-icon-box {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        background: #222;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .brand-icon-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
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
      <p style="color: #888; font-size: 0.85rem; margin-bottom: 24px;">Choose your fulfillment type and secure your 50% deposit.</p>
      
      <!-- Fulfillment Method Selection -->
      <div style="margin-bottom: 24px;">
        <label style="font-size: 0.85rem; color: #aaa; display: block; margin-bottom: 10px; font-weight: 600;">SELECT FULFILLMENT METHOD</label>
        
        <div class="pay-brand-card selected" data-group="fulfillment" data-type="delivery">
          <div class="brand-icon-box" style="background: rgba(212,175,55,0.1); color: #d4af37; font-size: 1.3rem;">🚚</div>
          <div>
            <div style="font-weight: bold; color: #fff;">Courier Delivery in Botswana</div>
            <div style="font-size: 0.8rem; color: #888; margin-top: 2px;">Direct doorstep delivery to ${orderData.customer_town}</div>
          </div>
        </div>
        
        <div class="pay-brand-card" data-group="fulfillment" data-type="pickup">
          <div class="brand-icon-box" style="background: rgba(255,255,255,0.05); color: #fff; font-size: 1.3rem;">📍</div>
          <div>
            <div style="font-weight: bold; color: #fff;">Free Store Pickup</div>
            <div style="font-size: 0.8rem; color: #888; margin-top: 2px;">Collect directly from Cotton Street collection point</div>
          </div>
        </div>
      </div>

      <!-- Payment Method Selection with Image Placeholders for ALL Options -->
      <div style="margin-bottom: 24px;">
        <label style="font-size: 0.85rem; color: #aaa; display: block; margin-bottom: 10px; font-weight: 600;">SELECT PAYMENT METHOD</label>
        
        <!-- Orange Money -->
        <div class="pay-brand-card selected" data-group="payment" data-type="orangemoney">
          <div class="brand-icon-box">
            <img src="/images/om.jpg" alt="Orange Money" onerror="this.parentElement.innerHTML='🟠'">
          </div>
          <div style="flex-grow: 1;">
            <div style="font-weight: bold; color: #fff; display: flex; justify-content: space-between;">
              <span>Orange Money</span>
              <span style="font-size: 0.75rem; background: rgba(255,121,0,0.2); color: #ff9e42; padding: 2px 6px; border-radius: 4px;">Instant</span>
            </div>
            <div style="font-size: 0.8rem; color: #888; margin-top: 2px;">Botswana mobile wallet deposit</div>
          </div>
        </div>

        <!-- MyZaka Mascom Money -->
        <div class="pay-brand-card" data-group="payment" data-type="myzaka">
          <div class="brand-icon-box">
            <img src="/images/myzaka.jpg" alt="MyZaka" onerror="this.parentElement.innerHTML='🔵'">
          </div>
          <div style="flex-grow: 1;">
            <div style="font-weight: bold; color: #fff; display: flex; justify-content: space-between;">
              <span>MyZaka (Mascom)</span>
              <span style="font-size: 0.75rem; background: rgba(255,204,0,0.15); color: #ffd633; padding: 2px 6px; border-radius: 4px;">Popular</span>
            </div>
            <div style="font-size: 0.8rem; color: #888; margin-top: 2px;">Mascom mobile money transfer</div>
          </div>
        </div>

        <!-- FNB Bank -->
        <div class="pay-brand-card" data-group="payment" data-type="fnb">
          <div class="brand-icon-box">
            <img src="/images/images.jpg" alt="FNB" onerror="this.parentElement.innerHTML='FNB'">
          </div>
          <div style="flex-grow: 1;">
            <div style="font-weight: bold; color: #fff;">First National Bank (FNB Botswana)</div>
            <div style="font-size: 0.8rem; color: #888; margin-top: 2px;">Direct bank transfer or FNB App payment</div>
          </div>
        </div>

        <!-- Absa Bank -->
        <div class="pay-brand-card" data-group="payment" data-type="absa">
          <div class="brand-icon-box">
            <img src="/images/absa.png" alt="Absa" onerror="this.parentElement.innerHTML='ABSA'">
          </div>
          <div style="flex-grow: 1;">
            <div style="font-weight: bold; color: #fff;">Absa Bank Botswana</div>
            <div style="font-size: 0.8rem; color: #888; margin-top: 2px;">Direct bank deposit or card gateway</div>
          </div>
        </div>
      </div>

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

  // Render success screen with receipt generation
  function renderSuccessView(orderRef, methodTitle) {
    container.innerHTML = `
      <div class="checkout-page-container" style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 3rem; margin-bottom: 12px;">✅</div>
        <h2 style="color:#d4af37; margin-bottom: 8px; font-size: 1.5rem;">ORDER PLACED SUCCESSFULLY!</h2>
        <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 24px;">Your order has been logged. Please complete your transfer to finalize dispatch.</p>
        
        <div style="background: #181818; text-align: left; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.06); font-size: 0.9rem; line-height: 1.6;">
          <div style="margin-bottom: 6px;"><span style="color: #888;">Order Reference:</span> <strong style="color: #fff;">#${orderRef}</strong></div>
          <div style="margin-bottom: 6px;"><span style="color: #888;">Payment Gateway:</span> <strong style="color: #fff;">${methodTitle}</strong></div>
          <div style="margin-bottom: 6px;"><span style="color: #888;">50% Deposit Due:</span> <strong style="color: #d4af37;">P${deposit.toLocaleString()}</strong></div>
          <div style="margin-bottom: 6px;"><span style="color: #888;">Balance Due on ${selectedFulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}:</span> <strong style="color: #fff;">P${balance.toLocaleString()}</strong></div>
        </div>

        <button id="downloadReceiptBtn" class="complete-pay-btn" style="margin-bottom: 12px;">📥 DOWNLOAD OFFICIAL DEPOSIT RECEIPT (PDF)</button>
        <button id="returnStoreBtn" style="background: transparent; border: 1px solid #444; color: #ccc; width: 100%; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Return to Store</button>
      </div>
    `;

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
            payment_method: methodTitle,
            fulfillment: selectedFulfillmentType
          })
        });

        if (receiptRes.ok) {
          const blob = await receiptRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `CottonStreet-Receipt-${orderRef}.pdf`;
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

    container.querySelector('#returnStoreBtn').addEventListener('click', () => {
      clearBag();
      window.location.reload();
    });
  }

  // Handle card click states & dynamic instructions
  container.querySelectorAll('.pay-brand-card').forEach(card => {
    card.addEventListener('click', () => {
      const group = card.dataset.group;
      container.querySelectorAll(`.pay-brand-card[data-group="${group}"]`).forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      if (group === 'fulfillment') {
        selectedFulfillmentType = card.dataset.type;
      } else if (group === 'payment') {
        selectedPaymentMethod = card.dataset.type;
        const infoBox = container.querySelector('#paymentInstructionsBox');

        if (selectedPaymentMethod === 'orangemoney') {
          infoBox.innerHTML = `
            <strong>Orange Money Instructions:</strong><br>
            Send your 50% deposit (<strong>P${deposit.toLocaleString()}</strong>) to Orange Money Number: <span style="color:#d4af37; font-weight:bold;">+267 78 637 243</span> (Cotton Street Apparel). Keep your transaction SMS or screenshot as proof.
          `;
        } else if (selectedPaymentMethod === 'myzaka') {
          infoBox.innerHTML = `
            <strong>MyZaka (Mascom) Instructions:</strong><br>
            Send your 50% deposit (<strong>P${deposit.toLocaleString()}</strong>) to MyZaka Number: <span style="color:#d4af37; font-weight:bold;">+267 71 234 567</span> (Cotton Street Apparel). Reference your name during transfer.
          `;
        } else if (selectedPaymentMethod === 'fnb') {
          infoBox.innerHTML = `
            <strong>FNB Botswana Payment Instructions:</strong><br>
            Transfer your 50% deposit (<strong>P${deposit.toLocaleString()}</strong>) to FNB Account: <span style="color:#d4af37; font-weight:bold;">62800012345</span> (Branch Code: 281467 - Cotton Street). Use your order reference as proof.
          `;
        } else if (selectedPaymentMethod === 'absa') {
          infoBox.innerHTML = `
            <strong>Absa Bank Botswana Payment Instructions:</strong><br>
            Transfer your 50% deposit (<strong>P${deposit.toLocaleString()}</strong>) to Absa Account: <span style="color:#d4af37; font-weight:bold;">4012345678</span> (Cotton Street Apparel). Keep your receipt slip or confirmation.
          `;
        }
      }
    });
  });

  container.querySelector('#backToFormBtn').addEventListener('click', () => {
    if (typeof onBack === 'function') onBack();
  });

  // Handle final order submission
  container.querySelector('#finalizeOrderBtn').addEventListener('click', async () => {
    const btn = container.querySelector('#finalizeOrderBtn');
    btn.disabled = true;
    btn.textContent = 'LOGGING ORDER...';

    const generatedOrderRef = Math.floor(100000 + Math.random() * 900000).toString();
    const methodNames = {
      orangemoney: 'Orange Money (Botswana)',
      myzaka: 'MyZaka (Mascom)',
      fnb: 'FNB Botswana',
      absa: 'Absa Bank Botswana'
    };
    const activeMethodName = methodNames[selectedPaymentMethod] || 'Local Payment';

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
      renderSuccessView(generatedOrderRef, activeMethodName);
    } catch (err) {
      console.error('Order submission failed:', err);
      alert('Order submission failed: ' + (err.message || 'Please try again.'));
      btn.disabled = false;
      btn.textContent = 'CONFIRM & SUBMIT ORDER';
    }
  });
}