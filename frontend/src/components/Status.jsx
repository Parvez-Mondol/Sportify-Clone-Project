import { errorText } from '../api';

export function Loading() {
  return <div className="status"><div className="spinner" aria-label="Loading" /></div>;
}

export function ErrorMessage({ error }) {
  return <div className="status error">{error.status === 404 ? 'Not found.' : errorText(error)}</div>;
}

export function Empty({ children }) {
  return <div className="status muted">{children}</div>;
}
