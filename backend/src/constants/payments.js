/** Payment method codes aligned with posApp (see reportPaymentAgg / payments.method). */
export const PAYMENT_METHOD_ORDER = [
  'CASH',
  'QR',
  'CARD_VISA',
  'CARD_MASTERCARD',
  'CARD_OTHER',
  'TRANSFER',
  'OTHER'
];

export const PAYMENT_METHOD_LABELS = {
  CASH: 'เงินสด',
  QR: 'QR',
  CARD_VISA: 'Visa',
  CARD_MASTERCARD: 'Mastercard',
  CARD_OTHER: 'บัตรอื่น',
  TRANSFER: 'โอนเงิน',
  CREDIT_CARD: 'บัตรเครดิต',
  OTHER: 'อื่นๆ'
};

/** Map legacy / unknown POS codes onto the vendor-portal set. */
export const normalizePaymentMethod = (method) => {
  const code = String(method || '')
    .trim()
    .toUpperCase();
  if (!code) return 'OTHER';
  if (code === 'CREDIT_CARD') return 'CARD_OTHER';
  if (PAYMENT_METHOD_ORDER.includes(code)) return code;
  if (code.startsWith('CARD_')) return 'CARD_OTHER';
  return 'OTHER';
};

export const paymentMethodLabel = (method) => {
  const code = normalizePaymentMethod(method);
  return PAYMENT_METHOD_LABELS[code] || code;
};
