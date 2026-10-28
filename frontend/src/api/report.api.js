import api from './axios.js';

export const getSummaryReport = (params) => api.get('/reports/summary', { params });

export const getDailyReport = (params) => api.get('/reports/daily', { params });

export const getMonthlyReport = (params) => api.get('/reports/monthly', { params });

export const getByProductReport = (params) => api.get('/reports/by-product', { params });

export const getByBranchReport = (params) => api.get('/reports/by-branch', { params });
