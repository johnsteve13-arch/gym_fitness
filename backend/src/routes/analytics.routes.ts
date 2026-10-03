import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate, isStaffOrAdmin);

router.get("/overview", AnalyticsController.getOverview);
router.get("/revenue-trends", AnalyticsController.getRevenueTrends);
router.get("/attendance-trends", AnalyticsController.getAttendanceTrends);
router.get("/export-members", AnalyticsController.exportMembers);

export default router;
