import { getCurrentVendor, login } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

export const loginController = asyncHandler(async (req, res) => {
  const data = await login(req.validated);
  return success(res, data, 'เข้าสู่ระบบสำเร็จ');
});

export const logoutController = asyncHandler(async (req, res) => {
  return success(res, {}, 'ออกจากระบบสำเร็จ');
});

export const meController = asyncHandler(async (req, res) => {
  const user = await getCurrentVendor(req.user);
  return success(res, { user }, 'Success');
});
