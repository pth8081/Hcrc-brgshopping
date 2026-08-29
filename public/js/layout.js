import { getUser, clearSession, apiFetch, getToken } from './api.js';

export async function renderLayout({ activeCategoryId } = {}) {
  const user = getUser();
  const params = new URLSearchParams(location.search);

  document.getElementById('site-header').innerHTML = `
    <div class="topbar">
      <div class="wrap topbar-inner">
        <span>Miễn phí vận chuyển cho đơn từ 500.000₫</span>
        <div class="topbar-links">
          ${
            user
              ? `<span>Xin chào, <strong>${escapeHtml(user.fullName)}</strong></span>
                 <a href="/orders.html">Đơn hàng của tôi</a>
                 ${user.role === 'admin' ? '<a href="/admin.html" class="pill pill-admin" style="padding:3px 9px;">Quản trị</a>' : ''}
                 <a href="#" id="logout-link">Đăng xuất</a>`
              : `<a href="/login.html">Đăng nhập</a><a href="/register.html">Đăng ký</a>`
          }
        </div>
      </div>
    </div>
    <div class="navbar">
      <div class="navbar-inner">
        <a class="logo" href="/index.html">BRG<span>Shopping</span></a>
        <form class="search" id="search-form">
          <input type="search" name="q" placeholder="Tìm sản phẩm..." value="${escapeHtml(params.get('q') || '')}">
          <button type="submit" aria-label="Tìm kiếm">🔍</button>
        </form>
        <a class="cart-link" href="/cart.html">
          🛒 Giỏ hàng <span id="cart-count" class="cart-count">0</span>
        </a>
      </div>
    </div>
    <div class="catnav"><div class="wrap catnav-inner" id="catnav"></div></div>
  `;

  document.getElementById('site-footer').innerHTML = `
    <div class="wrap">
      <div>
        <strong>BRG Shopping</strong>
        Bản demo giao diện — Node.js + Express + MSSQL.
      </div>
      <div>
        <strong>Hỗ trợ khách hàng</strong>
        1900 0000 · cskh@brgshopping.demo
      </div>
      <div>
        <strong>Thanh toán</strong>
        COD · Chuyển khoản · Ví điện tử
      </div>
    </div>
  `;

  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get('q');
    window.location.href = `/index.html${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  });

  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = '/index.html';
    });
  }

  loadCategoryNav(activeCategoryId);
  refreshCartCount();
}

async function loadCategoryNav(activeCategoryId) {
  const nav = document.getElementById('catnav');
  try {
    const { data } = await apiFetch('/categories');
    const items = [`<a href="/index.html" class="${!activeCategoryId ? 'active' : ''}">Tất cả sản phẩm</a>`]
      .concat(
        data.map(
          (c) =>
            `<a href="/index.html?category=${c.id}" class="${String(activeCategoryId) === String(c.id) ? 'active' : ''}">${escapeHtml(c.name)}</a>`
        )
      );
    nav.innerHTML = items.join('');
  } catch {
    nav.innerHTML = '';
  }
}

export async function refreshCartCount() {
  const el = document.getElementById('cart-count');
  if (!el) return;
  if (!getToken()) {
    el.textContent = '0';
    return;
  }
  try {
    const { data } = await apiFetch('/cart');
    const count = data.items.reduce((sum, item) => sum + item.quantity, 0);
    el.textContent = String(count);
  } catch {
    el.textContent = '0';
  }
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
