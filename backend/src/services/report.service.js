import {
  findVendorBranches,
  findVendorBranchDaily,
  findVendorDaily,
  findVendorDailyDetailLines,
  findVendorMonthly,
  findVendorSummary
} from '../repositories/report.repository.js';
import { roundMoney, roundQty } from '../utils/money.js';

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

/** Daily report drill-down: date → bills → vendor-only line items. */
export const getDailyDetailReport = async (vendorId, query) => {
  const range = resolveRange(query);
  const lines = await findVendorDailyDetailLines(vendorId, range);
  const dayMap = new Map();

  for (const line of lines) {
    // Defensive: never attach empty / zero lines (would create orphan bill numbers).
    if (!line.saleId || !(Number(line.qty) > 0)) continue;

    let day = dayMap.get(line.date);
    if (!day) {
      day = {
        date: line.date,
        bills: [],
        billMap: new Map()
      };
      dayMap.set(line.date, day);
    }

    let bill = day.billMap.get(line.saleId);
    if (!bill) {
      bill = {
        saleId: line.saleId,
        receiptNo: line.receiptNo,
        paidAt: line.paidAt,
        branchId: line.branchId,
        branchCode: line.branchCode,
        branchName: line.branchName,
        qty: 0,
        amount: 0,
        items: []
      };
      day.billMap.set(line.saleId, bill);
      day.bills.push(bill);
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

  // Keep only bills that actually have our products; drop empty days/bills from summary.
  const days = [...dayMap.values()]
    .map((day) => {
      const bills = day.bills.filter((bill) => bill.items.length > 0 && Number(bill.qty) > 0);
      const qty = roundQty(bills.reduce((sum, bill) => sum + Number(bill.qty || 0), 0));
      const amount = roundMoney(bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0));
      return {
        date: day.date,
        bills,
        billsCount: bills.length,
        qty,
        amount
      };
    })
    .filter((day) => day.billsCount > 0);

  const totals = days.reduce(
    (acc, day) => ({
      bills: acc.bills + day.billsCount,
      qty: roundQty(acc.qty + day.qty),
      amount: roundMoney(acc.amount + day.amount)
    }),
    { bills: 0, qty: 0, amount: 0 }
  );

  return withBranches(vendorId, { ...range, days, totals });
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
