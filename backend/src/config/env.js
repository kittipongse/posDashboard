import { loadBackendEnv } from './loadEnv.js';

loadBackendEnv();

const sanitizeDbName = (value) => {
  const name = String(value || '').trim();
  if (!name) return '';
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(
      `Invalid database name "${name}". Use only letters, numbers, underscore (set DB_REMOTE_NAME).`
    );
  }
  return name;
};

const dbMode = 'remote';

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3010,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  idleTimeoutMinutes: (() => {
    const raw = process.env.SESSION_IDLE_TIMEOUT_MINUTES;
    if (raw === undefined || raw === '') return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })(),
  dbMode,
  db: {
    host: process.env.DB_REMOTE_HOST || process.env.DB_HOST || '',
    port: Number(process.env.DB_REMOTE_PORT || process.env.DB_PORT || 3306),
    name: sanitizeDbName(process.env.DB_REMOTE_NAME || process.env.DB_NAME),
    user: process.env.DB_REMOTE_USER || process.env.DB_USER || '',
    password: process.env.DB_REMOTE_PASSWORD || process.env.DB_PASSWORD || ''
  },
  companyName: String(process.env.COMPANY_NAME || '').trim()
};

export const isDatabaseConfigured = () =>
  Boolean(env.db.host && env.db.name && env.db.user);

export const isJwtConfigured = () =>
  Boolean(env.jwtSecret && env.jwtSecret !== 'change-this-secret');

export default env;
