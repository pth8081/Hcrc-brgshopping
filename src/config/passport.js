const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { User } = require('../models');

const GOOGLE_ENABLED = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const FACEBOOK_ENABLED = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);

// Links a Google/Facebook login to an existing account with the same email
// (so someone who registered by email can also sign in via social later),
// or creates a new customer account on first login.
async function findOrCreateSocialUser({ idField, providerId, email, name, avatarUrl }) {
  let user = await User.findOne({ where: { [idField]: providerId } });
  if (user) return user;

  if (email) {
    user = await User.findOne({ where: { email } });
    if (user) {
      user[idField] = providerId;
      if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
      await user.save();
      return user;
    }
  }

  return User.create({
    fullName: name || 'Khách hàng',
    email: email || `${idField}_${providerId}@no-email.brgshopping.local`,
    passwordHash: null,
    avatarUrl: avatarUrl || null,
    [idField]: providerId,
  });
}

if (GOOGLE_ENABLED) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateSocialUser({
          idField: 'googleId',
          providerId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  ));
}

if (FACEBOOK_ENABLED) {
  passport.use(new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'emails', 'photos'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateSocialUser({
          idField: 'facebookId',
          providerId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  ));
}

module.exports = { passport, GOOGLE_ENABLED, FACEBOOK_ENABLED };
