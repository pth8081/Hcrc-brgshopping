import { apiFetch, getRecentlyViewed, getToken, applyThumbGradients } from '../api.js';
import { renderLayout, escapeHtml } from '../layout.js';
import { categoryIcon } from '../icons.js';
import { promoCard } from '../promoHelpers.js';
import { renderProductGrid, recentlyViewedCard } from '../productGrid.js';

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
  loadCampaigns();
  loadForYou();
  loadBestSellers();
  renderRecentlyViewed();
} else {
  document.getElementById('hero-carousel').hidden = true;
  document.getElementById('promo-banner').hidden = true;
}

async function loadCampaigns() {
  const section = document.getElementById('campaign-section');
  const grid = document.getElementById('campaign-grid');
  try {
    const { data } = await apiFetch('/promotions');
    if (data.length === 0) return;
    grid.innerHTML = data.slice(0, 3).map(promoCard).join('');
    section.hidden = false;
  } catch {
    section.hidden = true;
  }
}

async function loadForYou() {
  const section = document.getElementById('foryou-section');
  const grid = document.getElementById('foryou-grid');
  if (!getToken()) return;

  try {
    const { data } = await apiFetch('/recommendations/for-you?limit=8');
    if (data.length === 0) return;
    renderProductGrid(grid, data);
    section.hidden = false;
  } catch {
    section.hidden = true;
  }
}

async function loadBestSellers() {
  const section = document.getElementById('bestseller-section');
  const grid = document.getElementById('bestseller-grid');
  try {
    const { data } = await apiFetch('/products/best-sellers?limit=8');
    if (data.length === 0) return;
    renderProductGrid(grid, data);
    section.hidden = false;
  } catch {
    section.hidden = true;
  }
}

function renderRecentlyViewed() {
  const section = document.getElementById('recent-section');
  const grid = document.getElementById('recent-grid');
  const items = getRecentlyViewed();
  if (items.length === 0) return;
  grid.innerHTML = items.map(recentlyViewedCard).join('');
  applyThumbGradients(grid);
  section.hidden = false;
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

    const ordered = isHomepage && getToken() ? await personalizeOrder(data) : data;
    renderProductGrid(grid, ordered);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state col-span-full">Không tải được sản phẩm: ${escapeHtml(err.message)}</div>`;
  }
}

// Nudges the default "Tất cả sản phẩm" grid toward a logged-in visitor's
// interests: products from their top affinity categories float to the top,
// everything else keeps its original relative order. Falls back to the
// untouched list for guests or anyone with no view/purchase history yet.
async function personalizeOrder(products) {
  try {
    const { data: topCategoryIds } = await apiFetch('/recommendations/top-categories');
    if (topCategoryIds.length === 0) return products;
    const rank = new Map(topCategoryIds.map((id, i) => [id, i]));
    return products
      .map((p, i) => ({ p, i, r: rank.has(p.categoryId) ? rank.get(p.categoryId) : Infinity }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((entry) => entry.p);
  } catch {
    return products;
  }
}
