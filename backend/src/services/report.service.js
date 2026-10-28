import {
  findVendorBranches,
  findVendorBranchDaily,
  findVendorDaily,
  findVendorMonthly,
  findVendorSummary
} from '../repositories/report.repository.js';

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
