-- Same as posApp — keep for reference / manual migrate
ALTER TABLE vendors
  ADD COLUMN portal_username VARCHAR(64) NULL AFTER status,
  ADD COLUMN portal_password_hash VARCHAR(255) NULL AFTER portal_username,
  ADD COLUMN portal_password_hint VARCHAR(128) NULL AFTER portal_password_hash,
  ADD COLUMN portal_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER portal_password_hint,
  ADD COLUMN portal_last_login_at DATETIME NULL AFTER portal_enabled;

ALTER TABLE vendors
  ADD UNIQUE KEY uk_vendors_portal_username (portal_username);
