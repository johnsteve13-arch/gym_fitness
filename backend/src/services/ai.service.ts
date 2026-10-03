import { prisma } from "../config/database";

export class AiService {
  static async calculateActivityScore(memberId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [attendanceCount, workoutCount, lastAttendance, member] = await Promise.all([
      prisma.attendance.count({
        where: { memberId, checkInTime: { gte: thirtyDaysAgo } },
      }),
      prisma.workoutLog.count({
        where: { memberId, date: { gte: thirtyDaysAgo } },
      }),
      prisma.attendance.findFirst({
        where: { memberId },
        orderBy: { checkInTime: "desc" },
      }),
      prisma.member.findUnique({
        where: { id: memberId },
        include: {
          user: true,
          memberships: {
            where: { status: "active" },
            orderBy: { endDate: "desc" },
            take: 1,
            include: { plan: true },
          },
        },
      }),
    ]);

    if (!member) throw new Error("Member not found.");

    // Score calculations
    // Optimal attendance: 12-16 visits in 30 days (~3-4 per week) = 100 points
    const attendanceScore = Math.min(100, Math.round((attendanceCount / 12) * 100));

    // Optimal workout logging: 10-12 workouts in 30 days = 100 points
    const workoutScore = Math.min(100, Math.round((workoutCount / 10) * 100));

    // Consistency score: based on days since last visit
    const daysSinceLastVisit = lastAttendance
      ? Math.floor((Date.now() - new Date(lastAttendance.checkInTime).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    let consistencyScore = 100;
    if (daysSinceLastVisit > 14) consistencyScore = 20;
    else if (daysSinceLastVisit > 7) consistencyScore = 50;
    else if (daysSinceLastVisit > 3) consistencyScore = 80;

    // Overall weighted score
    const score = Math.round(attendanceScore * 0.4 + workoutScore * 0.35 + consistencyScore * 0.25);

    let riskLevel: "low" | "moderate" | "high" = "low";
    if (score < 40 || daysSinceLastVisit >= 14) riskLevel = "high";
    else if (score < 70 || daysSinceLastVisit >= 7) riskLevel = "moderate";

    const insights = [
      `Completed ${attendanceCount} gym check-in sessions in the last 30 days.`,
      `Logged ${workoutCount} comprehensive workout entries.`,
      daysSinceLastVisit === 0
        ? "Visited the gym today! Excellent momentum."
        : `Last visit was ${daysSinceLastVisit} day(s) ago.`,
      riskLevel === "high"
        ? "ALERT: Member is showing significant signs of disengagement. Staff follow-up recommended."
        : riskLevel === "moderate"
        ? "Member engagement is stable but could benefit from a motivational check-in or class invitation."
        : "Highly active, engaged member with great training consistency.",
    ].join(" ");

    const scoreRecord = await prisma.aiActivityScore.create({
      data: {
        memberId,
        score,
        attendanceScore,
        workoutScore,
        consistencyScore,
        riskLevel,
        insights,
      },
    });

    return {
      scoreRecord,
      daysSinceLastVisit,
      attendanceCount,
      workoutCount,
    };
  }

  static async getRetentionAlerts() {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // 1. Members with no visit in > 14 days
    const activeMembers = await prisma.member.findMany({
      where: {
        user: { status: "active" },
        memberships: { some: { status: "active" } },
      },
      include: {
        user: true,
        attendances: {
          orderBy: { checkInTime: "desc" },
          take: 1,
        },
        memberships: {
          where: { status: "active" },
          orderBy: { endDate: "desc" },
          take: 1,
          include: { plan: true },
        },
      },
    });

    const alerts: {
      type: "inactivity" | "expiration" | "achievement";
      severity: "high" | "medium" | "info";
      memberId: string;
      memberName: string;
      memberCode: string;
      email: string;
      phone: string | null;
      message: string;
      daysInactive?: number;
      expiryDate?: string;
    }[] = [];

    const now = new Date();

    activeMembers.forEach((m) => {
      const lastVisit = m.attendances[0];
      const daysSinceVisit = lastVisit
        ? Math.floor((now.getTime() - new Date(lastVisit.checkInTime).getTime()) / (1000 * 60 * 60 * 24))
        : 30;

      if (daysSinceVisit >= 14) {
        alerts.push({
          type: "inactivity",
          severity: daysSinceVisit > 21 ? "high" : "medium",
          memberId: m.id,
          memberName: `${m.user.firstName} ${m.user.lastName}`,
          memberCode: m.memberCode,
          email: m.user.email,
          phone: m.user.phone,
          daysInactive: daysSinceVisit,
          message: `Member has not visited the gym for ${daysSinceVisit} days. Potential churn risk.`,
        });
      }

      // Check upcoming membership expiration
      const membership = m.memberships[0];
      if (membership) {
        const daysToExpiry = Math.ceil((new Date(membership.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry > 0 && daysToExpiry <= 7) {
          alerts.push({
            type: "expiration",
            severity: "high",
            memberId: m.id,
            memberName: `${m.user.firstName} ${m.user.lastName}`,
            memberCode: m.memberCode,
            email: m.user.email,
            phone: m.user.phone,
            expiryDate: new Date(membership.endDate).toLocaleDateString(),
            message: `Membership (${membership.plan.name}) expires in ${daysToExpiry} days (${new Date(membership.endDate).toLocaleDateString()}). Renewal prompt required.`,
          });
        }
      }
    });

    return alerts;
  }

  static async generateCoachAdvice(params: {
    memberId: string;
    userQuery?: string;
    focusArea?: "workout" | "nutrition" | "recovery" | "habits";
  }) {
    const member = await prisma.member.findUnique({
      where: { id: params.memberId },
      include: {
        user: true,
        bodyMeasurements: { orderBy: { recordedDate: "desc" }, take: 1 },
        attendances: { orderBy: { checkInTime: "desc" }, take: 5 },
        workoutLogs: { orderBy: { date: "desc" }, take: 3, include: { entries: true } },
      },
    });

    if (!member) throw new Error("Member not found.");

    const latestMeasurement = member.bodyMeasurements[0];
    const bmi = latestMeasurement ? Number(latestMeasurement.bmi) : null;
    const goals = member.fitnessGoals || "General Athletic Fitness & Muscle Conditioning";

    // Build intelligent, contextual recommendation
    let responseText = "";
    const disclaimer =
      "⚠️ Disclaimer: This AI Fitness Coach provides general physical conditioning and educational lifestyle suggestions based on your logged gym activity. It does not replace advice, diagnosis, or treatment from a licensed physician, clinical dietitian, or certified medical specialist.";

    const query = (params.userQuery || "").toLowerCase();

    if (query.includes("nutrition") || query.includes("diet") || query.includes("meal") || params.focusArea === "nutrition") {
      responseText = `Based on your stated objective (${goals}) and regular training, here is a targeted nutritional guideline:
• Protein Optimization: Aim for approximately 1.6 to 2.2 grams of dietary protein per kilogram of target body weight, spread evenly across 3-4 meals to maximize muscle protein synthesis.
• Hydration Protocol: Consume at least 35-40 ml of water per kg daily, adding electrolyte replacement on intense workout days.
• Nutrient Timing: Prioritize complex carbohydrates (oats, brown rice, sweet potatoes) 90-120 minutes prior to lifting, followed by rapid-digesting protein and carbs post-workout.
• Micronutrient Support: Focus on leafy greens, magnesium-rich seeds, and quality omega-3 fatty acids for joint and recovery support.`;
    } else if (query.includes("recovery") || query.includes("sore") || query.includes("sleep") || params.focusArea === "recovery") {
      responseText = `To accelerate recovery and support your current training volume:
• Sleep Quality: Target 7.5 to 9 hours of uninterrupted sleep in a dark, cool environment (<19°C/66°F) to optimize nocturnal growth hormone release.
• Active Recovery: On non-lifting days, incorporate 20-30 minutes of Zone 2 cardio (light cycling, brisk walk) to promote lymphatic circulation and reduce residual lactic fatigue.
• Deload Scheduling: Every 4-6 weeks of progressive overload, schedule a 5-day deload reducing volume by 40% while preserving mechanical intensity.`;
    } else {
      responseText = `Welcome back, ${member.user.firstName}! Let's optimize your current training block:
• Personalized Focus: Tailored to your goal of "${goals}"${bmi ? ` with current BMI index at ${bmi}` : ""}.
• Recommended Split: A 4-day Upper/Lower or Push/Pull/Legs rotation to allow 48-72 hours of systemic recovery per muscle group.
• Progressive Overload Principle: Consistently track your working weights in the Workout Logger. Strive to add 1-2 repetitions or 1.25-2.5 kg to primary compound lifts each week.
• Consistency Reminder: Your logged workouts indicate solid commitment. Pair your heavy lifting days with proper dynamic mobility warm-ups (hip openers, thoracic twists) before each session.`;
    }

    // Save recommendation to database
    await prisma.aiRecommendation.create({
      data: {
        memberId: member.id,
        recommendationType: params.focusArea || "workout",
        title: params.userQuery ? `Coach Insight: ${params.userQuery.slice(0, 35)}...` : "Personalized Conditioning Plan",
        content: responseText,
      },
    });

    return {
      message: responseText,
      disclaimer,
      fitnessGoals: goals,
      currentBmi: bmi,
    };
  }
}
