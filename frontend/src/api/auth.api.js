import api from './axios.js';

const AUTH_TIMEOUT_MS = 45000;

export const login = (payload) => api.post('/auth/login', payload, { timeout: AUTH_TIMEOUT_MS });

export const logout = () => api.post('/auth/logout', {}, { timeout: 8000 });

export const getMe = () => api.get('/auth/me', { timeout: AUTH_TIMEOUT_MS });

export const warmAuthApi = () => api.get('/health', { timeout: AUTH_TIMEOUT_MS });

export const checkHealth = () => api.get('/health', { timeout: 8000 });
