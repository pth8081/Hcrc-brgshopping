import { apiFetch, formatVND, thumbGradient, initials, getToken, showToast } from '../api.js';
import { renderLayout, refreshCartCount, escapeHtml } from '../layout.js';

const params = new URLSearchParams(location.search);
const categoryId = params.get('category');
const search = params.get('q');

renderLayout({ activeCategoryId: categoryId });
loadProducts();

async function loadProducts() {
  const grid = document.getElementById('product-grid');
  const titleEl = document.getElementById('list-title');
  const countEl = document.getElementById('list-count');

  const query = new URLSearchParams();
  if (categoryId) query.set('categoryId', categoryId);
  if (search) query.set('search', search);
  query.set('limit', '24');

  try {
    const { data, pagination } = await apiFetch(`/products?${query.toString()}`);

    if (search) titleEl.textContent = `Kết quả cho "${search}"`;
    else if (categoryId && data[0]) titleEl.textContent = data[0].category?.name || 'Sản phẩm';
    else titleEl.textContent = 'Tất cả sản phẩm';
    countEl.textContent = `${pagination.total} sản phẩm`;

    if (data.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="big-icon">🛍️</div>
          <p>Chưa có sản phẩm nào ở đây.</p>
        </div>`;
      return;
    }

    grid.innerHTML = data.map(productCard).join('');
    grid.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        addToCart(btn.dataset.add, btn);
      });
    });
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Không tải được sản phẩm: ${escapeHtml(err.message)}</div>`;
  }
}

function productCard(p) {
  const hasSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const displayPrice = hasSale ? p.salePrice : p.price;
  const href = `/product.html?slug=${encodeURIComponent(p.slug)}`;
  return `
    <div class="card">
      <a href="${href}">
        <div class="thumb" style="background:${thumbGradient(p.name)}">
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
