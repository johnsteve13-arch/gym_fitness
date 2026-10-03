import { prisma } from "../config/database";

export class MembershipService {
  static async listPlans() {
    return prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
  }

  static async createPlan(data: {
    name: string;
    code: string;
    description: string;
    durationDays: number;
    price: number;
    planType?: "standard" | "premium" | "student" | "corporate" | "trial" | "promo" | "custom";
    benefits: string[];
    maxClassesPerWeek?: number;
    hasTrainerAccess?: boolean;
  }) {
    return prisma.membershipPlan.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        durationDays: data.durationDays,
        price: data.price,
        planType: (data.planType as any) || "standard",
        benefits: JSON.stringify(data.benefits || []),
        maxClassesPerWeek: data.maxClassesPerWeek || 0,
        hasTrainerAccess: data.hasTrainerAccess || false,
      },
    });
  }

  static async updatePlan(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      durationDays?: number;
      benefits?: string[];
      isActive?: boolean;
    }
  ) {
    const updateData: any = { ...data };
    if (data.benefits) {
      updateData.benefits = JSON.stringify(data.benefits);
    }
    return prisma.membershipPlan.update({
      where: { id },
      data: updateData,
    });
  }

  static async assignOrUpgradeMembership(data: {
    memberId: string;
    planId: string;
    autoRenew?: boolean;
  }) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: data.planId } });
    if (!plan) throw new Error("Membership plan not found.");

    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      include: {
        memberships: {
          where: { status: "active" },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    });
    if (!member) throw new Error("Member not found.");

    // Deactivate prior active memberships
    if (member.memberships.length > 0) {
      await prisma.membership.updateMany({
        where: { memberId: data.memberId, status: "active" },
        data: { status: "expired" },
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const gracePeriodEnd = new Date(endDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7-day grace period

    const newMembership = await prisma.membership.create({
      data: {
        memberId: data.memberId,
        planId: plan.id,
        startDate,
        endDate,
        status: "active",
        autoRenew: data.autoRenew ?? false,
        gracePeriodEnd,
      },
      include: {
        plan: true,
      },
    });

    // Send notification
    await prisma.notification.create({
      data: {
        userId: member.userId,
        title: "Membership Activated",
        message: `Your ${plan.name} is now active until ${endDate.toLocaleDateString()}. Enjoy full access!`,
        type: "membership",
      },
    });

    return newMembership;
  }

  static async extendMembership(membershipId: string, additionalDays: number, notes?: string) {
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new Error("Membership not found.");

    const currentEnd = new Date(membership.endDate);
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(baseDate);
    newEnd.setDate(newEnd.getDate() + additionalDays);

    return prisma.membership.update({
      where: { id: membershipId },
      data: {
        endDate: newEnd,
        status: "active",
        notes: notes ? `${membership.notes || ""}\nExtended by ${additionalDays} days: ${notes}` : membership.notes,
      },
      include: { plan: true },
    });
  }

  static async freezeMembership(membershipId: string, durationDays: number, reason?: string) {
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new Error("Membership not found.");

    const freezeStart = new Date();
    const freezeEnd = new Date();
    freezeEnd.setDate(freezeEnd.getDate() + durationDays);

    // Push the expiration date back by the freeze duration
    const currentEnd = new Date(membership.endDate);
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + durationDays);

    return prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: "frozen",
        freezeStart,
        freezeEnd,
        endDate: newEnd,
        notes: `${membership.notes || ""}\nMembership frozen for ${durationDays} days. Reason: ${reason || "Member request"}.`,
      },
      include: { plan: true },
    });
  }

  static async unfreezeMembership(membershipId: string) {
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new Error("Membership not found.");

    return prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: "active",
        freezeStart: null,
        freezeEnd: null,
      },
      include: { plan: true },
    });
  }

  static async cancelMembership(membershipId: string, reason?: string) {
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new Error("Membership not found.");

    return prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: "cancelled",
        notes: `${membership.notes || ""}\nCancelled on ${new Date().toISOString()}: ${reason || "No reason given"}`,
      },
      include: { plan: true },
    });
  }

  static async renewMembership(memberId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        memberships: {
          orderBy: { endDate: "desc" },
          take: 1,
          include: { plan: true },
        },
      },
    });

    if (!member || member.memberships.length === 0) {
      throw new Error("No previous membership found to renew. Please assign a plan.");
    }

    const previous = member.memberships[0];
    const plan = previous.plan;

    // If existing end date is in the future, renew from that end date; otherwise from today
    const now = new Date();
    const startDate = previous.endDate > now ? previous.endDate : now;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const renewal = await prisma.membership.create({
      data: {
        memberId: member.id,
        planId: plan.id,
        startDate,
        endDate,
        status: "active",
        autoRenew: previous.autoRenew,
      },
      include: { plan: true },
    });

    await prisma.notification.create({
      data: {
        userId: member.userId,
        title: "Membership Renewed Successfully",
        message: `Your ${plan.name} has been renewed until ${endDate.toLocaleDateString()}. Thank you for training with us!`,
        type: "membership",
      },
    });

    return renewal;
  }
}
