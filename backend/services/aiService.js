const { Application } = require('../models');

async function parseEmailText(emailText) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('dummy')) {
    throw new Error('OpenAI API key not configured');
  }
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: `Extract job application info from this email and return ONLY JSON with keys: company, role, status (applied/interview/offered/rejected/ghosted/saved), hrName, hrEmail, location, type (Internship/Full-time/Part-time/Contract/Freelance), salary, followUpDate, summary, keyInfo.\n\nEmail:\n${emailText}` }],
    temperature: 0.1, max_tokens: 600
  });
  const text = response.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

async function generateInsights(applicationId) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('dummy')) {
    return 'Add a real OpenAI API key to .env to enable AI insights.';
  }
  const app = await Application.findById(applicationId);
  if (!app) throw new Error('Application not found');
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: `Give 2-3 bullet points of career advice for this job application:\nCompany: ${app.company}\nRole: ${app.role}\nStatus: ${app.status}\nNotes: ${app.notes || 'none'}` }],
    temperature: 0.7, max_tokens: 200
  });
  const insights = response.choices[0].message.content.trim();
  app.aiInsights = insights;
  await app.save();
  return insights;
}

async function getUserAnalysis(userId) {
  const apps = await Application.find({ userId });
  const stats = { total: apps.length, byStatus: {}, responseRate: 0 };
  apps.forEach(a => { stats.byStatus[a.status] = (stats.byStatus[a.status] || 0) + 1; });
  const responded = apps.filter(a => ['interview','offered','rejected'].includes(a.status));
  stats.responseRate = apps.length ? Math.round((responded.length / apps.length) * 100) : 0;
  return stats;
}

module.exports = { parseEmailText, generateInsights, getUserAnalysis };
