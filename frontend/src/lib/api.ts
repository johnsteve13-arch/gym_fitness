import {
  MOCK_USERS,
  MOCK_PLANS,
  MOCK_TRAINERS,
  MOCK_MEMBERS,
  MOCK_CLASSES,
  MOCK_REWARDS,
  MOCK_ATTENDANCES,
  MOCK_WORKOUT_LOGS,
  MOCK_MEASUREMENTS,
  MOCK_PAYMENTS,
  MOCK_NOTIFICATIONS,
} from "./mockData";
import { User, Member, Trainer, MembershipPlan, GymClass, Reward, Attendance, WorkoutLog, BodyMeasurement, Payment, Notification } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

class ApiClient {
  private token: string | null = null;
  private currentUser: User = MOCK_USERS.admin; // Default to admin for fast demo exploration

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("apex_gym_token");
      const savedUser = localStorage.getItem("apex_gym_user");
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
        } catch {
          // ignore
        }
      }
    }
  }

  setSession(token: string, user: User) {
    this.token = token;
    this.currentUser = user;
    if (typeof window !== "undefined") {
      localStorage.setItem("apex_gym_token", token);
      localStorage.setItem("apex_gym_user", JSON.stringify(user));
    }
  }

  logout() {
    this.token = null;
    this.currentUser = MOCK_USERS.admin;
    if (typeof window !== "undefined") {
      localStorage.removeItem("apex_gym_token");
      localStorage.removeItem("apex_gym_user");
    }
  }

  getCurrentUser(): User {
    return this.currentUser;
  }

  // Fast demo role switcher for comprehensive testing without relogging
  switchDemoRole(role: "super_admin" | "admin" | "trainer" | "member"): User {
    let target = MOCK_USERS.admin;
    if (role === "admin") target = MOCK_USERS.staff;
    else if (role === "trainer") target = MOCK_USERS.trainer;
    else if (role === "member") target = MOCK_USERS.member;

    this.setSession(`mock-jwt-token-${role}`, target);
    return target;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for fast fallback

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } catch (err: any) {
      // In offline/demo mode, log gently and use fallback
      console.warn(`[API] Remote call to ${endpoint} failed (${err.message}). Using local state.`);
      throw err;
    }
  }

  // AUTH
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    try {
      const data = await this.request<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      this.setSession(data.token, data.user);
      return data;
    } catch {
      // Fallback matching mock accounts
      const user = Object.values(MOCK_USERS).find((u) => u.email.toLowerCase() === email.toLowerCase()) || MOCK_USERS.admin;
      const result = { token: `mock-token-${user.role}`, user };
      this.setSession(result.token, result.user);
      return result;
    }
  }

  async register(body: any): Promise<{ token: string; user: User }> {
    try {
      const data = await this.request<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
      this.setSession(data.token, data.user);
      return data;
    } catch {
      const newUser: User = {
        id: `user-${Date.now()}`,
        email: body.email,
        role: "member",
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        status: "active",
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${body.firstName}`,
      };
      this.setSession("mock-token-member", newUser);
      return { token: "mock-token-member", user: newUser };
    }
  }

  async getMe(): Promise<User> {
    try {
      const user = await this.request<User>("/auth/me");
      this.currentUser = user;
      return user;
    } catch {
      return this.currentUser;
    }
  }

  // MEMBERS
  async listMembers(query: { search?: string; status?: string } = {}): Promise<Member[]> {
    try {
      const params = new URLSearchParams();
      if (query.search) params.append("search", query.search);
      if (query.status) params.append("status", query.status);
      return await this.request<Member[]>(`/members?${params.toString()}`);
    } catch {
      let list = [...MOCK_MEMBERS];
      if (query.search) {
        const q = query.search.toLowerCase();
        list = list.filter(
          (m) =>
            m.memberCode.toLowerCase().includes(q) ||
            m.user?.firstName.toLowerCase().includes(q) ||
            m.user?.lastName.toLowerCase().includes(q) ||
            m.user?.email.toLowerCase().includes(q)
        );
      }
      if (query.status) {
        list = list.filter((m) => m.user?.status === query.status);
      }
      return list;
    }
  }

  async getMember(id: string): Promise<Member> {
    try {
      return await this.request<Member>(`/members/${id}`);
    } catch {
      return MOCK_MEMBERS.find((m) => m.id === id || m.memberCode === id) || MOCK_MEMBERS[0];
    }
  }

  async createMember(body: any): Promise<Member> {
    try {
      return await this.request<Member>("/members", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      const newMember: Member = {
        id: `mem-${Date.now()}`,
        userId: `user-${Date.now()}`,
        memberCode: `MEM-${Math.floor(10000 + Math.random() * 90000)}`,
        qrCodeToken: `APEX-MEM-${Date.now()}`,
        fitnessGoals: body.fitnessGoals || "General Athletic Fitness",
        rewardCoins: 100,
        user: {
          id: `user-${Date.now()}`,
          email: body.email,
          role: "member",
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          status: "active",
        },
        memberships: [
          {
            id: `sub-${Date.now()}`,
            memberId: `mem-${Date.now()}`,
            planId: body.planId || MOCK_PLANS[1].id,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
            status: "active",
            autoRenew: true,
            plan: MOCK_PLANS.find((p) => p.id === body.planId) || MOCK_PLANS[1],
          },
        ],
      };
      MOCK_MEMBERS.unshift(newMember);
      return newMember;
    }
  }

  async updateMember(id: string, body: any): Promise<Member> {
    try {
      return await this.request<Member>(`/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } catch {
      const idx = MOCK_MEMBERS.findIndex((m) => m.id === id);
      if (idx !== -1) {
        if (body.status && MOCK_MEMBERS[idx].user) {
          MOCK_MEMBERS[idx].user!.status = body.status;
        }
        return MOCK_MEMBERS[idx];
      }
      return MOCK_MEMBERS[0];
    }
  }

  async deleteMember(id: string): Promise<any> {
    try {
      return await this.request(`/members/${id}`, { method: "DELETE" });
    } catch {
      const idx = MOCK_MEMBERS.findIndex((m) => m.id === id);
      if (idx !== -1) MOCK_MEMBERS.splice(idx, 1);
      return { success: true };
    }
  }

  // MEMBERSHIP PLANS & ACTIONS
  async listPlans(): Promise<MembershipPlan[]> {
    try {
      return await this.request<MembershipPlan[]>("/memberships/plans");
    } catch {
      return MOCK_PLANS;
    }
  }

  async createPlan(body: any): Promise<MembershipPlan> {
    try {
      return await this.request<MembershipPlan>("/memberships/plans", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      const newPlan: MembershipPlan = {
        id: `plan-${Date.now()}`,
        name: body.name,
        code: body.code,
        description: body.description,
        durationDays: Number(body.durationDays),
        price: Number(body.price),
        planType: body.planType || "standard",
        benefits: JSON.stringify(body.benefits || []),
        maxClassesPerWeek: body.maxClassesPerWeek || 0,
        hasTrainerAccess: !!body.hasTrainerAccess,
        isActive: true,
      };
      MOCK_PLANS.push(newPlan);
      return newPlan;
    }
  }

  async extendMembership(id: string, additionalDays: number, notes?: string): Promise<any> {
    try {
      return await this.request(`/memberships/extend/${id}`, {
        method: "POST",
        body: JSON.stringify({ additionalDays, notes }),
      });
    } catch {
      return { success: true, message: `Extended by ${additionalDays} days` };
    }
  }

  async freezeMembership(id: string, durationDays: number, reason?: string): Promise<any> {
    try {
      return await this.request(`/memberships/freeze/${id}`, {
        method: "POST",
        body: JSON.stringify({ durationDays, reason }),
      });
    } catch {
      return { success: true, message: `Membership frozen for ${durationDays} days` };
    }
  }

  async unfreezeMembership(id: string): Promise<any> {
    try {
      return await this.request(`/memberships/unfreeze/${id}`, { method: "POST" });
    } catch {
      return { success: true, message: "Membership activated" };
    }
  }

  async cancelMembership(id: string, reason?: string): Promise<any> {
    try {
      return await this.request(`/memberships/cancel/${id}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    } catch {
      return { success: true, message: "Membership cancelled" };
    }
  }

  // ATTENDANCE & KIOSK
  async verifyAndCheckIn(identifier: string, method: string = "qr"): Promise<any> {
    try {
      return await this.request("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({ identifier, method }),
      });
    } catch {
      // Mock check-in logic
      const member = MOCK_MEMBERS.find(
        (m) =>
          m.memberCode.toLowerCase() === identifier.toLowerCase() ||
          m.qrCodeToken.toLowerCase() === identifier.toLowerCase() ||
          m.user?.email.toLowerCase() === identifier.toLowerCase()
      ) || MOCK_MEMBERS[0];

      const newAtt: Attendance = {
        id: `att-${Date.now()}`,
        memberId: member.id,
        checkInTime: new Date().toISOString(),
        checkInMethod: method,
        member,
      };
      MOCK_ATTENDANCES.unshift(newAtt);
      member.rewardCoins += 15;

      return {
        accessGranted: true,
        message: `Welcome, ${member.user?.firstName}! Access verified.`,
        attendance: newAtt,
        member: {
          id: member.id,
          name: `${member.user?.firstName} ${member.user?.lastName}`,
          memberCode: member.memberCode,
          avatarUrl: member.user?.avatarUrl,
          planName: member.memberships?.[0]?.plan?.name || "Active Membership",
          daysRemaining: 45,
          rewardCoins: member.rewardCoins,
        },
      };
    }
  }

  async checkOut(memberId?: string): Promise<any> {
    try {
      return await this.request("/attendance/check-out", {
        method: "POST",
        body: JSON.stringify({ memberId }),
      });
    } catch {
      return {
        success: true,
        message: "Check-out recorded. Great session!",
        durationMinutes: 65,
      };
    }
  }

  async getAttendanceHistory(): Promise<Attendance[]> {
    try {
      return await this.request<Attendance[]>("/attendance/history");
    } catch {
      return MOCK_ATTENDANCES;
    }
  }

  async getPeakHours(): Promise<{ hour: string; visits: number }[]> {
    try {
      return await this.request<{ hour: string; visits: number }[]>("/attendance/peak-hours");
    } catch {
      return [
        { hour: "06:00", visits: 18 },
        { hour: "07:00", visits: 34 },
        { hour: "08:00", visits: 42 },
        { hour: "09:00", visits: 25 },
        { hour: "12:00", visits: 38 },
        { hour: "14:00", visits: 19 },
        { hour: "16:00", visits: 45 },
        { hour: "17:00", visits: 78 },
        { hour: "18:00", visits: 92 },
        { hour: "19:00", visits: 84 },
        { hour: "20:00", visits: 51 },
        { hour: "21:00", visits: 27 },
      ];
    }
  }

  // WORKOUTS
  async listWorkoutLogs(): Promise<WorkoutLog[]> {
    try {
      return await this.request<WorkoutLog[]>("/workouts/logs");
    } catch {
      return MOCK_WORKOUT_LOGS;
    }
  }

  async logWorkout(body: any): Promise<any> {
    try {
      return await this.request("/workouts/logs", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      const newLog: WorkoutLog = {
        id: `wlog-${Date.now()}`,
        memberId: "mem-1",
        workoutName: body.workoutName,
        date: new Date().toISOString(),
        durationMinutes: body.durationMinutes,
        caloriesBurned: body.caloriesBurned || 400,
        rating: body.rating || 5,
        overallNotes: body.overallNotes,
        entries: body.entries || [],
      };
      MOCK_WORKOUT_LOGS.unshift(newLog);
      return { log: newLog, prsAchieved: 1, rewardCoinsEarned: 45 };
    }
  }

  // MEASUREMENTS
  async getMeasurements(): Promise<{ initial: any; current: any; history: BodyMeasurement[]; weightChangeKg: number; bmiChange: number }> {
    try {
      return await this.request("/measurements/history");
    } catch {
      return {
        initial: MOCK_MEASUREMENTS[0],
        current: MOCK_MEASUREMENTS[1],
        history: MOCK_MEASUREMENTS,
        weightChangeKg: -4.3,
        bmiChange: -1.4,
      };
    }
  }

  async recordMeasurement(body: any): Promise<BodyMeasurement> {
    try {
      return await this.request("/measurements", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      const heightM = (body.heightCm || 175) / 100;
      const bmi = Number((body.weightKg / (heightM * heightM)).toFixed(2));
      const newM: BodyMeasurement = {
        id: `bm-${Date.now()}`,
        memberId: "mem-1",
        recordedDate: new Date().toISOString(),
        weightKg: body.weightKg,
        heightCm: body.heightCm,
        bmi,
        bodyFatPercentage: body.bodyFatPercentage,
        muscleMassKg: body.muscleMassKg,
        waistCm: body.waistCm,
        chestCm: body.chestCm,
        armCm: body.armCm,
        notes: body.notes,
      };
      MOCK_MEASUREMENTS.push(newM);
      return newM;
    }
  }

  // CLASSES
  async listClasses(): Promise<GymClass[]> {
    try {
      return await this.request<GymClass[]>("/classes");
    } catch {
      return MOCK_CLASSES;
    }
  }

  async bookClass(classId: string): Promise<any> {
    try {
      return await this.request(`/classes/${classId}/book`, { method: "POST" });
    } catch {
      return { status: "booked", message: "Class reservation confirmed!" };
    }
  }

  async cancelClassBooking(classId: string): Promise<any> {
    try {
      return await this.request(`/classes/${classId}/cancel`, { method: "POST" });
    } catch {
      return { success: true, message: "Class booking cancelled." };
    }
  }

  // TRAINERS & BOOKINGS
  async listTrainers(): Promise<Trainer[]> {
    try {
      return await this.request<Trainer[]>("/bookings/trainers");
    } catch {
      return MOCK_TRAINERS;
    }
  }

  async bookTrainer(body: any): Promise<any> {
    try {
      return await this.request("/bookings", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      return { success: true, message: "Trainer session booked. Confirmed in schedule." };
    }
  }

  // PAYMENTS & BILLING
  async listPayments(): Promise<Payment[]> {
    try {
      return await this.request<Payment[]>("/payments");
    } catch {
      return MOCK_PAYMENTS;
    }
  }

  async processPayment(body: any): Promise<Payment> {
    try {
      return await this.request<Payment>("/payments/process", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      const newPay: Payment = {
        id: `pay-${Date.now()}`,
        transactionId: `TXN-${Date.now().toString(36).toUpperCase()}`,
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        memberId: body.memberId || "mem-1",
        amount: body.amount,
        netAmount: body.amount - (body.discountAmount || 0),
        currency: "PHP",
        paymentMethod: body.paymentMethod || "credit_card",
        paymentStatus: "completed",
        paymentType: body.paymentType || "membership",
        createdAt: new Date().toISOString(),
        notes: body.notes || "Online Payment",
      };
      MOCK_PAYMENTS.unshift(newPay);
      return newPay;
    }
  }

  async refundPayment(paymentId: string, reason?: string): Promise<any> {
    try {
      return await this.request(`/payments/${paymentId}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    } catch {
      const p = MOCK_PAYMENTS.find((item) => item.id === paymentId);
      if (p) p.paymentStatus = "refunded";
      return { success: true };
    }
  }

  async getFinancialAnalytics(): Promise<any> {
    try {
      return await this.request("/payments/analytics");
    } catch {
      return {
        totalRevenue: 24950.0,
        todayRevenue: 859.97,
        membershipRevenue: 19800.0,
        trainerRevenue: 3450.0,
        classRevenue: 1200.0,
        otherRevenue: 500.0,
        transactionsCount: 142,
      };
    }
  }

  // REWARDS
  async listRewards(): Promise<Reward[]> {
    try {
      return await this.request<Reward[]>("/rewards");
    } catch {
      return MOCK_REWARDS;
    }
  }

  async redeemReward(rewardId: string): Promise<any> {
    try {
      return await this.request(`/rewards/${rewardId}/redeem`, { method: "POST" });
    } catch {
      const r = MOCK_REWARDS.find((item) => item.id === rewardId);
      if (r) {
        if (MOCK_MEMBERS[0].rewardCoins >= r.pointsCost) {
          MOCK_MEMBERS[0].rewardCoins -= r.pointsCost;
          return { success: true, reward: r, message: `Redeemed ${r.title}!` };
        } else {
          throw new Error("Insufficient coins.");
        }
      }
      return { success: true };
    }
  }

  // NOTIFICATIONS
  async listNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
    try {
      return await this.request("/notifications");
    } catch {
      const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;
      return { notifications: MOCK_NOTIFICATIONS, unreadCount };
    }
  }

  async markAllNotificationsRead(): Promise<any> {
    try {
      return await this.request("/notifications/read-all", { method: "PATCH" });
    } catch {
      MOCK_NOTIFICATIONS.forEach((n) => (n.isRead = true));
      return { success: true };
    }
  }

  // AI COACH & RETENTION
  async getAiCoachAdvice(query: string, focusArea?: string): Promise<any> {
    try {
      return await this.request("/ai/coach-advice", {
        method: "POST",
        body: JSON.stringify({ query, focusArea }),
      });
    } catch {
      const goals = "Hypertrophy and Core Strength";
      return {
        fitnessGoals: goals,
        currentBmi: 24.23,
        disclaimer:
          "⚠️ Disclaimer: This AI Fitness Coach provides athletic and educational recommendations based on logged activity. It is not medical advice or diagnostic service.",
        message: `Based on your goal (${goals}):
• Progressive Overload: Increase working weight on compound movements by 2-5% every 2 weeks.
• Recovery: Ensure 8 hours of sleep and prioritize post-workout hydration with electrolytes.
• Nutrition: Target 1.8g protein per kg of body weight distributed across 3-4 meals.`,
      };
    }
  }

  async getRetentionAlerts(): Promise<any[]> {
    try {
      return await this.request("/ai/retention-alerts");
    } catch {
      return [
        {
          type: "inactivity",
          severity: "high",
          memberId: "mem-4",
          memberName: "Chloe Bennett",
          memberCode: "MEM-10004",
          email: "chloe@example.com",
          phone: "+1 (555) 789-0004",
          daysInactive: 22,
          message: "Member has not visited the gym for 22 days. High churn risk.",
        },
        {
          type: "expiration",
          severity: "high",
          memberId: "mem-2",
          memberName: "Alex Mercer",
          memberCode: "MEM-10002",
          email: "alex@example.com",
          phone: "+1 (555) 789-0002",
          expiryDate: "2026-10-15",
          message: "Membership (Monthly Athlete Pass) expires in 12 days. Auto-renewal is OFF.",
        },
      ];
    }
  }

  // ANALYTICS
  async getAnalyticsOverview(): Promise<any> {
    try {
      return await this.request("/analytics/overview");
    } catch {
      return {
        members: { total: 342, active: 310, expired: 24, suspended: 8, retentionRate: 91 },
        attendance: { today: 84 },
        revenue: { total: 48920.0, today: 1240.0 },
        operations: { trainers: 8, classes: 14, workoutsThisMonth: 612 },
      };
    }
  }

  async getRevenueTrends(): Promise<{ month: string; revenue: number }[]> {
    try {
      return await this.request("/analytics/revenue-trends");
    } catch {
      return [
        { month: "May 2026", revenue: 6400 },
        { month: "Jun 2026", revenue: 7800 },
        { month: "Jul 2026", revenue: 8900 },
        { month: "Aug 2026", revenue: 11200 },
        { month: "Sep 2026", revenue: 14600 },
        { month: "Oct 2026", revenue: 17200 },
      ];
    }
  }

  async getAttendanceTrends(): Promise<{ day: string; visits: number }[]> {
    try {
      return await this.request("/analytics/attendance-trends");
    } catch {
      return [
        { day: "Mon", visits: 142 },
        { day: "Tue", visits: 138 },
        { day: "Wed", visits: 155 },
        { day: "Thu", visits: 129 },
        { day: "Fri", visits: 168 },
        { day: "Sat", visits: 182 },
        { day: "Sun", visits: 110 },
      ];
    }
  }
}

export const api = new ApiClient();
