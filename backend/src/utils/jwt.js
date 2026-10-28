import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { JWT_AUDIENCE, JWT_ISSUER } from '../constants/roles.js';
import { isIdleTimeoutExceeded } from '../constants/session.js';
import { UnauthorizedError } from './errors.js';

const nowUnix = () => Math.floor(Date.now() / 1000);

const assertSecret = () => {
  if (!env.jwtSecret || env.jwtSecret === 'change-this-secret') {
    throw new Error('JWT_SECRET is not set');
  }
};

export const signToken = (payload) => {
  assertSecret();

  return jwt.sign(
    {
      ...payload,
      lastActivity: nowUnix()
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );
};

export const verifyToken = (token) => {
  if (!env.jwtSecret || env.jwtSecret === 'change-this-secret') {
    throw new UnauthorizedError('JWT is not configured', 'JWT_NOT_CONFIGURED');
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
    const lastActivity = Number(payload.lastActivity || payload.iat || 0);
    const idleMinutes = Number(env.idleTimeoutMinutes);
    const idleLimit = Number.isFinite(idleMinutes) && idleMinutes > 0 ? idleMinutes * 60 : 0;

    if (idleLimit > 0 && isIdleTimeoutExceeded(lastActivity, nowUnix(), idleLimit)) {
      throw new UnauthorizedError(
        'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่',
        'SESSION_IDLE_TIMEOUT'
      );
    }

    payload.lastActivity = lastActivity;
    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid token', 'TOKEN_INVALID');
  }
};
