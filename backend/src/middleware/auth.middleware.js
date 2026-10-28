import { ROLES } from '../constants/roles.js';
import { UnauthorizedError } from '../utils/errors.js';
import { fail } from '../utils/response.js';
import { verifyToken } from '../utils/jwt.js';

export const requireVendorAuth = (req, res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return fail(res, 'กรุณาเข้าสู่ระบบ', 'UNAUTHORIZED', 401);
  }

  const token = header.slice(7).trim();
  if (!token) {
    return fail(res, 'กรุณาเข้าสู่ระบบ', 'UNAUTHORIZED', 401);
  }

  try {
    const payload = verifyToken(token);
    const vendorId = Number(payload.vendorId);
    if (payload.role !== ROLES.VENDOR || !Number.isInteger(vendorId) || vendorId <= 0) {
      return fail(res, 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้', 'FORBIDDEN', 403);
    }

    req.user = {
      id: vendorId,
      username: payload.username,
      fullName: payload.fullName,
      role: ROLES.VENDOR,
      vendorId,
      vendorCode: payload.vendorCode || null,
      vendorAbbr: payload.vendorAbbr || null,
      lastActivity: payload.lastActivity
    };
    return next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail(res, error.message, error.code, error.status);
    }
    return fail(res, 'Invalid token', 'TOKEN_INVALID', 401);
  }
};
