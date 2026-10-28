import {
  findVendorBranches,
  findVendorByBranch,
  findVendorByProduct,
  findVendorDaily,
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

const sumRows = (items) =>
  items.reduce(
    (acc, row) => ({
      bills: acc.bills + Number(row.bills || 0),
      qty: roundQty(acc.qty + Number(row.qty || 0)),
      amount: roundMoney(acc.amount + Number(row.amount || 0))
    }),
    { bills: 0, qty: 0, amount: 0 }
  );

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

export const getMonthlyReport = async (vendorId, query) => {
  const today = bangkokToday();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const range = resolveRange(query, { dateFrom: yearStart, dateTo: today });
  const items = await findVendorMonthly(vendorId, range);
  const totals = await findVendorSummary(vendorId, range);

  const chart = items
    .slice()
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((row) => ({
      year: row.year,
      month: row.month,
      amount: row.amount
    }));

  return withBranches(vendorId, { ...range, items, totals, chart });
};

export const getByProductReport = async (vendorId, query) => {
  const range = resolveRange(query);
  const items = await findVendorByProduct(vendorId, range);
  const totals = await findVendorSummary(vendorId, range);
  return withBranches(vendorId, { ...range, items, totals: totals || sumRows(items) });
};

export const getByBranchReport = async (vendorId, query) => {
  const range = resolveRange(query);
  const items = await findVendorByBranch(vendorId, range);
  const totals = await findVendorSummary(vendorId, range);
  return withBranches(vendorId, { ...range, items, totals });
};
