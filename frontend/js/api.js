// ─── API Base ─────────────────────────────────────────────────────
const API = 'https://jobflow-s3z4.onrender.com/api';

async function req(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  // Auth
  me:          ()       => req('GET',  '/auth/me'),
  loginGuest:  (email, name) => req('POST', '/auth/guest', { email, name }),
  logout:      ()       => req('POST', '/auth/logout'),

  // Applications
  getApps:     (params) => req('GET',  '/applications?' + new URLSearchParams(params)),
  getStats:    ()       => req('GET',  '/applications/stats'),
  createApp:   (data)   => req('POST', '/applications', data),
  updateApp:   (id, d)  => req('PUT',  `/applications/${id}`, d),
  deleteApp:   (id)     => req('DELETE',`/applications/${id}`),
  getInsights: (id)     => req('POST', `/applications/${id}/insights`),
  importCsv:   (rows)   => req('POST', '/applications/import/csv', { rows }),

  // Email
  syncEmails:  ()       => req('POST', '/email/sync'),
  syncStatus:  ()       => req('GET',  '/email/sync-status'),
  parseEmail:  (text)   => req('POST', '/email/parse', { emailText: text }),
};

window.api = api;