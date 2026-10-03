import { Router } from "express";
import authRoutes from "./auth.routes";
import memberRoutes from "./member.routes";
import membershipRoutes from "./membership.routes";
import attendanceRoutes from "./attendance.routes";
import workoutRoutes from "./workout.routes";
import measurementRoutes from "./measurement.routes";
import bookingRoutes from "./booking.routes";
import classRoutes from "./class.routes";
import paymentRoutes from "./payment.routes";
import rewardRoutes from "./reward.routes";
import aiRoutes from "./ai.routes";
import notificationRoutes from "./notification.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/members", memberRoutes);
router.use("/memberships", membershipRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/workouts", workoutRoutes);
router.use("/measurements", measurementRoutes);
router.use("/bookings", bookingRoutes);
router.use("/classes", classRoutes);
router.use("/payments", paymentRoutes);
router.use("/rewards", rewardRoutes);
router.use("/ai", aiRoutes);
router.use("/notifications", notificationRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
