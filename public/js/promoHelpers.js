import { formatVND } from './api.js';
import { escapeHtml } from './layout.js';

export function discountLabel(p) {
  return p.discountType === 'percent' ? `-${Number(p.discountValue)}%` : `-${formatVND(p.discountValue)}`;
}

export function promoCard(p) {
  const endDate = new Date(p.endDate).toLocaleDateString('vi-VN');
  return `
    <div class="promo-card">
      <div class="promo-card-head">
        <span>${escapeHtml(p.title)}</span>
        <span class="amount">${discountLabel(p)}</span>
      </div>
      <div class="promo-card-body">
        ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ''}
        ${Number(p.minOrderAmount) > 0 ? `<p>Áp dụng cho đơn từ ${formatVND(p.minOrderAmount)}</p>` : ''}
      </div>
      <div class="promo-card-foot">
        ${p.code ? `<span class="coupon-code">${escapeHtml(p.code)}</span>` : '<span></span>'}
        <span class="promo-expiry">HSD: ${endDate}</span>
      </div>
    </div>`;
}
