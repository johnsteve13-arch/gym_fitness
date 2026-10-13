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

      const booking = await BookingService.createBooking({
        ...req.body,
        memberId,
      });

      await recordAuditLog(req, "TRAINER_BOOKING_CREATED", "trainer_bookings", booking.id, {
        trainerId: booking.trainerId,
        sessionDate: booking.sessionDate,
      });

      return sendSuccess(res, booking, "Trainer session booked. Please complete payment within 30 minutes to confirm.", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
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
      const { status } = req.body;
      const updated = await BookingService.updateBookingStatus(req.params.id, status);
      await recordAuditLog(req, "TRAINER_BOOKING_STATUS_CHANGED", "trainer_bookings", req.params.id, { status });
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
}
