export const formatBaht = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('th-TH').format(amount);
};

export const formatQty = (value) =>
  Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 3 });

export const formatVendorRef = (row, fallback = '-') => {
  if (!row || typeof row !== 'object') return fallback;
  const abbr = String(row.abbr || row.vendorAbbr || '')
    .trim()
    .toUpperCase();
  if (/^[A-Z0-9]{3}$/.test(abbr)) return abbr;
  const code = String(row.vendorCode || '').trim();
  return code || fallback;
};

export const monthLabel = (year, month) =>
  `${String(month).padStart(2, '0')}/${Number(year) + 543}`;
