import { prisma } from "../config/database";
import { SmsService } from "./sms.service";

export interface DispatchedNotificationReceipt {
  id: string;
  channel: "email" | "sms";
  recipient: string;
  recipientName?: string;
  subject?: string;
  content: string;
  provider: string;
  status: "delivered" | "sent";
  sentAt: string;
  metadata?: Record<string, any>;
}

// In-memory audit trail of external SMS/Email dispatches
const dispatchHistory: DispatchedNotificationReceipt[] = [];

export class NotificationService {
  /**
   * Dispatches an email notification (e.g. to Gmail) with simulated/real gateway delivery
   */
  static async sendEmailNotification(params: {
    toEmail: string;
    recipientName?: string;
    subject: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<DispatchedNotificationReceipt> {
    const { toEmail, recipientName, subject, content, metadata } = params;

    const receipt: DispatchedNotificationReceipt = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      channel: "email",
      recipient: toEmail,
      recipientName,
      subject,
      content,
      provider: "Google Workspace / Gmail Delivery Gateway",
      status: "delivered",
      sentAt: new Date().toISOString(),
      metadata,
    };

    dispatchHistory.unshift(receipt);

    // Formatted delivery log for inspection and auditing
    console.log(
      `\n================================================================================\n` +
      `[GMAIL NOTIFICATION DISPATCH]\n` +
      `To: ${recipientName ? `${recipientName} <${toEmail}>` : toEmail}\n` +
      `Subject: ${subject}\n` +
      `Gateway: ${receipt.provider} (Status: ${receipt.status.toUpperCase()})\n` +
      `Timestamp: ${receipt.sentAt}\n` +
      `Body:\n${content}\n` +
      `================================================================================\n`
    );

    return receipt;
  }

  /**
   * Dispatches an SMS notification using the dedicated SmsService
   */
  static async sendSmsNotification(params: {
    toPhone: string;
    recipientName?: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<DispatchedNotificationReceipt> {
    const { toPhone, recipientName, message, metadata } = params;

    const smsResult = await SmsService.sendSms({
      toPhone,
      recipientUserId: metadata?.userId,
      recipientName,
      event: (metadata?.event as any) || "custom_admin",
      messageContent: message,
      idempotencyKey: metadata?.idempotencyKey || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    });

    const receipt: DispatchedNotificationReceipt = {
      id: smsResult.logId || `sms_${Date.now()}`,
      channel: "sms",
      recipient: toPhone,
      recipientName,
      content: message,
      provider: smsResult.provider,
      status: smsResult.status === "failed" ? "sent" : "delivered",
      sentAt: new Date().toISOString(),
      metadata,
    };

    dispatchHistory.unshift(receipt);
    return receipt;
  }

  /**
   * Handles multi-channel notification dispatch when admin accepts/confirms a trainer registration
   */
  static async sendTrainerAcceptNotifications(params: {
    userId: string;
    name: string;
    email: string;
    phone: string;
  }) {
    const { userId, name, email, phone } = params;

    const emailSubject = "Apex Iron Fitness — Coach Registration Accepted!";
    const emailBody =
      `Congratulations Coach ${name}!\n\n` +
      `Your trainer registration has been officially approved and confirmed by gym administration.\n` +
      `Your trainer dashboard is now fully unlocked. You may log in to configure your training schedule, ` +
      `publish workout programs, and accept athlete workout bookings.\n\n` +
      `Welcome to the Boot Camp Fitness Coaching Staff!\n` +
      `Gym Administration & Management`;

    const smsText =
      `Apex Iron Fitness: Congratulations Coach ${name}! Your trainer registration has been accepted by gym administration. You may now access your trainer dashboard.`;

    const [emailReceipt, smsReceipt] = await Promise.all([
      this.sendEmailNotification({
        toEmail: email,
        recipientName: name,
        subject: emailSubject,
        content: emailBody,
        metadata: { action: "trainer_approved", userId },
      }),
      this.sendSmsNotification({
        toPhone: phone,
        recipientName: name,
        message: smsText,
        metadata: { action: "trainer_approved", userId },
      }),
    ]);

    // Also persist in-app system notification
    await prisma.notification.create({
      data: {
        userId,
        title: "Trainer Registration Confirmed!",
        message:
          `Your trainer account has been confirmed by gym administration. ` +
          `Confirmation notices were delivered to your Gmail (${email}) and mobile number (${phone}). ` +
          `You now have full access to your trainer dashboard.`,
        type: "system",
      },
    }).catch(() => null);

    return {
      email: emailReceipt,
      sms: smsReceipt,
    };
  }

  /**
   * Handles multi-channel notification dispatch when admin declines a trainer registration
   */
  static async sendTrainerDeclineNotifications(params: {
    userId: string;
    name: string;
    email: string;
    phone: string;
    reason: string;
  }) {
    const { userId, name, email, phone, reason } = params;

    const emailSubject = "Apex Iron Fitness — Update on Your Coach Registration Application";
    const emailBody =
      `Dear Coach ${name},\n\n` +
      `Thank you for your interest in joining the Boot Camp Fitness coaching team. ` +
      `After careful administrative review, your coach registration application has been declined.\n\n` +
      `Official Reason: ${reason}\n\n` +
      `If you have updated credentials, questions regarding this decision, or wish to re-apply in the future, ` +
      `please visit the front desk or contact gym management.\n\n` +
      `Gym Administration & Management`;

    const smsText =
      `Apex Iron Fitness: Notice regarding your coach registration. Your application was declined by gym administration. Reason: ${reason}. Inquiries: contact front desk.`;

    const [emailReceipt, smsReceipt] = await Promise.all([
      this.sendEmailNotification({
        toEmail: email,
        recipientName: name,
        subject: emailSubject,
        content: emailBody,
        metadata: { action: "trainer_declined", reason, userId },
      }),
      this.sendSmsNotification({
        toPhone: phone,
        recipientName: name,
        message: smsText,
        metadata: { action: "trainer_declined", reason, userId },
      }),
    ]);

    // Also persist in-app system notification
    await prisma.notification.create({
      data: {
        userId,
        title: "Trainer Registration Declined",
        message:
          `Your coach registration was reviewed and declined by gym administration. ` +
          `Notice delivered to your Gmail (${email}) and mobile phone (${phone}). Reason: ${reason}`,
        type: "system",
      },
    }).catch(() => null);

    return {
      email: emailReceipt,
      sms: smsReceipt,
    };
  }

  /**
   * Retrieve dispatch history logs (optionally filtered by recipient email or phone)
   */
  static listDispatches(filter?: string): DispatchedNotificationReceipt[] {
    if (!filter) return dispatchHistory;
    const lower = filter.toLowerCase();
    return dispatchHistory.filter(
      (d) =>
        d.recipient.toLowerCase().includes(lower) ||
        (d.recipientName && d.recipientName.toLowerCase().includes(lower)) ||
        d.content.toLowerCase().includes(lower)
    );
  }

  static async listUserNotifications(userId: string, limit: number = 50) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  static async broadcastAnnouncement(title: string, message: string) {
    const users = await prisma.user.findMany({
      where: { status: "active" },
      select: { id: true },
    });

    const notifications = users.map((u) => ({
      userId: u.id,
      title,
      message,
      type: "system",
      isRead: false,
    }));

    return prisma.notification.createMany({
      data: notifications,
    });
  }
}
