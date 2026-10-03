import { prisma } from "../config/database";

export class RewardService {
  static async listRewards() {
    return prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { pointsCost: "asc" },
    });
  }

  static async createReward(data: {
    title: string;
    description: string;
    pointsCost: number;
    category: string;
    stockQuantity?: number;
    imageUrl?: string;
  }) {
    return prisma.reward.create({
      data: {
        title: data.title,
        description: data.description,
        pointsCost: data.pointsCost,
        category: data.category,
        stockQuantity: data.stockQuantity ?? 100,
        imageUrl: data.imageUrl || null,
        isActive: true,
      },
    });
  }

  static async redeemReward(memberId: string, rewardId: string) {
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.isActive) throw new Error("Reward item is not currently available.");
    if (reward.stockQuantity <= 0) throw new Error("Reward item is out of stock.");

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { user: true },
    });
    if (!member) throw new Error("Member not found.");

    if (member.rewardCoins < reward.pointsCost) {
      throw new Error(
        `Insufficient reward coins. You have ${member.rewardCoins} coins, but this reward requires ${reward.pointsCost} coins.`
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Deduct coins
      const updatedMember = await tx.member.update({
        where: { id: memberId },
        data: { rewardCoins: { decrement: reward.pointsCost } },
      });

      // Decrement stock
      await tx.reward.update({
        where: { id: rewardId },
        data: { stockQuantity: { decrement: 1 } },
      });

      // Record transaction
      const txn = await tx.rewardTransaction.create({
        data: {
          memberId,
          rewardId,
          points: reward.pointsCost,
          transactionType: "redeemed",
          reason: `Redeemed reward: ${reward.title}`,
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId: member.userId,
          title: "Reward Redeemed!",
          message: `Congratulations! You successfully redeemed '${reward.title}'. Show this confirmation to front desk staff.`,
          type: "reward",
        },
      });

      return { updatedMember, txn, reward };
    });

    return result;
  }

  static async getMemberHistory(memberId: string) {
    return prisma.rewardTransaction.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      include: {
        reward: true,
      },
    });
  }
}
