// In-memory captcha answers, single PM2 instance only (this app is always
// deployed as one process — see docs/DEPLOYMENT.md — never `pm2 start -i
// max`, so there's no cross-process sharing problem to solve here). Same
// constraint already applies to express-rate-limit's default store.
const store = new Map();
const TTL_MS = 5 * 60 * 1000;

function save(id, text) {
  store.set(id, { text: text.toLowerCase(), expiresAt: Date.now() + TTL_MS });
}

// Single-use: the entry is removed whether or not it matches, so a captured
// or guessed answer can't be replayed.
function verify(id, input) {
  const entry = store.get(id);
  store.delete(id);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) return false;
  return entry.text === String(input || '').trim().toLowerCase();
}

module.exports = { save, verify };
