const API_BASE = '/api';
const TOKEN_KEY = 'brg_token';
const USER_KEY = 'brg_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Stores just the token, before the user profile is known yet — used by the
// OAuth callback page, which gets a token from the redirect and then calls
// /auth/me (itself needing the token already set) to fetch the profile.
export function setTokenOnly(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function requireAuth() {
  if (!getToken()) {
    window.location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    return false;
  }
  return true;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new Error(body.message || `Yêu cầu thất bại (HTTP ${res.status})`);
  }
  return body;
}

export function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

// Deterministic pastel-ish gradient per product, so cards without real
// photography still look distinct and stable across reloads.
export function thumbGradient(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const h1 = hash % 360;
  const h2 = (h1 + 42) % 360;
  return `linear-gradient(135deg, hsl(${h1} 55% 45%), hsl(${h2} 60% 38%))`;
}

// Sets thumbnail backgrounds via the CSSOM (element.style.background = ...)
// rather than a `style="..."` HTML attribute, so it works under a CSP with
// no `style-src 'unsafe-inline'`. Call after inserting markup that contains
// `.thumb[data-thumb-name]` elements.
export function applyThumbGradients(root = document) {
  root.querySelectorAll('[data-thumb-name]').forEach((el) => {
    el.style.background = thumbGradient(el.dataset.thumbName);
  });
}

export function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function showToast(message, isError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.toggle('err', isError);
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

export const ORDER_STATUS_LABEL = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã huỷ',
};

// Whitelist of the only class names ever produced for an order's status pill,
// so an unexpected status value can never be interpolated into a class attribute.
export const ORDER_STATUS_CLASS = {
  pending: 'pill-pending',
  confirmed: 'pill-confirmed',
  shipping: 'pill-shipping',
  completed: 'pill-completed',
  cancelled: 'pill-cancelled',
};

export const PAYMENT_STATUS_LABEL = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
};

export const PAYMENT_STATUS_CLASS = {
  unpaid: 'pill-pending',
  paid: 'pill-completed',
  refunded: 'pill-shipping',
};

const RECENTLY_VIEWED_KEY = 'brg_recently_viewed';
const RECENTLY_VIEWED_MAX = 10;

// Client-side "recently viewed" — no server round-trip, no account needed.
// Stores just enough to render a product card without refetching each item.
export function pushRecentlyViewed(product) {
  const entry = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    salePrice: product.salePrice,
    categoryName: product.category?.name || null,
  };
  const list = getRecentlyViewed().filter((p) => p.id !== entry.id);
  list.unshift(entry);
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list.slice(0, RECENTLY_VIEWED_MAX)));
  } catch {
    // localStorage unavailable (private browsing, quota) — recently-viewed just won't persist.
  }
}

export function getRecentlyViewed() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export const PAYMENT_METHOD_LABEL = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản ngân hàng',
  e_wallet: 'Ví điện tử',
};

const GUEST_CART_KEY = 'brg_guest_cart';

// Client-side cart for a visitor with no account, so "add to cart" doesn't
// force a login. Mirrors the server cart's shape (productId + quantity, plus
// a price snapshot from when the item was added) so cart.js/checkout.js can
// render either source with the same code.
export function getGuestCart() {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_CART_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable (private browsing, quota) — guest cart just won't persist.
  }
}

export function addToGuestCart(product, quantity = 1) {
  const items = getGuestCart();
  const existing = items.find((i) => i.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      salePrice: product.salePrice,
      quantity,
    });
  }
  saveGuestCart(items);
  return items;
}

export function updateGuestCartItem(productId, quantity) {
  const items = getGuestCart().map((i) => (i.productId === productId ? { ...i, quantity } : i));
  saveGuestCart(items);
  return items;
}

export function removeFromGuestCart(productId) {
  const items = getGuestCart().filter((i) => i.productId !== productId);
  saveGuestCart(items);
  return items;
}

export function clearGuestCart() {
  saveGuestCart([]);
}

export function guestCartCount() {
  return getGuestCart().reduce((sum, i) => sum + i.quantity, 0);
}

// Called right after establishing a real session (email/password login,
// register, or social login) — folds whatever was in the anonymous cart into
// the account's server-side cart so a visitor never loses items just because
// they decided to log in partway through shopping.
export async function mergeGuestCartIntoAccount() {
  const items = getGuestCart();
  if (items.length === 0) return;
  for (const item of items) {
    try {
      await apiFetch('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
      });
    } catch {
      // A single stale/removed product shouldn't block merging the rest of the cart.
    }
  }
  clearGuestCart();
}

const GUEST_CHAT_TOKEN_KEY = 'brg_guest_chat_token';

// Identifies an anonymous visitor's chat conversation across page loads and
// reloads, without requiring an account — functions like a lightweight,
// chat-only session credential (see src/controllers/chat.controller.js).
export function getGuestChatToken() {
  let token = localStorage.getItem(GUEST_CHAT_TOKEN_KEY);
  if (!token) {
    token = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      localStorage.setItem(GUEST_CHAT_TOKEN_KEY, token);
    } catch {
      // localStorage unavailable — chat still works, just won't resume after a reload.
    }
  }
  return token;
}
