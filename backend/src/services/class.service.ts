import { prisma } from "../config/database";

export class ClassService {
  static async listClasses(params: { category?: string; scheduleDate?: string }) {
    const where: any = { isCancelled: false };
    if (params.category) where.category = params.category;
    if (params.scheduleDate) {
      const targetDate = new Date(params.scheduleDate);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      where.scheduleDate = { gte: startOfDay, lte: endOfDay };
    }

    return prisma.gymClass.findMany({
      where,
      orderBy: [{ scheduleDate: "asc" }, { startTime: "asc" }],
      include: {
        trainer: {
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
        bookings: {
          include: {
            member: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });
  }

  static async createClass(data: {
    name: string;
    description: string;
    category: string;
    trainerId: string;
    room?: string;
    maxCapacity?: number;
    startTime: string;
    endTime: string;
    scheduleDate: string;
    durationMinutes?: number;
  }) {
    return prisma.gymClass.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category.toLowerCase(),
        trainerId: data.trainerId,
        room: data.room || "Studio 1",
        maxCapacity: data.maxCapacity || 20,
        startTime: data.startTime,
        endTime: data.endTime,
        scheduleDate: new Date(data.scheduleDate),
        durationMinutes: data.durationMinutes || 60,
      },
      include: {
        trainer: { include: { user: true } },
      },
    });
  }

  static async bookClass(classId: string, memberId: string) {
    const gymClass = await prisma.gymClass.findUnique({
      where: { id: classId },
      include: {
        bookings: {
          where: { status: { in: ["booked", "waitlisted"] } },
        },
      },
    });

    if (!gymClass) throw new Error("Gym class not found.");
    if (gymClass.isCancelled) throw new Error("This class has been cancelled.");

    // Check if already booked
    const existingBooking = gymClass.bookings.find((b) => b.memberId === memberId);
    if (existingBooking) {
      throw new Error(`You have already registered for this class with status: ${existingBooking.status}.`);
    }

    const confirmedCount = gymClass.bookings.filter((b) => b.status === "booked").length;

    let status: "booked" | "waitlisted" = "booked";
    let waitlistPosition: number | null = null;

    if (confirmedCount >= gymClass.maxCapacity) {
      status = "waitlisted";
      const currentWaitlistCount = gymClass.bookings.filter((b) => b.status === "waitlisted").length;
      waitlistPosition = currentWaitlistCount + 1;
    }

    const booking = await prisma.classBooking.create({
      data: {
        classId,
        memberId,
        status,
        waitlistPosition,
      },
      include: {
        class: true,
      },
    });

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (member) {
      await prisma.notification.create({
        data: {
          userId: member.userId,
          title: status === "booked" ? "Class Confirmed" : "Added to Class Waitlist",
          message:
            status === "booked"
              ? `You are confirmed for ${gymClass.name} on ${new Date(gymClass.scheduleDate).toLocaleDateString()} at ${gymClass.startTime}.`
              : `The class is currently full. You are #${waitlistPosition} on the waitlist for ${gymClass.name}.`,
          type: "booking",
        },
      });
    }

    return booking;
  }

  static async cancelClassBooking(classId: string, memberId: string) {
    const booking = await prisma.classBooking.findUnique({
      where: {
        classId_memberId: { classId, memberId },
      },
    });

    if (!booking) throw new Error("Class booking not found.");

    await prisma.classBooking.update({
      where: { id: booking.id },
      data: { status: "cancelled" },
    });

    // If the cancelled booking was confirmed, automatically promote the #1 waitlisted member!
    if (booking.status === "booked") {
      const nextInLine = await prisma.classBooking.findFirst({
        where: { classId, status: "waitlisted" },
        orderBy: { waitlistPosition: "asc" },
        include: { member: { include: { user: true } }, class: true },
      });

      if (nextInLine) {
        await prisma.classBooking.update({
          where: { id: nextInLine.id },
          data: {
            status: "booked",
            waitlistPosition: null,
          },
        });

        // Notify promoted member
        await prisma.notification.create({
          data: {
            userId: nextInLine.member.userId,
            title: "Waitlist Spot Opened! You Are In!",
            message: `A spot opened in ${nextInLine.class.name}! You have been moved from the waitlist to confirmed booked status.`,
            type: "booking",
          },
        });
      }
    }

    return { success: true, message: "Booking cancelled successfully." };
  }
}
