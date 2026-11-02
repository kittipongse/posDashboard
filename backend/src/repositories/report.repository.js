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

/** Sale calendar day — paid bills use paid_at; voided may fall back to voided_at. */
const SALE_DATE_SQL = 'DATE(COALESCE(s.paid_at, s.voided_at, s.created_at))';
const SALE_DATE_FORMAT_SQL = `DATE_FORMAT(COALESCE(s.paid_at, s.voided_at, s.created_at), '%Y-%m-%d')`;

/**
 * Vendor scope is always the id from the caller (JWT). Never read vendor id from the client.
 * @param {'PAID'|'VOIDED'} statusMode — PAID sales totals vs cancelled/voided bills
 */
const vendorScope = (vendorId, filters = {}, statusMode = 'PAID') => {
  const params = [vendorId];
  const conditions = ['COALESCE(si.vendor_id, p.vendor_id) = ?'];

  if (statusMode === 'VOIDED') {
    // Match POS void / cancel regardless of exact status string used historically.
    conditions.push(
      `(s.status IN ('VOID', 'VOIDED', 'CANCELLED') OR (s.voided_at IS NOT NULL AND s.status <> 'PAID'))`
    );
  } else {
    conditions.push("s.status = 'PAID'");
  }

  if (filters.branchId) {
    conditions.push('s.branch_id = ?');
    params.push(filters.branchId);
  }
  if (filters.dateFrom) {
    conditions.push(`${SALE_DATE_SQL} >= ?`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`${SALE_DATE_SQL} <= ?`);
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
       ${SALE_DATE_FORMAT_SQL} AS sale_date,
       COUNT(DISTINCT s.id) AS bills,
       IFNULL(SUM(si.qty), 0) AS qty,
       IFNULL(SUM(si.line_total), 0) AS amount
     ${FROM_SQL}
     WHERE ${where}
     GROUP BY ${SALE_DATE_FORMAT_SQL}
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
       YEAR(COALESCE(s.paid_at, s.voided_at, s.created_at)) AS sale_year,
       MONTH(COALESCE(s.paid_at, s.voided_at, s.created_at)) AS sale_month,
       COUNT(DISTINCT s.id) AS bills,
       IFNULL(SUM(si.qty), 0) AS qty,
       IFNULL(SUM(si.line_total), 0) AS amount
     ${FROM_SQL}
     WHERE ${where}
     GROUP BY YEAR(COALESCE(s.paid_at, s.voided_at, s.created_at)), MONTH(COALESCE(s.paid_at, s.voided_at, s.created_at))
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
       ${SALE_DATE_FORMAT_SQL} AS sale_date,
       s.branch_id AS branch_id,
       b.code AS branch_code,
       b.name AS branch_name,
       COUNT(DISTINCT s.id) AS bills,
       IFNULL(SUM(si.qty), 0) AS qty,
       IFNULL(SUM(si.line_total), 0) AS amount
     ${FROM_SQL}
     LEFT JOIN branches b ON b.id = s.branch_id
     WHERE ${where}
     GROUP BY ${SALE_DATE_FORMAT_SQL}, s.branch_id, b.code, b.name
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

const mapDailyDetailLine = (row) => ({
  date: formatSqlDate(row.sale_date),
  saleId: Number(row.sale_id),
  receiptNo: row.receipt_no || '',
  status: row.status || '',
  paidAt: row.paid_at,
  voidedAt: row.voided_at || null,
  voidReason: row.void_reason || '',
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
});

const DETAIL_SELECT_SQL = `
       ${SALE_DATE_FORMAT_SQL} AS sale_date,
       s.id AS sale_id,
       s.receipt_no AS receipt_no,
       s.status AS status,
       s.paid_at AS paid_at,
       s.voided_at AS voided_at,
       s.void_reason AS void_reason,
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
`;

/**
 * Flat PAID sale lines for this vendor only (other vendors' lines on the same bill are excluded).
 * Ordered date DESC → paid_at DESC → sale id → line id.
 */
export const findVendorDailyDetailLines = async (vendorId, filters) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, filters, 'PAID');
  // Only lines attributed to this vendor — bills with zero of our products never appear.
  const [rows] = await getPool().execute(
    `SELECT
       ${DETAIL_SELECT_SQL}
     ${FROM_SQL}
     LEFT JOIN branches b ON b.id = s.branch_id
     WHERE ${where}
       AND si.qty > 0
     ORDER BY sale_date DESC, s.paid_at DESC, s.id DESC, si.id ASC`,
    params
  );

  return rows.map(mapDailyDetailLine);
};

/**
 * Flat voided/cancelled sale lines for this vendor only — same attribution rules as PAID detail.
 */
export const findVendorDailyDetailVoidedLines = async (vendorId, filters) => {
  assertDatabase();
  const { where, params } = vendorScope(vendorId, filters, 'VOIDED');
  const [rows] = await getPool().execute(
    `SELECT
       ${DETAIL_SELECT_SQL}
     ${FROM_SQL}
     LEFT JOIN branches b ON b.id = s.branch_id
     WHERE ${where}
       AND si.qty > 0
     ORDER BY sale_date DESC, COALESCE(s.voided_at, s.paid_at) DESC, s.id DESC, si.id ASC`,
    params
  );

  return rows.map(mapDailyDetailLine);
};

/**
 * Payment rows for specific sale ids (full bill amounts — for per-bill display).
 * CASH uses amount - change_amount.
 */
export const findPaymentsBySaleIds = async (saleIds = []) => {
  assertDatabase();
  const ids = [...new Set(saleIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) return [];

  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await getPool().execute(
    `SELECT
       pay.sale_id AS sale_id,
       pay.method AS method,
       IFNULL(SUM(
         CASE
           WHEN pay.method = 'CASH' THEN pay.amount - IFNULL(pay.change_amount, 0)
           ELSE pay.amount
         END
       ), 0) AS amount
     FROM payments pay
     WHERE pay.sale_id IN (${placeholders})
     GROUP BY pay.sale_id, pay.method
     ORDER BY pay.sale_id ASC, pay.method ASC`,
    ids
  );

  return rows.map((row) => ({
    saleId: Number(row.sale_id),
    method: row.method || 'OTHER',
    amount: roundMoney(row.amount || 0)
  }));
};

/**
 * Per-day payment breakdown for this vendor's share of PAID bills.
 * Mixed-vendor bills allocate each payment by vendor_line_total / bill_line_total.
 * CASH uses amount - change_amount (net cash received).
 */
export const findVendorDailyPaymentBreakdown = async (vendorId, filters) => {
  assertDatabase();
  const params = [vendorId];
  const conditions = ["s.status = 'PAID'"];

  if (filters.branchId) {
    conditions.push('s.branch_id = ?');
    params.push(filters.branchId);
  }
  if (filters.dateFrom) {
    conditions.push(`${SALE_DATE_SQL} >= ?`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`${SALE_DATE_SQL} <= ?`);
    params.push(filters.dateTo);
  }

  const [rows] = await getPool().execute(
    `SELECT
       ${SALE_DATE_FORMAT_SQL} AS sale_date,
       pay.method AS method,
       IFNULL(SUM(
         (CASE
            WHEN pay.method = 'CASH' THEN pay.amount - IFNULL(pay.change_amount, 0)
            ELSE pay.amount
          END)
         * (vendor_lines.vendor_amount / NULLIF(bill_lines.bill_amount, 0))
       ), 0) AS amount
     FROM sales s
     INNER JOIN (
       SELECT
         si.sale_id AS sale_id,
         IFNULL(SUM(si.line_total), 0) AS vendor_amount
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE COALESCE(si.vendor_id, p.vendor_id) = ?
         AND si.qty > 0
       GROUP BY si.sale_id
     ) vendor_lines ON vendor_lines.sale_id = s.id
     INNER JOIN (
       SELECT
         sale_id,
         IFNULL(SUM(line_total), 0) AS bill_amount
       FROM sale_items
       WHERE qty > 0
       GROUP BY sale_id
     ) bill_lines ON bill_lines.sale_id = s.id
     INNER JOIN payments pay ON pay.sale_id = s.id
     WHERE ${conditions.join(' AND ')}
       AND vendor_lines.vendor_amount > 0
       AND bill_lines.bill_amount > 0
     GROUP BY ${SALE_DATE_FORMAT_SQL}, pay.method
     ORDER BY sale_date DESC, pay.method ASC`,
    params
  );

  return rows.map((row) => ({
    date: formatSqlDate(row.sale_date),
    method: row.method || 'OTHER',
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
