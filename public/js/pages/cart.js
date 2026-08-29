import { apiFetch, formatVND, thumbGradient, initials, requireAuth, showToast } from '../api.js';
import { renderLayout, refreshCartCount, escapeHtml } from '../layout.js';

renderLayout({});

if (requireAuth()) {
  loadCart();
}

async function loadCart() {
  const el = document.getElementById('cart-content');
  try {
    const { data } = await apiFetch('/cart');

    if (data.items.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="big-icon">🛒</div>
          <p>Giỏ hàng của bạn đang trống.</p>
          <p style="margin-top:14px;"><a class="btn btn-primary" href="/index.html">Tiếp tục mua sắm</a></p>
        </div>`;
      return;
    }

    const total = data.items.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);

    el.innerHTML = `
      <div class="cart-layout">
        <div class="panel" id="cart-items">
          ${data.items.map(cartRow).join('')}
        </div>
        <div class="panel">
          <h3>Tóm tắt đơn hàng</h3>
          <div class="summary-row"><span>Tạm tính</span><span class="val">${formatVND(total)}</span></div>
          <div class="summary-row"><span>Vận chuyển</span><span class="val">${total >= 500000 ? 'Miễn phí' : formatVND(20000)}</span></div>
          <div class="summary-row total"><span>Tổng cộng</span><span class="val">${formatVND(total >= 500000 ? total : total + 20000)}</span></div>
          <a class="btn btn-primary btn-block" style="margin-top:16px;" href="/checkout.html">Tiến hành thanh toán</a>
        </div>
      </div>`;

    wireRowActions();
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Không tải được giỏ hàng: ${escapeHtml(err.message)}</div>`;
  }
}

function cartRow(item) {
  const p = item.product;
  return `
    <div class="cart-row" data-item="${item.id}">
      <div class="thumb" style="background:${thumbGradient(p?.name || 'SP')}">${escapeHtml(initials(p?.name || 'SP'))}</div>
      <div>
        <a href="/product.html?slug=${p?.slug || ''}" class="cart-row-name">${escapeHtml(p?.name || 'Sản phẩm đã bị xoá')}</a>
        <div class="cart-row-price">${formatVND(item.priceAtAdd)} / sản phẩm</div>
      </div>
      <div class="qty">
        <button type="button" data-step="-1">−</button>
        <span class="qty-value">${item.quantity}</span>
        <button type="button" data-step="1">+</button>
      </div>
      <div style="display:flex; align-items:center; gap:14px;">
        <div class="cart-row-total">${formatVND(Number(item.priceAtAdd) * item.quantity)}</div>
        <button class="btn btn-ghost btn-sm" data-remove title="Xoá">✕</button>
      </div>
    </div>`;
}

function wireRowActions() {
  document.querySelectorAll('.cart-row').forEach((row) => {
    const itemId = row.dataset.item;
    const qtyEl = row.querySelector('.qty-value');

    row.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const next = Number(qtyEl.textContent) + Number(btn.dataset.step);
        if (next < 1) return;
        try {
          await apiFetch(`/cart/items/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity: next }) });
          loadCart();
          refreshCartCount();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    row.querySelector('[data-remove]').addEventListener('click', async () => {
      try {
        await apiFetch(`/cart/items/${itemId}`, { method: 'DELETE' });
        showToast('Đã xoá sản phẩm khỏi giỏ hàng');
        loadCart();
        refreshCartCount();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}
