import {
  getByBranchReport,
  getByProductReport,
  getDailyReport,
  getMonthlyReport,
  getSummaryReport
} from '../services/report.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

const vendorIdOf = (req) => req.user.vendorId;

export const summaryController = asyncHandler(async (req, res) => {
  const data = await getSummaryReport(vendorIdOf(req), req.validatedQuery);
  return success(res, data);
});

export const dailyController = asyncHandler(async (req, res) => {
  const data = await getDailyReport(vendorIdOf(req), req.validatedQuery);
  return success(res, data);
});

export const monthlyController = asyncHandler(async (req, res) => {
  const data = await getMonthlyReport(vendorIdOf(req), req.validatedQuery);
  return success(res, data);
});

export const byProductController = asyncHandler(async (req, res) => {
  const data = await getByProductReport(vendorIdOf(req), req.validatedQuery);
  return success(res, data);
});

export const byBranchController = asyncHandler(async (req, res) => {
  const data = await getByBranchReport(vendorIdOf(req), req.validatedQuery);
  return success(res, data);
});
