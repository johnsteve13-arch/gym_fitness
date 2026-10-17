import { Request, Response, NextFunction } from "express";
import { BookingService } from "../services/booking.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { recordAuditLog } from "../middleware/audit.middleware";

export class BookingController {
  static async listTrainers(req: Request, res: Response, next: NextFunction) {
    try {
      const includePending =
        req.query.includePending === "true" ||
        req.user?.role === "admin" ||
        req.user?.role === "super_admin";
      const trainers = await BookingService.listTrainers({ includePending });
      return sendSuccess(res, trainers);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.body.memberId || req.user?.memberId;
      if (!memberId) return sendError(res, "Member ID is required", 400);

      const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
      const userAgent = req.headers["user-agent"] || "";

      const booking = await BookingService.createBooking({
        ...req.body,
        memberId,
        ipAddress,
        userAgent,
      });

      await recordAuditLog(req, "TRAINER_BOOKING_CREATED", "trainer_bookings", booking.id, {
        trainerId: booking.trainerId,
        sessionDate: booking.sessionDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      });

      return sendSuccess(res, booking, "Trainer session booked. Please complete payment within 30 minutes to confirm.", 201);
    } catch (err: any) {
      const statusCode = err.statusCode || (err.message.includes("Booking Declined") ? 409 : 400);
      return sendError(res, err.message, statusCode);
    }
  }

  static async listBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.query.memberId as string || (req.user?.role === "member" ? req.user.memberId : undefined);
      const trainerId = req.query.trainerId as string || (req.user?.role === "trainer" ? req.user.trainerId : undefined);
      const status = req.query.status as string;

      const bookings = await BookingService.listBookings({ memberId, trainerId, status });
      return sendSuccess(res, bookings);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, reason } = req.body;
      const updated = await BookingService.updateBookingStatus(req.params.id, status, reason);
      const action = status === "declined" ? "TRAINER_DECLINED_BOOKING" : "TRAINER_BOOKING_STATUS_CHANGED";
      await recordAuditLog(req, action, "trainer_bookings", req.params.id, { status, reason });
      return sendSuccess(res, updated, `Booking marked as ${status}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async createTrainer(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, firstName, lastName } = req.body;
      if (!email || !firstName || !lastName) {
        return sendError(res, "First name, last name, and email are required.", 400);
      }
      const trainer = await BookingService.createTrainer(req.body);
      await recordAuditLog(req, "TRAINER_CREATED", "trainers", trainer.id, {
        name: `${trainer.user.firstName} ${trainer.user.lastName}`,
        email: trainer.user.email,
        specialization: trainer.specialization,
      });
      return sendSuccess(res, trainer, "Trainer registered successfully.", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deleteTrainer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const result = await BookingService.deleteTrainer(id);
      await recordAuditLog(req, "TRAINER_DELETED", "trainers", id);
      return sendSuccess(res, result, "Trainer deleted successfully.");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async approveTrainer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const result = await BookingService.approveTrainer(id);
      await recordAuditLog(req, "TRAINER_APPROVED", "trainers", id);
      return sendSuccess(res, result, "Trainer registration confirmed.");
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getTrainerAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.params.id;
      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const startTime = req.query.startTime as string;
      const endTime = req.query.endTime as string;

      const availability = await BookingService.getTrainerAvailability({
        trainerId,
        sessionDate: date,
        startTime,
        endTime,
      });

      return sendSuccess(res, availability);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async listScheduleConflicts(req: Request, res: Response, next: NextFunction) {
    try {
      const conflicts = await BookingService.listScheduleConflicts();
      return sendSuccess(res, conflicts);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
