import { getUser, clearSession, apiFetch, getToken, showToast, formatDate, ORDER_STATUS_LABEL, guestCartCount, getGuestChatToken } from './api.js';
import { categoryIcon } from './icons.js';

const ICON = {
  hamburger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2l2.2 12.2a2 2 0 0 0 2 1.65h8.3a2 2 0 0 0 2-1.6L21 8H6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.5-4.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4V5z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7"/></svg>',
  zalo: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.8 1.6 5.3 4.1 6.9-.1.9-.5 2.3-1.4 3.6 0 0 2.4-.5 4.3-1.9 1 .3 2 .4 3 .4 5.5 0 10-3.9 10-8.7C22 5.9 17.5 2 12 2z"/></svg>',
  messenger: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.2 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4-2.6-2.8-5 2.8 5.5-5.8 2.6 2.8 5-2.8-5.5 5.8z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg>',
};

const STATIC_LINKS = [
  { label: 'Về BRG Shopping', href: '/page.html?slug=ve-chung-toi' },
  { label: 'Khuyến mãi', href: '/promotions.html' },
  { label: 'Thẻ thành viên', href: '/page.html?slug=the-thanh-vien' },
  { label: 'Tuyển dụng', href: '/page.html?slug=tuyen-dung' },
  { label: 'Tin tức', href: '/news.html' },
  { label: 'Tra cứu đơn hàng', href: '/order-lookup.html' },
  { label: 'Liên hệ', href: '/page.html?slug=lien-he' },
];

export async function renderLayout({ activeCategoryId } = {}) {
  const user = getUser();

  document.getElementById('site-header').innerHTML = `
    <div class="navbar">
      <div class="navbar-inner">
        <button class="icon-btn" id="drawer-open" aria-label="Mở menu">${ICON.hamburger}</button>
        <a class="logo" href="/index.html">${ICON.bag}BRG<span>Shopping</span></a>
        <div class="nav-icons">
          <div class="dropdown-anchor">
            <button class="icon-btn" id="bell-btn" aria-label="Thông báo">${ICON.bell}<span class="notif-dot" id="notif-dot"></span></button>
            <div class="notif-dropdown" id="notif-dropdown"></div>
          </div>
          <button class="icon-btn" id="search-btn" aria-label="Tìm kiếm">${ICON.search}</button>
          <a class="icon-btn cart-badge" href="/cart.html" aria-label="Giỏ hàng">${ICON.cart}<span class="count" id="cart-count">0</span></a>
        </div>
      </div>
      <div class="searchbar" id="searchbar">
        <form id="search-form">
          <input type="search" name="q" id="search-input" placeholder="Tìm sản phẩm, danh mục..." autocomplete="off">
          <button type="submit" aria-label="Tìm kiếm">${ICON.search}</button>
        </form>
        <div class="search-suggest" id="search-suggest"></div>
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
        ${STATIC_LINKS.map((l) => `<a href="${l.href}">${escapeHtml(l.label).toUpperCase()}</a>`).join('')}
      </div>
      <div class="drawer-auth">
        ${
          user
            ? `<div class="row"><a href="/orders.html">Đơn hàng của tôi</a></div>
               <div class="row"><a href="/change-password.html">Đổi mật khẩu</a></div>
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
      <strong>BRG Shopping</strong> — © ${new Date().getFullYear()}. Đã đăng ký bản quyền.
    </div>
  `;

  const accountHref = user ? '/orders.html' : '/login.html';
  const path = location.pathname;
  document.body.insertAdjacentHTML(
    'beforeend',
    `<button class="chat-fab print:hidden" id="chat-fab" aria-label="Chat hỗ trợ">${ICON.chat}</button>
     <div class="chat-launcher-menu print:hidden" id="chat-launcher-menu" hidden>
       <div class="head">Chat với BRG Shopping<span>Thường trả lời trong vài phút</span></div>
       <div class="chat-channel" id="chat-channel-web">
         <span class="ico web">${ICON.chat}</span>
         <div><div class="label">Chat trên website</div><div class="sub">Nhắn trực tiếp, xem lại lịch sử</div></div>
       </div>
       <div class="chat-channel" id="chat-channel-zalo" hidden>
         <span class="ico zalo">${ICON.zalo}</span>
         <div><div class="label">Chat qua Zalo</div><div class="sub">Mở Zalo OA của BRG Shopping</div></div>
       </div>
       <div class="chat-channel" id="chat-channel-messenger" hidden>
         <span class="ico messenger">${ICON.messenger}</span>
         <div><div class="label">Chat qua Messenger</div><div class="sub">Mở Facebook Page của BRG Shopping</div></div>
       </div>
     </div>
     <div class="chat-panel print:hidden" id="chat-panel" hidden>
       <div class="head">
         <div><b>Hỗ trợ BRG Shopping</b><span>Đang trực tuyến</span></div>
         <button type="button" id="chat-panel-close" aria-label="Đóng">${ICON.close}</button>
       </div>
       <div class="body" id="chat-panel-body"></div>
       <form class="composer" id="chat-composer">
         <input type="text" id="chat-input" placeholder="Nhập tin nhắn..." autocomplete="off">
         <button type="submit" aria-label="Gửi">${ICON.send}</button>
       </form>
     </div>
     <nav class="bottom-nav print:hidden" id="bottom-nav">
       <a href="/index.html" class="${path === '/index.html' || path === '/' ? 'active' : ''}">${ICON.home}Trang chủ</a>
       <a href="#" id="bottom-nav-categories">${ICON.grid}Danh mục</a>
       <a href="/cart.html" class="${path === '/cart.html' ? 'active' : ''}">${ICON.cart}Giỏ hàng<span class="bn-badge hidden" id="cart-count-mobile">0</span></a>
       <a href="${accountHref}" class="${['/orders.html', '/login.html', '/register.html'].includes(path) ? 'active' : ''}">${ICON.user}Tài khoản</a>
     </nav>`
  );

  // Printing an invoice (order-detail.js) should never include chrome.
  document.getElementById('site-header').classList.add('print:hidden');
  document.getElementById('site-footer').classList.add('print:hidden');

  wireHeader();
  loadDrawerCategories(activeCategoryId);
  refreshCartCount();
  loadNotifications();
  initChatWidget();
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
  document.getElementById('bottom-nav-categories')?.addEventListener('click', (e) => {
    e.preventDefault();
    openDrawer();
  });

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
  wireSearchSuggestions();

  document.getElementById('bell-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotifDropdown();
  });
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown?.classList.contains('open') && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = '/index.html';
    });
  }
}

function wireSearchSuggestions() {
  const input = document.getElementById('search-input');
  const box = document.getElementById('search-suggest');
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (!q) {
      box.classList.remove('open');
      return;
    }
    debounceTimer = setTimeout(async () => {
      try {
        const { data } = await apiFetch(`/search/suggestions?q=${encodeURIComponent(q)}`);
        if (data.length === 0) {
          box.classList.remove('open');
          return;
        }
        box.innerHTML = data.map((kw) => `<button type="button" class="search-suggest-item" data-kw="${escapeHtml(kw)}">${escapeHtml(kw)}</button>`).join('');
        box.classList.add('open');
      } catch {
        box.classList.remove('open');
      }
    }, 200);
  });

  box.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-kw]');
    if (!btn) return;
    window.location.href = `/index.html?q=${encodeURIComponent(btn.dataset.kw)}`;
  });

  document.addEventListener('click', (e) => {
    if (e.target !== input && !box.contains(e.target)) box.classList.remove('open');
  });
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

const NOTIF_SEEN_KEY = 'brg_notif_last_seen';
let cachedNotifications = [];

async function loadNotifications() {
  const dot = document.getElementById('notif-dot');
  if (!dot) return;
  if (!getToken()) {
    dot.classList.add('hidden');
    return;
  }
  try {
    const { data } = await apiFetch('/orders/notifications');
    cachedNotifications = data;
    const lastSeen = Number(localStorage.getItem(NOTIF_SEEN_KEY) || 0);
    const hasUnread = data.some((n) => new Date(n.createdAt).getTime() > lastSeen);
    dot.classList.toggle('hidden', !hasUnread);
  } catch {
    dot.classList.add('hidden');
  }
}

function toggleNotifDropdown() {
  if (!getToken()) {
    window.location.href = '/login.html';
    return;
  }
  const dropdown = document.getElementById('notif-dropdown');
  const isOpening = !dropdown.classList.contains('open');
  dropdown.classList.toggle('open');
  if (!isOpening) return;

  dropdown.innerHTML = cachedNotifications.length
    ? cachedNotifications
        .map(
          (n) => `
        <a class="notif-item" href="/order-detail.html?id=${n.orderId}">
          ${escapeHtml(notificationText(n))}
          <span class="date">${formatDate(n.createdAt)}</span>
        </a>`
        )
        .join('')
    : '<div class="notif-empty">Bạn chưa có thông báo nào.</div>';

  localStorage.setItem(NOTIF_SEEN_KEY, String(Date.now()));
  document.getElementById('notif-dot').classList.add('hidden');
}

function notificationText(n) {
  if (n.status) return `Đơn #${n.orderId}: ${ORDER_STATUS_LABEL[n.status] || n.status}`;
  if (n.paymentStatus) return `Đơn #${n.orderId}: cập nhật thanh toán`;
  return `Đơn #${n.orderId}: có cập nhật mới`;
}

export async function refreshCartCount() {
  const el = document.getElementById('cart-count');
  const mobileEl = document.getElementById('cart-count-mobile');
  if (!el && !mobileEl) return;

  const setCount = (count) => {
    if (el) el.textContent = String(count);
    if (mobileEl) {
      mobileEl.textContent = String(count);
      mobileEl.classList.toggle('hidden', count === 0);
    }
  };

  if (!getToken()) {
    setCount(guestCartCount());
    return;
  }
  try {
    const { data } = await apiFetch('/cart');
    setCount(data.items.reduce((sum, item) => sum + item.quantity, 0));
  } catch {
    setCount(0);
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

// --- Chat widget: a channel picker (web / Zalo / Messenger) plus a small
// polling-based web chat panel. Works for both a logged-in user (identified
// by the JWT already sent on every apiFetch call) and an anonymous guest
// (identified by a random token kept in localStorage) — see chat.controller.js.
let chatConversationId = null;
let chatLastMessageId = 0;
let chatPollTimer = null;

function initChatWidget() {
  const fab = document.getElementById('chat-fab');
  const menu = document.getElementById('chat-launcher-menu');
  if (!fab || !menu) return;

  fab.addEventListener('click', () => {
    const panel = document.getElementById('chat-panel');
    if (!panel.hidden) {
      closeChatPanel();
      return;
    }
    menu.hidden = !menu.hidden;
  });

  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== fab && !fab.contains(e.target)) {
      menu.hidden = true;
    }
  });

  document.getElementById('chat-channel-web').addEventListener('click', () => {
    menu.hidden = true;
    openChatPanel();
  });
  document.getElementById('chat-panel-close').addEventListener('click', closeChatPanel);
  document.getElementById('chat-composer').addEventListener('submit', sendChatMessage);

  apiFetch('/config/public')
    .then(({ data }) => {
      if (data.zaloUrl) {
        const el = document.getElementById('chat-channel-zalo');
        el.hidden = false;
        el.addEventListener('click', () => window.open(data.zaloUrl, '_blank', 'noopener'));
      }
      if (data.messengerUrl) {
        const el = document.getElementById('chat-channel-messenger');
        el.hidden = false;
        el.addEventListener('click', () => window.open(data.messengerUrl, '_blank', 'noopener'));
      }
    })
    .catch(() => {});
}

async function openChatPanel() {
  const panel = document.getElementById('chat-panel');
  panel.hidden = false;

  if (!chatConversationId) {
    try {
      const body = getToken() ? {} : { guestToken: getGuestChatToken() };
      const { data } = await apiFetch('/chat/start', { method: 'POST', body: JSON.stringify(body) });
      chatConversationId = data.id;
    } catch {
      showToast('Không thể kết nối chat, vui lòng thử lại sau', true);
      panel.hidden = true;
      return;
    }
  }

  await pollChatMessages();
  clearInterval(chatPollTimer);
  chatPollTimer = setInterval(pollChatMessages, 4000);
}

function closeChatPanel() {
  document.getElementById('chat-panel').hidden = true;
  clearInterval(chatPollTimer);
  chatPollTimer = null;
}

async function pollChatMessages() {
  if (!chatConversationId) return;
  const guestParam = getToken() ? '' : `&guestToken=${encodeURIComponent(getGuestChatToken())}`;
  try {
    const { data } = await apiFetch(`/chat/${chatConversationId}/messages?after=${chatLastMessageId}${guestParam}`);
    if (data.length === 0) return;
    const body = document.getElementById('chat-panel-body');
    data.forEach((m) => {
      chatLastMessageId = Math.max(chatLastMessageId, m.id);
      body.insertAdjacentHTML('beforeend', `<div class="chat-bubble ${m.senderType === 'admin' ? 'in' : 'out'}">${escapeHtml(m.body)}</div>`);
    });
    body.scrollTop = body.scrollHeight;
  } catch {
    // Transient poll failure — the next tick will retry.
  }
}

async function sendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !chatConversationId) return;
  input.value = '';

  const body = getToken() ? { body: text } : { body: text, guestToken: getGuestChatToken() };
  try {
    await apiFetch(`/chat/${chatConversationId}/messages`, { method: 'POST', body: JSON.stringify(body) });
    await pollChatMessages();
  } catch (err) {
    showToast(err.message, true);
  }
}
