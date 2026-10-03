import { Router } from "express";
import { AiController } from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.post("/score/:memberId?", AiController.calculateScore);
router.get("/retention-alerts", isStaffOrAdmin, AiController.getRetentionAlerts);
router.post("/coach-advice", AiController.getCoachAdvice);

export default router;
