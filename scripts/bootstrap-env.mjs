/**
 * Copy shared MySQL settings from posApp into PosDashboard backend/.env.local
 * and generate a separate JWT_SECRET. Does not overwrite an existing file.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'backend', '.env.local');
const frontendTarget = path.join(root, 'frontend', '.env.local');
const posAppEnv = path.join('C:\\posApp', 'backend', '.env.local');

if (fs.existsSync(target)) {
  console.log('backend/.env.local already exists — skip');
} else if (!fs.existsSync(posAppEnv)) {
  console.error('Missing C:\\posApp\\backend\\.env.local — copy backend/env.local manually');
  process.exit(1);
} else {
  const raw = fs.readFileSync(posAppEnv, 'utf8');
  const pick = (key) => {
    const match = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : '';
  };

  const jwtSecret = crypto.randomBytes(48).toString('base64url');
  const lines = [
    'NODE_ENV=development',
    'PORT=3010',
    'DB_MODE=remote',
    `DB_REMOTE_HOST=${pick('DB_REMOTE_HOST')}`,
    `DB_REMOTE_PORT=${pick('DB_REMOTE_PORT') || '3306'}`,
    `DB_REMOTE_NAME=${pick('DB_REMOTE_NAME')}`,
    `DB_REMOTE_USER=${pick('DB_REMOTE_USER')}`,
    `DB_REMOTE_PASSWORD=${pick('DB_REMOTE_PASSWORD')}`,
    `JWT_SECRET=${jwtSecret}`,
    'JWT_EXPIRES_IN=8h',
    'SESSION_IDLE_TIMEOUT_MINUTES=0',
    `COMPANY_NAME=${pick('COMPANY_NAME')}`,
    'FRONTEND_URL=http://localhost:5174,https://vendor.znix.online',
    ''
  ];

  fs.writeFileSync(target, lines.join('\n'), 'utf8');
  console.log('Created backend/.env.local from posApp DB settings (new JWT_SECRET)');
}

if (!fs.existsSync(frontendTarget)) {
  fs.copyFileSync(path.join(root, 'frontend', 'env.local'), frontendTarget);
  console.log('Created frontend/.env.local');
} else {
  console.log('frontend/.env.local already exists — skip');
}
