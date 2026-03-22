const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { User } = require('../models');

router.post('/sync', requireAuth, async (req, res) => {
  try {
    if (!req.user.googleTokens?.access_token) {
      return res.status(400).json({ error: 'Gmail not connected. Please login with Google first.' });
    }
    const { syncEmails } = require('../services/gmailService');
    const result = await syncEmails(req.user._id);
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sync-status', requireAuth, async (req, res) => {
  res.json({
    connected: !!req.user.googleTokens?.access_token,
    lastSync: req.user.lastEmailSync,
    syncEnabled: req.user.gmailSyncEnabled,
  });
});

router.post('/parse', requireAuth, async (req, res) => {
  try {
    const { emailText } = req.body;
    if (!emailText?.trim()) return res.status(400).json({ error: 'emailText is required' });
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('dummy')) {
      return res.status(400).json({ error: 'OpenAI API key not configured. Add a real OPENAI_API_KEY to .env' });
    }
    const { parseEmailText } = require('../services/aiService');
    const parsed = await parseEmailText(emailText, req.user._id);
    res.json({ parsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/analysis', requireAuth, async (req, res) => {
  res.json({ message: 'Analysis available with OpenAI key' });
});

module.exports = router;
