const BASE = '/api';

function getToken() {
  return sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || null;
}

async function request(method, path, body, token) {
  const t = token || getToken();
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (t) opts.headers['Authorization'] = `Bearer ${t}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  get: (path, token) => request('GET', path, null, token),
  post: (path, body, token) => request('POST', path, body, token),
  patch: (path, body, token) => request('PATCH', path, body, token),
  delete: (path, token) => request('DELETE', path, null, token),
};

export async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function detectExtensionFromBase64(base64) {
  const prefix = base64.substring(0, 4);
  switch (prefix) {
    case '/9j/': return 'jpeg';
    case 'iVBO': return 'png';
    case 'R0lG': return 'gif';
    default: return 'png';
  }
}
