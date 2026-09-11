import { apiFetch } from '../api.js';
import { renderLayout, escapeHtml } from '../layout.js';
import { promoCard } from '../promoHelpers.js';

renderLayout({});
loadPromotions();

async function loadPromotions() {
  const grid = document.getElementById('promo-grid');
  const countEl = document.getElementById('promo-count');
  try {
    const { data } = await apiFetch('/promotions');
    countEl.textContent = `${data.length} chương trình`;

    if (data.length === 0) {
      grid.innerHTML = `<div class="empty-state col-span-full"><div class="big-icon">🎁</div><p>Hiện chưa có chương trình khuyến mại nào đang diễn ra.</p></div>`;
      return;
    }

    grid.innerHTML = data.map(promoCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state col-span-full">Không tải được khuyến mại: ${escapeHtml(err.message)}</div>`;
  }
}
