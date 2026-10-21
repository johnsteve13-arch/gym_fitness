import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting clean database seeding for Apex Iron Fitness Platform...");

  // 1. Gym Settings
  await prisma.gymSetting.upsert({
    where: { id: "default" },
    update: {
      currency: "PHP",
    },
    create: {
      id: "default",
      gymName: "Apex Iron Athletic Club",
      tagline: "World-Class Athletic Performance, Recovery & Wellness",
      address: "100 Grand Olympic Boulevard, Suite 500, Metro City, NY 10001",
      phone: "+63 (917) 555-APEX",
      email: "concierge@apexfitness.com",
      currency: "PHP",
      taxRate: 8.875,
      unpaidBookingTimeoutMinutes: 30,
      gracePeriodDays: 7,
    },
  });

  // 2. Admin User Provisioning - Safe Seed Strategy (never overwrite existing real admin password)
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@apexfitness.com" },
  });

  if (!existingAdmin) {
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "Password@123";
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        email: "admin@apexfitness.com",
        passwordHash,
        role: "super_admin",
        firstName: "Apex",
        lastName: "Admin",
        phone: "+639170000000",
        status: "active",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      },
    });
    console.log("Initial super-administrator account created (admin@apexfitness.com).");
  } else {
    console.log("Administrator account exists; preserving existing secure credentials without reset.");
  }

  // 3. Membership Plans (Available for athlete registration)
  const planData = [
    {
      name: "Day Pass / Trial",
      code: "PLAN-DAY",
      description: "Full single-day gym access including locker rooms and sauna.",
      durationDays: 1,
      price: 200.0,
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
      price: 1500.0,
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
      price: 4200.0,
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
      price: 15000.0,
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
      price: 1000.0,
      planType: "student",
      benefits: JSON.stringify(["Unlimited gym floor access", "Study lounge Wi-Fi", "Locker room & showers", "Off-peak and weekend access"]),
      maxClassesPerWeek: 0,
      hasTrainerAccess: false,
    },
  ];

  for (const p of planData) {
    await prisma.membershipPlan.upsert({
      where: { code: p.code },
      update: {
        price: p.price,
        description: p.description,
      },
      create: p as any,
    });
  }

  // 4. Rewards Catalog
  const rewardData = [
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
  ];

  for (const r of rewardData) {
    const existing = await prisma.reward.findFirst({ where: { title: r.title } });
    if (!existing) {
      await prisma.reward.create({ data: r as any });
    }
  }

  console.log("Database seeded successfully with clean initial state (Admin only, ready for real registrations)!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
