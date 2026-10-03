import { prisma } from "../config/database";

export class AnalyticsService {
  static async getOverviewMetrics() {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalMembers,
      activeMemberships,
      expiredMemberships,
      suspendedUsers,
      todayAttendances,
      totalTrainers,
      totalClasses,
      completedPayments,
      recentWorkouts,
    ] = await Promise.all([
      prisma.member.count(),
      prisma.membership.count({ where: { status: "active" } }),
      prisma.membership.count({ where: { status: "expired" } }),
      prisma.user.count({ where: { status: "suspended" } }),
      prisma.attendance.count({ where: { checkInTime: { gte: startOfToday } } }),
      prisma.trainer.count(),
      prisma.gymClass.count({ where: { isCancelled: false } }),
      prisma.payment.findMany({ where: { paymentStatus: "completed" } }),
      prisma.workoutLog.count({ where: { date: { gte: thirtyDaysAgo } } }),
    ]);

    let totalRevenue = 0;
    let todayRevenue = 0;
    const todayStr = new Date().toISOString().slice(0, 10);

    completedPayments.forEach((p) => {
      const net = Number(p.netAmount);
      totalRevenue += net;
      if (p.paidAt && p.paidAt.toISOString().slice(0, 10) === todayStr) {
        todayRevenue += net;
      }
    });

    const retentionRate = totalMembers > 0 ? Math.round((activeMemberships / totalMembers) * 100) : 100;

    return {
      members: {
        total: totalMembers,
        active: activeMemberships,
        expired: expiredMemberships,
        suspended: suspendedUsers,
        retentionRate,
      },
      attendance: {
        today: todayAttendances,
      },
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
      },
      operations: {
        trainers: totalTrainers,
        classes: totalClasses,
        workoutsThisMonth: recentWorkouts,
      },
    };
  }

  static async getRevenueTrends() {
    // Generate revenue grouped by last 6 months
    const payments = await prisma.payment.findMany({
      where: { paymentStatus: "completed" },
      orderBy: { createdAt: "asc" },
    });

    const monthlyMap: Record<string, number> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    payments.forEach((p) => {
      const d = new Date(p.createdAt);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + Number(p.netAmount);
    });

    return Object.entries(monthlyMap).map(([month, revenue]) => ({
      month,
      revenue,
    }));
  }

  static async getAttendanceTrends() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const attendances = await prisma.attendance.findMany({
      where: { checkInTime: { gte: sevenDaysAgo } },
      orderBy: { checkInTime: "asc" },
    });

    const dayMap: Record<string, number> = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    attendances.forEach((a) => {
      const d = new Date(a.checkInTime);
      const dayName = days[d.getDay()];
      dayMap[dayName] = (dayMap[dayName] || 0) + 1;
    });

    return days.map((day) => ({
      day,
      visits: dayMap[day] || 0,
    }));
  }

  static async exportMembersCsv(): Promise<string> {
    const members = await prisma.member.findMany({
      include: {
        user: true,
        memberships: {
          take: 1,
          orderBy: { endDate: "desc" },
          include: { plan: true },
        },
      },
    });

    const headers = [
      "Member Code",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Account Status",
      "Plan",
      "Membership Status",
      "Expiration Date",
      "Reward Coins",
    ];

    const rows = members.map((m) => {
      const plan = m.memberships[0]?.plan?.name || "None";
      const status = m.memberships[0]?.status || "None";
      const expiry = m.memberships[0]?.endDate ? new Date(m.memberships[0].endDate).toLocaleDateString() : "N/A";
      return [
        `"${m.memberCode}"`,
        `"${m.user.firstName}"`,
        `"${m.user.lastName}"`,
        `"${m.user.email}"`,
        `"${m.user.phone || ""}"`,
        `"${m.user.status}"`,
        `"${plan}"`,
        `"${status}"`,
        `"${expiry}"`,
        `"${m.rewardCoins}"`,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }
}
