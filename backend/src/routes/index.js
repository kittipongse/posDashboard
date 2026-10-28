import { Router } from 'express';
import env, { isDatabaseConfigured } from '../config/env.js';
import { pingDatabase } from '../config/database.js';
import { findCompanyName } from '../repositories/company.repository.js';
import authRoutes from './auth.routes.js';
import reportRoutes from './report.routes.js';
import { fail, success } from '../utils/response.js';

const router = Router();

router.get('/health', async (req, res) => {
  const db = await pingDatabase();
  const companyName = db.ok ? (await findCompanyName()) || env.companyName || null : env.companyName || null;
  const ready = Boolean(db.ok && db.schemaReady && db.portalReady);

  const payload = {
    service: 'pos-dashboard-api',
    version: '1.0.0',
    ready,
    backend: 'ok',
    database: db.ok && db.schemaReady ? 'ok' : 'unavailable',
    databaseConfigured: isDatabaseConfigured(),
    portalReady: Boolean(db.portalReady),
    schemaReady: Boolean(db.schemaReady),
    dbMessage: db.message,
    dbCode: db.code,
    companyName: companyName || 'PosDashboard',
    auth: 'jwt',
    role: 'VENDOR'
  };

  if (!db.ok || !db.schemaReady) {
    return fail(res, 'Backend พร้อม แต่เชื่อมต่อฐานข้อมูลไม่ได้', 'DATABASE_UNAVAILABLE', 503, payload);
  }

  if (!db.portalReady) {
    return fail(
      res,
      'ฐานข้อมูลยังไม่มีช่อง login ของร้านค้า',
      'PORTAL_SCHEMA_MISSING',
      503,
      payload
    );
  }

  return success(res, payload);
});

router.use('/auth', authRoutes);
router.use('/reports', reportRoutes);

export default router;
