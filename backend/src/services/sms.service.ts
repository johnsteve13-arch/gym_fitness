import { prisma } from "../config/database";
import { ENV } from "../config/env";
import { SmsDeliveryStatus } from "@prisma/client";

export interface SmsSendParams {
  toPhone: string;
  recipientUserId?: string;
  recipientName?: string;
  event:
    | "booking_requested"
    | "booking_confirmed"
    | "booking_declined"
    | "booking_cancelled_trainer"
    | "booking_cancelled_member"
    | "session_reminder"
    | "membership_expiring"
    | "membership_renewed"
    | "payment_success"
    | "payment_failed"
    | "class_confirmed"
    | "class_cancelled"
    | "security_alert"
    | "trainer_approved"
    | "trainer_declined"
    | "custom_admin";
  messageContent: string;
  idempotencyKey?: string;
}

export interface SmsSendResult {
  success: boolean;
  logId?: string;
  status: SmsDeliveryStatus;
  provider: string;
  providerMessageId?: string;
  message: string;
  dryRun: boolean;
  recipientPhone: string;
}

export class SmsService {
  /**
   * Normalizes and validates Philippine mobile phone numbers.
   * Handles inputs like: "+639171234567", "09171234567", "9171234567", "+63 (917) 123-4567"
   */
  static normalizePhilippineNumber(phone: string): {
    valid: boolean;
    normalized: string; // e.g. "09171234567" for local or Semaphore
    international: string; // e.g. "+639171234567"
    error?: string;
  } {
    if (!phone || typeof phone !== "string") {
      return { valid: false, normalized: "", international: "", error: "Phone number is empty" };
    }

    // Strip non-digit characters
    const digits = phone.replace(/\D/g, "");

    let normalized = "";
    let international = "";

    if (digits.startsWith("639") && digits.length === 12) {
      normalized = "0" + digits.slice(2);
      international = "+" + digits;
    } else if (digits.startsWith("09") && digits.length === 11) {
      normalized = digits;
      international = "+63" + digits.slice(1);
    } else if (digits.startsWith("9") && digits.length === 10) {
      normalized = "0" + digits;
      international = "+63" + digits;
    } else {
      return {
        valid: false,
        normalized: digits,
        international: digits,
        error: "Invalid Philippine mobile number format (must be 09xxxxxxxxx or +639xxxxxxxxx)",
      };
    }

    return {
      valid: true,
      normalized,
      international,
    };
  }

  /**
   * Checks if user has enabled SMS notifications for this specific event category
   */
  static async isUserOptedIn(userId: string | undefined, event: string): Promise<boolean> {
    if (!userId) return true; // Non-registered direct recipient

    try {
      const pref = await prisma.userNotificationPreference.findUnique({
        where: { userId },
      });

      if (!pref) return true; // Default opted-in

      if (!pref.smsEnabled) return false;

      if (event.startsWith("booking_") && !pref.bookingSms) return false;
      if (event.startsWith("payment_") && !pref.paymentSms) return false;
      if (event.startsWith("membership_") && !pref.membershipSms) return false;
      if (event.startsWith("class_") && !pref.classSms) return false;
      if (event.includes("reminder") && !pref.reminderSms) return false;

      return true;
    } catch {
      return true; // Fail safe
    }
  }

  /**
   * Dispatches an SMS notification through Semaphore with idempotency, preferences, and persistence
   */
  static async sendSms(params: SmsSendParams): Promise<SmsSendResult> {
    const { toPhone, recipientUserId, recipientName, event, messageContent, idempotencyKey } = params;

    // 1. Phone number validation & normalization
    const phoneCheck = this.normalizePhilippineNumber(toPhone);
    if (!phoneCheck.valid) {
      // Record failure log
      const failedLog = await prisma.smsNotificationLog.create({
        data: {
          recipientPhone: toPhone,
          recipientUserId: recipientUserId || null,
          recipientName: recipientName || null,
          messageContent,
          event,
          provider: ENV.SMS_PROVIDER,
          status: "failed",
          errorMessage: phoneCheck.error || "Invalid mobile number",
          idempotencyKey: idempotencyKey || null,
        },
      });

      return {
        success: false,
        logId: failedLog.id,
        status: "failed",
        provider: ENV.SMS_PROVIDER,
        message: phoneCheck.error || "Invalid Philippine phone number",
        dryRun: ENV.SMS_DRY_RUN,
        recipientPhone: toPhone,
      };
    }

    const cleanNumber = phoneCheck.normalized;

    // 2. Idempotency Check
    if (idempotencyKey) {
      const existing = await prisma.smsNotificationLog.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return {
          success: existing.status === "delivered" || existing.status === "accepted",
          logId: existing.id,
          status: existing.status,
          provider: existing.provider,
          providerMessageId: existing.providerMessageId || undefined,
          message: "Duplicate notification prevented by idempotency check.",
          dryRun: ENV.SMS_DRY_RUN,
          recipientPhone: cleanNumber,
        };
      }
    }

    // 3. User Notification Preferences Check
    const isOptedIn = await this.isUserOptedIn(recipientUserId, event);
    if (!isOptedIn) {
      const optOutLog = await prisma.smsNotificationLog.create({
        data: {
          recipientPhone: cleanNumber,
          recipientUserId: recipientUserId || null,
          recipientName: recipientName || null,
          messageContent,
          event,
          provider: ENV.SMS_PROVIDER,
          status: "undelivered",
          errorMessage: "Recipient opted out of SMS notifications for this event category.",
          idempotencyKey: idempotencyKey || null,
        },
      });

      return {
        success: true,
        logId: optOutLog.id,
        status: "undelivered",
        provider: ENV.SMS_PROVIDER,
        message: "SMS skipped: Recipient opted out of SMS category.",
        dryRun: ENV.SMS_DRY_RUN,
        recipientPhone: cleanNumber,
      };
    }

    // 4. Dry-Run / Simulated Delivery (Safe Development Mode)
    const isDryRun = ENV.SMS_DRY_RUN || !ENV.SMS_ENABLED || !ENV.SMS_API_KEY;

    if (isDryRun) {
      console.log(
        `\n================================================================================\n` +
        `[SEMAPHORE SMS DISPATCH (DRY RUN / SIMULATED)]\n` +
        `Recipient: ${recipientName ? `${recipientName} ` : ""}(${cleanNumber})\n` +
        `Event: ${event}\n` +
        `Provider: Semaphore (https://semaphore.co)\n` +
        `Status: ACCEPTED (Simulated)\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `Message:\n${messageContent}\n` +
        `================================================================================\n`
      );

      const dryRunLog = await prisma.smsNotificationLog.create({
        data: {
          recipientPhone: cleanNumber,
          recipientUserId: recipientUserId || null,
          recipientName: recipientName || null,
          messageContent,
          event,
          provider: "semaphore (dry-run)",
          providerMessageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: "accepted",
          statusCode: 200,
          errorMessage: null,
          idempotencyKey: idempotencyKey || null,
          sentAt: new Date(),
        },
      });

      return {
        success: true,
        logId: dryRunLog.id,
        status: "accepted",
        provider: "semaphore (dry-run)",
        providerMessageId: dryRunLog.providerMessageId || undefined,
        message: "SMS simulated in dry-run mode.",
        dryRun: true,
        recipientPhone: cleanNumber,
      };
    }

    // 5. Live Semaphore API Dispatch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const requestPayload: any = {
        apikey: ENV.SMS_API_KEY,
        number: cleanNumber,
        message: messageContent,
      };

      if (ENV.SMS_SENDER_NAME) {
        requestPayload.sendername = ENV.SMS_SENDER_NAME;
      }

      const response = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData: any = await response.json();

      if (!response.ok) {
        const errorMsg =
          responseData?.message ||
          (Array.isArray(responseData) && responseData[0]?.message) ||
          `Semaphore API HTTP ${response.status}`;

        const failedLog = await prisma.smsNotificationLog.create({
          data: {
            recipientPhone: cleanNumber,
            recipientUserId: recipientUserId || null,
            recipientName: recipientName || null,
            messageContent,
            event,
            provider: "semaphore",
            status: "failed",
            statusCode: response.status,
            errorMessage: String(errorMsg),
            idempotencyKey: idempotencyKey || null,
          },
        });

        return {
          success: false,
          logId: failedLog.id,
          status: "failed",
          provider: "semaphore",
          message: String(errorMsg),
          dryRun: false,
          recipientPhone: cleanNumber,
        };
      }

      // Semaphore returns an array of messages
      const providerMsgId =
        Array.isArray(responseData) && responseData[0]?.message_id
          ? String(responseData[0].message_id)
          : responseData?.message_id
          ? String(responseData.message_id)
          : `sem_${Date.now()}`;

      const successLog = await prisma.smsNotificationLog.create({
        data: {
          recipientPhone: cleanNumber,
          recipientUserId: recipientUserId || null,
          recipientName: recipientName || null,
          messageContent,
          event,
          provider: "semaphore",
          providerMessageId: providerMsgId,
          status: "accepted",
          statusCode: response.status,
          idempotencyKey: idempotencyKey || null,
          sentAt: new Date(),
        },
      });

      return {
        success: true,
        logId: successLog.id,
        status: "accepted",
        provider: "semaphore",
        providerMessageId: providerMsgId,
        message: "SMS accepted by Semaphore for delivery.",
        dryRun: false,
        recipientPhone: cleanNumber,
      };
    } catch (err: any) {
      const isTimeout = err.name === "AbortError";
      const errorMsg = isTimeout ? "Semaphore API request timed out (10s)." : err.message;

      const errorLog = await prisma.smsNotificationLog.create({
        data: {
          recipientPhone: cleanNumber,
          recipientUserId: recipientUserId || null,
          recipientName: recipientName || null,
          messageContent,
          event,
          provider: "semaphore",
          status: "failed",
          statusCode: isTimeout ? 408 : 500,
          errorMessage: errorMsg,
          idempotencyKey: idempotencyKey || null,
        },
      });

      return {
        success: false,
        logId: errorLog.id,
        status: "failed",
        provider: "semaphore",
        message: errorMsg,
        dryRun: false,
        recipientPhone: cleanNumber,
      };
    }
  }

  /**
   * Templating helpers for the 13 required business events
   */
  static templates = {
    bookingRequested: (trainerName: string, date: string, time: string) =>
      `Apex Iron: New booking requested with Coach ${trainerName} on ${date} at ${time}. Complete payment or confirm via your portal.`,

    bookingConfirmed: (trainerName: string, date: string, time: string) =>
      `Apex Iron: Your session with Coach ${trainerName} on ${date} at ${time} is CONFIRMED. See you on the gym floor!`,

    bookingDeclined: (trainerName: string, date: string, time: string, reason?: string) =>
      `Apex Iron: Your session with Coach ${trainerName} on ${date} at ${time} was declined${
        reason ? ` (${reason})` : ""
      }. No charges were incurred.`,

    bookingCancelledTrainer: (trainerName: string, date: string, time: string) =>
      `Apex Iron: Coach ${trainerName} had to reschedule your session on ${date} at ${time}. Please select an alternate slot in your portal.`,

    bookingCancelledMember: (trainerName: string, date: string, time: string) =>
      `Apex Iron: Your session with Coach ${trainerName} on ${date} at ${time} has been cancelled.`,

    sessionReminder: (trainerName: string, time: string) =>
      `Apex Iron Reminder: Upcoming training session with Coach ${trainerName} today at ${time}. Don't forget your hydration gear!`,

    membershipExpiring: (planName: string, daysRemaining: number, expiryDate: string) =>
      `Apex Iron Alert: Your ${planName} membership expires in ${daysRemaining} days on ${expiryDate}. Renew now to maintain uninterrupted access.`,

    membershipRenewed: (planName: string, newExpiryDate: string) =>
      `Apex Iron: Welcome back! Your ${planName} membership has been renewed through ${newExpiryDate}. Thank you for training with Apex!`,

    paymentSuccess: (amount: number, invoiceNumber: string) =>
      `Apex Iron Receipt: Received payment of PHP ${amount.toFixed(
        2
      )} for ${invoiceNumber}. Thank you for training with Apex Iron Athletic Club!`,

    paymentFailed: (invoiceNumber: string) =>
      `Apex Iron Alert: Payment for invoice ${invoiceNumber} could not be processed. Please verify your payment details in the portal.`,

    classConfirmed: (className: string, date: string, time: string, room = "Studio A") =>
      `Apex Iron: You're confirmed for ${className} on ${date} at ${time} (${room}). Arrive 10 minutes early.`,

    classCancelled: (className: string, date: string, time: string) =>
      `Apex Iron Alert: ${className} scheduled for ${date} at ${time} has been cancelled. We apologize for the inconvenience.`,

    securityAlert: (details: string) =>
      `Apex Iron Security: New security action detected on your account (${details}). If this wasn't you, reset your password immediately.`,

    trainerApproved: (trainerName: string) =>
      `Apex Iron: Congratulations Coach ${trainerName}! Your trainer registration has been officially APPROVED by gym administration. You may now access your trainer dashboard.`,

    trainerDeclined: (trainerName: string, reason?: string) =>
      `Apex Iron: Notice regarding your coach registration. Your application was declined by gym administration${
        reason ? ` (Reason: ${reason})` : ""
      }. Please contact the front desk for inquiries.`,
  };

  /**
   * Retries sending a previously failed SMS notification
   */
  static async retrySms(logId: string): Promise<SmsSendResult> {
    const log = await prisma.smsNotificationLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new Error("SMS notification log not found.");
    }

    await prisma.smsNotificationLog.update({
      where: { id: logId },
      data: { retryCount: { increment: 1 } },
    });

    return this.sendSms({
      toPhone: log.recipientPhone,
      recipientUserId: log.recipientUserId || undefined,
      recipientName: log.recipientName || undefined,
      event: log.event as any,
      messageContent: log.messageContent,
      idempotencyKey: `retry_${log.id}_${Date.now()}`,
    });
  }

  /**
   * Retrieves summary statistics for SMS delivery
   */
  static async getSmsStats() {
    const [total, delivered, accepted, failed, undelivered, recentLogs] = await Promise.all([
      prisma.smsNotificationLog.count(),
      prisma.smsNotificationLog.count({ where: { status: "delivered" } }),
      prisma.smsNotificationLog.count({ where: { status: "accepted" } }),
      prisma.smsNotificationLog.count({ where: { status: "failed" } }),
      prisma.smsNotificationLog.count({ where: { status: "undelivered" } }),
      prisma.smsNotificationLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    return {
      provider: ENV.SMS_PROVIDER,
      senderName: ENV.SMS_SENDER_NAME || "Default (SEMAPHORE)",
      enabled: ENV.SMS_ENABLED,
      dryRun: ENV.SMS_DRY_RUN,
      metrics: {
        total,
        delivered,
        accepted,
        failed,
        undelivered,
        successRate: total > 0 ? Math.round(((delivered + accepted) / total) * 100) : 100,
      },
      recentLogs,
    };
  }
}
