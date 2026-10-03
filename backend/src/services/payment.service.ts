import { prisma } from "../config/database";
import crypto from "crypto";

export class PaymentService {
  static generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `INV-${year}-${randomHex}`;
  }

  static generateTransactionId(): string {
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `TXN-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
  }

  static async processPayment(data: {
    memberId: string;
    amount: number;
    discountAmount?: number;
    paymentMethod: "credit_card" | "cash" | "bank_transfer" | "online" | "qr_pay";
    paymentType: "membership" | "trainer_session" | "class" | "merchandise" | "addon";
    referenceId?: string;
    notes?: string;
  }) {
    const discount = data.discountAmount || 0;
    const netAmount = Math.max(0, data.amount - discount);
    const invoiceNumber = this.generateInvoiceNumber();
    const transactionId = this.generateTransactionId();

    // Use Prisma transaction to guarantee atomicity
    const payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          transactionId,
          invoiceNumber,
          memberId: data.memberId,
          amount: data.amount,
          discountAmount: discount,
          netAmount,
          currency: "USD",
          paymentMethod: data.paymentMethod,
          paymentStatus: "completed",
          paymentType: data.paymentType,
          referenceId: data.referenceId || null,
          notes: data.notes || null,
          paidAt: new Date(),
        },
        include: {
          member: {
            include: { user: true },
          },
        },
      });

      // If paying for trainer booking, update booking payment status
      if (data.paymentType === "trainer_session" && data.referenceId) {
        await tx.trainerBooking.update({
          where: { id: data.referenceId },
          data: { paymentStatus: "completed", status: "confirmed" },
        });
      }

      // If paying for membership renewal or upgrade, activate membership
      if (data.paymentType === "membership" && data.referenceId) {
        await tx.membership.update({
          where: { id: data.referenceId },
          data: { status: "active" },
        });
      }

      // Award bonus reward coins for payment (1 coin per $1 spent)
      const earnedCoins = Math.floor(netAmount);
      if (earnedCoins > 0) {
        await tx.member.update({
          where: { id: data.memberId },
          data: { rewardCoins: { increment: earnedCoins } },
        });

        await tx.rewardTransaction.create({
          data: {
            memberId: data.memberId,
            points: earnedCoins,
            transactionType: "earned",
            reason: `Reward points for payment ${invoiceNumber}`,
            referenceId: createdPayment.id,
          },
        });
      }

      // Create notification
      await tx.notification.create({
        data: {
          userId: createdPayment.member.userId,
          title: "Payment Received",
          message: `Your payment of $${netAmount.toFixed(2)} (${invoiceNumber}) has been successfully processed. Thank you!`,
          type: "payment",
        },
      });

      return createdPayment;
    });

    return payment;
  }

  static async listPayments(params: {
    memberId?: string;
    paymentStatus?: string;
    paymentType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.memberId) where.memberId = params.memberId;
    if (params.paymentStatus) where.paymentStatus = params.paymentStatus;
    if (params.paymentType) where.paymentType = params.paymentType;

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          member: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
      }),
    ]);

    return {
      payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async refundPayment(paymentId: string, reason?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { member: { include: { user: true } } },
    });
    if (!payment) throw new Error("Payment record not found.");
    if (payment.paymentStatus === "refunded") throw new Error("This payment has already been refunded.");

    const refunded = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: "refunded",
        notes: `${payment.notes || ""}\nRefunded on ${new Date().toISOString()}: ${reason || "Refund requested"}`,
      },
    });

    await prisma.notification.create({
      data: {
        userId: payment.member.userId,
        title: "Payment Refund Issued",
        message: `A refund of $${Number(payment.netAmount).toFixed(2)} for ${payment.invoiceNumber} has been issued.`,
        type: "payment",
      },
    });

    return refunded;
  }

  static async getFinancialAnalytics() {
    const payments = await prisma.payment.findMany({
      where: { paymentStatus: "completed" },
    });

    let totalRevenue = 0;
    let membershipRevenue = 0;
    let trainerRevenue = 0;
    let classRevenue = 0;
    let otherRevenue = 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    let todayRevenue = 0;

    payments.forEach((p) => {
      const net = Number(p.netAmount);
      totalRevenue += net;

      if (p.paymentType === "membership") membershipRevenue += net;
      else if (p.paymentType === "trainer_session") trainerRevenue += net;
      else if (p.paymentType === "class") classRevenue += net;
      else otherRevenue += net;

      if (p.paidAt && p.paidAt.toISOString().slice(0, 10) === todayStr) {
        todayRevenue += net;
      }
    });

    return {
      totalRevenue,
      todayRevenue,
      membershipRevenue,
      trainerRevenue,
      classRevenue,
      otherRevenue,
      transactionsCount: payments.length,
    };
  }
}
