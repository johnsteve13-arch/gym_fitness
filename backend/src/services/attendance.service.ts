import { prisma } from "../config/database";
import { parseMemberQrToken } from "../utils/qr";

export class AttendanceService {
  static async verifyAndCheckIn(params: {
    identifier: string; // QR code token, memberCode, or email
    method?: "qr" | "manual_id" | "kiosk";
    staffId?: string;
    notes?: string;
  }) {
    const rawIdentifier = params.identifier.trim();
    const parsed = parseMemberQrToken(rawIdentifier);
    const lookupCode = parsed.memberCode || rawIdentifier;

    // Find the member
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { qrCodeToken: rawIdentifier },
          { memberCode: lookupCode },
          { memberCode: rawIdentifier },
          { user: { email: rawIdentifier.toLowerCase() } },
        ],
      },
      include: {
        user: true,
        memberships: {
          orderBy: { endDate: "desc" },
          take: 1,
          include: { plan: true },
        },
      },
    });

    if (!member) {
      return {
        accessGranted: false,
        reason: "Member not found. Unrecognized QR or ID.",
        code: "MEMBER_NOT_FOUND",
      };
    }

    // Check account status
    if (member.user.status === "suspended") {
      return {
        accessGranted: false,
        member: { name: `${member.user.firstName} ${member.user.lastName}`, memberCode: member.memberCode },
        reason: "Access Denied: Account is suspended by administration.",
        code: "ACCOUNT_SUSPENDED",
      };
    }

    if (member.user.status === "inactive") {
      return {
        accessGranted: false,
        member: { name: `${member.user.firstName} ${member.user.lastName}`, memberCode: member.memberCode },
        reason: "Access Denied: Account is inactive.",
        code: "ACCOUNT_INACTIVE",
      };
    }

    // Check membership validity
    const activeMembership = member.memberships[0];
    const now = new Date();

    if (!activeMembership) {
      return {
        accessGranted: false,
        member: { name: `${member.user.firstName} ${member.user.lastName}`, memberCode: member.memberCode },
        reason: "Access Denied: No membership package registered.",
        code: "NO_MEMBERSHIP",
      };
    }

    if (activeMembership.status === "cancelled") {
      return {
        accessGranted: false,
        member: { name: `${member.user.firstName} ${member.user.lastName}`, memberCode: member.memberCode },
        reason: "Access Denied: Membership has been cancelled.",
        code: "MEMBERSHIP_CANCELLED",
      };
    }

    if (activeMembership.status === "frozen") {
      return {
        accessGranted: false,
        member: { name: `${member.user.firstName} ${member.user.lastName}`, memberCode: member.memberCode },
        reason: `Access Denied: Membership is currently frozen until ${activeMembership.freezeEnd ? new Date(activeMembership.freezeEnd).toLocaleDateString() : "further notice"}.`,
        code: "MEMBERSHIP_FROZEN",
      };
    }

    if (activeMembership.endDate < now) {
      // Check if in grace period
      if (activeMembership.gracePeriodEnd && activeMembership.gracePeriodEnd >= now) {
        // Allow access but warn grace period
        // proceed
      } else {
        return {
          accessGranted: false,
          member: {
            name: `${member.user.firstName} ${member.user.lastName}`,
            memberCode: member.memberCode,
            expiredDate: activeMembership.endDate,
          },
          reason: `Access Denied: Membership expired on ${new Date(activeMembership.endDate).toLocaleDateString()}. Please renew at front desk.`,
          code: "MEMBERSHIP_EXPIRED",
        };
      }
    }

    // Check for recent duplicate check-in (within the last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingRecentCheckIn = await prisma.attendance.findFirst({
      where: {
        memberId: member.id,
        checkInTime: { gte: thirtyMinutesAgo },
        checkOutTime: null,
      },
    });

    if (existingRecentCheckIn) {
      return {
        accessGranted: false,
        member: { name: `${member.user.firstName} ${member.user.lastName}`, memberCode: member.memberCode },
        reason: "Duplicate Check-in: Member has already checked in within the last 30 minutes.",
        code: "DUPLICATE_CHECK_IN",
        lastCheckInTime: existingRecentCheckIn.checkInTime,
      };
    }

    // Record verified attendance
    const attendance = await prisma.attendance.create({
      data: {
        memberId: member.id,
        checkInTime: now,
        checkInMethod: params.method || "qr",
        staffId: params.staffId || null,
        notes: params.notes || null,
      },
    });

    // Award attendance reward coins (+15 coins for visiting gym)
    await prisma.member.update({
      where: { id: member.id },
      data: { rewardCoins: { increment: 15 } },
    });

    await prisma.rewardTransaction.create({
      data: {
        memberId: member.id,
        points: 15,
        transactionType: "earned",
        reason: "Gym attendance visit bonus",
        referenceId: attendance.id,
      },
    });

    const daysRemaining = Math.max(
      0,
      Math.ceil((new Date(activeMembership.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      accessGranted: true,
      message: `Welcome, ${member.user.firstName}! Entry verified.`,
      attendance,
      member: {
        id: member.id,
        name: `${member.user.firstName} ${member.user.lastName}`,
        memberCode: member.memberCode,
        avatarUrl: member.user.avatarUrl,
        planName: activeMembership.plan.name,
        daysRemaining,
        rewardCoins: member.rewardCoins + 15,
      },
    };
  }

  static async checkOut(params: { memberId: string; attendanceId?: string }) {
    const now = new Date();

    const attendance = params.attendanceId
      ? await prisma.attendance.findUnique({ where: { id: params.attendanceId } })
      : await prisma.attendance.findFirst({
          where: { memberId: params.memberId, checkOutTime: null },
          orderBy: { checkInTime: "desc" },
        });

    if (!attendance) {
      throw new Error("No active open check-in session found to check out.");
    }

    const durationMinutes = Math.round(
      (now.getTime() - new Date(attendance.checkInTime).getTime()) / (1000 * 60)
    );

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: now,
        notes: attendance.notes
          ? `${attendance.notes} | Session duration: ${durationMinutes} mins`
          : `Session duration: ${durationMinutes} mins`,
      },
    });

    return {
      success: true,
      message: `Check-out recorded. Total workout duration: ${durationMinutes} minutes. Great job!`,
      attendance: updated,
      durationMinutes,
    };
  }

  static async getAttendanceHistory(params: {
    memberId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.memberId) where.memberId = params.memberId;
    if (params.startDate || params.endDate) {
      where.checkInTime = {};
      if (params.startDate) where.checkInTime.gte = new Date(params.startDate);
      if (params.endDate) where.checkInTime.lte = new Date(params.endDate);
    }

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { checkInTime: "desc" },
        include: {
          member: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      records,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getPeakHoursAnalysis() {
    const records = await prisma.attendance.findMany({
      select: { checkInTime: true },
    });

    const hourlyCounts: Record<number, number> = {};
    for (let h = 5; h <= 23; h++) {
      hourlyCounts[h] = 0;
    }

    records.forEach((record) => {
      const hour = new Date(record.checkInTime).getHours();
      if (hourlyCounts[hour] !== undefined) {
        hourlyCounts[hour]++;
      }
    });

    return Object.entries(hourlyCounts).map(([hour, count]) => ({
      hour: `${parseInt(hour, 10).toString().padStart(2, "0")}:00`,
      visits: count,
    }));
  }
}
