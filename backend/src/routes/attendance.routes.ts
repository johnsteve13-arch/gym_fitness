import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

// Allow authenticated staff/kiosk to verify and check in
router.post("/check-in", AttendanceController.checkIn);
router.post("/check-out", AttendanceController.checkOut);

router.use(authenticate);

router.get("/history", AttendanceController.history);
router.get("/peak-hours", isStaffOrAdmin, AttendanceController.peakHours);

export default router;
