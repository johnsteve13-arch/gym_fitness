import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.post("/process", PaymentController.process);
router.get("/", PaymentController.list);
router.post("/:id/refund", isStaffOrAdmin, PaymentController.refund);
router.get("/analytics", isStaffOrAdmin, PaymentController.getFinancialAnalytics);

export default router;
