const { google } = require('googleapis');
const { User, Application } = require('../models');

function getOAuth2Client(tokens = null) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  if (tokens) client.setCredentials(tokens);
  return client;
}

function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline', prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/userinfo.profile']
  });
}

async function exchangeCodeForTokens(code) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data: profile } = await oauth2.userinfo.get();
  return { tokens, profile };
}

const STATUS_PATTERNS = [
  { patterns: ['offer letter','pleased to offer','we would like to offer','congratulations.*offer','extending.*offer'], status: 'offered' },
  { patterns: ['interview','schedule.*call','phone screen','technical round','coding round','virtual interview','zoom call'], status: 'interview' },
  { patterns: ['unfortunately','regret to inform','not moving forward','not selected','other candidates','position has been filled'], status: 'rejected' },
  { patterns: ['application received','thank you for applying','successfully submitted','we have received your'], status: 'applied' },
  { patterns: ['online assessment','coding challenge','hackerrank','codility','take-home','technical assessment'], status: 'interview' },
];

function detectStatusFromEmail(subject, body) {
  const text = (subject + ' ' + body).toLowerCase();
  for (const { patterns, status } of STATUS_PATTERNS) {
    for (const p of patterns) {
      if (new RegExp(p, 'i').test(text)) return status;
    }
  }
  return null;
}

function extractCompanyFromEmail(from) {
  const domainMatch = from.match(/@([a-zA-Z0-9-]+)\./);
  if (domainMatch) {
    const domain = domainMatch[1];
    if (!['gmail','yahoo','hotmail','outlook','noreply','no-reply','donotreply'].includes(domain)) {
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  }
  return null;
}

async function syncEmails(userId) {
  const user = await User.findById(userId);
  if (!user?.googleTokens?.access_token) throw new Error('Gmail not connected');

  const client = getOAuth2Client(user.googleTokens);
  client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) user.googleTokens.refresh_token = tokens.refresh_token;
    user.googleTokens.access_token = tokens.access_token;
    await user.save();
  });

  const gmail = google.gmail({ version: 'v1', auth: client });
  const keywords = (user.syncKeywords || ['application','interview','offer','internship']).join(' OR ');
  const afterDate = user.lastEmailSync ? Math.floor(user.lastEmailSync.getTime() / 1000) : Math.floor((Date.now() - 90*24*60*60*1000)/1000);

  const { data: listData } = await gmail.users.messages.list({ userId: 'me', q: `(${keywords}) after:${afterDate}`, maxResults: 50 });
  if (!listData.messages?.length) { user.lastEmailSync = new Date(); await user.save(); return { synced: 0, found: 0 }; }

  let synced = 0;
  for (const msg of listData.messages) {
    try {
      const { data: message } = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const headers = message.payload?.headers || [];
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const subject = getHeader('Subject');
      const from = getHeader('From');
      const date = getHeader('Date');
      let body = '';
      const extractBody = (parts) => { if (!parts) return; for (const part of parts) { if (part.mimeType === 'text/plain' && part.body?.data) body += Buffer.from(part.body.data, 'base64').toString('utf-8'); else if (part.parts) extractBody(part.parts); } };
      if (message.payload?.body?.data) body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      else extractBody(message.payload?.parts);

      const detectedStatus = detectStatusFromEmail(subject, body);
      if (!detectedStatus) continue;

      const companyGuess = extractCompanyFromEmail(from);
      const threadId = message.threadId;
      const receivedAt = new Date(date);

      let app = companyGuess ? await Application.findOne({ userId, company: new RegExp(companyGuess, 'i'), status: { $nin: ['offered','rejected','withdrawn'] } }) : null;
      const alreadyTracked = app?.emailThreads?.some(t => t.gmailThreadId === threadId);
      if (alreadyTracked) continue;

      const emailEntry = { gmailThreadId: threadId, subject, from, receivedAt, snippet: message.snippet || '' };

      if (app) {
        if (detectedStatus !== app.status) { app.statusHistory.push({ status: detectedStatus, source: 'email', note: `Auto: ${subject}` }); app.status = detectedStatus; app.lastActivityDate = new Date(); }
        app.emailThreads.push(emailEntry);
        await app.save(); synced++;
      } else if (companyGuess) {
        await new Application({ userId, company: companyGuess, role: 'Position (update me)', status: detectedStatus, appliedDate: receivedAt, hrEmail: from.match(/<(.+)>/)?.[1] || from, emailThreads: [emailEntry], source: 'email', autoTracked: true, statusHistory: [{ status: detectedStatus, source: 'email' }] }).save();
        synced++;
      }
    } catch (err) { console.error('Email parse error:', err.message); }
  }

  user.lastEmailSync = new Date();
  await user.save();
  return { synced, found: listData.messages.length };
}

module.exports = { getAuthUrl, exchangeCodeForTokens, syncEmails, detectStatusFromEmail };
