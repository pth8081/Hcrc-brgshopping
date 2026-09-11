import { apiFetch, formatVND, initials, getToken, showToast, applyThumbGradients } from './api.js';
import { refreshCartCount, escapeHtml } from './layout.js';

// Shared product-card markup + "add to cart" wiring, reused by the homepage,
// product detail (related products) and any other grid of full Product
// records (id, name, slug, price, salePrice, stockQuantity, category).
export function productCard(p) {
  const hasSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const displayPrice = hasSale ? p.salePrice : p.price;
  const href = `/product.html?slug=${encodeURIComponent(p.slug)}`;
  return `
    <div class="card">
      <a href="${href}">
        <div class="thumb" data-thumb-name="${escapeHtml(p.name)}">
          ${hasSale ? '<span class="sale-badge">Giảm giá</span>' : ''}
          ${escapeHtml(initials(p.name))}
        </div>
      </a>
      <div class="card-body">
        <div class="card-cat">${escapeHtml(p.category?.name || 'Chưa phân loại')}</div>
        <a href="${href}"><div class="card-name">${escapeHtml(p.name)}</div></a>
        <div class="card-price">
          <span class="price-now">${formatVND(displayPrice)}</span>
          ${hasSale ? `<span class="price-old">${formatVND(p.price)}</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn btn-primary btn-block btn-sm" data-add="${p.id}" ${p.stockQuantity <= 0 ? 'disabled' : ''}>
            ${p.stockQuantity <= 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
          </button>
        </div>
      </div>
    </div>`;
}

// A lighter card for "recently viewed" entries, which only carry the few
// fields cached client-side in localStorage — no stock info, so no
// add-to-cart button (it could be stale by the time the visitor returns).
export function recentlyViewedCard(p) {
  const hasSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const displayPrice = hasSale ? p.salePrice : p.price;
  const href = `/product.html?slug=${encodeURIComponent(p.slug)}`;
  return `
    <a class="card" href="${href}">
      <div class="thumb" data-thumb-name="${escapeHtml(p.name)}">${escapeHtml(initials(p.name))}</div>
      <div class="card-body">
        <div class="card-cat">${escapeHtml(p.categoryName || 'Chưa phân loại')}</div>
        <div class="card-name">${escapeHtml(p.name)}</div>
        <div class="card-price">
          <span class="price-now">${formatVND(displayPrice)}</span>
          ${hasSale ? `<span class="price-old">${formatVND(p.price)}</span>` : ''}
        </div>
      </div>
    </a>`;
}

export function renderProductGrid(grid, products, cardFn = productCard) {
  grid.innerHTML = products.map(cardFn).join('');
  applyThumbGradients(grid);
  wireAddToCart(grid);
}

export function wireAddToCart(grid) {
  grid.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      addToCart(btn.dataset.add, btn);
    });
  });
}

async function addToCart(productId, btn) {
  if (!getToken()) {
    window.location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    return;
  }
  btn.disabled = true;
  try {
    await apiFetch('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId: Number(productId), quantity: 1 }),
    });
    showToast('Đã thêm vào giỏ hàng');
    refreshCartCount();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}
