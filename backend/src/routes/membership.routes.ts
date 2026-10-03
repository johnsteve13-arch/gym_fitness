import { Router } from "express";
import { MembershipController } from "../controllers/membership.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

// Publicly readable plans
router.get("/plans", MembershipController.listPlans);

router.use(authenticate);

// Admin plan management
router.post("/plans", isStaffOrAdmin, MembershipController.createPlan);
router.patch("/plans/:id", isStaffOrAdmin, MembershipController.updatePlan);

// Member subscription controls
router.post("/assign", isStaffOrAdmin, MembershipController.assignOrUpgrade);
router.post("/extend/:id", isStaffOrAdmin, MembershipController.extend);
router.post("/freeze/:id", MembershipController.freeze);
router.post("/unfreeze/:id", MembershipController.unfreeze);
router.post("/cancel/:id", MembershipController.cancel);
router.post("/renew", MembershipController.renew);

export default router;
