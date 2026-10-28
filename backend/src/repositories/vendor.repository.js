import { getPool } from '../config/database.js';
import { isDatabaseConfigured } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const assertDatabase = () => {
  if (!isDatabaseConfigured() || !getPool()) {
    throw new AppError('ยังไม่ได้เชื่อมฐานข้อมูล', 'DATABASE_NOT_CONFIGURED', 503);
  }
};

const mapPortalError = (error) => {
  if (error?.code === 'ER_BAD_FIELD_ERROR') {
    throw new AppError(
      'ฐานข้อมูลยังไม่มีช่อง login ของร้านค้า — รัน migration portal ใน posApp ก่อน',
      'PORTAL_SCHEMA_MISSING',
      503
    );
  }
  throw error;
};

const mapVendor = (row) => {
  if (!row) return null;
  return {
    id: Number(row.id),
    vendorCode: row.vendor_code || null,
    abbr: row.abbr || null,
    name: row.name || '',
    status: row.status || '',
    portalUsername: row.portal_username || null,
    portalPasswordHash: row.portal_password_hash || null,
    portalEnabled: Boolean(Number(row.portal_enabled ?? 0)),
    portalLastLoginAt: row.portal_last_login_at || null
  };
};

const PORTAL_COLUMNS = `
  id, vendor_code, abbr, name, status,
  portal_username, portal_password_hash, portal_enabled, portal_last_login_at
`;

export const findVendorByPortalUsername = async (username) => {
  assertDatabase();
  try {
    const [rows] = await getPool().execute(
      `SELECT ${PORTAL_COLUMNS}
       FROM vendors
       WHERE portal_username = ?
       LIMIT 1`,
      [username]
    );
    return mapVendor(rows[0]);
  } catch (error) {
    return mapPortalError(error);
  }
};

export const findVendorById = async (vendorId) => {
  assertDatabase();
  try {
    const [rows] = await getPool().execute(
      `SELECT ${PORTAL_COLUMNS}
       FROM vendors
       WHERE id = ?
       LIMIT 1`,
      [vendorId]
    );
    return mapVendor(rows[0]);
  } catch (error) {
    return mapPortalError(error);
  }
};

export const markPortalLogin = async (vendorId) => {
  assertDatabase();
  try {
    await getPool().execute(
      'UPDATE vendors SET portal_last_login_at = NOW() WHERE id = ?',
      [vendorId]
    );
  } catch (error) {
    mapPortalError(error);
  }
};
