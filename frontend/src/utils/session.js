import { IDLE_TIMEOUT_MS, isIdleTimeoutEnabled } from '@/constants/session';

const TOKEN_KEY = 'posdash_token';
const USER_KEY = 'posdash_user';
const ACTIVITY_KEY = 'posdash_last_activity';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const persistSession = (token, user) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  touchActivity();
};

export const touchActivity = () => {
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
};

export const getLastActivity = () => {
  const value = Number(localStorage.getItem(ACTIVITY_KEY));
  return Number.isFinite(value) ? value : 0;
};

export const isSessionIdle = () => {
  if (!isIdleTimeoutEnabled()) return false;
  const lastActivity = getLastActivity();
  if (!lastActivity) return false;
  return Date.now() - lastActivity > IDLE_TIMEOUT_MS;
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
};

export const getStoredUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const buildLoginRedirect = (reason = 'auth') => {
  const redirect = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams();
  if (redirect && redirect !== '/login') params.set('redirect', redirect);
  if (reason) params.set('reason', reason);
  const query = params.toString();
  return query ? `/login?${query}` : '/login';
};
