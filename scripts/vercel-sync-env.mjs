/**
 * Sync selected keys from backend/.env.local into a Vercel project (production).
 * Usage: node scripts/vercel-sync-env.mjs --cwd backend --scope zybercools-projects
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const cwd = path.resolve(getArg('--cwd', 'backend'));
const scope = getArg('--scope', 'zybercools-projects');
const envFile = path.join(cwd, '.env.local');

const KEYS = [
  'NODE_ENV',
  'DB_MODE',
  'DB_REMOTE_HOST',
  'DB_REMOTE_PORT',
  'DB_REMOTE_NAME',
  'DB_REMOTE_USER',
  'DB_REMOTE_PASSWORD',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'SESSION_IDLE_TIMEOUT_MINUTES',
  'COMPANY_NAME',
  'FRONTEND_URL'
];

if (!fs.existsSync(envFile)) {
  console.error('Missing', envFile);
  process.exit(1);
}

const parsed = Object.fromEntries(
  fs
    .readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      if (i < 0) return null;
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
    .filter(Boolean)
);

const overrides = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--set-'))
    .map((a) => {
      const body = a.slice('--set-'.length);
      const i = body.indexOf('=');
      return [body.slice(0, i), body.slice(i + 1)];
    })
);

const run = (command, commandArgs, input) => {
  const result = spawnSync(command, commandArgs, {
    cwd,
    input,
    encoding: 'utf8',
    shell: true
  });
  return result;
};

for (const key of KEYS) {
  const value = overrides[key] ?? parsed[key];
  if (value === undefined || value === '') {
    console.log(`skip ${key} (empty)`);
    continue;
  }

  // Remove existing production value if present (ignore errors).
  run('npx', ['vercel', 'env', 'rm', key, 'production', '--yes', '--scope', scope]);

  const added = run(
    'npx',
    ['vercel', 'env', 'add', key, 'production', '--scope', scope],
    `${value}\n`
  );
  if (added.status !== 0) {
    console.error(`failed ${key}:`, added.stderr || added.stdout);
    process.exit(1);
  }
  console.log(`set ${key}`);
}

console.log('Done syncing production env');
