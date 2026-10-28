import axios from 'axios';
import { resolveApiUrl } from '@/constants/origins';
import { SESSION_IDLE_CODES } from '@/constants/session';
import { buildLoginRedirect, clearSession, getStoredToken, isSessionIdle } from '@/utils/session';

const api = axios.create({
  baseURL: resolveApiUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const isAuthLoginRequest = (config) => (config?.url || '').includes('/auth/login');

const redirectToLogin = (reason) => {
  if (window.location.pathname === '/login') return;
  clearSession();
  window.location.assign(buildLoginRedirect(reason));
};

api.interceptors.request.use((config) => {
  if (!isAuthLoginRequest(config) && getStoredToken() && isSessionIdle()) {
    redirectToLogin('idle');
    return Promise.reject(new Error('SESSION_IDLE_TIMEOUT'));
  }

  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const alreadyOnLogin = window.location.pathname === '/login';

    if (status === 401 && !isAuthLoginRequest(error.config) && !alreadyOnLogin) {
      const reason = SESSION_IDLE_CODES.includes(code) ? 'idle' : 'auth';
      redirectToLogin(reason);
    }

    return Promise.reject(error);
  }
);

export default api;
