import { apiFetch, formatDate, thumbGradient, initials } from '../api.js';
import { renderLayout, escapeHtml } from '../layout.js';

renderLayout({});
loadNews();

async function loadNews() {
  const grid = document.getElementById('news-grid');
  const countEl = document.getElementById('news-count');
  try {
    const { data, pagination } = await apiFetch('/news?limit=24');
    countEl.textContent = `${pagination.total} bài viết`;

    if (data.length === 0) {
      grid.innerHTML = `<div class="empty-state col-span-full"><div class="big-icon">📰</div><p>Chưa có bài viết nào.</p></div>`;
      return;
    }

    grid.innerHTML = data.map(newsCard).join('');
    grid.querySelectorAll('[data-thumb-name]').forEach((el) => {
      el.style.background = thumbGradient(el.dataset.thumbName);
    });
  } catch (err) {
    grid.innerHTML = `<div class="empty-state col-span-full">Không tải được tin tức: ${escapeHtml(err.message)}</div>`;
  }
}

function newsCard(n) {
  const href = `/news-detail.html?slug=${encodeURIComponent(n.slug)}`;
  return `
    <a class="card" href="${href}">
      <div class="news-thumb" data-thumb-name="${escapeHtml(n.title)}">${escapeHtml(initials(n.title))}</div>
      <div class="card-body">
        <div class="news-date">${formatDate(n.publishedAt)}</div>
        <div class="card-name">${escapeHtml(n.title)}</div>
        <div class="news-summary">${escapeHtml(n.summary || '')}</div>
      </div>
    </a>`;
}
