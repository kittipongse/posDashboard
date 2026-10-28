import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import env from './config/env.js';
import routes from './routes/index.js';
import { AppError } from './utils/errors.js';
import { fail } from './utils/response.js';

const app = express();

app.set('trust proxy', 1);

const extraOrigins = (env.frontendUrl || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (extraOrigins.includes(origin)) return true;
  if (env.nodeEnv !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
};

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use((req, _res, next) => {
  if (req.headers['content-length'] === '0') {
    delete req.headers['content-type'];
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use('/api/v1', routes);

app.use((req, res) => {
  return fail(res, 'Route not found', 'NOT_FOUND', 404);
});

app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return fail(res, err.message, err.code, err.status, err.errors);
  }

  if (err.message === 'Not allowed by CORS') {
    return fail(res, 'Origin not allowed', 'CORS_DENIED', 403);
  }

  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return fail(res, 'JSON ไม่ถูกต้อง', 'INVALID_JSON', 400);
  }

  console.error(err);
  return fail(res, 'Internal server error', 'INTERNAL_ERROR', 500);
});

export default app;
