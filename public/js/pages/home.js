import { apiFetch, formatVND, applyThumbGradients, initials, getToken, showToast } from '../api.js';
import { renderLayout, refreshCartCount, escapeHtml } from '../layout.js';
import { categoryIcon } from '../icons.js';

const params = new URLSearchParams(location.search);
const categoryId = params.get('category');
const search = params.get('q');
const isHomepage = !categoryId && !search;

const HERO_SLIDES = [
  { tone: 'tone-brand', eyebrow: 'Ưu đãi hôm nay', title: 'Mua sắm dễ dàng, giao nhanh tận nơi', body: 'Toàn bộ sản phẩm dưới đây lấy trực tiếp từ API Node.js chạy trên MSSQL.' },
  { tone: 'tone-gold', eyebrow: 'Miễn phí vận chuyển', title: 'Freeship cho đơn hàng từ 500.000₫', body: 'Áp dụng cho tất cả sản phẩm, giao tận nơi trong 1–3 ngày làm việc.' },
  { tone: 'tone-slate', eyebrow: 'Thành viên mới', title: 'Đăng ký tài khoản để lưu đơn hàng', body: 'Theo dõi trạng thái đơn hàng và mua sắm nhanh hơn ở những lần sau.' },
];

renderLayout({ activeCategoryId: categoryId });
loadProducts();

if (isHomepage) {
  renderHero();
  loadCategoryGrid();
} else {
  document.getElementById('hero-carousel').hidden = true;
  document.getElementById('promo-banner').hidden = true;
}

function renderHero() {
  const el = document.getElementById('hero-carousel');
  el.innerHTML = `
    ${HERO_SLIDES.map(
      (s, i) => `
      <div class="hero-slide ${s.tone} ${i === 0 ? 'active' : ''}" data-slide="${i}">
        <span class="eyebrow2">${escapeHtml(s.eyebrow)}</span>
        <h2>${escapeHtml(s.title)}</h2>
        <p>${escapeHtml(s.body)}</p>
      </div>`
    ).join('')}
    <div class="hero-dots">
      ${HERO_SLIDES.map((_, i) => `<button data-dot="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i + 1}"></button>`).join('')}
    </div>
  `;

  let current = 0;
  const slides = el.querySelectorAll('.hero-slide');
  const dots = el.querySelectorAll('.hero-dots button');
  const show = (idx) => {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = idx;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  };
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
  setInterval(() => show((current + 1) % slides.length), 5000);
}

async function loadCategoryGrid() {
  const section = document.getElementById('catgrid-section');
  const grid = document.getElementById('catgrid');
  try {
    const { data } = await apiFetch('/categories');
    if (data.length === 0) return;
    grid.innerHTML = data
      .map(
        (c) => `
        <a class="cattile" href="/index.html?category=${c.id}">
          <span class="icon-box">${categoryIcon(c.name)}</span>
          <span>${escapeHtml(c.name)}</span>
        </a>`
      )
      .join('');
    section.hidden = false;
  } catch {
    section.hidden = true;
  }
}

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
        <div class="empty-state col-span-full">
          <div class="big-icon">🛍️</div>
          <p>Chưa có sản phẩm nào ở đây.</p>
        </div>`;
      return;
    }

    grid.innerHTML = data.map(productCard).join('');
    applyThumbGradients(grid);
    grid.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        addToCart(btn.dataset.add, btn);
      });
    });
  } catch (err) {
    grid.innerHTML = `<div class="empty-state col-span-full">Không tải được sản phẩm: ${escapeHtml(err.message)}</div>`;
  }
}

function productCard(p) {
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
