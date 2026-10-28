import { z } from 'zod';

const emptyToUndefined = (value) => {
  if (value === '' || value === undefined || value === null) return undefined;
  return value;
};

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง');

export const reportQuerySchema = z
  .object({
    dateFrom: z.preprocess(emptyToUndefined, dateString.optional()),
    dateTo: z.preprocess(emptyToUndefined, dateString.optional()),
    branchId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional())
  })
  .refine((query) => !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo, {
    message: 'วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด',
    path: ['dateTo']
  });
