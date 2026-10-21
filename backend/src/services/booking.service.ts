import { prisma } from "../config/database";
import { ENV } from "../config/env";
import bcrypt from "bcryptjs";
import { NotificationService } from "./notification.service";

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
    ipAddress?: string;
    userAgent?: string;
  }) {
    // 1. Sanitize & validate dates and time boundaries
    const dateStr = data.sessionDate.slice(0, 10);
    const sessionDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(sessionDate.getTime())) {
      throw new Error("Invalid session date format. Please provide YYYY-MM-DD.");
    }

    if (!data.startTime || !data.endTime || data.startTime >= data.endTime) {
      throw new Error("Invalid session time: Time to Finish must be later than Time to Start.");
    }

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // 2. Perform availability validation & booking creation inside atomic database transaction
    try {
      return await prisma.$transaction(async (tx) => {
      // A. Fetch Trainer with active availabilities
      const trainer = await tx.trainer.findUnique({
        where: { id: data.trainerId },
        include: {
          user: true,
          availabilities: { where: { isActive: true } },
        },
      });

      if (!trainer) {
        throw new Error("Trainer not found.");
      }

      if (trainer.user?.status !== "active") {
        throw new Error(
          "Booking Declined: The selected trainer is unavailable at your chosen date and time. Please select another trainer or choose a different time slot."
        );
      }

      // B. Check working hours schedule
      const dayOfWeek = sessionDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
      let isWithinHours = true;
      let declineReason = "";

      if (trainer.availabilities.length > 0) {
        const schedule = trainer.availabilities.find((a) => a.dayOfWeek === dayOfWeek);
        if (!schedule) {
          isWithinHours = false;
          declineReason = `Coach ${trainer.user?.firstName} does not hold training sessions on this day of the week.`;
        } else if (data.startTime < schedule.startTime || data.endTime > schedule.endTime) {
          isWithinHours = false;
          declineReason = `Requested time slot (${data.startTime} - ${data.endTime}) is outside coach working hours (${schedule.startTime} - ${schedule.endTime}).`;
        }
      }

      // C. Double-booking conflict check:
      // An overlap occurs if: existing.startTime < requested.endTime && existing.endTime > requested.startTime
      const existingConflict = await tx.trainerBooking.findFirst({
        where: {
          trainerId: data.trainerId,
          sessionDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: { in: ["pending", "confirmed"] },
          startTime: { lt: data.endTime },
          endTime: { gt: data.startTime },
        },
        include: {
          member: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      // D. Automatic Decline if unavailable or conflict
      if (!isWithinHours || existingConflict) {
        const fullConflictReason = existingConflict
          ? `Double-booking conflict prevented: Coach already has an active reservation from ${existingConflict.startTime} to ${existingConflict.endTime}.`
          : declineReason;

        // Payment Protection: Throwing here aborts the transaction cleanly without deducting coins or charging funds
        const declineErr: any = new Error(
          "Booking Declined: The selected trainer is unavailable at your chosen date and time. Please select another trainer or choose a different time slot."
        );
        declineErr.statusCode = 409;
        declineErr.isDeclined = true;
        declineErr.conflictDetails = {
          trainerId: data.trainerId,
          trainerName: `${trainer.user.firstName} ${trainer.user.lastName}`,
          memberId: data.memberId,
          sessionDate: dateStr,
          startTime: data.startTime,
          endTime: data.endTime,
          reason: fullConflictReason,
          paymentProtected: true,
          status: "declined",
          price: trainer.hourlyRate,
        };
        throw declineErr;
      }

      // E. Payment Processing (Coins vs Cash/Card) - Protected because validation passed!
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      const durationHours = Math.max(0.5, (endH * 60 + (endM || 0) - (startH * 60 + (startM || 0))) / 60);

      const calculatedPrice = Math.round(Number(trainer.hourlyRate) * durationHours);
      const baseCoinRate = Math.max(50, Math.round(Number(trainer.hourlyRate) > 200 ? Number(trainer.hourlyRate) / 5 : Number(trainer.hourlyRate)));
      const isCoinsPayment = data.paymentMethod === "coins";
      const coinsRequired =
        data.coinsPaid !== undefined
          ? Number(data.coinsPaid)
          : Math.round(baseCoinRate * durationHours);

      if (isCoinsPayment) {
        const member = await tx.member.findUnique({
          where: { id: data.memberId },
          include: { user: true },
        });
        if (!member) throw new Error("Member not found.");

        if (member.rewardCoins < coinsRequired) {
          throw new Error(
            `Insufficient coin balance. You have ${member.rewardCoins} coins, but this ${durationHours}-hour booking requires ${coinsRequired} coins.`
          );
        }

        // Deduct coins inside transaction
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
            price: calculatedPrice,
            notes: data.notes ? `${data.notes} [Redeemed ${coinsRequired} Coins | Duration: ${durationHours} hrs]` : `[Redeemed ${coinsRequired} Coins | Duration: ${durationHours} hrs]`,
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
            message: `Redeemed ${coinsRequired} coins for coaching session with Coach ${trainer.user?.firstName || "Trainer"} (Time to Start: ${data.startTime} • Time to Finish: ${data.endTime} — Takes ${durationHours} hr${durationHours > 1 ? "s" : ""} from start to finish).`,
            type: "reward",
          },
        });

        return booking;
      }

      // Unpaid Direct Payment Booking
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + ENV.UNPAID_BOOKING_TIMEOUT_MINUTES);

      const booking = await tx.trainerBooking.create({
        data: {
          memberId: data.memberId,
          trainerId: data.trainerId,
          sessionDate,
          startTime: data.startTime,
          endTime: data.endTime,
          sessionType: data.sessionType || "1-on-1 Fitness",
          status: "pending",
          paymentStatus: "unpaid",
          price: calculatedPrice,
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
    });
    } catch (err: any) {
      if (err.isDeclined && err.conflictDetails) {
        // Admin Monitoring: Persist declined conflict audit log & declined booking record in database
        try {
          await prisma.auditLog.create({
            data: {
              userId: data.memberId,
              action: "TRAINER_BOOKING_DECLINED_CONFLICT",
              entity: "trainer_bookings",
              entityId: data.trainerId,
              ipAddress: data.ipAddress || null,
              userAgent: data.userAgent || null,
              details: JSON.stringify(err.conflictDetails),
            },
          });

          await prisma.trainerBooking.create({
            data: {
              memberId: data.memberId,
              trainerId: data.trainerId,
              sessionDate,
              startTime: data.startTime,
              endTime: data.endTime,
              sessionType: data.sessionType || "1-on-1 Fitness",
              status: "declined",
              paymentStatus: "unpaid",
              price: err.conflictDetails.price || 75,
              notes: `Booking Declined: ${err.conflictDetails.reason}`,
            },
          });
        } catch (logErr) {
          console.error("Failed to log declined booking conflict:", logErr);
        }
      }
      throw err;
    }
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
    status: "confirmed" | "completed" | "cancelled" | "no_show" | "declined",
    reason?: string
  ) {
    const booking = await prisma.trainerBooking.findUnique({
      where: { id: bookingId },
      include: {
        member: { include: { user: true } },
        trainer: { include: { user: true } },
      },
    });
    if (!booking) throw new Error("Booking not found.");

    const updateData: any = { status };
    if (reason) {
      updateData.notes = `Declined by trainer: ${reason}`;
    }

    // Payment Protection: If declined, refund coins or mark payment refunded
    if (status === "declined") {
      updateData.paymentStatus = "refunded";

      // If booking was redeemed with loyalty coins, refund them
      const isCoinsRedemption = booking.notes?.includes("Redeemed") || booking.notes?.includes("Coins");
      if (isCoinsRedemption) {
        const match = booking.notes?.match(/Redeemed\s+(\d+)\s+Coins/i);
        const coinsAmount = match ? parseInt(match[1], 10) : 50;
        await prisma.member.update({
          where: { id: booking.memberId },
          data: { rewardCoins: { increment: coinsAmount } },
        }).catch(() => null);

        await prisma.notification.create({
          data: {
            userId: booking.member.userId,
            title: "Coins Refunded: Trainer Unavailable",
            message: `Coach ${booking.trainer.user.firstName} is unavailable and declined the booking on ${new Date(booking.sessionDate).toLocaleDateString()}. ${coinsAmount} Loyalty Coins have been refunded to your account balance.`,
            type: "reward",
          },
        }).catch(() => null);
      }
    }

    const updated = await prisma.trainerBooking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        trainer: { include: { user: true } },
      },
    });

    // Notify member of status change
    const isDeclined = status === "declined";
    const notifTitle = isDeclined
      ? "Trainer Session Declined"
      : `Training Session ${status.toUpperCase()}`;
    const notifMessage = isDeclined
      ? `Booking Declined: Coach ${updated.trainer.user.firstName} is unavailable at your requested date and time (${reason || "Trainer unavailable"}). Any coins or payments have been reversed.`
      : `Your session with Trainer ${updated.trainer.user.firstName} on ${new Date(booking.sessionDate).toLocaleDateString()} has been marked as ${status}.`;

    await prisma.notification.create({
      data: {
        userId: booking.member.userId,
        title: notifTitle,
        message: notifMessage,
        type: "booking",
      },
    }).catch(() => null);

    // Admin Monitoring: Record in audit log
    await prisma.auditLog.create({
      data: {
        userId: booking.trainer.userId,
        action: isDeclined ? "TRAINER_DECLINED_BOOKING" : "TRAINER_BOOKING_STATUS_CHANGED",
        entity: "trainer_bookings",
        entityId: bookingId,
        details: JSON.stringify({
          bookingId,
          trainerId: booking.trainerId,
          trainerName: `${booking.trainer.user.firstName} ${booking.trainer.user.lastName}`,
          memberId: booking.memberId,
          memberName: `${booking.member.user.firstName} ${booking.member.user.lastName}`,
          status,
          reason: reason || null,
          paymentProtected: true,
        }),
      },
    }).catch(() => null);

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

    const fullName = `${trainer.user.firstName} ${trainer.user.lastName}`.trim();
    const email = trainer.user.email;
    const phone = trainer.user.phone || "+63 912 345 6789";

    // Multi-channel dispatch: Gmail & Phone Number (SMS)
    const notificationsSent = await NotificationService.sendTrainerAcceptNotifications({
      userId: trainer.userId,
      name: fullName,
      email,
      phone,
    });

    return {
      success: true,
      message: `Trainer ${fullName} has been confirmed and activated. Notifications dispatched to Gmail (${email}) and SMS (${phone}).`,
      notificationsSent,
      trainer: {
        ...trainer,
        user: updatedUser,
      },
    };
  }

  static async declineTrainer(id: string, reason?: string) {
    const trainer = await prisma.trainer.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
      },
      include: { user: true },
    });

    if (!trainer) {
      throw new Error("Trainer not found.");
    }

    const declineReason = reason || "Application requirements not met or coaching roster currently full.";

    const updatedUser = await prisma.user.update({
      where: { id: trainer.userId },
      data: { status: "inactive" },
    });

    const fullName = `${trainer.user.firstName} ${trainer.user.lastName}`.trim();
    const email = trainer.user.email;
    const phone = trainer.user.phone || "+63 912 345 6789";

    // Multi-channel dispatch: Gmail & Phone Number (SMS)
    const notificationsSent = await NotificationService.sendTrainerDeclineNotifications({
      userId: trainer.userId,
      name: fullName,
      email,
      phone,
      reason: declineReason,
    });

    return {
      success: true,
      message: `Trainer registration for Coach ${fullName} has been declined. Decision notice dispatched to Gmail (${email}) and SMS (${phone}).`,
      status: "declined",
      reason: declineReason,
      notificationsSent,
      trainer: {
        ...trainer,
        user: updatedUser,
      },
    };
  }

  static async getTrainerAvailability(params: {
    trainerId: string;
    sessionDate: string; // "YYYY-MM-DD"
    startTime?: string;
    endTime?: string;
  }) {
    const dateStr = params.sessionDate.slice(0, 10);
    const sessionDate = new Date(`${dateStr}T00:00:00.000Z`);
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const trainer = await prisma.trainer.findUnique({
      where: { id: params.trainerId },
      include: {
        user: true,
        availabilities: { where: { isActive: true } },
      },
    });

    if (!trainer) throw new Error("Trainer not found.");

    // Active bookings on this day (pending or confirmed)
    const bookings = await prisma.trainerBooking.findMany({
      where: {
        trainerId: params.trainerId,
        sessionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ["pending", "confirmed"] },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    const dayOfWeek = sessionDate.getUTCDay();
    const schedule = trainer.availabilities.find((a) => a.dayOfWeek === dayOfWeek) || {
      startTime: "08:00",
      endTime: "18:00",
      isActive: true,
    };

    const standardSlots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    const slots = standardSlots.map((slot) => {
      const [h, m] = slot.split(":");
      const endH = (parseInt(h, 10) + 1).toString().padStart(2, "0");
      const slotEnd = `${endH}:${m}`;

      const conflict = bookings.find((b) => slot < b.endTime && slotEnd > b.startTime);
      const isWithinHours = slot >= schedule.startTime && slotEnd <= schedule.endTime;
      const isAvailable = !conflict && isWithinHours;

      return {
        startTime: slot,
        endTime: slotEnd,
        isAvailable,
        status: conflict ? "booked" : (!isWithinHours ? "outside_hours" : "available"),
        bookingStatus: conflict?.status || null,
      };
    });

    // Query alternative available trainers on this date & time
    const targetStart = params.startTime || "10:00";
    const targetEnd = params.endTime || "11:00";

    const allOtherTrainers = await prisma.trainer.findMany({
      where: {
        id: { not: params.trainerId },
        user: { status: "active" },
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true, email: true } },
        availabilities: { where: { isActive: true } },
        bookings: {
          where: {
            sessionDate: { gte: startOfDay, lte: endOfDay },
            status: { in: ["pending", "confirmed"] },
            startTime: { lt: targetEnd },
            endTime: { gt: targetStart },
          },
        },
      },
      take: 6,
    });

    const alternativeTrainers = allOtherTrainers
      .filter((ot) => ot.bookings.length === 0)
      .slice(0, 4)
      .map((ot) => ({
        id: ot.id,
        name: `Coach ${ot.user.firstName} ${ot.user.lastName}`,
        specialization: ot.specialization,
        hourlyRate: Number(ot.hourlyRate),
        rating: Number(ot.rating),
        avatarUrl: ot.user.avatarUrl,
      }));

    return {
      trainerId: trainer.id,
      sessionDate: dateStr,
      workingHours: schedule,
      bookedSlots: bookings,
      slots,
      alternativeTrainers,
    };
  }

  static async listScheduleConflicts() {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: "TRAINER_BOOKING_DECLINED_CONFLICT",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    const declinedBookings = await prisma.trainerBooking.findMany({
      where: {
        status: "declined",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        trainer: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        member: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    return {
      conflicts: logs.map((l) => ({
        id: l.id,
        timestamp: l.createdAt,
        user: l.user,
        details: l.details ? JSON.parse(l.details) : {},
      })),
      declinedBookings,
    };
  }
}

