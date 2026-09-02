import { getUser, clearSession, apiFetch, getToken, showToast } from './api.js';
import { categoryIcon } from './icons.js';

const ICON = {
  hamburger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2l2.2 12.2a2 2 0 0 0 2 1.65h8.3a2 2 0 0 0 2-1.6L21 8H6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.5-4.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4V5z"/></svg>',
};

const STATIC_LINKS = [
  { label: 'Về BRG Shopping', slug: 've-chung-toi' },
  { label: 'Khuyến mãi', slug: 'khuyen-mai' },
  { label: 'Thẻ thành viên', slug: 'the-thanh-vien' },
  { label: 'Tuyển dụng', slug: 'tuyen-dung' },
  { label: 'Tin tức', slug: 'tin-tuc' },
  { label: 'Liên hệ', slug: 'lien-he' },
];

export async function renderLayout({ activeCategoryId } = {}) {
  const user = getUser();

  document.getElementById('site-header').innerHTML = `
    <div class="navbar">
      <div class="navbar-inner">
        <button class="icon-btn" id="drawer-open" aria-label="Mở menu">${ICON.hamburger}</button>
        <a class="logo" href="/index.html">${ICON.bag}BRG<span>Shopping</span></a>
        <div class="nav-icons">
          <button class="icon-btn" id="bell-btn" aria-label="Thông báo">${ICON.bell}</button>
          <button class="icon-btn" id="search-btn" aria-label="Tìm kiếm">${ICON.search}</button>
          <a class="icon-btn cart-badge" href="/cart.html" aria-label="Giỏ hàng">${ICON.cart}<span class="count" id="cart-count">0</span></a>
        </div>
      </div>
      <div class="searchbar" id="searchbar">
        <form id="search-form">
          <input type="search" name="q" placeholder="Tìm sản phẩm, danh mục...">
          <button type="submit" aria-label="Tìm kiếm">${ICON.search}</button>
        </form>
      </div>
    </div>

    <div class="drawer-overlay" id="drawer-overlay"></div>
    <aside class="drawer" id="drawer">
      <div class="drawer-head">
        <div>
          <div class="who">${user ? escapeHtml(user.fullName) : 'Xin chào 👋'}</div>
          <div class="sub">${user ? (user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng thân thiết') : 'Đăng nhập để mua sắm dễ dàng hơn'}</div>
        </div>
        <button class="drawer-close" id="drawer-close" aria-label="Đóng menu">${ICON.close}</button>
      </div>
      <nav id="drawer-categories"></nav>
      <div class="static-links">
        ${STATIC_LINKS.map((l) => `<a href="/page.html?slug=${l.slug}">${escapeHtml(l.label).toUpperCase()}</a>`).join('')}
      </div>
      <div class="drawer-auth">
        ${
          user
            ? `<div class="row"><a href="/orders.html">Đơn hàng của tôi</a></div>
               ${user.role === 'admin' ? '<div class="row"><a href="/admin.html">Trang quản trị</a></div>' : ''}
               <div class="row"><a href="#" id="logout-link">Đăng xuất</a></div>`
            : `<div class="row"><a href="/login.html">Đăng nhập</a><a href="/register.html">Đăng ký</a></div>`
        }
      </div>
    </aside>
  `;

  document.getElementById('site-footer').innerHTML = `
    <div class="footer-accordion">
      ${footerAccordionItem('Giao hàng', 'Giao hàng toàn quốc trong 1–3 ngày làm việc. Miễn phí vận chuyển cho đơn hàng từ 500.000₫, đơn nhỏ hơn áp dụng phí vận chuyển theo khu vực.')}
      ${footerAccordionItem('Đổi trả', 'Hỗ trợ đổi trả trong vòng 7 ngày kể từ ngày nhận hàng đối với sản phẩm còn nguyên tem mác, chưa qua sử dụng.')}
      ${footerAccordionItem('Thanh toán', 'Chấp nhận thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng và các ví điện tử phổ biến.')}
      ${footerAccordionItem('Điều kiện giao dịch chung', 'Bằng việc đặt hàng trên website, quý khách đồng ý với các điều khoản và điều kiện giao dịch chung của chúng tôi.')}
      ${footerAccordionItem('Bảo mật thông tin khách hàng', 'Chúng tôi cam kết bảo mật thông tin cá nhân của khách hàng theo quy định pháp luật hiện hành.')}
    </div>
    <div class="footer-contact">
      <div>Bạn cần hỗ trợ? Gọi cho chúng tôi 24/7!</div>
      <div class="big">1900 0000</div>
    </div>
    <div class="footer-payments">
      <span class="pay-badge">COD</span>
      <span class="pay-badge">Chuyển khoản</span>
      <span class="pay-badge">VISA</span>
      <span class="pay-badge">Mastercard</span>
      <span class="pay-badge">Ví điện tử</span>
    </div>
    <div class="footer-copyright">
      <strong>BRG Shopping</strong> — Bản demo giao diện, xây dựng trên Node.js + Express + MSSQL.
    </div>
  `;

  document.body.insertAdjacentHTML(
    'beforeend',
    `<button class="chat-fab" id="chat-fab" aria-label="Chat hỗ trợ">${ICON.chat}</button>`
  );

  wireHeader();
  loadDrawerCategories(activeCategoryId);
  refreshCartCount();
}

function wireHeader() {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  const openDrawer = () => {
    drawer.classList.add('open');
    overlay.classList.add('open');
  };
  const closeDrawer = () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  };
  document.getElementById('drawer-open').addEventListener('click', openDrawer);
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  const searchbar = document.getElementById('searchbar');
  document.getElementById('search-btn').addEventListener('click', () => {
    searchbar.classList.toggle('open');
    if (searchbar.classList.contains('open')) searchbar.querySelector('input').focus();
  });
  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get('q');
    window.location.href = `/index.html${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  });

  document.getElementById('bell-btn').addEventListener('click', () => showToast('Bạn chưa có thông báo mới'));
  document.getElementById('chat-fab').addEventListener('click', () => showToast('Tính năng chat đang được phát triển'));

  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = '/index.html';
    });
  }
}

async function loadDrawerCategories(activeCategoryId) {
  const nav = document.getElementById('drawer-categories');
  try {
    const { data } = await apiFetch('/categories');
    nav.innerHTML = [
      `<a class="cat-item" href="/index.html">${categoryIcon('')}<span>Tất cả sản phẩm</span></a>`,
    ]
      .concat(
        data.map(
          (c) =>
            `<a class="cat-item${String(activeCategoryId) === String(c.id) ? ' bg-white/[0.08]' : ''}" href="/index.html?category=${c.id}">${categoryIcon(c.name)}<span>${escapeHtml(c.name)}</span></a>`
        )
      )
      .join('');
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

function footerAccordionItem(title, body) {
  return `
    <details class="acc-item">
      <summary>${escapeHtml(title).toUpperCase()}</summary>
      <div class="acc-body">${escapeHtml(body)}</div>
    </details>`;
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
