import mysql from 'mysql2/promise';
import env, { isDatabaseConfigured } from './env.js';

let pool = null;

export const getPool = () => {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.name,
      waitForConnections: true,
      connectionLimit: process.env.VERCEL ? 2 : 5,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+07:00',
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 15000
    });
  }

  return pool;
};

export const pingDatabase = async () => {
  if (!isDatabaseConfigured()) {
    return { ok: false, code: 'DATABASE_NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่าฐานข้อมูล' };
  }

  const activePool = getPool();
  if (!activePool) {
    return { ok: false, code: 'DATABASE_NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่าฐานข้อมูล' };
  }

  try {
    const conn = await activePool.getConnection();
    try {
      await conn.query('SELECT 1 AS ok');
      let schemaReady = false;
      let portalReady = false;
      try {
        const [tables] = await conn.query(
          `SELECT COUNT(*) AS c
           FROM information_schema.tables
           WHERE table_schema = DATABASE()
             AND table_name = 'vendors'`
        );
        schemaReady = Number(tables[0]?.c || 0) > 0;
        if (schemaReady) {
          const [cols] = await conn.query(
            `SELECT COUNT(*) AS c
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = 'vendors'
               AND column_name = 'portal_username'`
          );
          portalReady = Number(cols[0]?.c || 0) > 0;
        }
      } catch {
        schemaReady = false;
        portalReady = false;
      }
      return {
        ok: true,
        schemaReady,
        portalReady,
        code: schemaReady ? 'DATABASE_OK' : 'DATABASE_SCHEMA_MISSING',
        message: schemaReady ? 'เชื่อมต่อฐานข้อมูลได้' : 'มีฐานข้อมูล แต่ยังไม่มีตารางระบบ'
      };
    } finally {
      conn.release();
    }
  } catch (error) {
    const code = error.code || 'DATABASE_UNAVAILABLE';
    return {
      ok: false,
      schemaReady: false,
      portalReady: false,
      code,
      message: error.message || 'เชื่อมต่อฐานข้อมูลไม่ได้'
    };
  }
};

export default getPool;
