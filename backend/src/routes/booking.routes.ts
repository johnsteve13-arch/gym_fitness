import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

router.get("/trainers", BookingController.listTrainers);

router.use(authenticate);

router.post("/trainers", isStaffOrAdmin, BookingController.createTrainer);
router.patch("/trainers/:id/approve", isStaffOrAdmin, BookingController.approveTrainer);
router.delete("/trainers/:id", isStaffOrAdmin, BookingController.deleteTrainer);

router.post("/", BookingController.createBooking);
router.get("/", BookingController.listBookings);
router.patch("/:id/status", BookingController.updateStatus);

export default router;
