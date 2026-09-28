const { version: pkgVersion } = require('../../package.json');
const { GOOGLE_ENABLED, FACEBOOK_ENABLED } = require('../config/passport');
const asyncHandler = require('../utils/asyncHandler');

// package.json stays on standard 3-part npm semver (e.g. "1.4.0"), but the
// project's own changelog (version.md) uses a shorter "1 digit . 2 digits"
// scheme (e.g. "1.04") that rolls over to the next major at 99 — this reads
// the single source of truth (package.json) and reformats it, rather than
// keeping the version in two places that could drift apart.
function displayVersion(semver) {
  const [major, minor] = semver.split('.');
  return `${major}.${String(minor).padStart(2, '0')}`;
}

// Public, unauthenticated: tells the frontend which optional integrations
// are actually configured on this deployment, so it can hide a "Login with
// Google" button or a chat channel whose credentials/link were never set,
// instead of showing something that fails when clicked.
const getPublicConfig = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      version: displayVersion(pkgVersion),
      googleLoginEnabled: GOOGLE_ENABLED,
      facebookLoginEnabled: FACEBOOK_ENABLED,
      zaloUrl: process.env.ZALO_OA_URL || null,
      messengerUrl: process.env.MESSENGER_URL || null,
    },
  });
});

module.exports = { getPublicConfig };
