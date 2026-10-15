const BASE = import.meta.env.VITE_API_URL || '/api';

export const auth = {
  get: () => localStorage.getItem('td_token'),
  set: (t) => localStorage.setItem('td_token', t),
  clear: () => localStorage.removeItem('td_token'),
};

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth.get() ? { Authorization: `Bearer ${auth.get()}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && auth.get()) { auth.clear(); window.location.assign('/login'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  del: (p) => request(p, { method: 'DELETE' }),
};

// Fetches the PDF with the auth header, then opens it in a new tab.
export async function openPdf(mode, params = {}) {
  const q = new URLSearchParams({ mode, ...params });
  const res = await fetch(`${BASE}/export/timetable.pdf?${q}`, { headers: { Authorization: `Bearer ${auth.get()}` } });
  if (!res.ok) throw new Error('Could not create the PDF');
  window.open(URL.createObjectURL(await res.blob()), '_blank');
}
