import { getPool } from '../config/database.js';

export const findCompanyName = async () => {
  const pool = getPool();
  if (!pool) return null;

  try {
    const [rows] = await pool.query(
      'SELECT name_th, name_en FROM companies ORDER BY id ASC LIMIT 1'
    );
    const row = rows[0];
    if (!row) return null;
    return row.name_th || row.name_en || null;
  } catch {
    return null;
  }
};
