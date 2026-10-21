import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isStaffOrAdmin } from "../middleware/role.middleware";

const router = Router();

router.get("/", BookingController.listTrainers);
router.get("/unavailabilities", BookingController.listTrainerUnavailabilities);
router.get("/:id/availability", BookingController.getTrainerAvailability);

router.use(authenticate);

router.post("/", isStaffOrAdmin, BookingController.createTrainer);
router.post("/:id/unavailability", isStaffOrAdmin, BookingController.setTrainerUnavailability);
router.delete("/unavailability/:id", isStaffOrAdmin, BookingController.deleteTrainerUnavailability);
router.patch("/:id/approve", isStaffOrAdmin, BookingController.approveTrainer);
router.patch("/:id/decline", isStaffOrAdmin, BookingController.declineTrainer);
router.delete("/:id", isStaffOrAdmin, BookingController.deleteTrainer);

export default router;
