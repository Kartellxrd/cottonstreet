/* =========================================================
   store.js — bag state (persists across page scrolls via sessionStorage)
   ========================================================= */

const BAG_KEY = 'cs_bag';

function loadBag() {
  try {
    return JSON.parse(sessionStorage.getItem(BAG_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBag(bag) {
  sessionStorage.setItem(BAG_KEY, JSON.stringify(bag));
}

/* Bag array — each item: { id, name, variant, price, img, qty } */
let _bag = loadBag();

/* Subscribers — call renderBag() when bag changes */
const _subscribers = [];

function notify() {
  saveBag(_bag);
  _subscribers.forEach(fn => fn([..._bag]));
}

export function subscribe(fn) {
  _subscribers.push(fn);
  fn([..._bag]); // immediate call with current state
}

export function getBag() {
  return [..._bag];
}

export function addItem({ id, name, variant, price, img }) {
  const existing = _bag.find(b => b.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    _bag.push({ id, name, variant: variant || '', price: Number(price) || 0, img: img || '', qty: 1 });
  }
  notify();
}

export function removeItem(id) {
  _bag = _bag.filter(b => b.id !== id);
  notify();
}

export function clearBag() {
  _bag = [];
  notify();
}

export function getTotal() {
  return _bag.reduce((sum, b) => sum + b.price * b.qty, 0);
}


export function getCount() {
  return _bag.reduce((sum, b) => sum + b.qty, 0);
}