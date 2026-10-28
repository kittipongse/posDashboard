import bcrypt from 'bcryptjs';
import { findVendorById, findVendorByPortalUsername, markPortalLogin } from '../repositories/vendor.repository.js';
import { signToken } from '../utils/jwt.js';
import { AppError, UnauthorizedError } from '../utils/errors.js';

const invalidCredentials = () =>
  new UnauthorizedError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'INVALID_CREDENTIALS');

export const toPublicVendor = (vendor) => ({
  id: vendor.id,
  username: vendor.portalUsername,
  fullName: vendor.name,
  role: 'VENDOR',
  vendorId: vendor.id,
  vendorCode: vendor.vendorCode,
  vendorAbbr: vendor.abbr,
  status: vendor.status
});

const assertPortalActive = (vendor) => {
  if (!vendor || vendor.status !== 'ACTIVE' || !vendor.portalEnabled) {
    throw new AppError('บัญชีนี้ถูกปิดการใช้งานพอร์ทัล', 'VENDOR_INACTIVE', 403);
  }
};

export const login = async ({ username, password }) => {
  const loginName = String(username || '').trim().toLowerCase();
  const vendor = await findVendorByPortalUsername(loginName);

  if (!vendor?.portalPasswordHash) {
    throw invalidCredentials();
  }

  const matched = await bcrypt.compare(String(password || ''), vendor.portalPasswordHash);
  if (!matched) {
    throw invalidCredentials();
  }

  assertPortalActive(vendor);
  await markPortalLogin(vendor.id);

  const publicVendor = toPublicVendor(vendor);
  const token = signToken({
    sub: String(publicVendor.id),
    username: publicVendor.username,
    fullName: publicVendor.fullName,
    role: 'VENDOR',
    vendorId: publicVendor.vendorId,
    vendorCode: publicVendor.vendorCode,
    vendorAbbr: publicVendor.vendorAbbr
  });

  return { token, user: publicVendor };
};

export const getCurrentVendor = async (actor) => {
  const vendor = await findVendorById(actor.vendorId);
  if (!vendor) {
    throw new UnauthorizedError('ไม่พบบัญชีร้านค้า', 'VENDOR_NOT_FOUND');
  }
  assertPortalActive(vendor);
  return toPublicVendor(vendor);
};
