import { prisma } from "../config/database";
import { ENV } from "../config/env";
import bcrypt from "bcryptjs";

export class BookingService {
  static async listTrainers(params?: { includePending?: boolean }) {
    const where: any = {};
    if (!params?.includePending) {
      where.user = { status: "active" };
    }

    return prisma.trainer.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            status: true,
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

  static async createTrainer(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    specialization?: string;
    bio?: string;
    experienceYears?: number;
    hourlyRate?: number;
    maxClients?: number;
    password?: string;
    avatarUrl?: string;
  }) {
    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error("A user with this email address already exists.");
    }

    const passwordHash = await bcrypt.hash(data.password || "Password@123", 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "trainer",
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || null,
        avatarUrl:
          data.avatarUrl?.trim() ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.firstName}_${data.lastName}`,
        status: "active",
      },
    });

    const trainer = await prisma.trainer.create({
      data: {
        userId: user.id,
        specialization: data.specialization || "Strength & Conditioning",
        bio:
          data.bio ||
          "Certified fitness specialist dedicated to helping you achieve your athletic potential.",
        experienceYears: Number(data.experienceYears) || 3,
        hourlyRate: Number(data.hourlyRate) || 75.0,
        maxClients: Number(data.maxClients) || 20,
        rating: 5.0,
      },
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
        availabilities: true,
      },
    });

    // Create default availability schedule (Monday - Friday 08:00 - 18:00)
    for (let day = 1; day <= 5; day++) {
      await prisma.trainerAvailability
        .create({
          data: {
            trainerId: trainer.id,
            dayOfWeek: day,
            startTime: "08:00",
            endTime: "18:00",
            isActive: true,
          },
        })
        .catch(() => null);
    }

    return trainer;
  }

  static async deleteTrainer(id: string) {
    const trainer = await prisma.trainer.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
      },
      include: { user: true },
    });

    if (!trainer) {
      throw new Error("Trainer not found.");
    }

    // Delete or detach any gym classes assigned to this trainer
    await prisma.gymClass
      .deleteMany({
        where: { trainerId: trainer.id },
      })
      .catch(() => null);

    // Detach any workout programs assigned to this trainer
    await prisma.workoutProgram
      .updateMany({
        where: { trainerId: trainer.id },
        data: { trainerId: null },
      })
      .catch(() => null);

    // Delete user which cascades to trainer, availabilities, and bookings
    await prisma.user.delete({
      where: { id: trainer.userId },
    });

    return {
      success: true,
      message: `Trainer ${trainer.user.firstName} ${trainer.user.lastName} permanently deleted.`,
    };
  }

  static async approveTrainer(id: string) {
    const trainer = await prisma.trainer.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
      },
      include: { user: true },
    });

    if (!trainer) {
      throw new Error("Trainer not found.");
    }

    const updatedUser = await prisma.user.update({
      where: { id: trainer.userId },
      data: { status: "active" },
    });

    // Create confirmation notification for the trainer
    await prisma.notification.create({
      data: {
        userId: trainer.userId,
        title: "Trainer Registration Confirmed!",
        message: "Your trainer account has been confirmed by gym administration. You now have full access to your trainer dashboard.",
        type: "system",
      },
    }).catch(() => null);

    return {
      success: true,
      message: `Trainer ${trainer.user.firstName} ${trainer.user.lastName} has been confirmed and activated.`,
      trainer: {
        ...trainer,
        user: updatedUser,
      },
    };
  }
}

