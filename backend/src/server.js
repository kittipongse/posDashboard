import app from './app.js';
import env, { isDatabaseConfigured, isJwtConfigured } from './config/env.js';
import { ensureVendorPortalColumns } from './utils/ensureVendorPortalColumns.js';

const isVercel = Boolean(process.env.VERCEL);

if (!isVercel) {
  if (!isJwtConfigured()) {
    console.error('JWT_SECRET is missing or still using the example value.');
    console.error('Set a strong secret in backend/.env.local before starting the API.');
    process.exit(1);
  }

  app.listen(env.port, async () => {
    console.log(`PosDashboard API listening on http://localhost:${env.port}`);
    console.log('Auth: Vendor JWT (aud=pos-dashboard) — staff tokens from posApp are rejected');
    if (isDatabaseConfigured()) {
      console.log(`Database: ${env.dbMode} → ${env.db.user}@${env.db.host}:${env.db.port}/${env.db.name}`);
      try {
        await ensureVendorPortalColumns();
        console.log('Vendor portal columns: ready');
      } catch (error) {
        console.warn('Vendor portal columns ensure skipped:', error.message || error);
      }
    } else {
      console.log('Database: not configured yet (set DB_REMOTE_* in backend/.env.local)');
    }
  });
}

export default app;
