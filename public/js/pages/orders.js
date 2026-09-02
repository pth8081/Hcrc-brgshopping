import { apiFetch, formatVND, formatDate, requireAuth, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from '../api.js';
import { renderLayout, escapeHtml } from '../layout.js';

renderLayout({});

if (requireAuth()) {
  loadOrders();
}

async function loadOrders() {
  const el = document.getElementById('orders-content');
  try {
    const { data } = await apiFetch('/orders/my');

    if (data.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="big-icon">📦</div>
          <p>Bạn chưa có đơn hàng nào.</p>
          <p class="mt-3.5"><a class="btn btn-primary" href="/index.html">Bắt đầu mua sắm</a></p>
        </div>`;
      return;
    }

    el.innerHTML = data.map(orderCard).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Không tải được đơn hàng: ${escapeHtml(err.message)}</div>`;
  }
}

function orderCard(order) {
  const statusClass = ORDER_STATUS_CLASS[order.status] || 'pill-pending';
  const statusLabel = ORDER_STATUS_LABEL[order.status] || escapeHtml(order.status);
  return `
    <div class="order-card">
      <div class="order-head">
        <span class="oid">Đơn #${order.id}</span>
        <span class="pill ${statusClass}">${statusLabel}</span>
        <span class="date">${formatDate(order.createdAt)}</span>
      </div>
      ${order.items
        .map(
          (item) => `
        <div class="order-item-row">
          <span>${escapeHtml(item.productName)} × ${item.quantity}</span>
          <span>${formatVND(item.subtotal)}</span>
        </div>`
        )
        .join('')}
      <div class="order-total">${formatVND(order.totalAmount)}</div>
    </div>`;
}
