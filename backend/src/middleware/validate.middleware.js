import { fail } from '../utils/response.js';

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = (result.error.issues || []).map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return fail(res, 'ข้อมูลไม่ถูกต้อง', 'VALIDATION_ERROR', 422, errors);
  }

  req.validated = result.data;
  return next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);

  if (!result.success) {
    const errors = (result.error.issues || []).map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return fail(res, 'ข้อมูลไม่ถูกต้อง', 'VALIDATION_ERROR', 422, errors);
  }

  req.validatedQuery = result.data;
  return next();
};
