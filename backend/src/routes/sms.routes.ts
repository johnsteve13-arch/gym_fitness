import { Router } from "express";
import { SmsController } from "../controllers/sms.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";
import { smsLimiter } from "../middleware/rate-limiter";

const router = Router();

router.use(authenticate);

// User notification preferences (accessible by any logged in member/trainer/admin)
router.get("/preferences", SmsController.getPreferences);
router.put("/preferences", SmsController.updatePreferences);

// Administrative SMS routes
router.get("/stats", isStaffOrAdmin, SmsController.getStats);
router.get("/logs", isStaffOrAdmin, SmsController.listLogs);
router.post("/retry/:id", isStaffOrAdmin, smsLimiter, SmsController.retry);
router.post("/test", isStaffOrAdmin, smsLimiter, SmsController.testSend);

export default router;
