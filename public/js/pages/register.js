import { apiFetch, setSession } from '../api.js';
import { renderLayout } from '../layout.js';

renderLayout({});

const form = document.getElementById('register-form');
const errorEl = document.getElementById('form-error');

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
    window.location.href = '/index.html';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
  }
});
