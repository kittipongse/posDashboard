import {
  PAYMENT_METHOD_ORDER,
  normalizePaymentMethod,
  paymentMethodLabel
} from '../constants/payments.js';
import {
  findVendorBranches,
  findVendorBranchDaily,
  findVendorDaily,
  findVendorDailyDetailLines,
  findVendorDailyDetailVoidedLines,
  findVendorDailyPaymentBreakdown,
  findPaymentsBySaleIds,
  findVendorMonthly,
  findVendorSummary
} from '../repositories/report.repository.js';
import { roundMoney, roundQty } from '../utils/money.js';

const emptyPaymentBucket = () =>
  Object.fromEntries(PAYMENT_METHOD_ORDER.map((code) => [code, 0]));

const finalizePaymentRows = (bucket) =>
  PAYMENT_METHOD_ORDER.map((method) => ({
    method,
    label: paymentMethodLabel(method),
    amount: roundMoney(bucket[method] || 0)
  })).filter((row) => Number(row.amount) > 0);

const accumulatePayments = (bucket, rows = []) => {
  for (const row of rows) {
    const method = normalizePaymentMethod(row.method);
    bucket[method] = roundMoney((bucket[method] || 0) + Number(row.amount || 0));
  }
  return bucket;
};

const groupPaymentsBySaleId = (rows = []) => {
  const map = new Map();
  for (const row of rows) {
    if (!row.saleId || !(Number(row.amount) > 0)) continue;
    if (!map.has(row.saleId)) map.set(row.saleId, emptyPaymentBucket());
    accumulatePayments(map.get(row.saleId), [row]);
  }
  return map;
};

const buildBillsFromLines = (lines, paymentsBySaleId = new Map()) => {
  const billMap = new Map();
  const bills = [];

  for (const line of lines) {
    if (!line.saleId || !(Number(line.qty) > 0)) continue;

    let bill = billMap.get(line.saleId);
    if (!bill) {
      bill = {
        saleId: line.saleId,
        receiptNo: line.receiptNo,
        status: line.status || '',
        paidAt: line.paidAt,
        voidedAt: line.voidedAt || null,
        voidReason: line.voidReason || '',
        branchId: line.branchId,
        branchCode: line.branchCode,
        branchName: line.branchName,
        qty: 0,
        amount: 0,
        items: [],
        payments: finalizePaymentRows(paymentsBySaleId.get(line.saleId) || emptyPaymentBucket())
      };
      billMap.set(line.saleId, bill);
      bills.push(bill);
    }

    bill.items.push({
      saleItemId: line.saleItemId,
      sku: line.sku,
      name: line.name,
      qty: line.qty,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      unit: line.unit
    });
    bill.qty = roundQty(bill.qty + line.qty);
    bill.amount = roundMoney(bill.amount + line.lineTotal);
  }

  return bills.filter((bill) => bill.items.length > 0 && Number(bill.qty) > 0);
};

export const bangkokToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

export const addDaysIso = (isoDate, days) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const resolveRange = (query, { dateFrom, dateTo } = {}) => {
  const today = bangkokToday();
  return {
    dateFrom: query.dateFrom || dateFrom || addDaysIso(today, -6),
    dateTo: query.dateTo || dateTo || today,
    branchId: query.branchId || null
  };
};

const withBranches = async (vendorId, payload) => {
  const branches = await findVendorBranches(vendorId);
  return { ...payload, branches };
};

export const getSummaryReport = async (vendorId, query) => {
  const range = resolveRange(query);
  const totals = await findVendorSummary(vendorId, range);
  return withBranches(vendorId, { ...range, totals });
};

export const getDailyReport = async (vendorId, query) => {
  const range = resolveRange(query);
  const items = await findVendorDaily(vendorId, range);
  const totals = await findVendorSummary(vendorId, range);
  return withBranches(vendorId, { ...range, items, totals });
};

/** Daily report drill-down: date → paid bills (+ voided bills below) → vendor-only lines. */
export const getDailyDetailReport = async (vendorId, query) => {
  const range = resolveRange(query);
  const [paidLines, voidedLines, paymentRows] = await Promise.all([
    findVendorDailyDetailLines(vendorId, range),
    findVendorDailyDetailVoidedLines(vendorId, range),
    findVendorDailyPaymentBreakdown(vendorId, range)
  ]);

  const saleIds = [
    ...new Set(
      [...paidLines, ...voidedLines]
        .map((line) => Number(line.saleId))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  ];
  const billPaymentRows = await findPaymentsBySaleIds(saleIds);
  const paymentsBySaleId = groupPaymentsBySaleId(billPaymentRows);

  const dayMap = new Map();
  const paymentsByDate = new Map();

  const ensureDay = (date) => {
    let day = dayMap.get(date);
    if (!day) {
      day = { date, paidLines: [], voidedLines: [] };
      dayMap.set(date, day);
    }
    return day;
  };

  for (const line of paidLines) {
    if (!line.saleId || !(Number(line.qty) > 0)) continue;
    ensureDay(line.date).paidLines.push(line);
  }
  for (const line of voidedLines) {
    if (!line.saleId || !(Number(line.qty) > 0)) continue;
    ensureDay(line.date).voidedLines.push(line);
  }
  for (const row of paymentRows) {
    if (!row.date || !(Number(row.amount) > 0)) continue;
    if (!paymentsByDate.has(row.date)) {
      paymentsByDate.set(row.date, emptyPaymentBucket());
    }
    accumulatePayments(paymentsByDate.get(row.date), [row]);
    // Ensure payment-only dates still appear if somehow lines were filtered out.
    ensureDay(row.date);
  }

  // Paid totals stay the report numbers; cancelled bills are listed only (not added to sales).
  const days = [...dayMap.values()]
    .map((day) => {
      const bills = buildBillsFromLines(day.paidLines, paymentsBySaleId);
      const cancelledBills = buildBillsFromLines(day.voidedLines, paymentsBySaleId);
      const qty = roundQty(bills.reduce((sum, bill) => sum + Number(bill.qty || 0), 0));
      const amount = roundMoney(bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0));
      const payments = finalizePaymentRows(paymentsByDate.get(day.date) || emptyPaymentBucket());
      return {
        date: day.date,
        bills,
        cancelledBills,
        billsCount: bills.length,
        cancelledBillsCount: cancelledBills.length,
        qty,
        amount,
        payments
      };
    })
    .filter((day) => day.billsCount > 0 || day.cancelledBillsCount > 0)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const paymentTotalsBucket = emptyPaymentBucket();
  for (const day of days) {
    accumulatePayments(
      paymentTotalsBucket,
      (day.payments || []).map((row) => ({ method: row.method, amount: row.amount }))
    );
  }

  const totals = days.reduce(
    (acc, day) => ({
      bills: acc.bills + day.billsCount,
      qty: roundQty(acc.qty + day.qty),
      amount: roundMoney(acc.amount + day.amount),
      cancelledBills: acc.cancelledBills + day.cancelledBillsCount
    }),
    { bills: 0, qty: 0, amount: 0, cancelledBills: 0 }
  );

  return withBranches(vendorId, {
    ...range,
    days,
    totals: {
      ...totals,
      payments: finalizePaymentRows(paymentTotalsBucket)
    }
  });
};

export const getMonthlyReport = async (vendorId, query) => {
  const year = Number(query.year) || new Date().getFullYear();
  const range = {
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
    branchId: query.branchId || null
  };
  const items = await findVendorMonthly(vendorId, range);
  const totals = await findVendorSummary(vendorId, range);

  const chart = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const found = items.find((row) => row.month === month && row.year === year);
    return {
      year,
      month,
      amount: found?.amount || 0,
      bills: found?.bills || 0,
      qty: found?.qty || 0
    };
  });

  return withBranches(vendorId, { year, ...range, items, totals, chart });
};

/** Report style 4 — branch × day (like posApp branch-daily-sales). */
export const getByBranchReport = async (vendorId, query) => {
  const range = resolveRange(query);
  const items = await findVendorBranchDaily(vendorId, range);
  const totals = await findVendorSummary(vendorId, range);
  return withBranches(vendorId, { ...range, items, totals });
};
