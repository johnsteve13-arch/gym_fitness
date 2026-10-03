export type UserRole = "super_admin" | "admin" | "trainer" | "member";
export type AccountStatus = "active" | "suspended" | "inactive";
export type MembershipStatus = "active" | "expired" | "frozen" | "cancelled" | "pending";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "unpaid" | "pending" | "completed" | "failed" | "refunded";
export type PaymentType = "membership" | "trainer_session" | "class" | "merchandise" | "addon";
export type ClassBookingStatus = "booked" | "attended" | "cancelled" | "waitlisted";
export type RiskLevel = "low" | "moderate" | "high";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: AccountStatus;
  createdAt?: string;
  member?: Member | null;
  trainer?: Trainer | null;
}

export interface Member {
  id: string;
  userId: string;
  memberCode: string;
  qrCodeToken: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  address?: string | null;
  fitnessGoals?: string | null;
  rewardCoins: number;
  notes?: string | null;
  user?: User;
  memberships?: Membership[];
  aiActivityScores?: AiActivityScore[];
}

export interface Trainer {
  id: string;
  userId: string;
  specialization: string;
  bio?: string | null;
  experienceYears: number;
  hourlyRate: number | string;
  rating: number | string;
  maxClients: number;
  user?: User;
}

export interface MembershipPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  durationDays: number;
  price: number | string;
  planType: string;
  benefits: string; // JSON array
  maxClassesPerWeek: number;
  hasTrainerAccess: boolean;
  isActive: boolean;
}

export interface Membership {
  id: string;
  memberId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  autoRenew: boolean;
  freezeStart?: string | null;
  freezeEnd?: string | null;
  gracePeriodEnd?: string | null;
  notes?: string | null;
  plan?: MembershipPlan;
}

export interface Attendance {
  id: string;
  memberId: string;
  checkInTime: string;
  checkOutTime?: string | null;
  checkInMethod: string;
  notes?: string | null;
  member?: Member;
}

export interface WorkoutProgram {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  goal: string;
  durationWeeks: number;
  trainer?: { user: { firstName: string; lastName: string } };
  exercises?: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  dayNumber: number;
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  reps: number;
  weightTargetKg?: number | null;
  durationSeconds?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface WorkoutLog {
  id: string;
  memberId: string;
  workoutName: string;
  date: string;
  durationMinutes: number;
  caloriesBurned?: number | null;
  rating?: number | null;
  overallNotes?: string | null;
  entries?: WorkoutLogEntry[];
}

export interface WorkoutLogEntry {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  setNumber: number;
  repsCompleted: number;
  weightKg?: number | null;
  isPersonalRecord: boolean;
  notes?: string | null;
}

export interface BodyMeasurement {
  id: string;
  memberId: string;
  recordedDate: string;
  weightKg: number | string;
  heightCm: number | string;
  bmi: number | string;
  bodyFatPercentage?: number | string | null;
  muscleMassKg?: number | string | null;
  waistCm?: number | string | null;
  chestCm?: number | string | null;
  armCm?: number | string | null;
  notes?: string | null;
}

export interface TrainerBooking {
  id: string;
  memberId: string;
  trainerId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  price: number | string;
  notes?: string | null;
  member?: Member;
  trainer?: Trainer;
}

export interface GymClass {
  id: string;
  name: string;
  description: string;
  category: string;
  trainerId: string;
  room: string;
  maxCapacity: number;
  startTime: string;
  endTime: string;
  scheduleDate: string;
  durationMinutes: number;
  trainer?: Trainer;
  bookings?: ClassBooking[];
}

export interface ClassBooking {
  id: string;
  classId: string;
  memberId: string;
  status: ClassBookingStatus;
  waitlistPosition?: number | null;
  bookedAt: string;
  class?: GymClass;
  member?: Member;
}

export interface Payment {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  memberId: string;
  amount: number | string;
  discountAmount?: number | string;
  netAmount: number | string;
  currency: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentType: PaymentType;
  referenceId?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  createdAt: string;
  member?: Member;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: string;
  stockQuantity: number;
  imageUrl?: string | null;
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

export interface AiActivityScore {
  id: string;
  score: number;
  attendanceScore: number;
  workoutScore: number;
  consistencyScore: number;
  riskLevel: RiskLevel;
  insights: string;
}
