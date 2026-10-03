import { Router } from "express";
import { ClassController } from "../controllers/class.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

// Publicly viewable class schedule
router.get("/", ClassController.list);

router.use(authenticate);

router.post("/", isStaffOrAdmin, ClassController.create);
router.post("/:id/book", ClassController.book);
router.post("/:id/cancel", ClassController.cancelBooking);

export default router;
