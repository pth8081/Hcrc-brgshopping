import { apiFetch, formatVND, applyThumbGradients, initials, getToken, showToast } from '../api.js';
import { renderLayout, refreshCartCount, escapeHtml } from '../layout.js';

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
      <div class="panel grid grid-cols-[340px_1fr] gap-7">
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
    document.getElementById('add-btn')?.addEventListener('click', () => addToCart(p.id));
  } catch (err) {
    detailEl.innerHTML = emptyState(`Không tải được sản phẩm: ${err.message}`);
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

async function addToCart(productId) {
  if (!getToken()) {
    window.location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    return;
  }
  const quantity = Number(document.getElementById('qty-value').textContent);
  try {
    await apiFetch('/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity }) });
    showToast('Đã thêm vào giỏ hàng');
    refreshCartCount();
  } catch (err) {
    showToast(err.message, true);
  }
}

function emptyState(message) {
  return `<div class="empty-state"><div class="big-icon">🔍</div><p>${escapeHtml(message)}</p></div>`;
}
