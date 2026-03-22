const { User } = require('../models');

const requireAuth = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated. Please login.' });
  }
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth check failed' });
  }
};

const optionalAuth = async (req, res, next) => {
  if (req.session?.userId) {
    try { req.user = await User.findById(req.session.userId); } catch (_) {}
  }
  next();
};

module.exports = { requireAuth, optionalAuth };
