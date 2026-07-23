/* =========================================================
   chatbot.js — Free Autonomous Shopping Assistant
   Runs 100% locally in the browser — Zero API Costs Forever!
   ========================================================= */

import { getProducts } from './products.js';

const WHATSAPP_NUMBER = '26776707364';
let _isOpen = false;

/* ---- Local Keyword Bot Engine ---- */
function generateBotResponse(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  const products = getProducts();

  // 1. GREETINGS
  if (msg.match(/\b(hi|hello|hey|dumelang|ola|yo)\b/)) {
    return "Hey! 👋 Welcome to Cotton Street. I'm your virtual shopping assistant. Ask me about our iPhones, sneakers, streetwear, or delivery details! What are you looking for today?";
  }

  // 2. IPHONES & SAMSUNG (ELECTRONICS)
  if (msg.includes('iphone') || msg.includes('phone') || msg.includes('samsung') || msg.includes('galaxy') || msg.includes('s series')) {
    const phones = products.filter(p => {
      const name = p.name.toLowerCase();
      return name.includes('iphone') || name.includes('samsung') || name.includes('galaxy');
    });

    let reply = "📱 **Phones & Electronics:** We stock authentic Apple iPhones (from iPhone 7 Plus up to the latest models) and Samsung S-Series devices!\n\n";
    if (phones.length > 0) {
      reply += "Current items in stock:\n" + phones.map(p => `• ${p.name} — P${Number(p.price).toLocaleString()}`).join('\n');
    } else {
      reply += "Check out our live catalog above to see all currently available electronics!";
    }
    return reply + "\n\n💡 *Tip: Add items to your bag and fill out our checkout form to place your order instantly!*";
  }

  // 3. SNEAKERS & BRANDS (Nike, Adidas, New Balance, Vans, Converse, Puma, Lacoste)
  if (msg.match(/(sneaker|shoe|boot|nike|adidas|nb|new balance|vans|converse|puma|lacoste|slides)/)) {
    const matchingShoes = products.filter(p => {
      const categorySlug = p.categories?.slug || '';
      const txt = (p.name + ' ' + categorySlug).toLowerCase();
      return txt.match(/(sneaker|shoe|boot|nike|adidas|new balance|vans|converse|puma|lacoste|slides)/);
    });

    let reply = "👟 **Sneakers & Footwear:** We have the freshest kicks in Gaborone! From classic Nike and Adidas to New Balance, Vans, Converse, Puma, and Lacoste slides/boots.\n\n";
    if (matchingShoes.length > 0) {
      reply += "Available right now:\n" + matchingShoes.slice(0, 5).map(p => `• ${p.name} — P${Number(p.price).toLocaleString()}`).join('\n');
    } else {
      reply += "Check out our dynamic stock lists above to find your exact size and style!";
    }
    return reply + "\n\n💡 *Tip: Add items to your bag and fill out our checkout form to place your order instantly!*";
  }

  // 4. CLOTHING COLLECTIONS (Winter, Gym, Football, Caps, Bags, Underwear)
  if (msg.match(/(winter|jacket|hoodie|gym|workout|jersey|football|soccer|cap|bag|glove|underwear|clothes|clothing)/)) {
    return "👕 **Apparel & Collections:** We've got you covered across all seasons! Check out our:\n• ❄️ Winter Collection (Warm hoodies & jackets)\n• ⚽ Football Clothing & Soccer Boots\n• 🏋️‍♂️ Gym & Workout gear\n• 🧢 Accessories: Caps, Bags, Gloves, and Premium Underwear.\n\nScroll through our category tabs right on the homepage to view everything!\n\n💡 *Tip: Add items to your bag and fill out our checkout form to place your order instantly!*";
  }

  // 5. DELIVERY & LOCATION
  if (msg.includes('deliver') || msg.includes('ship') || msg.includes('location') || msg.includes('where') || msg.includes('gaborone') || msg.includes('francistown')) {
    return "🚚 **Delivery Info:**\n• **Gaborone:** Free delivery within 24 hours!\n• **Rest of Botswana:** Quick delivery arranged anywhere across the country.\n• **Payment:** Secure order processing directly through our system!";
  }

  // 6. HOW TO BUY / ORDER
  if (msg.includes('buy') || msg.includes('order') || msg.includes('price') || msg.includes('how much')) {
    return "🛍️ **How to Order:**\n1. Add your favorite items and sizes to your shopping bag here on the website.\n2. Open your bag drawer and click checkout.\n3. Fill out your details in our system form to submit your order seamlessly!";
  }

  // 7. DEFAULT FALLBACK
  return "✨ I want to make sure you get exactly what you need! Browse our full catalog above or add items straight to your bag to place an order.\n\n💡 *Tip: Add items to your bag and fill out our checkout form to place your order instantly!*";
}

/* ---- Core Frontend UI Mechanics ---- */

async function askClaude(userMessage) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const reply = generateBotResponse(userMessage);
      resolve(reply);
    }, 600);
  });
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

function appendMessage(role, text) {
  const body = document.getElementById('chatBody');
  if (!body) return;
  const div  = document.createElement('div');
  div.className = `chat-msg chat-${role}`;
  const html = esc(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function setTyping(show) {
  const el = document.getElementById('chatTyping');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function setSendDisabled(disabled) {
  const btn = document.getElementById('chatSend');
  const inp = document.getElementById('chatInput');
  if (btn) btn.disabled = disabled;
  if (inp) inp.disabled = disabled;
}

export function toggleChat() {
  _isOpen = !_isOpen;
  const panel = document.getElementById('chatPanel');
  const bubble = document.getElementById('chatBubble');
  if (panel)  panel.classList.toggle('open', _isOpen);
  if (bubble) bubble.classList.toggle('active', _isOpen);
  if (_isOpen && document.querySelectorAll('.chat-msg').length === 0) {
    appendMessage('bot', "Hey! 👋 I'm the Cotton Street assistant. Ask me about any product, prices, delivery, or collections — I've got you.");
  }
  if (_isOpen) {
    setTimeout(() => document.getElementById('chatInput')?.focus(), 300);
  }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text  = input?.value.trim();
  if (!text) return;

  input.value = '';
  appendMessage('user', text);
  setTyping(true);
  setSendDisabled(true);

  try {
    const reply = await askClaude(text);
    setTyping(false);
    appendMessage('bot', reply);
  } catch (err) {
    setTyping(false);
    appendMessage('bot', 'Something went wrong. Please try typing your message again!');
  } finally {
    setSendDisabled(false);
    document.getElementById('chatInput')?.focus();
  }
}

export function initChatbot() {
  // Create chatbot toggle button fixed securely at the bottom right corner
  const bubble = document.createElement('button');
  bubble.id        = 'chatBubble';
  bubble.className = 'chat-bubble';
  bubble.setAttribute('aria-label', 'Open chat assistant');
  bubble.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    background: #d4af37;
    color: #000;
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    transition: transform 0.2s ease, background 0.2s ease;
  `;
  bubble.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.049 22l4.974-1.355A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.953 7.953 0 01-4.073-1.116l-.292-.174-3.044.83.858-3.006-.19-.31A7.951 7.951 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/>
      <circle cx="8.5" cy="12" r="1.25"/><circle cx="12" cy="12" r="1.25"/><circle cx="15.5" cy="12" r="1.25"/>
    </svg>`;
  bubble.addEventListener('click', toggleChat);

  // Create chat container panel fixed at bottom right corner above the button
  const panel = document.createElement('div');
  panel.id        = 'chatPanel';
  panel.className = 'chat-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 92px;
    right: 24px;
    width: 360px;
    max-width: calc(100vw - 48px);
    height: 480px;
    max-height: calc(100vh - 120px);
    background: #0d0d0d;
    color: #fff;
    border: 1px solid rgba(212, 175, 55, 0.3);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    z-index: 9998;
    display: none;
    flex-direction: column;
    overflow: hidden;
    font-family: inherit;
  `;

  // Add open class handler support for styles if toggled
  const styleTag = document.createElement('style');
  styleTag.innerHTML = `
    #chatPanel.open { display: flex !important; }
    .chat-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #111; }
    .chat-msg { padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; max-width: 85%; line-height: 1.4; }
    .chat-bot { background: #1a1a1a; color: #fff; border: 1px solid rgba(212,175,55,0.2); align-self: flex-start; }
    .chat-user { background: #d4af37; color: #000; align-self: flex-end; font-weight: 500; }
    .chat-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px; background: #141414; border-top: 1px solid rgba(255,255,255,0.06); }
    .chat-chip { background: #1e1e1e; border: 1px solid rgba(212,175,55,0.3); color: #d4af37; padding: 4px 10px; font-size: 0.75rem; border-radius: 16px; cursor: pointer !important; transition: all 0.2s; }
    .chat-chip:hover { background: #d4af37; color: #000; }
    .chat-input-row { display: flex; padding: 10px 12px; background: #141414; border-top: 1px solid rgba(255,255,255,0.08); gap: 8px; align-items: center; }
    .chat-input { flex: 1; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; outline: none; }
    .chat-input:focus { border-color: #d4af37; }
    .chat-send { background: #d4af37; color: #000; border: none; width: 36px; height: 36px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer !important; }
  `;
  document.head.appendChild(styleTag);

  panel.innerHTML = `
    <div class="chat-header" style="background:#141414; padding:12px 16px; border-bottom:1px solid rgba(212,175,55,0.2); display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="background:rgba(212,175,55,0.1); border:1px solid #d4af37; color:#d4af37; width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.85rem;">CS</div>
        <div>
          <div style="font-weight:600; font-size:0.9rem; color:#fff;">Cotton Street Assistant</div>
          <div style="font-size:0.7rem; color:#888;">Online · Free Support</div>
        </div>
      </div>
      <button class="chat-close" onclick="window.__csChat.toggle()" aria-label="Close chat" style="background:transparent; border:1px solid rgba(255,255,255,0.2); color:#fff; width:28px; height:28px; border-radius:4px; cursor:pointer !important; display:flex; align-items:center; justify-content:center;">✕</button>
    </div>
    <div class="chat-body" id="chatBody">
      <div id="chatTyping" class="chat-typing" style="display:none">
        <span></span><span></span><span></span>
      </div>
    </div>
    <div class="chat-footer">
      <div class="chat-suggestions" id="chatSuggestions">
        <button class="chat-chip" data-msg="What iPhones do you have?">iPhones 📱</button>
        <button class="chat-chip" data-msg="Do you deliver outside Gaborone?">Delivery 🚚</button>
        <button class="chat-chip" data-msg="Show me clothing options">Clothing 👕</button>
      </div>
      <div class="chat-input-row">
        <input type="text" id="chatInput" class="chat-input" placeholder="Ask me anything…" autocomplete="off" maxlength="400">
        <button id="chatSend" class="chat-send" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>`;

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  document.getElementById('chatSend').addEventListener('click', sendMessage);
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('chatSuggestions').addEventListener('click', e => {
    const chip = e.target.closest('.chat-chip');
    if (!chip) return;
    document.getElementById('chatInput').value = chip.dataset.msg;
    sendMessage();
    document.getElementById('chatSuggestions').style.display = 'none';
  });

  window.__csChat = { toggle: toggleChat };
}