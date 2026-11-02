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

/** Like posApp branch-daily-sales — one row per branch per day (vendor-scoped). */
export const findVendorBranchDaily = async (vendorId, filters) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, filters);
  const [rows] = await getPool().execute(
    `SELECT
       DATE_FORMAT(s.paid_at, '%Y-%m-%d') AS sale_date,
       s.branch_id AS branch_id,
       b.code AS branch_code,
       b.name AS branch_name,
       COUNT(DISTINCT s.id) AS bills,
       IFNULL(SUM(si.qty), 0) AS qty,
       IFNULL(SUM(si.line_total), 0) AS amount
     ${FROM_SQL}
     LEFT JOIN branches b ON b.id = s.branch_id
     WHERE ${where}
     GROUP BY DATE_FORMAT(s.paid_at, '%Y-%m-%d'), s.branch_id, b.code, b.name
     ORDER BY sale_date DESC, branch_name ASC`,
    params
  );

  return rows.map((row) => ({
    date: formatSqlDate(row.sale_date),
    branchId: row.branch_id == null ? null : Number(row.branch_id),
    branchCode: row.branch_code || null,
    branchName: row.branch_name || '-',
    bills: Number(row.bills || 0),
    qty: roundQty(row.qty || 0),
    amount: roundMoney(row.amount || 0)
  }));
};

/**
 * Flat PAID sale lines for this vendor only (other vendors' lines on the same bill are excluded).
 * Ordered date DESC → paid_at DESC → sale id → line id.
 */
export const findVendorDailyDetailLines = async (vendorId, filters) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, filters);
  // Only lines attributed to this vendor — bills with zero of our products never appear.
  const [rows] = await getPool().execute(
    `SELECT
       DATE_FORMAT(s.paid_at, '%Y-%m-%d') AS sale_date,
       s.id AS sale_id,
       s.receipt_no AS receipt_no,
       s.paid_at AS paid_at,
       s.branch_id AS branch_id,
       b.code AS branch_code,
       b.name AS branch_name,
       si.id AS sale_item_id,
       si.sku AS sku,
       si.name AS product_name,
       si.qty AS qty,
       si.unit_price AS unit_price,
       si.line_total AS line_total,
       si.unit AS unit
     ${FROM_SQL}
     LEFT JOIN branches b ON b.id = s.branch_id
     WHERE ${where}
       AND si.qty > 0
     ORDER BY sale_date DESC, s.paid_at DESC, s.id DESC, si.id ASC`,
    params
  );

  return rows.map((row) => ({
    date: formatSqlDate(row.sale_date),
    saleId: Number(row.sale_id),
    receiptNo: row.receipt_no || '',
    paidAt: row.paid_at,
    branchId: row.branch_id == null ? null : Number(row.branch_id),
    branchCode: row.branch_code || null,
    branchName: row.branch_name || '-',
    saleItemId: Number(row.sale_item_id),
    sku: row.sku || '',
    name: row.product_name || '-',
    qty: roundQty(row.qty || 0),
    unitPrice: roundMoney(row.unit_price || 0),
    lineTotal: roundMoney(row.line_total || 0),
    unit: row.unit || 'ชิ้น'
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
