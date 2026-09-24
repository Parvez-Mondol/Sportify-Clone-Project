// Thin fetch wrapper for the Sportify backend. All paths are relative to /api.

const TOKEN_KEY = 'sportify.token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage can be unavailable (private mode); the session just won't persist.
  }
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form; // FormData: the browser sets the multipart boundary itself.
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error?.message || `Request failed (${res.status})`, data.error?.details);
  }
  return data;
}

// Turn a validation error into one readable line, e.g. "password: must be at least 8 characters".
export function errorText(err) {
  if (err?.details) return Object.entries(err.details).map(([k, v]) => `${k} ${v}`).join(' · ');
  return err?.message || 'Something went wrong';
}
