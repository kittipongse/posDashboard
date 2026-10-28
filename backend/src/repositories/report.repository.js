import { getPool } from '../config/database.js';
import { isDatabaseConfigured } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { roundMoney, roundQty } from '../utils/money.js';

const assertDatabase = () => {
  if (!isDatabaseConfigured() || !getPool()) {
    throw new AppError('ยังไม่ได้เชื่อมฐานข้อมูล', 'DATABASE_NOT_CONFIGURED', 503);
  }
};

const formatSqlDate = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
};

/**
 * Vendor scope is always the id from the caller (JWT). Never read vendor id from the client.
 */
const vendorScope = (vendorId, filters = {}) => {
  const params = [vendorId];
  const conditions = [
    "s.status = 'PAID'",
    'COALESCE(si.vendor_id, p.vendor_id) = ?'
  ];

  if (filters.branchId) {
    conditions.push('s.branch_id = ?');
    params.push(filters.branchId);
  }
  if (filters.dateFrom) {
    conditions.push('DATE(s.paid_at) >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('DATE(s.paid_at) <= ?');
    params.push(filters.dateTo);
  }

  return { where: conditions.join(' AND '), params };
};

const FROM_SQL = `
  FROM sale_items si
  INNER JOIN sales s ON s.id = si.sale_id
  LEFT JOIN products p ON p.id = si.product_id
`;

const mapTotals = (row = {}) => ({
  bills: Number(row.bills || 0),
  qty: roundQty(row.qty || 0),
  amount: roundMoney(row.amount || 0)
});

export const findVendorSummary = async (vendorId, filters) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, filters);
  const [rows] = await getPool().execute(
    `SELECT
       COUNT(DISTINCT s.id) AS bills,
       IFNULL(SUM(si.qty), 0) AS qty,
       IFNULL(SUM(si.line_total), 0) AS amount
     ${FROM_SQL}
     WHERE ${where}`,
    params
  );
  return mapTotals(rows[0]);
};

export const findVendorDaily = async (vendorId, filters) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, filters);
  const [rows] = await getPool().execute(
    `SELECT
       DATE_FORMAT(s.paid_at, '%Y-%m-%d') AS sale_date,
       COUNT(DISTINCT s.id) AS bills,
       IFNULL(SUM(si.qty), 0) AS qty,
       IFNULL(SUM(si.line_total), 0) AS amount
     ${FROM_SQL}
     WHERE ${where}
     GROUP BY DATE_FORMAT(s.paid_at, '%Y-%m-%d')
     ORDER BY sale_date DESC`,
    params
  );

  return rows.map((row) => ({
    date: formatSqlDate(row.sale_date),
    bills: Number(row.bills || 0),
    qty: roundQty(row.qty || 0),
    amount: roundMoney(row.amount || 0)
  }));
};

export const findVendorMonthly = async (vendorId, filters) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, filters);
  const [rows] = await getPool().execute(
    `SELECT
       YEAR(s.paid_at) AS sale_year,
       MONTH(s.paid_at) AS sale_month,
       COUNT(DISTINCT s.id) AS bills,
       IFNULL(SUM(si.qty), 0) AS qty,
       IFNULL(SUM(si.line_total), 0) AS amount
     ${FROM_SQL}
     WHERE ${where}
     GROUP BY YEAR(s.paid_at), MONTH(s.paid_at)
     ORDER BY sale_year DESC, sale_month DESC`,
    params
  );

  return rows.map((row) => ({
    year: Number(row.sale_year),
    month: Number(row.sale_month),
    bills: Number(row.bills || 0),
    qty: roundQty(row.qty || 0),
    amount: roundMoney(row.amount || 0)
  }));
};

export const findVendorByProduct = async (vendorId, filters) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, filters);
  const [rows] = await getPool().execute(
    `SELECT
       si.product_id AS product_id,
       si.sku AS sku,
       si.name AS product_name,
       COUNT(DISTINCT s.id) AS bills,
       IFNULL(SUM(si.qty), 0) AS qty,
       IFNULL(SUM(si.line_total), 0) AS amount
     ${FROM_SQL}
     WHERE ${where}
     GROUP BY si.product_id, si.sku, si.name
     ORDER BY amount DESC, product_name ASC`,
    params
  );

  return rows.map((row) => ({
    productId: row.product_id == null ? null : Number(row.product_id),
    sku: row.sku || '',
    name: row.product_name || '-',
    bills: Number(row.bills || 0),
    qty: roundQty(row.qty || 0),
    amount: roundMoney(row.amount || 0)
  }));
};

export const findVendorByBranch = async (vendorId, filters) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, filters);
  const [rows] = await getPool().execute(
    `SELECT
       s.branch_id AS branch_id,
       b.code AS branch_code,
       b.name AS branch_name,
       COUNT(DISTINCT s.id) AS bills,
       IFNULL(SUM(si.qty), 0) AS qty,
       IFNULL(SUM(si.line_total), 0) AS amount
     ${FROM_SQL}
     LEFT JOIN branches b ON b.id = s.branch_id
     WHERE ${where}
     GROUP BY s.branch_id, b.code, b.name
     ORDER BY amount DESC, branch_name ASC`,
    params
  );

  return rows.map((row) => ({
    branchId: row.branch_id == null ? null : Number(row.branch_id),
    branchCode: row.branch_code || null,
    branchName: row.branch_name || '-',
    bills: Number(row.bills || 0),
    qty: roundQty(row.qty || 0),
    amount: roundMoney(row.amount || 0)
  }));
};

/** Branches that have sold this vendor's items — used only as a report filter. */
export const findVendorBranches = async (vendorId) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, {});
  const [rows] = await getPool().execute(
    `SELECT DISTINCT
       s.branch_id AS branch_id,
       b.code AS branch_code,
       b.name AS branch_name
     ${FROM_SQL}
     LEFT JOIN branches b ON b.id = s.branch_id
     WHERE ${where}
     ORDER BY branch_name ASC`,
    params
  );

  return rows.map((row) => ({
    id: row.branch_id == null ? null : Number(row.branch_id),
    code: row.branch_code || null,
    name: row.branch_name || '-'
  }));
};
