import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { ENV } from "../config/env";
import { generateMemberQrToken } from "../utils/qr";

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: "member" | "trainer" | "admin";
    fitnessGoals?: string;
    planId?: string;
    specialization?: string;
    bio?: string;
    experienceYears?: number;
    hourlyRate?: number;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new Error("A user with this email address already exists.");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const role = data.role || "member";

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: role as any,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || null,
        status: role === "trainer" ? "pending" : "active",
      },
    });

    let member = null;
    let trainer = null;

    if (role === "member") {
      const count = await prisma.member.count();
      const memberCode = `MEM-${(10001 + count).toString()}`;
      const qrCodeToken = generateMemberQrToken(memberCode);

      member = await prisma.member.create({
        data: {
          userId: user.id,
          memberCode,
          qrCodeToken,
          fitnessGoals: data.fitnessGoals || "General Health and Fitness",
          rewardCoins: 50, // 50 bonus welcome coins on registration
        },
      });

      // If a plan was selected during registration, activate the membership
      if (data.planId) {
        const plan = await prisma.membershipPlan.findUnique({
          where: { id: data.planId },
        });

        if (plan) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(startDate.getDate() + plan.durationDays);

          await prisma.membership.create({
            data: {
              memberId: member.id,
              planId: plan.id,
              startDate,
              endDate,
              status: "active",
              autoRenew: true,
            },
          });
        }
      }

      // Record welcome reward transaction
      await prisma.rewardTransaction.create({
        data: {
          memberId: member.id,
          points: 50,
          transactionType: "earned",
          reason: "Welcome bonus for joining Apex Iron Fitness (50 coins)",
        },
      });

      // Send welcome notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "Welcome to Apex Iron Fitness!",
          message: "Your membership profile has been created with 50 bonus reward coins. Check your QR code to enter the gym and earn coins on every attendance!",
          type: "system",
        },
      });
    } else if (role === "trainer") {
      trainer = await prisma.trainer.create({
        data: {
          userId: user.id,
          specialization: data.specialization || "Strength & Conditioning",
          bio: data.bio || "Certified fitness specialist dedicated to helping you achieve your athletic potential.",
          experienceYears: Number(data.experienceYears) || 3,
          hourlyRate: Number(data.hourlyRate) || 750.0,
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "Trainer Registration Received",
          message: "Your coach profile has been registered and is pending admin confirmation. You will be able to access your dashboard once approved.",
          type: "system",
        },
      }).catch(() => null);
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      memberId: member?.id,
      trainerId: trainer?.id,
      status: user.status,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        member,
        trainer,
      },
    };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        member: {
          include: {
            memberships: {
              where: { status: "active" },
              include: { plan: true },
              orderBy: { endDate: "desc" },
              take: 1,
            },
          },
        },
        trainer: true,
      },
    });

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    if (user.status === "suspended") {
      throw new Error("Account has been suspended. Please contact gym administration.");
    }

    if (user.status === "inactive") {
      throw new Error("Account is currently inactive. Please contact support.");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid email or password.");
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      memberId: user.member?.id,
      trainerId: user.trainer?.id,
      status: user.status,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        member: user.member,
        trainer: user.trainer,
      },
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: {
          include: {
            memberships: {
              include: { plan: true },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        trainer: {
          include: {
            availabilities: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  static async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
      },
    });
  }

  static generateToken(payload: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    memberId?: string;
    trainerId?: string;
    status: string;
  }): string {
    return jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as any,
    });
  }
}
