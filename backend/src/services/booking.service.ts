import { prisma } from "../config/database";
import { ENV } from "../config/env";

export class BookingService {
  static async listTrainers() {
    return prisma.trainer.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        availabilities: {
          where: { isActive: true },
        },
      },
    });
  }

  static async createBooking(data: {
    memberId: string;
    trainerId: string;
    sessionDate: string; // "YYYY-MM-DD"
    startTime: string; // "10:00"
    endTime: string; // "11:00"
    sessionType?: string;
    notes?: string;
  }) {
    const sessionDate = new Date(data.sessionDate);

    // 1. Check if trainer exists
    const trainer = await prisma.trainer.findUnique({
      where: { id: data.trainerId },
      include: { user: true },
    });
    if (!trainer) throw new Error("Trainer not found.");

    // 2. Check for scheduling conflict with this trainer
    const existingConflict = await prisma.trainerBooking.findFirst({
      where: {
        trainerId: data.trainerId,
        sessionDate: sessionDate,
        startTime: data.startTime,
        status: { in: ["pending", "confirmed"] },
      },
    });

    if (existingConflict) {
      throw new Error(`The trainer is already booked at this time slot (${data.startTime} - ${data.endTime}) on this date.`);
    }

    // 3. Set unpaid booking expiration time (e.g. 30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ENV.UNPAID_BOOKING_TIMEOUT_MINUTES);

    const booking = await prisma.trainerBooking.create({
      data: {
        memberId: data.memberId,
        trainerId: data.trainerId,
        sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        sessionType: data.sessionType || "1-on-1 Fitness",
        status: "pending",
        paymentStatus: "unpaid",
        price: trainer.hourlyRate,
        notes: data.notes || null,
        expiresAt,
      },
      include: {
        trainer: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return booking;
  }

  static async listBookings(params: {
    memberId?: string;
    trainerId?: string;
    status?: string;
  }) {
    // Before listing, automatically cancel expired unpaid bookings!
    await this.cancelExpiredUnpaidBookings();

    const where: any = {};
    if (params.memberId) where.memberId = params.memberId;
    if (params.trainerId) where.trainerId = params.trainerId;
    if (params.status) where.status = params.status;

    return prisma.trainerBooking.findMany({
      where,
      orderBy: [{ sessionDate: "desc" }, { startTime: "asc" }],
      include: {
        member: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } },
          },
        },
        trainer: {
          include: {
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  static async updateBookingStatus(
    bookingId: string,
    status: "confirmed" | "completed" | "cancelled" | "no_show"
  ) {
    const booking = await prisma.trainerBooking.findUnique({
      where: { id: bookingId },
      include: { member: { include: { user: true } } },
    });
    if (!booking) throw new Error("Booking not found.");

    const updated = await prisma.trainerBooking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        trainer: { include: { user: true } },
      },
    });

    // Notify member
    await prisma.notification.create({
      data: {
        userId: booking.member.userId,
        title: `Training Session ${status.toUpperCase()}`,
        message: `Your session with Trainer ${updated.trainer.user.firstName} on ${new Date(booking.sessionDate).toLocaleDateString()} has been marked as ${status}.`,
        type: "booking",
      },
    });

    return updated;
  }

  static async cancelExpiredUnpaidBookings() {
    const now = new Date();
    await prisma.trainerBooking.updateMany({
      where: {
        status: "pending",
        paymentStatus: "unpaid",
        expiresAt: { lt: now },
      },
      data: {
        status: "cancelled",
        notes: "Automatically cancelled due to unpaid session window expiration.",
      },
    });
  }
}
