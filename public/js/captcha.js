import { apiFetch } from './api.js';

// Shared by login.js and register.js. The captcha SVG comes from
// GET /api/auth/captcha (self-hosted, see src/controllers/auth.controller.js
// — no external service involved) and is inserted directly as markup, not
// via an <img src>, so it renders under this app's strict CSP with no
// exceptions needed.
export function initCaptcha(imgElId, refreshBtnId) {
  const imgEl = document.getElementById(imgElId);
  const refreshBtn = document.getElementById(refreshBtnId);
  let captchaId = null;

  async function refresh() {
    imgEl.textContent = '...';
    try {
      const { data } = await apiFetch('/auth/captcha');
      captchaId = data.captchaId;
      imgEl.innerHTML = data.svg;
    } catch {
      captchaId = null;
      imgEl.textContent = 'Không tải được mã, bấm để thử lại';
    }
  }

  refreshBtn.addEventListener('click', refresh);
  refresh();

  return {
    getId: () => captchaId,
    refresh,
  };
}
