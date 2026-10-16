// Thin fetch wrapper. The SPA and API share an origin (CloudFront /api/* on AWS, Nginx on-prem), so paths are relative.
export const APP_NAME = 'SG Home Business Directory'; // placeholder; team to finalise (also in index.html <title>)
const TOKEN_KEY = 'hbb_token';
const USER_KEY = 'hbb_user';

export const session = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  get user() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } },
  set({ token, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) session.clear();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
