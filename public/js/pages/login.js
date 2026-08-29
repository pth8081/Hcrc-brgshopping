import { apiFetch, setSession } from '../api.js';
import { renderLayout } from '../layout.js';

renderLayout({});

const form = document.getElementById('login-form');
const errorEl = document.getElementById('form-error');
const next = new URLSearchParams(location.search).get('next') || '/index.html';

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
    window.location.href = next;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add('show');
  }
});
