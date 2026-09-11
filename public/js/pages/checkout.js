import { apiFetch, formatVND, requireAuth, showToast } from '../api.js';
import { renderLayout, refreshCartCount, escapeHtml } from '../layout.js';

renderLayout({});

let subtotal = 0;
let shippingFee = 0;
let appliedPromo = null; // { code, promotionId, title, discountAmount }

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
          <p class="mt-3.5"><a class="btn btn-primary" href="/index.html">Về trang chủ</a></p>
        </div>`;
      return;
    }

    subtotal = data.items.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);
    const shipping = subtotal >= 500000 ? 0 : 20000;
    shippingFee = shipping;

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
            <div id="payment-info" class="info-note"></div>
            <div class="form-row">
              <label for="note">Ghi chú (tuỳ chọn)</label>
              <textarea id="note" name="note" rows="2" placeholder="Giao giờ hành chính..."></textarea>
            </div>
            <button class="btn btn-primary btn-block" type="submit" id="submit-btn">Đặt hàng — ${formatVND(subtotal + shipping)}</button>
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
          <div class="form-row mt-2.5">
            <label for="promoCode">Mã khuyến mại</label>
            <div class="flex gap-2">
              <input id="promoCode" placeholder="Nhập mã (nếu có)" class="flex-1">
              <button type="button" class="btn btn-outline btn-sm" id="apply-promo-btn">Áp dụng</button>
            </div>
            <div class="form-error" id="promo-error"></div>
          </div>
          <div id="summary-rows"></div>
        </div>
      </div>`;

    renderSummary();
    document.getElementById('checkout-form').addEventListener('submit', (e) => submitOrder(e));
    document.getElementById('paymentMethod').addEventListener('change', updatePaymentInfo);
    document.getElementById('apply-promo-btn').addEventListener('click', applyPromoCode);
    updatePaymentInfo();
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Không tải được giỏ hàng: ${escapeHtml(err.message)}</div>`;
  }
}

const PAYMENT_INFO = {
  bank_transfer:
    'Chuyển khoản tới: <strong>Ngân hàng ABC — STK 0123456789 — CTY TNHH BRG</strong>. Nội dung: số điện thoại của bạn. Đơn hàng sẽ được xác nhận thanh toán sau khi cửa hàng nhận được tiền.',
  e_wallet: 'Sau khi đặt hàng, nhân viên sẽ liên hệ gửi mã QR ví điện tử để thanh toán.',
};

function renderSummary() {
  const total = subtotal - (appliedPromo?.discountAmount || 0) + shippingFee;
  document.getElementById('summary-rows').innerHTML = `
    <div class="summary-row"><span>Tạm tính</span><span class="val">${formatVND(subtotal)}</span></div>
    ${
      appliedPromo
        ? `<div class="summary-row"><span>Khuyến mại (${escapeHtml(appliedPromo.code)})</span><span class="val">-${formatVND(appliedPromo.discountAmount)}</span></div>`
        : ''
    }
    <div class="summary-row"><span>Vận chuyển</span><span class="val">${shippingFee ? formatVND(shippingFee) : 'Miễn phí'}</span></div>
    <div class="summary-row total"><span>Tổng cộng</span><span class="val">${formatVND(total)}</span></div>`;
  document.getElementById('submit-btn').textContent = `Đặt hàng — ${formatVND(total)}`;
}

async function applyPromoCode() {
  const input = document.getElementById('promoCode');
  const errorEl = document.getElementById('promo-error');
  errorEl.classList.remove('show');
  const code = input.value.trim();
  if (!code) return;

  try {
    const { data } = await apiFetch('/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderTotal: subtotal }),
    });
    appliedPromo = { code, promotionId: data.promotionId, title: data.title, discountAmount: Number(data.discountAmount) };
    showToast(`Đã áp dụng mã ${code}`);
    renderSummary();
  } catch (err) {
    appliedPromo = null;
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
    renderSummary();
  }
}

function updatePaymentInfo() {
  const method = document.getElementById('paymentMethod').value;
  const box = document.getElementById('payment-info');
  if (PAYMENT_INFO[method]) {
    box.innerHTML = PAYMENT_INFO[method];
    box.classList.add('show');
  } else {
    box.classList.remove('show');
  }
}

async function submitOrder(e) {
  e.preventDefault();
  const errorEl = document.getElementById('form-error');
  errorEl.classList.remove('show');

  const fd = new FormData(e.target);
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const { data: order } = await apiFetch('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: fd.get('recipientName'),
        phone: fd.get('phone'),
        addressLine: fd.get('address'),
        paymentMethod: fd.get('paymentMethod'),
        note: fd.get('note') || undefined,
        promoCode: appliedPromo?.code || undefined,
      }),
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
