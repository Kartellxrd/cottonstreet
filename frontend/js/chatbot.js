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
      reply += "Drop us a message on WhatsApp to check our exact live phone inventory and battery health percentages!";
    }
    return reply + "\n\n💡 *Tip: Tap 'WhatsApp Us' or add a phone to your bag to request pictures!*";
  }

  // 3. SNEAKERS & BRANDS (Nike, Adidas, New Balance, Vans, Converse, Puma, Lacoste)
  if (msg.match(/(sneaker|shoe|boot|nike|adidas|nb|new balance|vans|converse|puma|lacoste|slides)/)) {
    const matchingShoes = products.filter(p => {
      const txt = (p.name + ' ' + (p.category || '')).toLowerCase();
      return txt.match(/(sneaker|shoe|boot|nike|adidas|new balance|vans|converse|puma|lacoste|slides)/);
    });

    let reply = "👟 **Sneakers & Footwear:** We have the freshest kicks in Gaborone! From classic Nike and Adidas to New Balance, Vans, Converse, Puma, and Lacoste slides/boots.\n\n";
    if (matchingShoes.length > 0) {
      reply += "Available right now:\n" + matchingShoes.slice(0, 5).map(p => `• ${p.name} — P${Number(p.price).toLocaleString()}`).join('\n');
    } else {
      reply += "Check out our dynamic stock lists above or ask us for your specific size via WhatsApp!";
    }
    return reply;
  }

  // 4. CLOTHING COLLECTIONS (Winter, Gym, Football, Caps, Bags, Underwear)
  if (msg.match(/(winter|jacket|hoodie|gym|workout|jersey|football|soccer|cap|bag|glove|underwear|clothes|clothing)/)) {
    return "👕 **Apparel & Collections:** We've got you covered across all seasons! Check out our:\n• ❄️ Winter Collection (Warm hoodies & jackets)\n• ⚽ Football Clothing & Soccer Boots\n• 🏋️‍♂️ Gym & Workout gear\n• 🧢 Accessories: Caps, Bags, Gloves, and Premium Underwear.\n\nScroll through our category tabs right on the homepage to view everything!";
  }

  // 5. DELIVERY & LOCATION
  if (msg.includes('deliver') || msg.includes('ship') || msg.includes('location') || msg.includes('where') || msg.includes('gaborone') || msg.includes('francistown')) {
    return "🚚 **Delivery Info:**\n• **Gaborone:** Free delivery within 24 hours!\n• **Rest of Botswana:** Quick delivery arranged anywhere across the country.\n• **Payment:** Cash on delivery or immediate EFT. No online card details needed!";
  }

  // 6. HOW TO BUY / ORDER
  if (msg.includes('buy') || msg.includes('order') || msg.includes('price') || msg.includes('how much')) {
    return "🛍️ **How to Order:**\n1. Add your favorite items and sizes to your shopping bag here on the website.\n2. Open your bag and hit checkout.\n3. Your bag info automatically formats into a WhatsApp message so you can finalize your deal with us instantly!";
  }

  // 7. DEFAULT FALLBACK
  return "✨ I want to make sure you get exactly what you need! For instant stock confirmation, custom sizing, or to send pictures from our catalog, tap **WhatsApp Us** below — we respond in minutes! 📱";
}

/* ---- Core Frontend UI Mechanics ---- */

async function askClaude(userMessage) {
  // We mimic an async network delay so it feels like a real high-end AI thinking!
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
    appendMessage('bot', 'Something went wrong. Tap the WhatsApp icon to talk directly with us!');
  } finally {
    setSendDisabled(false);
    document.getElementById('chatInput')?.focus();
  }
}

export function initChatbot() {
  const bubble = document.createElement('button');
  bubble.id        = 'chatBubble';
  bubble.className = 'chat-bubble';
  bubble.setAttribute('aria-label', 'Open chat assistant');
  bubble.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.049 22l4.974-1.355A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.953 7.953 0 01-4.073-1.116l-.292-.174-3.044.83.858-3.006-.19-.31A7.951 7.951 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/>
      <circle cx="8.5" cy="12" r="1.25"/><circle cx="12" cy="12" r="1.25"/><circle cx="15.5" cy="12" r="1.25"/>
    </svg>`;
  bubble.addEventListener('click', toggleChat);

  const panel = document.createElement('div');
  panel.id        = 'chatPanel';
  panel.className = 'chat-panel';
  panel.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-info">
        <div class="chat-avatar">CS</div>
        <div>
          <div class="chat-title">Cotton Street Assistant</div>
          <div class="chat-status">Online · Free Support</div>
        </div>
      </div>
      <button class="chat-close" onclick="window.__csChat.toggle()" aria-label="Close chat">✕</button>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
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