import { ensureVendorPortalColumns } from '../src/utils/ensureVendorPortalColumns.js';
import { isDatabaseConfigured } from '../src/config/env.js';
import { pingDatabase, getPool } from '../src/config/database.js';

if (!isDatabaseConfigured()) {
  console.error('Database is not configured in backend/.env.local');
  process.exit(1);
}

const ping = await pingDatabase();
if (!ping.ok) {
  console.error('Cannot connect to database:', ping.message);
  process.exit(1);
}

await ensureVendorPortalColumns();
const after = await pingDatabase();
console.log('Portal columns ready:', Boolean(after.portalReady));
await getPool()?.end?.();
process.exit(after.portalReady ? 0 : 1);
