import { apiFetch, formatVND, applyThumbGradients, initials, getToken, showToast, getGuestCart, updateGuestCartItem, removeFromGuestCart } from '../api.js';
import { renderLayout, refreshCartCount, escapeHtml } from '../layout.js';

renderLayout({});

if (getToken()) {
  loadCart();
} else {
  loadGuestCart();
}

async function loadCart() {
  const el = document.getElementById('cart-content');
  try {
    const { data } = await apiFetch('/cart');

    if (data.items.length === 0) {
      el.innerHTML = emptyCartHtml();
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
          <a class="btn btn-primary btn-block mt-4" href="/checkout.html">Tiến hành thanh toán</a>
        </div>
      </div>`;

    applyThumbGradients(el);
    wireRowActions();
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Không tải được giỏ hàng: ${escapeHtml(err.message)}</div>`;
  }
}

// Guest (no account): the cart lives in localStorage with a price snapshot
// from when each item was added — same semantics as the server cart's
// priceAtAdd, just client-side. See getGuestCart() in public/js/api.js.
function loadGuestCart() {
  const el = document.getElementById('cart-content');
  const items = getGuestCart();

  if (items.length === 0) {
    el.innerHTML = emptyCartHtml();
    return;
  }

  const total = items.reduce((sum, item) => sum + Number(item.salePrice || item.price) * item.quantity, 0);

  el.innerHTML = `
    <div class="cart-layout">
      <div class="panel" id="cart-items">
        ${items.map(guestCartRow).join('')}
      </div>
      <div class="panel">
        <h3>Tóm tắt đơn hàng</h3>
        <div class="summary-row"><span>Tạm tính</span><span class="val">${formatVND(total)}</span></div>
        <div class="summary-row"><span>Vận chuyển</span><span class="val">${total >= 500000 ? 'Miễn phí' : formatVND(20000)}</span></div>
        <div class="summary-row total"><span>Tổng cộng</span><span class="val">${formatVND(total >= 500000 ? total : total + 20000)}</span></div>
        <a class="btn btn-primary btn-block mt-4" href="/checkout.html">Tiến hành thanh toán</a>
      </div>
    </div>`;

  applyThumbGradients(el);
  wireGuestRowActions();
}

function emptyCartHtml() {
  return `
    <div class="empty-state">
      <div class="big-icon">🛒</div>
      <p>Giỏ hàng của bạn đang trống.</p>
      <p class="mt-3.5"><a class="btn btn-primary" href="/index.html">Tiếp tục mua sắm</a></p>
    </div>`;
}

function cartRow(item) {
  const p = item.product;
  return `
    <div class="cart-row" data-item="${item.id}">
      <div class="thumb" data-thumb-name="${escapeHtml(p?.name || 'SP')}">${escapeHtml(initials(p?.name || 'SP'))}</div>
      <div class="cart-row-info">
        <a href="/product.html?slug=${encodeURIComponent(p?.slug || '')}" class="cart-row-name">${escapeHtml(p?.name || 'Sản phẩm đã bị xoá')}</a>
        <div class="cart-row-price">${formatVND(item.priceAtAdd)} / sản phẩm</div>
      </div>
      <div class="qty">
        <button type="button" data-step="-1">−</button>
        <span class="qty-value">${item.quantity}</span>
        <button type="button" data-step="1">+</button>
      </div>
      <div class="cart-row-end flex items-center gap-3.5">
        <div class="cart-row-total">${formatVND(Number(item.priceAtAdd) * item.quantity)}</div>
        <button class="btn btn-ghost btn-sm" data-remove title="Xoá">✕</button>
      </div>
    </div>`;
}

function guestCartRow(item) {
  const price = Number(item.salePrice || item.price);
  return `
    <div class="cart-row" data-product="${item.productId}">
      <div class="thumb" data-thumb-name="${escapeHtml(item.name)}">${escapeHtml(initials(item.name))}</div>
      <div class="cart-row-info">
        <a href="/product.html?slug=${encodeURIComponent(item.slug || '')}" class="cart-row-name">${escapeHtml(item.name)}</a>
        <div class="cart-row-price">${formatVND(price)} / sản phẩm</div>
      </div>
      <div class="qty">
        <button type="button" data-step="-1">−</button>
        <span class="qty-value">${item.quantity}</span>
        <button type="button" data-step="1">+</button>
      </div>
      <div class="cart-row-end flex items-center gap-3.5">
        <div class="cart-row-total">${formatVND(price * item.quantity)}</div>
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

function wireGuestRowActions() {
  document.querySelectorAll('.cart-row').forEach((row) => {
    const productId = Number(row.dataset.product);
    const qtyEl = row.querySelector('.qty-value');

    row.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = Number(qtyEl.textContent) + Number(btn.dataset.step);
        if (next < 1) return;
        updateGuestCartItem(productId, next);
        loadGuestCart();
        refreshCartCount();
      });
    });

    row.querySelector('[data-remove]').addEventListener('click', () => {
      removeFromGuestCart(productId);
      showToast('Đã xoá sản phẩm khỏi giỏ hàng');
      loadGuestCart();
      refreshCartCount();
    });
  });
}
