import { apiFetch, formatDate, thumbGradient, initials } from '../api.js';
import { renderLayout, escapeHtml } from '../layout.js';

renderLayout({});

const slug = new URLSearchParams(location.search).get('slug');
const el = document.getElementById('news-detail');

if (!slug) {
  el.innerHTML = emptyState('Thiếu bài viết.');
} else {
  loadNews();
}

async function loadNews() {
  try {
    const { data: news } = await apiFetch(`/news/${encodeURIComponent(slug)}`);
    document.title = `${news.title} — BRG Shopping`;
    document.getElementById('crumb-title').textContent = news.title;
    render(news);
  } catch (err) {
    el.innerHTML = emptyState(`Không tải được bài viết: ${err.message}`);
  }
}

function render(news) {
  // Rendered as a CSS gradient placeholder rather than a real <img src>, same
  // as product/category thumbnails: the storefront has no real image assets
  // and the CSP's img-src is locked to 'self', so an admin-entered external
  // imageUrl couldn't actually load here anyway.
  el.innerHTML = `
    <article class="panel">
      <div class="article-cover" data-thumb-name="${escapeHtml(news.title)}">${escapeHtml(initials(news.title))}</div>
      <h1 class="text-[22px] mb-2">${escapeHtml(news.title)}</h1>
      <div class="article-meta">Đăng ngày ${formatDate(news.publishedAt)}</div>
      <div class="article-body">${escapeHtml(news.content)}</div>
    </article>`;
  document.querySelectorAll('[data-thumb-name]').forEach((elx) => { elx.style.background = thumbGradient(elx.dataset.thumbName); });
}

function emptyState(message) {
  return `<div class="empty-state"><div class="big-icon">📰</div><p>${escapeHtml(message)}</p></div>`;
}
