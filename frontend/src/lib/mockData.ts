import {
  User,
  Member,
  Trainer,
  MembershipPlan,
  GymClass,
  Reward,
  Attendance,
  WorkoutLog,
  BodyMeasurement,
  Payment,
  Notification,
} from "../types";

export const MOCK_USERS: Record<string, User> = {
  admin: {
    id: "user-admin",
    email: "admin@apexfitness.com",
    role: "super_admin",
    firstName: "Apex",
    lastName: "Admin",
    phone: "+63 (917) 000-0000",
    status: "active",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  },
};

export const MOCK_PLANS: MembershipPlan[] = [
  {
    id: "plan-trial",
    name: "Day Pass / Trial",
    code: "PLAN-DAY",
    description: "Single-day access to gym facilities, lockers, and dry sauna.",
    durationDays: 1,
    price: 20.0,
    planType: "trial",
    benefits: JSON.stringify(["Full floor access for 24 hours", "Standard locker access", "Free hydration bar"]),
    maxClassesPerWeek: 0,
    hasTrainerAccess: false,
    isActive: true,
  },
  {
    id: "plan-monthly",
    name: "Monthly Athlete Pass",
    code: "PLAN-MONTHLY",
    description: "Flexible monthly training membership with unrestricted access to all strength & cardio areas.",
    durationDays: 30,
    price: 59.99,
    planType: "standard",
    benefits: JSON.stringify(["Unlimited gym floor access", "Locker room & Finnish sauna", "Free mobile app QR check-in", "1 Group class per week"]),
    maxClassesPerWeek: 1,
    hasTrainerAccess: false,
    isActive: true,
  },
  {
    id: "plan-quarterly",
    name: "Quarterly Pro Conditioning",
    code: "PLAN-QUARTERLY",
    description: "Comprehensive 90-day athletic program with included fitness classes and recovery lounge access.",
    durationDays: 90,
    price: 159.99,
    planType: "premium",
    benefits: JSON.stringify(["Unlimited gym access", "Unlimited group classes", "1 Complimentary 1-on-1 PT Session", "Recovery lounge & massage chairs", "2 Guest passes per month"]),
    maxClassesPerWeek: 5,
    hasTrainerAccess: true,
    isActive: true,
  },
  {
    id: "plan-annual",
    name: "Annual All-Access Championship",
    code: "PLAN-ANNUAL",
    description: "The pinnacle 365-day membership. VIP keyless entry, recovery suite, and monthly trainer consultations.",
    durationDays: 365,
    price: 499.99,
    planType: "premium",
    benefits: JSON.stringify(["24/7 VIP keyless QR entry", "Unlimited classes & recovery zone", "Monthly 1-on-1 PT consultation", "10% discount on gym apparel and gear", "Unlimited guest access"]),
    maxClassesPerWeek: 10,
    hasTrainerAccess: true,
    isActive: true,
  },
  {
    id: "plan-student",
    name: "Student Performance Pass",
    code: "PLAN-STUDENT",
    description: "Budget-friendly membership for high school and university students with valid student ID.",
    durationDays: 30,
    price: 39.99,
    planType: "student",
    benefits: JSON.stringify(["Full strength & cardio access", "Study lounge Wi-Fi", "Locker room & showers", "Off-peak and weekend access"]),
    maxClassesPerWeek: 0,
    hasTrainerAccess: false,
    isActive: true,
  },
];

export const MOCK_TRAINERS: Trainer[] = [];

export const MOCK_MEMBERS: Member[] = [];

export const MOCK_CLASSES: GymClass[] = [];

export const MOCK_REWARDS: Reward[] = [
  {
    id: "rew-1",
    title: "Apex Stealth Shaker Bottle (800ml)",
    description: "BPA-free matte black stainless steel shaker with surgical grade mixing whisk.",
    pointsCost: 150,
    category: "merchandise",
    stockQuantity: 45,
    isActive: true,
  },
  {
    id: "rew-2",
    title: "Heavy Duty Lifting Wrist Straps",
    description: "Reinforced cotton padded straps engineered for maximal pulling grip on heavy lifts.",
    pointsCost: 200,
    category: "merchandise",
    stockQuantity: 30,
    isActive: true,
  },
  {
    id: "rew-3",
    title: "1-on-1 Personal Training Session Voucher",
    description: "60-minute private personal coaching session with any senior trainer of your choice.",
    pointsCost: 500,
    category: "free_session",
    stockQuantity: 20,
    isActive: true,
  },
  {
    id: "rew-4",
    title: "20% Off Next Membership Renewal",
    description: "Apply an instant 20% discount coupon towards any upcoming membership term.",
    pointsCost: 350,
    category: "discount",
    stockQuantity: 100,
    isActive: true,
  },
  {
    id: "rew-5",
    title: "Apex Elite Performance Zip Hoodie",
    description: "Athletic taper breathable fleece hoodie with laser-cut ventilation and embroidered logo.",
    pointsCost: 800,
    category: "merchandise",
    stockQuantity: 15,
    isActive: true,
  },
];

export const MOCK_ATTENDANCES: Attendance[] = [];

export const MOCK_WORKOUT_LOGS: WorkoutLog[] = [];

export const MOCK_MEASUREMENTS: BodyMeasurement[] = [];

export const MOCK_PAYMENTS: Payment[] = [];

export const MOCK_NOTIFICATIONS: Notification[] = [];
