import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/trainers", BookingController.listTrainers);

router.use(authenticate);

router.post("/", BookingController.createBooking);
router.get("/", BookingController.listBookings);
router.patch("/:id/status", BookingController.updateStatus);

export default router;
