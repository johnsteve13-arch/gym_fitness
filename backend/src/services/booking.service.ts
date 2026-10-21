import { prisma } from "../config/database";
import { ENV } from "../config/env";
import bcrypt from "bcryptjs";
import { NotificationService } from "./notification.service";
import { SmsService } from "./sms.service";

export interface TrainerUnavailabilityRecord {
  id: string;
  trainerId: string;
  trainerName: string;
  date: string; // YYYY-MM-DD
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reasonCategory: string;
  description: string;
  createdAt: string;
  createdBy?: string;
}

export class BookingService {
  /**
   * Persists trainer unavailability in the database (backed by Supabase PostgreSQL)
   */
  static async setTrainerUnavailability(record: {
    trainerId: string;
    trainerName?: string;
    date: string; // YYYY-MM-DD
    isFullDay?: boolean;
    startTime?: string;
    endTime?: string;
    reasonCategory?: string;
    description?: string;
    createdBy?: string;
  }): Promise<TrainerUnavailabilityRecord> {
    const dateStr = record.date.slice(0, 10);
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

    const created = await prisma.trainerUnavailability.create({
      data: {
        trainerId: record.trainerId,
        date: dateObj,
        isAllDay: record.isFullDay !== undefined ? record.isFullDay : true,
        startTime: record.startTime || null,
        endTime: record.endTime || null,
        category: record.reasonCategory || "General",
        description: record.description || "Trainer is marked unavailable.",
        createdBy: record.createdBy || null,
      },
      include: {
        trainer: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: record.trainerId,
          action: "TRAINER_UNAVAILABILITY_SET",
          entity: "trainer_unavailabilities",
          entityId: created.id,
          details: JSON.stringify({
            trainerId: record.trainerId,
            date: dateStr,
            isAllDay: created.isAllDay,
            startTime: created.startTime,
            endTime: created.endTime,
            description: created.description,
          }),
        },
      });
    } catch {}

    const trainerName =
      record.trainerName ||
      (created.trainer?.user
        ? `${created.trainer.user.firstName} ${created.trainer.user.lastName}`
        : "Coach");

    return {
      id: created.id,
      trainerId: created.trainerId,
      trainerName,
      date: dateStr,
      isFullDay: created.isAllDay,
      startTime: created.startTime || undefined,
      endTime: created.endTime || undefined,
      reasonCategory: created.category,
      description: created.description || "",
      createdAt: created.createdAt.toISOString(),
      createdBy: created.createdBy || undefined,
    };
  }

  /**
   * Lists persistent trainer unavailabilities from Supabase PostgreSQL
   */
  static async listTrainerUnavailabilities(trainerId?: string): Promise<TrainerUnavailabilityRecord[]> {
    const where: any = {};
    if (trainerId) {
      where.trainerId = trainerId;
    }

    const unavailabilities = await prisma.trainerUnavailability.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        trainer: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return unavailabilities.map((u) => ({
      id: u.id,
      trainerId: u.trainerId,
      trainerName: u.trainer?.user
        ? `${u.trainer.user.firstName} ${u.trainer.user.lastName}`
        : "Coach",
      date: u.date.toISOString().slice(0, 10),
      isFullDay: u.isAllDay,
      startTime: u.startTime || undefined,
      endTime: u.endTime || undefined,
      reasonCategory: u.category,
      description: u.description || "",
      createdAt: u.createdAt.toISOString(),
      createdBy: u.createdBy || undefined,
    }));
  }

  /**
   * Deletes a persistent trainer unavailability record from Supabase PostgreSQL
   */
  static async deleteTrainerUnavailability(id: string): Promise<{ success: boolean }> {
    await prisma.trainerUnavailability.delete({
      where: { id },
    });
    return { success: true };
  }

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

  /**
   * Creates a trainer booking with atomic conflict prevention, half-open interval validation,
   * past-booking protection, and multi-channel notification dispatch.
   */
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

    // Past booking protection: reject booking attempts in the past
    const now = new Date();
    const sessionStartDateTime = new Date(`${dateStr}T${data.startTime}:00.000Z`);
    // Compare date if current day or older
    const todayStr = now.toISOString().slice(0, 10);
    if (dateStr < todayStr) {
      throw new Error("Booking validation failed: Cannot reserve a training session in the past.");
    }

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // 2. Perform availability validation & booking creation inside atomic database transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
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

        // B.2 Check Persistent Unavailability Override from Database
        const dbUnavailabilities = await tx.trainerUnavailability.findMany({
          where: {
            trainerId: data.trainerId,
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        const activeUnavail = dbUnavailabilities.find((u) => {
          if (u.isAllDay) return true;
          const uStart = u.startTime || "08:00";
          const uEnd = u.endTime || "18:00";
          return data.startTime < uEnd && data.endTime > uStart;
        });

        if (activeUnavail) {
          isWithinHours = false;
          declineReason = `Coach ${trainer.user?.firstName || "Trainer"} is marked unavailable: "${
            activeUnavail.description || activeUnavail.category
          }".`;
        }

        // C. Double-booking conflict check with half-open intervals [start, end)
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
        const durationHours = Math.max(
          0.5,
          (endH * 60 + (endM || 0) - (startH * 60 + (startM || 0))) / 60
        );

        const calculatedPrice = Math.round(Number(trainer.hourlyRate) * durationHours);
        const isCoinsPayment = data.paymentMethod === "coins";
        const coinsRequired = 150; // Steady to 150 coins only

        if (isCoinsPayment) {
          // Enforce 1-day redemption limit: members can use the 150 coins redemption for 1 day only
          const existingCoinBooking = await tx.trainerBooking.findFirst({
            where: {
              memberId: data.memberId,
              sessionDate: sessionDate,
              status: { notIn: ["declined", "cancelled"] },
              OR: [{ notes: { contains: "Redeemed" } }, { notes: { contains: "Coins" } }],
            },
          });
          if (existingCoinBooking) {
            throw new Error(
              "Daily Limit Reached: Members can use the 150 coins redemption for 1 day only (1 redemption per day). Please use Direct Payment for additional sessions on this date."
            );
          }

          const member = await tx.member.findUnique({
            where: { id: data.memberId },
            include: { user: true },
          });
          if (!member) throw new Error("Member not found.");

          if (member.rewardCoins < coinsRequired) {
            throw new Error(
              `Insufficient coin balance. You have ${member.rewardCoins} coins, but trainer redemption requires ${coinsRequired} coins.`
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
              notes: data.notes
                ? `${data.notes} [Redeemed ${coinsRequired} Coins | 1-Day Payment to Trainer | Duration: ${durationHours} hrs]`
                : `[Redeemed ${coinsRequired} Coins | 1-Day Payment to Trainer | Duration: ${durationHours} hrs]`,
              expiresAt: null,
            },
            include: {
              trainer: {
                include: {
                  user: { select: { firstName: true, lastName: true, phone: true } },
                },
              },
              member: {
                include: {
                  user: { select: { firstName: true, lastName: true, phone: true, id: true } },
                },
              },
            },
          });

          await tx.notification.create({
            data: {
              userId: member.userId,
              title: "Loyalty Coins Redeemed for Trainer (1-Day Payment)",
              message: `Redeemed ${coinsRequired} coins for one day's payment to Coach ${
                trainer.user?.firstName || "Trainer"
              } (Time to Start: ${data.startTime} • Time to Finish: ${data.endTime}).`,
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
                user: { select: { firstName: true, lastName: true, phone: true } },
              },
            },
            member: {
              include: {
                user: { select: { firstName: true, lastName: true, phone: true, id: true } },
              },
            },
          },
        });

        const member = await tx.member.findUnique({
          where: { id: data.memberId },
          include: { user: true },
        });

        if (member) {
          await tx.notification.create({
            data: {
              userId: member.userId,
              title: "Trainer Session Reserved",
              message: `Session reserved with Coach ${trainer.user?.firstName || "Trainer"} on ${dateStr} at ${
                data.startTime
              }. Please complete payment within 30 minutes to confirm.`,
              type: "booking",
            },
          });
        }

        return booking;
      });

      // Out-of-transaction SMS notification dispatch (prevents external network failure from breaking database commit)
      if (result) {
        const memberUser = (result as any).member?.user;
        const trainerUser = (result as any).trainer?.user;
        const coachName = trainerUser ? `${trainerUser.firstName} ${trainerUser.lastName}` : "Trainer";

        if (memberUser?.phone) {
          const smsMsg =
            result.status === "confirmed"
              ? SmsService.templates.bookingConfirmed(coachName, dateStr, `${data.startTime} - ${data.endTime}`)
              : SmsService.templates.bookingRequested(coachName, dateStr, `${data.startTime} - ${data.endTime}`);

          SmsService.sendSms({
            toPhone: memberUser.phone,
            recipientUserId: memberUser.id,
            recipientName: `${memberUser.firstName} ${memberUser.lastName}`,
            event: result.status === "confirmed" ? "booking_confirmed" : "booking_requested",
            messageContent: smsMsg,
            idempotencyKey: `booking_${result.id}`,
          }).catch((smsErr) => console.warn("[SMS] Failed to dispatch booking SMS:", smsErr.message));
        }
      }

      return result;
    } catch (err: any) {
      if (err.isDeclined && err.conflictDetails) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: err.conflictDetails.trainerId,
              action: "TRAINER_BOOKING_DECLINED_CONFLICT",
              entity: "trainer_bookings",
              details: JSON.stringify(err.conflictDetails),
            },
          });

          await prisma.trainerBooking.create({
            data: {
              memberId: err.conflictDetails.memberId,
              trainerId: err.conflictDetails.trainerId,
              sessionDate: new Date(`${err.conflictDetails.sessionDate}T00:00:00.000Z`),
              startTime: err.conflictDetails.startTime,
              endTime: err.conflictDetails.endTime,
              status: "declined",
              paymentStatus: "unpaid",
              price: err.conflictDetails.price || 80,
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
        const coinsAmount = match ? parseInt(match[1], 10) : 150;
        await prisma.member
          .update({
            where: { id: booking.memberId },
            data: { rewardCoins: { increment: coinsAmount } },
          })
          .catch(() => null);

        await prisma.notification
          .create({
            data: {
              userId: booking.member.userId,
              title: "Coins Refunded: Trainer Unavailable",
              message: `Coach ${booking.trainer.user.firstName} is unavailable and declined the booking on ${new Date(
                booking.sessionDate
              ).toLocaleDateString()}. ${coinsAmount} Loyalty Coins have been refunded to your account balance.`,
              type: "reward",
            },
          })
          .catch(() => null);
      }
    }

    const updated = await prisma.trainerBooking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        trainer: { include: { user: true } },
        member: { include: { user: true } },
      },
    });

    // Notify member of status change
    const isDeclined = status === "declined";
    const notifTitle = isDeclined
      ? "Trainer Session Declined"
      : `Training Session ${status.toUpperCase()}`;

    const notifMessage = isDeclined
      ? `Booking Declined: Coach ${updated.trainer.user.firstName} is unavailable at your requested date and time (${
          reason || "Trainer unavailable"
        }). Any coins or payments have been reversed.`
      : `Your session with Trainer ${updated.trainer.user.firstName} on ${new Date(
          booking.sessionDate
        ).toLocaleDateString()} has been marked as ${status}.`;

    await prisma.notification
      .create({
        data: {
          userId: booking.member.userId,
          title: notifTitle,
          message: notifMessage,
          type: "booking",
        },
      })
      .catch(() => null);

    // Multi-channel SMS dispatch to member phone
    if (booking.member.user?.phone) {
      const coachName = `${booking.trainer.user.firstName} ${booking.trainer.user.lastName}`;
      const dateStr = booking.sessionDate.toISOString().slice(0, 10);
      const timeStr = `${booking.startTime} - ${booking.endTime}`;

      let smsContent = "";
      let smsEvent: any = "booking_confirmed";

      if (status === "declined") {
        smsEvent = "booking_declined";
        smsContent = SmsService.templates.bookingDeclined(coachName, dateStr, timeStr, reason);
      } else if (status === "cancelled") {
        smsEvent = "booking_cancelled_trainer";
        smsContent = SmsService.templates.bookingCancelledTrainer(coachName, dateStr, timeStr);
      } else if (status === "confirmed") {
        smsEvent = "booking_confirmed";
        smsContent = SmsService.templates.bookingConfirmed(coachName, dateStr, timeStr);
      }

      if (smsContent) {
        SmsService.sendSms({
          toPhone: booking.member.user.phone,
          recipientUserId: booking.member.userId,
          recipientName: `${booking.member.user.firstName} ${booking.member.user.lastName}`,
          event: smsEvent,
          messageContent: smsContent,
          idempotencyKey: `status_change_${booking.id}_${status}`,
        }).catch((err) => console.warn("[SMS] Status update dispatch warning:", err.message));
      }
    }

    // Admin Monitoring: Record in audit log
    await prisma.auditLog
      .create({
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
      })
      .catch(() => null);

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
        hourlyRate: Number(data.hourlyRate) || 80.0,
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
    const phone = trainer.user.phone || "";

    // Multi-channel dispatch: Gmail & Phone Number (SMS)
    const notificationsSent = await NotificationService.sendTrainerAcceptNotifications({
      userId: trainer.userId,
      name: fullName,
      email,
      phone: phone || "+639170000000",
    });

    return {
      success: true,
      message: `Trainer ${fullName} confirmed and notified via Email & SMS.`,
      notifications: notificationsSent,
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

    const updatedUser = await prisma.user.update({
      where: { id: trainer.userId },
      data: { status: "inactive" },
    });

    const fullName = `${trainer.user.firstName} ${trainer.user.lastName}`.trim();
    const email = trainer.user.email;
    const phone = trainer.user.phone || "";

    const notificationsSent = await NotificationService.sendTrainerDeclineNotifications({
      userId: trainer.userId,
      name: fullName,
      email,
      phone: phone || "+639170000000",
      reason: reason || "Profile does not currently meet our requirements.",
    });

    return {
      success: true,
      message: `Trainer ${fullName} application declined and notified via Email & SMS.`,
      notifications: notificationsSent,
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

    // Database persistent unavailability
    const dbUnavailabilities = await prisma.trainerUnavailability.findMany({
      where: {
        trainerId: params.trainerId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    const activeAdminUnavail = dbUnavailabilities.length > 0 ? dbUnavailabilities[0] : null;

    const standardSlots = [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ];
    const slots = standardSlots.map((slot) => {
      const [h, m] = slot.split(":");
      const endH = (parseInt(h, 10) + 1).toString().padStart(2, "0");
      const slotEnd = `${endH}:${m}`;

      const conflict = bookings.find((b) => slot < b.endTime && slotEnd > b.startTime);
      const isWithinHours = slot >= schedule.startTime && slotEnd <= schedule.endTime;

      const unavail = dbUnavailabilities.find((u) => {
        if (u.isAllDay) return true;
        const uStart = u.startTime || "08:00";
        const uEnd = u.endTime || "18:00";
        return slot < uEnd && slotEnd > uStart;
      });

      const isAvailable = !conflict && isWithinHours && !unavail;

      return {
        startTime: slot,
        endTime: slotEnd,
        isAvailable,
        status: unavail
          ? "unavailable"
          : conflict
          ? "booked"
          : !isWithinHours
          ? "outside_hours"
          : "available",
        bookingStatus: conflict?.status || null,
        adminDescription: unavail ? unavail.description : null,
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
      adminUnavailability: activeAdminUnavail,
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
