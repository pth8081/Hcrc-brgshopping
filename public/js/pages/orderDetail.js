import {
  apiFetch, formatVND, formatDate, requireAuth, getUser, showToast,
  ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_CLASS, PAYMENT_METHOD_LABEL,
} from '../api.js';
import { renderLayout, escapeHtml } from '../layout.js';

renderLayout({});

const orderId = new URLSearchParams(location.search).get('id');
const el = document.getElementById('order-detail');

if (requireAuth()) {
  loadOrder();
}

async function loadOrder() {
  if (!orderId) {
    el.innerHTML = emptyState('Thiếu mã đơn hàng.');
    return;
  }

  try {
    const { data: order } = await apiFetch(`/orders/${encodeURIComponent(orderId)}`);
    document.title = `Đơn hàng #${order.id} — BRG Shopping`;
    document.getElementById('crumb-id').textContent = `Đơn #${order.id}`;
    render(order);
  } catch (err) {
    el.innerHTML = emptyState(`Không tải được đơn hàng: ${err.message}`);
  }
}

function render(order) {
  const user = getUser();
  const isAdmin = user?.role === 'admin';
  const isOwner = order.userId === user?.id;
  const address = order.address;
  const customer = order.User;

  el.innerHTML = `
    <div class="panel">
      <div class="order-head">
        <span class="oid text-lg">Đơn hàng #${order.id}</span>
        <span class="pill ${ORDER_STATUS_CLASS[order.status] || 'pill-pending'}">${ORDER_STATUS_LABEL[order.status] || escapeHtml(order.status)}</span>
        <span class="pill ${PAYMENT_STATUS_CLASS[order.paymentStatus] || 'pill-pending'}">${PAYMENT_STATUS_LABEL[order.paymentStatus] || escapeHtml(order.paymentStatus)}</span>
        <span class="date ml-auto">${formatDate(order.createdAt)}</span>
      </div>

      <div class="cart-layout">
        <div>
          <h3>Thông tin giao hàng</h3>
          <table class="kv-table">
            <tr><td>Người nhận</td><td>${escapeHtml(address?.recipientName || '—')}</td></tr>
            <tr><td>Số điện thoại</td><td>${escapeHtml(address?.phone || '—')}</td></tr>
            <tr><td>Địa chỉ</td><td>${escapeHtml(address?.addressLine || '—')}</td></tr>
            <tr><td>Phương thức thanh toán</td><td>${PAYMENT_METHOD_LABEL[order.paymentMethod] || escapeHtml(order.paymentMethod)}</td></tr>
            ${order.note ? `<tr><td>Ghi chú</td><td>${escapeHtml(order.note)}</td></tr>` : ''}
            ${isAdmin && customer ? `<tr><td>Khách hàng</td><td>${escapeHtml(customer.fullName)} — ${escapeHtml(customer.email)}${customer.phone ? ` — ${escapeHtml(customer.phone)}` : ''}</td></tr>` : ''}
          </table>

          <h3 class="mt-6">Lịch sử đơn hàng</h3>
          <div class="timeline">
            ${(order.history || [])
              .map(
                (h) => `
              <div class="timeline-row">
                <span class="date">${formatDate(h.createdAt)}</span>
                <span>
                  ${h.status ? `<span class="pill ${ORDER_STATUS_CLASS[h.status] || 'pill-pending'}">${ORDER_STATUS_LABEL[h.status] || escapeHtml(h.status)}</span>` : ''}
                  ${h.paymentStatus ? `<span class="pill ${PAYMENT_STATUS_CLASS[h.paymentStatus] || 'pill-pending'}">${PAYMENT_STATUS_LABEL[h.paymentStatus] || escapeHtml(h.paymentStatus)}</span>` : ''}
                  ${h.note ? `<span class="text-muted">${escapeHtml(h.note)}</span>` : ''}
                </span>
              </div>`
              )
              .join('') || '<p class="text-muted">Chưa có lịch sử.</p>'}
          </div>
        </div>

        <div class="panel">
          <h3>Sản phẩm (${order.items.length})</h3>
          ${order.items
            .map(
              (item) => `
            <div class="order-item-row">
              <span>${escapeHtml(item.productName)} × ${item.quantity}</span>
              <span>${formatVND(item.subtotal)}</span>
            </div>`
            )
            .join('')}
          <div class="summary-row total"><span>Tổng cộng</span><span class="val">${formatVND(order.totalAmount)}</span></div>
        </div>
      </div>

      <div class="order-actions print:hidden">
        ${
          isAdmin
            ? `
          <div class="form-row">
            <label for="status-select">Trạng thái đơn hàng</label>
            <select id="status-select">
              ${Object.entries(ORDER_STATUS_LABEL).map(([v, l]) => `<option value="${v}" ${v === order.status ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label for="payment-select">Trạng thái thanh toán</label>
            <select id="payment-select">
              ${Object.entries(PAYMENT_STATUS_LABEL).map(([v, l]) => `<option value="${v}" ${v === order.paymentStatus ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>`
            : ''
        }
        <div class="flex gap-2.5 flex-wrap mt-2">
          ${isOwner && !isAdmin && order.status === 'pending' ? '<button class="btn btn-ghost" id="cancel-btn">Huỷ đơn hàng</button>' : ''}
          <button class="btn btn-outline" id="print-btn">In hoá đơn</button>
          <a class="btn btn-outline" href="${isAdmin ? '/admin.html' : '/orders.html'}">Quay lại</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('print-btn').addEventListener('click', () => window.print());

  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      if (!confirm('Bạn chắc chắn muốn huỷ đơn hàng này?')) return;
      try {
        await apiFetch(`/orders/${order.id}/cancel`, { method: 'PUT' });
        showToast('Đã huỷ đơn hàng');
        loadOrder();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  const statusSelect = document.getElementById('status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', async () => {
      try {
        await apiFetch(`/orders/${order.id}/status`, { method: 'PUT', body: JSON.stringify({ status: statusSelect.value }) });
        showToast('Đã cập nhật trạng thái đơn hàng');
        loadOrder();
      } catch (err) {
        showToast(err.message, true);
        loadOrder();
      }
    });
  }

  const paymentSelect = document.getElementById('payment-select');
  if (paymentSelect) {
    paymentSelect.addEventListener('change', async () => {
      try {
        await apiFetch(`/orders/${order.id}/payment-status`, { method: 'PUT', body: JSON.stringify({ paymentStatus: paymentSelect.value }) });
        showToast('Đã cập nhật trạng thái thanh toán');
        loadOrder();
      } catch (err) {
        showToast(err.message, true);
        loadOrder();
      }
    });
  }
}

function emptyState(message) {
  return `<div class="empty-state"><div class="big-icon">📦</div><p>${escapeHtml(message)}</p></div>`;
}
