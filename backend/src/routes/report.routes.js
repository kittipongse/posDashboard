import { Router } from 'express';
import {
  byBranchController,
  dailyController,
  monthlyController,
  summaryController
} from '../controllers/report.controller.js';
import { requireVendorAuth } from '../middleware/auth.middleware.js';
import { validateQuery } from '../middleware/validate.middleware.js';
import { reportQuerySchema } from '../validators/report.validator.js';

const router = Router();

router.use(requireVendorAuth);

router.get('/summary', validateQuery(reportQuerySchema), summaryController);
router.get('/daily', validateQuery(reportQuerySchema), dailyController);
router.get('/monthly', validateQuery(reportQuerySchema), monthlyController);
router.get('/by-branch', validateQuery(reportQuerySchema), byBranchController);

export default router;
