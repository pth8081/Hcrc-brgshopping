import { apiFetch, requireAuth, showToast } from '../api.js';
import { renderLayout } from '../layout.js';

renderLayout({});

if (requireAuth()) {
  init();
}

async function init() {
  const form = document.getElementById('change-password-form');
  const errorEl = document.getElementById('form-error');
  const currentPasswordRow = document.getElementById('current-password-row');
  const currentPasswordInput = document.getElementById('currentPassword');
  const socialOnlyNote = document.getElementById('social-only-note');

  try {
    const { data: user } = await apiFetch('/auth/me');
    if (!user.hasPassword) {
      currentPasswordRow.hidden = true;
      currentPasswordInput.required = false;
      socialOnlyNote.hidden = false;
    }
  } catch {
    // If this fails, just leave the current-password field visible/required — the safer default.
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('show');

    const fd = new FormData(form);
    const newPassword = fd.get('newPassword');
    if (newPassword !== fd.get('confirmPassword')) {
      errorEl.textContent = 'Mật khẩu nhập lại không khớp';
      errorEl.classList.add('show');
      return;
    }

    try {
      await apiFetch('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: fd.get('currentPassword') || undefined, newPassword }),
      });
      showToast('Đã đổi mật khẩu thành công');
      form.reset();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('show');
    }
  });
}
