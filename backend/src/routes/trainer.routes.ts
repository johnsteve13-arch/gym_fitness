import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

router.get("/", BookingController.listTrainers);

router.use(authenticate);

router.post("/", isStaffOrAdmin, BookingController.createTrainer);
router.delete("/:id", isStaffOrAdmin, BookingController.deleteTrainer);

export default router;
