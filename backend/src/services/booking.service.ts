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
    paymentMethod?: string;
    coinsPaid?: number;
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

    const isCoinsPayment = data.paymentMethod === "coins";
    const coinsRequired =
      data.coinsPaid !== undefined
        ? Number(data.coinsPaid)
        : Math.max(50, Math.round(Number(trainer.hourlyRate) > 200 ? Number(trainer.hourlyRate) / 5 : Number(trainer.hourlyRate)));

    if (isCoinsPayment) {
      const member = await prisma.member.findUnique({
        where: { id: data.memberId },
        include: { user: true },
      });
      if (!member) throw new Error("Member not found.");

      if (member.rewardCoins < coinsRequired) {
        throw new Error(
          `Insufficient coin balance. You have ${member.rewardCoins} coins, but this booking requires ${coinsRequired} coins.`
        );
      }

      // Deduct coins inside transaction and create confirmed booking
      return await prisma.$transaction(async (tx) => {
        await tx.member.update({
          where: { id: data.memberId },
          data: { rewardCoins: { decrement: coinsRequired } },
        });

        const booking = await tx.trainerBooking.create({
          data: {
            memberId: data.memberId,
            trainerId: data.trainerId,
            sessionDate,
            startTime: data.startTime,
            endTime: data.endTime,
            sessionType: data.sessionType || "1-on-1 Fitness",
            status: "confirmed",
            paymentStatus: "completed",
            price: trainer.hourlyRate,
            notes: data.notes ? `${data.notes} [Redeemed ${coinsRequired} Coins]` : `[Redeemed ${coinsRequired} Coins]`,
            expiresAt: null,
          },
          include: {
            trainer: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        });

        await tx.notification.create({
          data: {
            userId: member.userId,
            title: "Loyalty Coins Redeemed for Trainer",
            message: `Redeemed ${coinsRequired} coins for 1-on-1 session with Coach ${trainer.user?.firstName || "Trainer"}.`,
            type: "reward",
          },
        });

        return booking;
      });
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
