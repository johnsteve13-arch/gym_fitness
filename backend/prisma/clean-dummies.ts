import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning dummy members, trainers, and staff records from database...");

  // 1. Delete Attendances, BodyMeasurements, WorkoutLogs, Bookings, Payments, Memberships for non-admin users
  const dummyUsers = await prisma.user.findMany({
    where: {
      email: {
        not: "admin@apexfitness.com",
      },
    },
    include: {
      member: true,
      trainer: true,
    },
  });

  console.log(`Found ${dummyUsers.length} non-admin accounts to purge.`);

  for (const u of dummyUsers) {
    if (u.member) {
      await prisma.attendance.deleteMany({ where: { memberId: u.member.id } });
      await prisma.workoutLog.deleteMany({ where: { memberId: u.member.id } });
      await prisma.bodyMeasurement.deleteMany({ where: { memberId: u.member.id } });
      await prisma.classBooking.deleteMany({ where: { memberId: u.member.id } });
      await prisma.trainerBooking.deleteMany({ where: { memberId: u.member.id } });
      await prisma.payment.deleteMany({ where: { memberId: u.member.id } });
      await prisma.membership.deleteMany({ where: { memberId: u.member.id } });
      await prisma.aiActivityScore.deleteMany({ where: { memberId: u.member.id } });
      await prisma.member.delete({ where: { id: u.member.id } });
    }

    if (u.trainer) {
      await prisma.trainerBooking.deleteMany({ where: { trainerId: u.trainer.id } });
      await prisma.gymClass.deleteMany({ where: { trainerId: u.trainer.id } });
      await prisma.trainer.delete({ where: { id: u.trainer.id } });
    }

    await prisma.notification.deleteMany({ where: { userId: u.id } });
    await prisma.auditLog.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }

  console.log("Purge complete! Only Admin account remains in the database.");
}

main()
  .catch((e) => {
    console.error("Purge error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
