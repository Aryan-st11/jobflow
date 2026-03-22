const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { getAuthUrl, exchangeCodeForTokens } = require('../services/gmailService');

router.get('/google', (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.redirect(`${process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}?auth_error=${error}`);
  try {
    const { tokens, profile } = await exchangeCodeForTokens(code);
    let user = await User.findOne({ googleId: profile.id });
    if (!user) user = await User.findOne({ email: profile.email });
    if (!user) {
      user = new User({ googleId: profile.id, email: profile.email, name: profile.name, picture: profile.picture, googleTokens: tokens });
    } else {
      user.googleId = profile.id; user.googleTokens = tokens; user.name = profile.name; user.picture = profile.picture;
    }
    await user.save();
    req.session.userId = user._id.toString();
    req.session.save();
    res.redirect(`${process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}?auth=success`);
  } catch (err) {
    console.error('OAuth error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}?auth_error=callback_failed`);
  }
});

router.post('/guest', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, name: name || email.split('@')[0], gmailSyncEnabled: false });
      await user.save();
    }
    req.session.userId = user._id.toString();
    req.session.save();
    res.json({ success: true, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  if (!req.session?.userId) return res.json({ user: null });
  try {
    const user = await User.findById(req.session.userId).select('-googleTokens');
    res.json({ user });
  } catch (err) {
    res.json({ user: null });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
