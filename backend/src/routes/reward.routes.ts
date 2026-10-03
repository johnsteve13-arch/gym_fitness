import { Router } from "express";
import { RewardController } from "../controllers/reward.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

// Publicly viewable catalog
router.get("/", RewardController.list);

router.use(authenticate);

router.post("/", isStaffOrAdmin, RewardController.create);
router.post("/:id/redeem", RewardController.redeem);
router.get("/history", RewardController.getHistory);

export default router;
