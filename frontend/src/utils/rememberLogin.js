const REMEMBER_KEY = 'posdash_remember_login';

export const getRememberedLogin = () => {
  const raw = localStorage.getItem(REMEMBER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.username || typeof parsed.password !== 'string') return null;
    return { username: parsed.username, password: parsed.password };
  } catch {
    return null;
  }
};

export const saveRememberedLogin = (username, password) => {
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
};

export const clearRememberedLogin = () => {
  localStorage.removeItem(REMEMBER_KEY);
};
