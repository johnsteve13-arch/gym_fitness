import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Purging all data from the database...");

  // 1. Delete dependent transactional records
  await prisma.smsNotificationLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.userNotificationPreference.deleteMany({});
  await prisma.rewardTransaction.deleteMany({});
  await prisma.reward.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.classBooking.deleteMany({});
  await prisma.gymClass.deleteMany({});
  await prisma.trainerBooking.deleteMany({});
  await prisma.trainerUnavailability.deleteMany({});
  await prisma.trainerAvailability.deleteMany({});
  await prisma.bodyMeasurement.deleteMany({});
  await prisma.workoutLogEntry.deleteMany({});
  await prisma.workoutLog.deleteMany({});
  await prisma.workoutExercise.deleteMany({});
  await prisma.workoutProgram.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.membershipPlan.deleteMany({});
  await prisma.aiActivityScore.deleteMany({});
  await prisma.aiRecommendation.deleteMany({});

  // 2. Delete Member and Trainer profile records
  await prisma.member.deleteMany({});
  await prisma.trainer.deleteMany({});

  // 3. Delete non-admin or all user records
  await prisma.user.deleteMany({});
  await prisma.gymSetting.deleteMany({});

  console.log("Purge complete! All tables have been completely cleared (0 records).");
}

main()
  .catch((e) => {
    console.error("Purge error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
