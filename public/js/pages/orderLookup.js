import {
  apiFetch, formatVND, formatDate,
  ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_CLASS, PAYMENT_METHOD_LABEL,
} from '../api.js';
import { renderLayout, escapeHtml } from '../layout.js';

renderLayout({});

const form = document.getElementById('lookup-form');
const errorEl = document.getElementById('form-error');
const resultEl = document.getElementById('lookup-result');

const params = new URLSearchParams(location.search);
const prefillCode = params.get('code');
const prefillPhone = params.get('phone');
if (prefillCode) document.getElementById('code').value = prefillCode;
if (prefillPhone) document.getElementById('phone').value = prefillPhone;
if (prefillCode && prefillPhone) lookup(prefillCode, prefillPhone);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  lookup(fd.get('code'), fd.get('phone'));
});

async function lookup(code, phone) {
  errorEl.classList.remove('show');
  resultEl.innerHTML = '';
  try {
    const { data: order } = await apiFetch(`/orders/lookup?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`);
    render(order);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
  }
}

function render(order) {
  resultEl.innerHTML = `
    <div class="panel">
      <div class="order-head">
        <span class="oid text-lg">Đơn hàng #${order.id}</span>
        <span class="pill ${ORDER_STATUS_CLASS[order.status] || 'pill-pending'}">${ORDER_STATUS_LABEL[order.status] || escapeHtml(order.status)}</span>
        <span class="pill ${PAYMENT_STATUS_CLASS[order.paymentStatus] || 'pill-pending'}">${PAYMENT_STATUS_LABEL[order.paymentStatus] || escapeHtml(order.paymentStatus)}</span>
        <span class="date ml-auto">${formatDate(order.createdAt)}</span>
      </div>

      <div class="cart-layout">
        <div>
          <h3>Thông tin nhận hàng</h3>
          <table class="kv-table">
            <tr><td>Người nhận</td><td>${escapeHtml(order.guestName || '—')}</td></tr>
            <tr><td>Số điện thoại</td><td>${escapeHtml(order.guestPhone || '—')}</td></tr>
            <tr><td>Địa chỉ</td><td>${escapeHtml(order.guestAddress || '—')}</td></tr>
            <tr><td>Phương thức thanh toán</td><td>${PAYMENT_METHOD_LABEL[order.paymentMethod] || escapeHtml(order.paymentMethod)}</td></tr>
            ${order.note ? `<tr><td>Ghi chú</td><td>${escapeHtml(order.note)}</td></tr>` : ''}
          </table>
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
    </div>`;
}
