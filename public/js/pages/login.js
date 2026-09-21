import { apiFetch, setSession, mergeGuestCartIntoAccount, showToast } from '../api.js';
import { renderLayout } from '../layout.js';

renderLayout({});

const form = document.getElementById('login-form');
const errorEl = document.getElementById('form-error');
const next = new URLSearchParams(location.search).get('next') || '/index.html';

if (new URLSearchParams(location.search).get('oauth') === 'not_configured') {
  showToast('Đăng nhập Google/Facebook chưa được cấu hình trên server này', true);
} else if (new URLSearchParams(location.search).get('oauth') === 'error') {
  showToast('Đăng nhập thất bại, vui lòng thử lại', true);
}

document.getElementById('google-login-btn')?.addEventListener('click', () => {
  window.location.href = '/api/auth/google';
});
document.getElementById('facebook-login-btn')?.addEventListener('click', () => {
  window.location.href = '/api/auth/facebook';
});

apiFetch('/config/public')
  .then(({ data }) => {
    if (data.googleLoginEnabled) document.getElementById('google-login-btn').hidden = false;
    if (data.facebookLoginEnabled) document.getElementById('facebook-login-btn').hidden = false;
    if (data.googleLoginEnabled || data.facebookLoginEnabled) document.getElementById('social-login').hidden = false;
  })
  .catch(() => {});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.remove('show');

  const fd = new FormData(form);
  try {
    const { data } = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
    });
    setSession(data.token, data.user);
    await mergeGuestCartIntoAccount();
    window.location.href = next;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
  }
});
