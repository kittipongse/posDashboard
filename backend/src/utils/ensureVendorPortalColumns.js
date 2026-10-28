import { getPool } from '../config/database.js';

let ensured = false;

const hasColumn = async (db, columnName) => {
  const [cols] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vendors'
       AND COLUMN_NAME = ?`,
    [columnName]
  );
  return Boolean(cols.length);
};

const hasIndex = async (db, indexName) => {
  const [indexes] = await db.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'vendors'
       AND INDEX_NAME = ?`,
    [indexName]
  );
  return Boolean(indexes.length);
};

/** Idempotent — vendors.portal_* for PosDashboard vendor login (same as posApp). */
export const ensureVendorPortalColumns = async (executor) => {
  if (ensured && !executor) return;

  const db = executor || getPool();
  if (!db) return;

  if (!(await hasColumn(db, 'portal_username'))) {
    await db.query(
      `ALTER TABLE vendors
       ADD COLUMN portal_username VARCHAR(64) NULL DEFAULT NULL AFTER status`
    );
  }
  if (!(await hasColumn(db, 'portal_password_hash'))) {
    await db.query(
      `ALTER TABLE vendors
       ADD COLUMN portal_password_hash VARCHAR(255) NULL DEFAULT NULL AFTER portal_username`
    );
  }
  if (!(await hasColumn(db, 'portal_password_hint'))) {
    await db.query(
      `ALTER TABLE vendors
       ADD COLUMN portal_password_hint VARCHAR(128) NULL DEFAULT NULL AFTER portal_password_hash`
    );
  }
  if (!(await hasColumn(db, 'portal_enabled'))) {
    await db.query(
      `ALTER TABLE vendors
       ADD COLUMN portal_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER portal_password_hint`
    );
  }
  if (!(await hasColumn(db, 'portal_last_login_at'))) {
    await db.query(
      `ALTER TABLE vendors
       ADD COLUMN portal_last_login_at DATETIME NULL DEFAULT NULL AFTER portal_enabled`
    );
  }
  if (!(await hasIndex(db, 'uk_vendors_portal_username'))) {
    await db.query(
      'ALTER TABLE vendors ADD UNIQUE KEY uk_vendors_portal_username (portal_username)'
    );
  }

  if (!executor) {
    ensured = true;
  }
};
