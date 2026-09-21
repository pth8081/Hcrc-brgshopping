import { apiFetch, getUser, formatVND, formatDate, showToast, ORDER_STATUS_LABEL } from '../api.js';
import { renderLayout, escapeHtml } from '../layout.js';
import { discountLabel } from '../promoHelpers.js';

renderLayout({});

const user = getUser();
const guardEl = document.getElementById('admin-guard');
const appEl = document.getElementById('admin-app');

if (!user) {
  guardEl.innerHTML = `<div class="empty-state"><p>Bạn cần đăng nhập để truy cập trang quản trị.</p><p class="mt-3.5"><a class="btn btn-primary" href="/login.html?next=/admin.html">Đăng nhập</a></p></div>`;
} else if (user.role !== 'admin') {
  guardEl.innerHTML = `<div class="empty-state"><p>Tài khoản của bạn không có quyền quản trị.</p></div>`;
} else {
  appEl.hidden = false;
  initTabs();
  loadCategories();
  loadProducts();
  loadOrders();
  loadNews();
  loadPromotions();
  wireForms();
}

const TAB_NAMES = ['categories', 'products', 'orders', 'news', 'promotions', 'chat'];

function initTabs() {
  const buttons = document.querySelectorAll('.tabs button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      TAB_NAMES.forEach((name) => {
        document.getElementById(`tab-${name}`).hidden = name !== btn.dataset.tab;
      });

      stopChatPolling();
      if (btn.dataset.tab === 'chat') {
        loadChatConversations();
        chatPollInterval = setInterval(() => {
          loadChatConversations(true);
          if (selectedConversationId) refreshThread();
        }, 4000);
      }
    });
  });
}

let categoriesCache = [];

async function loadCategories() {
  const table = document.getElementById('category-table');
  const select = document.getElementById('p-category');
  try {
    const { data } = await apiFetch('/categories');
    categoriesCache = data;

    select.innerHTML = data.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    table.innerHTML = data.length
      ? `<table class="admin-table">
          <thead><tr><th>ID</th><th>Tên</th><th>Slug</th><th></th></tr></thead>
          <tbody>
            ${data
              .map(
                (c) => `
              <tr>
                <td>${c.id}</td>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.slug)}</td>
                <td><button class="btn btn-ghost btn-sm" data-del-cat="${c.id}">Xoá</button></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '<p class="text-muted">Chưa có danh mục nào.</p>';

    table.querySelectorAll('[data-del-cat]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xoá danh mục này?')) return;
        try {
          await apiFetch(`/categories/${btn.dataset.delCat}`, { method: 'DELETE' });
          showToast('Đã xoá danh mục');
          loadCategories();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    table.innerHTML = `<p class="text-danger">${escapeHtml(err.message)}</p>`;
  }
}

async function loadProducts() {
  const table = document.getElementById('product-table');
  try {
    const { data } = await apiFetch('/products?limit=100');

    table.innerHTML = data.length
      ? `<table class="admin-table">
          <thead><tr><th>ID</th><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th></th></tr></thead>
          <tbody>
            ${data
              .map(
                (p) => `
              <tr>
                <td>${p.id}</td>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.category?.name || '—')}</td>
                <td>${formatVND(p.salePrice || p.price)}</td>
                <td>${p.stockQuantity}</td>
                <td><button class="btn btn-ghost btn-sm" data-del-prod="${p.id}">Xoá</button></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '<p class="text-muted">Chưa có sản phẩm nào.</p>';

    table.querySelectorAll('[data-del-prod]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xoá sản phẩm này?')) return;
        try {
          await apiFetch(`/products/${btn.dataset.delProd}`, { method: 'DELETE' });
          showToast('Đã xoá sản phẩm');
          loadProducts();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    table.innerHTML = `<p class="text-danger">${escapeHtml(err.message)}</p>`;
  }
}

async function loadOrders() {
  const table = document.getElementById('order-table');
  try {
    const { data } = await apiFetch('/orders');

    table.innerHTML = data.length
      ? `<table class="admin-table">
          <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Tổng tiền</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            ${data
              .map(
                (o) => `
              <tr>
                <td>#${o.id}</td>
                <td>${escapeHtml(o.User?.fullName || o.guestName || '—')}${o.User?.phone || o.guestPhone ? `<br><span class="text-faint text-xs">${escapeHtml(o.User?.phone || o.guestPhone)}</span>` : ''}${!o.User ? '<br><span class="pill pill-pending text-[10px] mt-1 inline-block">Khách vãng lai</span>' : ''}</td>
                <td>${formatDate(o.createdAt)}</td>
                <td>${formatVND(o.totalAmount)}</td>
                <td>
                  <select data-order="${o.id}">
                    ${Object.entries(ORDER_STATUS_LABEL)
                      .map(([value, label]) => `<option value="${value}" ${value === o.status ? 'selected' : ''}>${label}</option>`)
                      .join('')}
                  </select>
                </td>
                <td><a class="btn btn-outline btn-sm" href="/order-detail.html?id=${o.id}">Xem</a></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '<p class="text-muted">Chưa có đơn hàng nào.</p>';

    table.querySelectorAll('[data-order]').forEach((select) => {
      select.addEventListener('change', async () => {
        try {
          await apiFetch(`/orders/${select.dataset.order}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: select.value }),
          });
          showToast(`Đã cập nhật đơn #${select.dataset.order}`);
        } catch (err) {
          showToast(err.message, true);
          loadOrders();
        }
      });
    });
  } catch (err) {
    table.innerHTML = `<p class="text-danger">${escapeHtml(err.message)}</p>`;
  }
}

async function loadNews() {
  const table = document.getElementById('news-table');
  try {
    const { data } = await apiFetch('/news/all');

    table.innerHTML = data.length
      ? `<table class="admin-table">
          <thead><tr><th>ID</th><th>Tiêu đề</th><th>Ngày đăng</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            ${data
              .map(
                (n) => `
              <tr>
                <td>${n.id}</td>
                <td>${escapeHtml(n.title)}</td>
                <td>${formatDate(n.publishedAt)}</td>
                <td>${n.isPublished ? 'Đã đăng' : 'Nháp'}</td>
                <td><button class="btn btn-ghost btn-sm" data-del-news="${n.id}">Xoá</button></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '<p class="text-muted">Chưa có bài viết nào.</p>';

    table.querySelectorAll('[data-del-news]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xoá bài viết này?')) return;
        try {
          await apiFetch(`/news/${btn.dataset.delNews}`, { method: 'DELETE' });
          showToast('Đã xoá bài viết');
          loadNews();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    table.innerHTML = `<p class="text-danger">${escapeHtml(err.message)}</p>`;
  }
}

async function loadPromotions() {
  const table = document.getElementById('promotion-table');
  try {
    const { data } = await apiFetch('/promotions/all');

    table.innerHTML = data.length
      ? `<table class="admin-table">
          <thead><tr><th>ID</th><th>Chương trình</th><th>Mã</th><th>Giảm giá</th><th>Hiệu lực</th><th></th></tr></thead>
          <tbody>
            ${data
              .map(
                (p) => `
              <tr>
                <td>${p.id}</td>
                <td>${escapeHtml(p.title)}</td>
                <td>${p.code ? escapeHtml(p.code) : '—'}</td>
                <td>${discountLabel(p)}</td>
                <td>${new Date(p.startDate).toLocaleDateString('vi-VN')} – ${new Date(p.endDate).toLocaleDateString('vi-VN')}</td>
                <td><button class="btn btn-ghost btn-sm" data-del-promo="${p.id}">Xoá</button></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '<p class="text-muted">Chưa có chương trình khuyến mại nào.</p>';

    table.querySelectorAll('[data-del-promo]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xoá chương trình khuyến mại này?')) return;
        try {
          await apiFetch(`/promotions/${btn.dataset.delPromo}`, { method: 'DELETE' });
          showToast('Đã xoá chương trình khuyến mại');
          loadPromotions();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    table.innerHTML = `<p class="text-danger">${escapeHtml(err.message)}</p>`;
  }
}

function wireForms() {
  const catForm = document.getElementById('category-form');
  const catError = document.getElementById('category-error');
  catForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    catError.classList.remove('show');
    const fd = new FormData(catForm);
    try {
      await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: fd.get('name'), imageUrl: fd.get('imageUrl') || undefined }),
      });
      catForm.reset();
      showToast('Đã thêm danh mục');
      loadCategories();
    } catch (err) {
      catError.textContent = err.message;
      catError.classList.add('show');
    }
  });

  const prodForm = document.getElementById('product-form');
  const prodError = document.getElementById('product-error');
  prodForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    prodError.classList.remove('show');
    const fd = new FormData(prodForm);
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          categoryId: Number(fd.get('categoryId')),
          price: Number(fd.get('price')),
          salePrice: fd.get('salePrice') ? Number(fd.get('salePrice')) : undefined,
          stockQuantity: Number(fd.get('stockQuantity')),
          sku: fd.get('sku') || undefined,
          description: fd.get('description') || undefined,
        }),
      });
      prodForm.reset();
      showToast('Đã thêm sản phẩm');
      loadProducts();
    } catch (err) {
      prodError.textContent = err.message;
      prodError.classList.add('show');
    }
  });

  const newsForm = document.getElementById('news-form');
  const newsError = document.getElementById('news-error');
  newsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    newsError.classList.remove('show');
    const fd = new FormData(newsForm);
    try {
      await apiFetch('/news', {
        method: 'POST',
        body: JSON.stringify({
          title: fd.get('title'),
          summary: fd.get('summary') || undefined,
          imageUrl: fd.get('imageUrl') || undefined,
          content: fd.get('content'),
        }),
      });
      newsForm.reset();
      showToast('Đã đăng tin tức');
      loadNews();
    } catch (err) {
      newsError.textContent = err.message;
      newsError.classList.add('show');
    }
  });

  const promoForm = document.getElementById('promotion-form');
  const promoError = document.getElementById('promotion-error');
  promoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    promoError.classList.remove('show');
    const fd = new FormData(promoForm);
    try {
      await apiFetch('/promotions', {
        method: 'POST',
        body: JSON.stringify({
          title: fd.get('title'),
          code: fd.get('code') || undefined,
          discountType: fd.get('discountType'),
          discountValue: Number(fd.get('discountValue')),
          minOrderAmount: fd.get('minOrderAmount') ? Number(fd.get('minOrderAmount')) : 0,
          maxDiscountAmount: fd.get('maxDiscountAmount') ? Number(fd.get('maxDiscountAmount')) : undefined,
          startDate: fd.get('startDate'),
          endDate: fd.get('endDate'),
          description: fd.get('description') || undefined,
        }),
      });
      promoForm.reset();
      showToast('Đã tạo chương trình khuyến mại');
      loadPromotions();
    } catch (err) {
      promoError.textContent = err.message;
      promoError.classList.add('show');
    }
  });
}

// --- Chat inbox ---
let chatPollInterval = null;
let selectedConversationId = null;
let lastThreadMessageId = 0;

function stopChatPolling() {
  clearInterval(chatPollInterval);
  chatPollInterval = null;
}

async function loadChatConversations(silent = false) {
  const list = document.getElementById('chat-conv-list');
  try {
    const { data } = await apiFetch('/chat/admin/conversations');

    list.innerHTML = data.length
      ? data
          .map((c) => {
            const lastMessage = c.messages?.[0];
            const awaitingReply = lastMessage?.senderType === 'customer';
            return `
          <button type="button" class="chat-conv-row${c.id === selectedConversationId ? ' active' : ''}" data-conv="${c.id}">
            <div class="name">${awaitingReply ? '<span class="awaiting"></span>' : ''}${escapeHtml(c.User?.fullName || c.guestName || 'Khách')}</div>
            <div class="preview">${escapeHtml(lastMessage?.body || 'Chưa có tin nhắn')}</div>
            <div class="time">${c.lastMessageAt ? formatDate(c.lastMessageAt) : formatDate(c.createdAt)}</div>
          </button>`;
          })
          .join('')
      : '<p class="text-muted p-3">Chưa có cuộc trò chuyện nào.</p>';

    list.querySelectorAll('[data-conv]').forEach((btn) => {
      btn.addEventListener('click', () => openConversation(Number(btn.dataset.conv)));
    });
  } catch (err) {
    if (!silent) list.innerHTML = `<p class="text-danger p-3">${escapeHtml(err.message)}</p>`;
  }
}

async function openConversation(id) {
  selectedConversationId = id;
  lastThreadMessageId = 0;
  document.querySelectorAll('.chat-conv-row').forEach((row) => {
    row.classList.toggle('active', Number(row.dataset.conv) === id);
  });

  const thread = document.getElementById('chat-thread');
  thread.innerHTML = `
    <div class="chat-thread-body" id="chat-thread-body"></div>
    <form class="chat-thread-composer" id="chat-thread-composer">
      <input type="text" id="chat-thread-input" placeholder="Nhập tin nhắn..." autocomplete="off">
      <button type="submit" class="btn btn-primary btn-sm">Gửi</button>
    </form>`;

  document.getElementById('chat-thread-composer').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-thread-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
      await apiFetch(`/chat/admin/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: text }) });
      await refreshThread();
      loadChatConversations(true);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  await refreshThread();
}

async function refreshThread() {
  if (!selectedConversationId) return;
  const body = document.getElementById('chat-thread-body');
  if (!body) return;

  try {
    const { data } = await apiFetch(`/chat/admin/conversations/${selectedConversationId}/messages`);
    const newMessages = data.messages.filter((m) => m.id > lastThreadMessageId);
    if (lastThreadMessageId === 0) {
      body.innerHTML = data.messages
        .map((m) => `<div class="chat-bubble ${m.senderType === 'admin' ? 'out' : 'in'}">${escapeHtml(m.body)}</div>`)
        .join('') || '<p class="text-muted">Chưa có tin nhắn.</p>';
    } else if (newMessages.length > 0) {
      body.insertAdjacentHTML(
        'beforeend',
        newMessages.map((m) => `<div class="chat-bubble ${m.senderType === 'admin' ? 'out' : 'in'}">${escapeHtml(m.body)}</div>`).join('')
      );
    }
    if (data.messages.length > 0) lastThreadMessageId = Math.max(...data.messages.map((m) => m.id));
    body.scrollTop = body.scrollHeight;
  } catch (err) {
    showToast(err.message, true);
  }
}
