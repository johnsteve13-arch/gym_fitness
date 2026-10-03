import { prisma } from "../config/database";
import bcrypt from "bcryptjs";
import { generateMemberQrToken } from "../utils/qr";

export class MemberService {
  static async listMembers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    membershipStatus?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { memberCode: { contains: q } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
        { user: { email: { contains: q } } },
        { user: { phone: { contains: q } } },
      ];
    }

    if (params.status) {
      where.user = { ...where.user, status: params.status };
    }

    if (params.membershipStatus) {
      where.memberships = {
        some: {
          status: params.membershipStatus,
        },
      };
    }

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatarUrl: true,
              status: true,
              createdAt: true,
            },
          },
          memberships: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: { plan: true },
          },
          aiActivityScores: {
            take: 1,
            orderBy: { calculatedAt: "desc" },
          },
        },
      }),
    ]);

    return {
      members,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getMemberById(id: string) {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            status: true,
            createdAt: true,
          },
        },
        memberships: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
        attendances: {
          take: 20,
          orderBy: { checkInTime: "desc" },
        },
        bodyMeasurements: {
          take: 10,
          orderBy: { recordedDate: "desc" },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        rewardTransactions: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        aiActivityScores: {
          take: 1,
          orderBy: { calculatedAt: "desc" },
        },
      },
    });

    if (!member) {
      throw new Error("Member not found.");
    }

    return member;
  }

  static async createMember(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    address?: string;
    fitnessGoals?: string;
    planId?: string;
    notes?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new Error("A user with this email already exists.");
    }

    const defaultPassword = "Password@123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: "member",
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || null,
        status: "active",
      },
    });

    const count = await prisma.member.count();
    const memberCode = `MEM-${(10001 + count).toString()}`;
    const qrCodeToken = generateMemberQrToken(memberCode);

    const member = await prisma.member.create({
      data: {
        userId: user.id,
        memberCode,
        qrCodeToken,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        address: data.address || null,
        fitnessGoals: data.fitnessGoals || "General Fitness",
        notes: data.notes || null,
        rewardCoins: 100,
      },
    });

    // If an initial plan is chosen, create the active membership
    if (data.planId) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: data.planId } });
      if (plan) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);

        await prisma.membership.create({
          data: {
            memberId: member.id,
            planId: plan.id,
            startDate,
            endDate,
            status: "active",
          },
        });
      }
    }

    return this.getMemberById(member.id);
  }

  static async updateMember(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      status?: "active" | "suspended" | "inactive";
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      address?: string;
      fitnessGoals?: string;
      notes?: string;
    }
  ) {
    const member = await prisma.member.findUnique({ where: { id }, include: { user: true } });
    if (!member) throw new Error("Member not found.");

    if (data.firstName || data.lastName || data.phone || data.status) {
      await prisma.user.update({
        where: { id: member.userId },
        data: {
          firstName: data.firstName ?? member.user.firstName,
          lastName: data.lastName ?? member.user.lastName,
          phone: data.phone ?? member.user.phone,
          status: data.status ?? member.user.status,
        },
      });
    }

    await prisma.member.update({
      where: { id },
      data: {
        emergencyContactName: data.emergencyContactName ?? member.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone ?? member.emergencyContactPhone,
        address: data.address ?? member.address,
        fitnessGoals: data.fitnessGoals ?? member.fitnessGoals,
        notes: data.notes ?? member.notes,
      },
    });

    return this.getMemberById(id);
  }

  static async deleteMember(id: string) {
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) throw new Error("Member not found.");

    // Delete user which cascades to member
    await prisma.user.delete({ where: { id: member.userId } });
    return { success: true, message: "Member and user record permanently deleted." };
  }
}
