const { GOOGLE_ENABLED, FACEBOOK_ENABLED } = require('../config/passport');
const asyncHandler = require('../utils/asyncHandler');

// Public, unauthenticated: tells the frontend which optional integrations
// are actually configured on this deployment, so it can hide a "Login with
// Google" button or a chat channel whose credentials/link were never set,
// instead of showing something that fails when clicked.
const getPublicConfig = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      googleLoginEnabled: GOOGLE_ENABLED,
      facebookLoginEnabled: FACEBOOK_ENABLED,
      zaloUrl: process.env.ZALO_OA_URL || null,
      messengerUrl: process.env.MESSENGER_URL || null,
    },
  });
});

module.exports = { getPublicConfig };
