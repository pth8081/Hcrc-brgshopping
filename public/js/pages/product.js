import { apiFetch, formatVND, thumbGradient, initials, getToken, showToast } from '../api.js';
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
      <div class="panel" style="display:grid; grid-template-columns:340px 1fr; gap:28px;">
        <div class="thumb" style="background:${thumbGradient(p.name)}; border-radius:12px; font-size:56px; position:relative;">
          ${hasSale ? '<span class="sale-badge">Giảm giá</span>' : ''}
          ${escapeHtml(initials(p.name))}
        </div>
        <div>
          <h1 style="font-size:24px;">${escapeHtml(p.name)}</h1>
          ${p.sku ? `<p style="color:var(--faint); font-size:13px; margin-top:6px;">SKU: ${escapeHtml(p.sku)}</p>` : ''}
          <div style="display:flex; align-items:baseline; gap:12px; margin:16px 0;">
            <span style="font:800 26px 'Be Vietnam Pro'; color:var(--accent-dark);">${formatVND(displayPrice)}</span>
            ${hasSale ? `<span class="price-old" style="font-size:15px;">${formatVND(p.price)}</span>` : ''}
          </div>
          <p style="color:var(--muted); max-width:60ch;">${escapeHtml(p.description || 'Chưa có mô tả cho sản phẩm này.')}</p>

          <div style="margin:20px 0; display:flex; align-items:center; gap:14px;">
            <span class="pill ${inStock ? 'pill-completed' : 'pill-cancelled'}">${inStock ? `Còn ${p.stockQuantity} sản phẩm` : 'Hết hàng'}</span>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
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
