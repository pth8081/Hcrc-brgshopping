import { apiFetch, setSession, mergeGuestCartIntoAccount } from '../api.js';
import { renderLayout } from '../layout.js';

renderLayout({});

const form = document.getElementById('register-form');
const errorEl = document.getElementById('form-error');

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
    const { data } = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: fd.get('fullName'),
        email: fd.get('email'),
        phone: fd.get('phone') || undefined,
        password: fd.get('password'),
      }),
    });
    setSession(data.token, data.user);
    await mergeGuestCartIntoAccount();
    window.location.href = '/index.html';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
  }
});
