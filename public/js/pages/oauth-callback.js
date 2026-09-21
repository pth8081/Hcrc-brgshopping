import { apiFetch, setSession, setTokenOnly, mergeGuestCartIntoAccount, clearSession } from '../api.js';

const params = new URLSearchParams(location.search);
const token = params.get('token');

if (!token) {
  window.location.href = '/login.html?oauth=error';
} else {
  finishLogin(token);
}

async function finishLogin(token) {
  try {
    setTokenOnly(token);
    const { data: user } = await apiFetch('/auth/me');
    setSession(token, user);
    await mergeGuestCartIntoAccount();
    window.location.href = '/index.html';
  } catch {
    clearSession();
    window.location.href = '/login.html?oauth=error';
  }
}
