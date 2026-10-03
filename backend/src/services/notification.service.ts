import { prisma } from "../config/database";

export class NotificationService {
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
