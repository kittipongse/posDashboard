import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginController, logoutController, meController } from '../controllers/auth.controller.js';
import { requireVendorAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { loginSchema } from '../validators/auth.validator.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่',
    code: 'RATE_LIMITED',
    errors: []
  }
});

router.post('/login', loginLimiter, validateBody(loginSchema), loginController);
router.post('/logout', requireVendorAuth, logoutController);
router.get('/me', requireVendorAuth, meController);

export default router;
