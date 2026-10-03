import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding for Apex Iron Fitness Platform...");

  const defaultPassword = "Password@123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Gym Settings
  await prisma.gymSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      gymName: "Apex Iron Athletic Club",
      tagline: "World-Class Athletic Performance, Recovery & Wellness",
      address: "100 Grand Olympic Boulevard, Suite 500, Metro City, NY 10001",
      phone: "+1 (800) 555-APEX",
      email: "concierge@apexfitness.com",
      currency: "USD",
      taxRate: 8.875,
      unpaidBookingTimeoutMinutes: 30,
      gracePeriodDays: 7,
    },
  });

  // 2. Users: Super Admin & Staff
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@apexfitness.com" },
    update: {},
    create: {
      email: "superadmin@apexfitness.com",
      passwordHash,
      role: "super_admin",
      firstName: "Alexander",
      lastName: "Vance",
      phone: "+1 (555) 901-1122",
      status: "active",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    },
  });

  const staffAdmin = await prisma.user.upsert({
    where: { email: "staff@apexfitness.com" },
    update: {},
    create: {
      email: "staff@apexfitness.com",
      passwordHash,
      role: "admin",
      firstName: "Rachel",
      lastName: "Greene",
      phone: "+1 (555) 901-3344",
      status: "active",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
    },
  });

  // 3. Trainers
  const trainerUser1 = await prisma.user.upsert({
    where: { email: "marcus@apexfitness.com" },
    update: {},
    create: {
      email: "marcus@apexfitness.com",
      passwordHash,
      role: "trainer",
      firstName: "Marcus",
      lastName: "Steele",
      phone: "+1 (555) 234-5678",
      status: "active",
      avatarUrl: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150",
    },
  });

  const trainer1 = await prisma.trainer.upsert({
    where: { userId: trainerUser1.id },
    update: {},
    create: {
      userId: trainerUser1.id,
      specialization: "Hypertrophy & Heavy Powerlifting",
      bio: "Former collegiate strength coach with 8+ years experience coaching national powerlifting medalists.",
      experienceYears: 8,
      hourlyRate: 75.0,
      rating: 4.95,
      maxClients: 25,
    },
  });

  const trainerUser2 = await prisma.user.upsert({
    where: { email: "elena@apexfitness.com" },
    update: {},
    create: {
      email: "elena@apexfitness.com",
      passwordHash,
      role: "trainer",
      firstName: "Elena",
      lastName: "Rostova",
      phone: "+1 (555) 345-6789",
      status: "active",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    },
  });

  const trainer2 = await prisma.trainer.upsert({
    where: { userId: trainerUser2.id },
    update: {},
    create: {
      userId: trainerUser2.id,
      specialization: "HIIT Conditioning & Olympic Weightlifting",
      bio: "CrossFit Level 3 certified coach specializing in functional conditioning and body recomposition.",
      experienceYears: 6,
      hourlyRate: 65.0,
      rating: 4.88,
      maxClients: 20,
    },
  });

  // 4. Membership Plans
  const planData = [
    {
      name: "Day Pass / Trial",
      code: "PLAN-DAY",
      description: "Full single-day gym access including locker rooms and sauna.",
      durationDays: 1,
      price: 20.0,
      planType: "trial",
      benefits: JSON.stringify(["Full gym access for 24 hours", "Standard locker access", "Free hydration bar"]),
      maxClassesPerWeek: 0,
      hasTrainerAccess: false,
    },
    {
      name: "Monthly Athlete Pass",
      code: "PLAN-MONTHLY",
      description: "Our core flexible monthly membership with unlimited cardio and free weights.",
      durationDays: 30,
      price: 59.99,
      planType: "standard",
      benefits: JSON.stringify(["Unlimited gym floor access", "Locker room & Finnish sauna", "Free mobile app QR check-in", "1 Group class per week"]),
      maxClassesPerWeek: 1,
      hasTrainerAccess: false,
    },
    {
      name: "Quarterly Pro Conditioning",
      code: "PLAN-QUARTERLY",
      description: "Comprehensive 90-day package with group fitness classes and guest privileges.",
      durationDays: 90,
      price: 159.99,
      planType: "premium",
      benefits: JSON.stringify(["Unlimited gym access", "Unlimited group classes", "1 Complimentary Personal Training Session", "Recovery lounge & massage chairs", "2 Guest passes per month"]),
      maxClassesPerWeek: 5,
      hasTrainerAccess: true,
    },
    {
      name: "Annual All-Access Championship",
      code: "PLAN-ANNUAL",
      description: "The ultimate 365-day athletic membership. Unlimited access, VIP perks, and full trainer consultations.",
      durationDays: 365,
      price: 499.99,
      planType: "premium",
      benefits: JSON.stringify(["24/7 VIP keyless QR entry", "Unlimited classes & recovery zone", "Monthly 1-on-1 PT consultation", "10% discount on gym apparel and supplements", "Unlimited guest access"]),
      maxClassesPerWeek: 10,
      hasTrainerAccess: true,
    },
    {
      name: "Student Performance Pass",
      code: "PLAN-STUDENT",
      description: "Discounted monthly membership for accredited high school and university students.",
      durationDays: 30,
      price: 39.99,
      planType: "student",
      benefits: JSON.stringify(["Unlimited gym floor access", "Study lounge Wi-Fi", "Locker room & showers", "Off-peak and weekend access"]),
      maxClassesPerWeek: 0,
      hasTrainerAccess: false,
    },
  ];

  const createdPlans = [];
  for (const p of planData) {
    const plan = await prisma.membershipPlan.upsert({
      where: { code: p.code },
      update: {},
      create: p as any,
    });
    createdPlans.push(plan);
  }

  // 5. Members
  const memberUsersData = [
    {
      email: "sarah@example.com",
      firstName: "Sarah",
      lastName: "Connor",
      phone: "+1 (555) 789-0001",
      goals: "Hypertrophy and Core Strength for Endurance",
      code: "MEM-10001",
      qr: "APEX-MEM10001-QR2026-A1B2C3",
      coins: 450,
      planIndex: 2, // Quarterly Pro
    },
    {
      email: "alex@example.com",
      firstName: "Alex",
      lastName: "Mercer",
      phone: "+1 (555) 789-0002",
      goals: "Fat Loss and Athletic Cardiovascular Conditioning",
      code: "MEM-10002",
      qr: "APEX-MEM10002-QR2026-D4E5F6",
      coins: 220,
      planIndex: 1, // Monthly
    },
    {
      email: "jordan@example.com",
      firstName: "Jordan",
      lastName: "Lee",
      phone: "+1 (555) 789-0003",
      goals: "Powerlifting PRs (Squat, Bench, Deadlift)",
      code: "MEM-10003",
      qr: "APEX-MEM10003-QR2026-G7H8I9",
      coins: 680,
      planIndex: 3, // Annual
    },
  ];

  const createdMembers = [];
  for (const m of memberUsersData) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        passwordHash,
        role: "member",
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        status: "active",
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.firstName}`,
      },
    });

    const member = await prisma.member.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        memberCode: m.code,
        qrCodeToken: m.qr,
        fitnessGoals: m.goals,
        rewardCoins: m.coins,
      },
    });

    // Create active membership
    const chosenPlan = createdPlans[m.planIndex];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 15);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + chosenPlan.durationDays);

    await prisma.membership.create({
      data: {
        memberId: member.id,
        planId: chosenPlan.id,
        startDate,
        endDate,
        status: "active",
        autoRenew: true,
      },
    });

    // Seed recent attendance
    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      const checkInTime = new Date();
      checkInTime.setDate(checkInTime.getDate() - dayOffset * 2);
      checkInTime.setHours(17, 30, 0);

      const checkOutTime = new Date(checkInTime);
      checkOutTime.setMinutes(checkOutTime.getMinutes() + 65);

      await prisma.attendance.create({
        data: {
          memberId: member.id,
          checkInTime,
          checkOutTime,
          checkInMethod: "qr",
          notes: "Session duration: 65 mins",
        },
      });
    }

    // Seed body measurements
    const initialDate = new Date();
    initialDate.setDate(initialDate.getDate() - 60);
    await prisma.bodyMeasurement.create({
      data: {
        memberId: member.id,
        recordedDate: initialDate,
        weightKg: 78.5,
        heightCm: 175.0,
        bmi: 25.63,
        bodyFatPercentage: 21.0,
        muscleMassKg: 58.2,
        waistCm: 84.0,
        chestCm: 101.0,
        armCm: 36.5,
        notes: "Baseline measurement at gym enrollment",
      },
    });

    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 2);
    await prisma.bodyMeasurement.create({
      data: {
        memberId: member.id,
        recordedDate: currentDate,
        weightKg: 74.2,
        heightCm: 175.0,
        bmi: 24.23,
        bodyFatPercentage: 17.5,
        muscleMassKg: 60.1,
        waistCm: 79.5,
        chestCm: 103.5,
        armCm: 38.0,
        notes: "Visible abdominal definition and improved arm peak.",
      },
    });

    // Seed payment record
    await prisma.payment.create({
      data: {
        transactionId: `TXN-${Date.now().toString(36)}-${m.code}`,
        invoiceNumber: `INV-2026-${m.code}`,
        memberId: member.id,
        amount: chosenPlan.price,
        netAmount: chosenPlan.price,
        currency: "USD",
        paymentMethod: "credit_card",
        paymentStatus: "completed",
        paymentType: "membership",
        paidAt: startDate,
      },
    });

    // Seed AI Activity Score
    await prisma.aiActivityScore.create({
      data: {
        memberId: member.id,
        score: 88,
        attendanceScore: 92,
        workoutScore: 85,
        consistencyScore: 90,
        riskLevel: "low",
        insights: "High performance athlete! Consistency has improved 15% over the past 30 days.",
      },
    });

    createdMembers.push(member);
  }

  // 6. Group Classes
  const classTomorrow = new Date();
  classTomorrow.setDate(classTomorrow.getDate() + 1);

  await prisma.gymClass.createMany({
    data: [
      {
        name: "Olympic Barbell & Power Clinic",
        description: "Technical coaching on snatch, clean & jerk, and posterior chain explosive power.",
        category: "strength",
        trainerId: trainer1.id,
        room: "Barbell Arena",
        maxCapacity: 12,
        startTime: "09:00",
        endTime: "10:15",
        scheduleDate: classTomorrow,
        durationMinutes: 75,
      },
      {
        name: "Tactical Metabolic HIIT",
        description: "High-octane interval conditioning featuring kettlebells, assault bikes, and rowing intervals.",
        category: "hiit",
        trainerId: trainer2.id,
        room: "Studio B",
        maxCapacity: 18,
        startTime: "18:00",
        endTime: "19:00",
        scheduleDate: classTomorrow,
        durationMinutes: 60,
      },
      {
        name: "Athletic Mobility & Hip Recovery",
        description: "Deep tissue myofascial release, joint decompression, and mobility drills for lifters.",
        category: "yoga",
        trainerId: trainer2.id,
        room: "Zen Studio",
        maxCapacity: 20,
        startTime: "19:30",
        endTime: "20:30",
        scheduleDate: classTomorrow,
        durationMinutes: 60,
      },
    ],
  });

  // 7. Rewards Catalog
  await prisma.reward.createMany({
    data: [
      {
        title: "Apex Stealth Shaker Bottle (800ml)",
        description: "BPA-free matte black stainless steel shaker with surgical grade mixing whisk.",
        pointsCost: 150,
        category: "merchandise",
        stockQuantity: 45,
      },
      {
        title: "Heavy Duty Lifting Wrist Straps",
        description: "Reinforced cotton padded straps engineered for maximal pulling grip on deadlifts.",
        pointsCost: 200,
        category: "merchandise",
        stockQuantity: 30,
      },
      {
        title: "1-on-1 Personal Training Session Voucher",
        description: "60-minute private personal coaching session with any senior trainer of your choice.",
        pointsCost: 500,
        category: "free_session",
        stockQuantity: 20,
      },
      {
        title: "20% Off Next Membership Renewal",
        description: "Apply an instant 20% discount coupon towards any upcoming membership term.",
        pointsCost: 350,
        category: "discount",
        stockQuantity: 100,
      },
    ],
  });

  console.log("Database seeded successfully with realistic fitness gym data!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
