import { apiFetch, formatVND, requireAuth, showToast } from '../api.js';
import { renderLayout, refreshCartCount, escapeHtml } from '../layout.js';

renderLayout({});

if (requireAuth()) {
  loadCheckout();
}

async function loadCheckout() {
  const el = document.getElementById('checkout-content');
  try {
    const { data } = await apiFetch('/cart');

    if (data.items.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="big-icon">🧾</div>
          <p>Giỏ hàng trống, không có gì để thanh toán.</p>
          <p style="margin-top:14px;"><a class="btn btn-primary" href="/index.html">Về trang chủ</a></p>
        </div>`;
      return;
    }

    const total = data.items.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);
    const shipping = total >= 500000 ? 0 : 20000;

    el.innerHTML = `
      <div class="cart-layout">
        <div class="panel">
          <h3>Thông tin giao hàng</h3>
          <div class="form-error" id="form-error"></div>
          <form id="checkout-form">
            <div class="form-grid">
              <div class="form-row">
                <label for="recipientName">Họ tên người nhận</label>
                <input id="recipientName" name="recipientName" required>
              </div>
              <div class="form-row">
                <label for="phone">Số điện thoại</label>
                <input id="phone" name="phone" required>
              </div>
            </div>
            <div class="form-row">
              <label for="address">Địa chỉ giao hàng</label>
              <textarea id="address" name="address" rows="2" required placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"></textarea>
            </div>
            <div class="form-row">
              <label for="paymentMethod">Phương thức thanh toán</label>
              <select id="paymentMethod" name="paymentMethod">
                <option value="cod">Thanh toán khi nhận hàng (COD)</option>
                <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                <option value="e_wallet">Ví điện tử</option>
              </select>
            </div>
            <div class="form-row">
              <label for="note">Ghi chú (tuỳ chọn)</label>
              <textarea id="note" name="note" rows="2" placeholder="Giao giờ hành chính..."></textarea>
            </div>
            <button class="btn btn-primary btn-block" type="submit">Đặt hàng — ${formatVND(total + shipping)}</button>
          </form>
        </div>

        <div class="panel">
          <h3>Đơn hàng (${data.items.length} sản phẩm)</h3>
          ${data.items
            .map(
              (item) => `
            <div class="order-item-row">
              <span>${escapeHtml(item.product?.name || 'Sản phẩm')} × ${item.quantity}</span>
              <span>${formatVND(Number(item.priceAtAdd) * item.quantity)}</span>
            </div>`
            )
            .join('')}
          <div class="summary-row"><span>Tạm tính</span><span class="val">${formatVND(total)}</span></div>
          <div class="summary-row"><span>Vận chuyển</span><span class="val">${shipping ? formatVND(shipping) : 'Miễn phí'}</span></div>
          <div class="summary-row total"><span>Tổng cộng</span><span class="val">${formatVND(total + shipping)}</span></div>
        </div>
      </div>`;

    document.getElementById('checkout-form').addEventListener('submit', (e) => submitOrder(e));
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Không tải được giỏ hàng: ${escapeHtml(err.message)}</div>`;
  }
}

async function submitOrder(e) {
  e.preventDefault();
  const errorEl = document.getElementById('form-error');
  errorEl.classList.remove('show');

  const fd = new FormData(e.target);
  const note = [
    `Người nhận: ${fd.get('recipientName')} (${fd.get('phone')})`,
    `Địa chỉ: ${fd.get('address')}`,
    fd.get('note') ? `Ghi chú: ${fd.get('note')}` : null,
  ]
    .filter(Boolean)
    .join(' — ');

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const { data: order } = await apiFetch('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify({ paymentMethod: fd.get('paymentMethod'), note }),
    });
    refreshCartCount();
    showToast(`Đặt hàng thành công — mã đơn #${order.id}`);
    window.location.href = '/orders.html';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
    submitBtn.disabled = false;
  }
}
