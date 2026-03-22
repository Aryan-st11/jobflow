const express = require('express');
const router = express.Router();
const { Application } = require('../models');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { status, type, search, sort = 'createdAt', order = 'desc', limit = 100 } = req.query;
    const query = { userId: req.user._id };
    if (status && status !== 'all') query.status = status;
    if (type) query.type = type;
    if (search) query.$or = [{ company: new RegExp(search, 'i') }, { role: new RegExp(search, 'i') }, { location: new RegExp(search, 'i') }];
    const apps = await Application.find(query).sort({ [sort]: order === 'asc' ? 1 : -1 }).limit(parseInt(limit));
    const total = await Application.countDocuments(query);
    res.json({ applications: apps, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const apps = await Application.find({ userId: req.user._id });
    const stats = { total: apps.length, byStatus: { saved:0,applied:0,interview:0,offered:0,rejected:0,ghosted:0,withdrawn:0 }, byType: {}, autoTracked: 0, responseRate: 0, timeline: [] };
    apps.forEach(a => {
      stats.byStatus[a.status] = (stats.byStatus[a.status] || 0) + 1;
      stats.byType[a.type] = (stats.byType[a.type] || 0) + 1;
      if (a.autoTracked) stats.autoTracked++;
    });
    const responded = apps.filter(a => ['interview','offered','rejected'].includes(a.status));
    const applied = apps.filter(a => a.status !== 'saved');
    stats.responseRate = applied.length ? Math.round((responded.length / applied.length) * 100) : 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      stats.timeline.push({ date: dateStr, count: apps.filter(a => a.appliedDate?.toISOString().split('T')[0] === dateStr).length });
    }
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const app = new Application({ ...req.body, userId: req.user._id, statusHistory: [{ status: req.body.status || 'applied', source: 'manual' }] });
    await app.save();
    res.status(201).json(app);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const app = await Application.findOne({ _id: req.params.id, userId: req.user._id });
    if (!app) return res.status(404).json({ error: 'Not found' });
    res.json(app);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const app = await Application.findOne({ _id: req.params.id, userId: req.user._id });
    if (!app) return res.status(404).json({ error: 'Not found' });
    if (req.body.status && req.body.status !== app.status) app.statusHistory.push({ status: req.body.status, source: 'manual' });
    Object.assign(app, req.body);
    app.lastActivityDate = new Date();
    await app.save();
    res.json(app);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Application.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/insights', async (req, res) => {
  res.json({ insights: 'Add your OpenAI API key in .env to enable AI insights.' });
});

router.post('/import/csv', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const docs = rows.map(r => ({ ...r, userId: req.user._id, source: 'csv', statusHistory: [{ status: r.status || 'applied', source: 'manual' }] }));
    const inserted = await Application.insertMany(docs, { ordered: false });
    res.json({ imported: inserted.length });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
