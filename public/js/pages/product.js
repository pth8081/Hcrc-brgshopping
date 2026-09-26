import { apiFetch, formatVND, applyThumbGradients, initials, getToken, showToast, pushRecentlyViewed, addToGuestCart } from '../api.js';
import { renderLayout, refreshCartCount, escapeHtml } from '../layout.js';
import { renderProductGrid } from '../productGrid.js';

const slug = new URLSearchParams(location.search).get('slug');
const detailEl = document.getElementById('product-detail');

renderLayout({});
loadProduct();

async function loadProduct() {
  if (!slug) {
    detailEl.innerHTML = emptyState('Không tìm thấy sản phẩm.');
    return;
  }

  try {
    const { data: p } = await apiFetch(`/products/${encodeURIComponent(slug)}`);
    document.title = `${p.name} — BRG Shopping`;

    const cat = p.category;
    document.getElementById('crumb-cat').innerHTML = cat
      ? `<a href="/index.html?category=${cat.id}">${escapeHtml(cat.name)}</a>`
      : 'Sản phẩm';

    const hasSale = p.salePrice && Number(p.salePrice) < Number(p.price);
    const displayPrice = hasSale ? p.salePrice : p.price;
    const inStock = p.stockQuantity > 0;

    detailEl.innerHTML = `
      <div class="panel product-detail-grid">
        <div class="thumb rounded-xl text-[56px] relative" data-thumb-name="${escapeHtml(p.name)}">
          ${hasSale ? '<span class="sale-badge">Giảm giá</span>' : ''}
          ${escapeHtml(initials(p.name))}
        </div>
        <div>
          <h1 class="text-[24px]">${escapeHtml(p.name)}</h1>
          ${p.sku ? `<p class="text-faint text-[13px] mt-1.5">SKU: ${escapeHtml(p.sku)}</p>` : ''}
          <div class="flex items-baseline gap-3 my-4">
            <span class="text-[26px] font-extrabold text-brand-dark">${formatVND(displayPrice)}</span>
            ${hasSale ? `<span class="price-old text-[15px]">${formatVND(p.price)}</span>` : ''}
          </div>
          <p class="text-muted max-w-[60ch]">${escapeHtml(p.description || 'Chưa có mô tả cho sản phẩm này.')}</p>

          <div class="my-5 flex items-center gap-3.5">
            <span class="pill ${inStock ? 'pill-completed' : 'pill-cancelled'}">${inStock ? `Còn ${p.stockQuantity} sản phẩm` : 'Hết hàng'}</span>
          </div>

          <div class="flex items-center gap-3">
            <div class="qty" id="qty-picker">
              <button type="button" data-step="-1">−</button>
              <span id="qty-value">1</span>
              <button type="button" data-step="1">+</button>
            </div>
            <button class="btn btn-primary" id="add-btn" ${inStock ? '' : 'disabled'}>Thêm vào giỏ hàng</button>
          </div>
        </div>
      </div>
    `;

    applyThumbGradients(detailEl);
    wireQty();
    document.getElementById('add-btn')?.addEventListener('click', () => addToCart(p));

    pushRecentlyViewed(p);
    apiFetch(`/products/${p.id}/view`, { method: 'POST' }).catch(() => {});
    loadRelated(p);
    loadAlsoBought(p);
  } catch (err) {
    detailEl.innerHTML = emptyState(`Không tải được sản phẩm: ${err.message}`);
  }
}

async function loadRelated(product) {
  const section = document.getElementById('related-section');
  const grid = document.getElementById('related-grid');
  if (!product.categoryId) return;

  try {
    const { data } = await apiFetch(`/products?categoryId=${product.categoryId}&limit=9`);
    const related = data.filter((p) => p.id !== product.id).slice(0, 8);
    if (related.length === 0) return;
    renderProductGrid(grid, related);
    section.hidden = false;
  } catch {
    section.hidden = true;
  }
}

async function loadAlsoBought(product) {
  const section = document.getElementById('also-bought-section');
  const grid = document.getElementById('also-bought-grid');

  try {
    const { data } = await apiFetch(`/products/${product.id}/also-bought?limit=8`);
    if (data.length === 0) return;
    renderProductGrid(grid, data);
    section.hidden = false;
  } catch {
    section.hidden = true;
  }
}

function wireQty() {
  const valueEl = document.getElementById('qty-value');
  document.querySelectorAll('#qty-picker [data-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = Number(valueEl.textContent) + Number(btn.dataset.step);
      valueEl.textContent = String(Math.max(1, next));
    });
  });
}

async function addToCart(product) {
  const quantity = Number(document.getElementById('qty-value').textContent);

  if (!getToken()) {
    addToGuestCart(product, quantity);
    showToast('Đã thêm vào giỏ hàng');
    refreshCartCount();
    return;
  }

  try {
    await apiFetch('/cart/items', { method: 'POST', body: JSON.stringify({ productId: product.id, quantity }) });
    showToast('Đã thêm vào giỏ hàng');
    refreshCartCount();
  } catch (err) {
    showToast(err.message, true);
  }
}

function emptyState(message) {
  return `<div class="empty-state"><div class="big-icon">🔍</div><p>${escapeHtml(message)}</p></div>`;
}
