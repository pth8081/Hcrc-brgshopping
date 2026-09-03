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

export const PAYMENT_METHOD_LABEL = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản ngân hàng',
  e_wallet: 'Ví điện tử',
};
