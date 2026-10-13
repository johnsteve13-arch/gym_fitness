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
import { generateSpecificAdvice } from "./ai-advice";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

class ApiClient {
  private token: string | null = null;
  private currentUser: User | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("apex_gym_token");
      const savedUser = localStorage.getItem("apex_gym_user");
      if (savedUser && this.token) {
        try {
          this.currentUser = JSON.parse(savedUser);
        } catch {
          this.currentUser = null;
        }
      } else {
        this.currentUser = null;
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
    this.currentUser = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("apex_gym_token");
      localStorage.removeItem("apex_gym_user");
    }
  }

  getCurrentUser(): User | null {
    if (typeof window !== "undefined" && !this.currentUser) {
      const savedUser = localStorage.getItem("apex_gym_user");
      const savedToken = localStorage.getItem("apex_gym_token");
      if (savedUser && savedToken) {
        try {
          this.currentUser = JSON.parse(savedUser);
          this.token = savedToken;
        } catch {
          this.currentUser = null;
        }
      }
    }
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
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
      // Fallback matching mock accounts or registered members/trainers
      let user = Object.values(MOCK_USERS).find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        const storedMembers = this.getStoredMembers();
        const foundM = storedMembers.find((m) => m.user?.email.toLowerCase() === email.toLowerCase());
        if (foundM?.user) user = foundM.user;
      }
      if (!user) {
        const storedTrainers = this.getStoredTrainers();
        const foundT = storedTrainers.find((t) => t.user?.email.toLowerCase() === email.toLowerCase());
        if (foundT?.user) user = foundT.user;
      }
      if (!user) {
        if (email.toLowerCase().includes("admin")) {
          user = MOCK_USERS.admin;
        } else {
          throw new Error("Invalid credentials. Please register your account at /register.");
        }
      }
      const result = { token: `mock-token-${user.role}`, user };
      this.setSession(result.token, result.user);
      return result;
    }
  }

  getStoredMembers(): Member[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("apex_registered_members");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveStoredMember(member: Member) {
    if (typeof window === "undefined") return;
    try {
      const existing = this.getStoredMembers();
      const updated = [member, ...existing.filter((m) => m.user?.email.toLowerCase() !== member.user?.email.toLowerCase())];
      localStorage.setItem("apex_registered_members", JSON.stringify(updated));
    } catch {}
  }

  getStoredTrainers(): Trainer[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("apex_registered_trainers");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveStoredTrainer(trainer: Trainer) {
    if (typeof window === "undefined") return;
    try {
      const existing = this.getStoredTrainers();
      const updated = [trainer, ...existing.filter((t) => t.user?.email.toLowerCase() !== trainer.user?.email.toLowerCase())];
      localStorage.setItem("apex_registered_trainers", JSON.stringify(updated));

      // If re-adding a previously deleted trainer, remove from deleted IDs
      const deletedIds = this.getDeletedTrainerIds().filter(
        (id) =>
          id !== trainer.id.toLowerCase() &&
          id !== trainer.userId?.toLowerCase() &&
          id !== trainer.user?.id?.toLowerCase() &&
          id !== trainer.user?.email.toLowerCase()
      );
      localStorage.setItem("apex_deleted_trainer_ids", JSON.stringify(deletedIds));
    } catch {}
  }

  getDeletedTrainerIds(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("apex_deleted_trainer_ids");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  deleteStoredTrainer(idOrEmail: string) {
    if (typeof window === "undefined") return;
    try {
      const existing = this.getStoredTrainers();
      const targetLower = idOrEmail.toLowerCase();
      const updated = existing.filter(
        (t) =>
          t.id.toLowerCase() !== targetLower &&
          t.userId?.toLowerCase() !== targetLower &&
          t.user?.id?.toLowerCase() !== targetLower &&
          t.user?.email.toLowerCase() !== targetLower
      );
      localStorage.setItem("apex_registered_trainers", JSON.stringify(updated));

      const deletedIds = this.getDeletedTrainerIds();
      if (!deletedIds.includes(targetLower)) {
        deletedIds.push(targetLower);
        localStorage.setItem("apex_deleted_trainer_ids", JSON.stringify(deletedIds));
      }

      // Also clean up bookings for this trainer
      const bookings = this.getStoredBookings();
      const cleanBookings = bookings.filter(
        (b) =>
          b.trainerId?.toLowerCase() !== targetLower &&
          b.trainerUserId?.toLowerCase() !== targetLower &&
          b.trainer?.id?.toLowerCase() !== targetLower &&
          b.trainer?.email?.toLowerCase() !== targetLower &&
          b.trainer?.user?.email?.toLowerCase() !== targetLower
      );
      localStorage.setItem("apex_trainer_bookings", JSON.stringify(cleanBookings));
    } catch {}
  }

  getStoredBookings(): any[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("apex_trainer_bookings");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveStoredBooking(booking: any) {
    if (typeof window === "undefined") return;
    try {
      const existing = this.getStoredBookings();
      const updated = [booking, ...existing.filter((b) => b.id !== booking.id)];
      localStorage.setItem("apex_trainer_bookings", JSON.stringify(updated));
    } catch {}
  }

  async register(body: any): Promise<{ token: string; user: User }> {
    const role = body.role === "trainer" ? "trainer" : "member";

    let result: { token: string; user: User };
    try {
      result = await this.request<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
      this.setSession(result.token, result.user);
    } catch {
      const newUser: User = {
        id: `user-${Date.now()}`,
        email: body.email,
        role: role as any,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        status: "active",
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${body.firstName}`,
      };
      result = { token: `mock-token-${role}`, user: newUser };
      this.setSession(`mock-token-${role}`, newUser);
    }

    // Direct input of newly joined members into the Admin Roster & Profile directory
    if (role === "member") {
      const plan = MOCK_PLANS.find((p) => p.id === body.planId) || MOCK_PLANS[1];
      const memberRecord: Member = {
        id: (result.user as any).member?.id || `mem-${Date.now()}`,
        userId: result.user.id,
        memberCode: (result.user as any).member?.memberCode || `MEM-${Math.floor(10000 + Math.random() * 90000)}`,
        qrCodeToken: (result.user as any).member?.qrCodeToken || `APEX-QR-${Date.now()}`,
        dateOfBirth: "1995-06-15",
        gender: "other",
        emergencyContactName: "Self-Registered Athlete",
        emergencyContactPhone: body.phone || "+63 (900) 000-0000",
        rewardCoins: 100,
        fitnessGoals: body.fitnessGoals || "Athletic Conditioning and Hypertrophy",
        user: {
          id: result.user.id,
          email: result.user.email,
          role: "member",
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          phone: result.user.phone || body.phone,
          status: "active",
          createdAt: new Date().toISOString(),
        },
        memberships: [
          {
            id: `sub-${Date.now()}`,
            memberId: (result.user as any).member?.id || `mem-${Date.now()}`,
            planId: plan.id,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + (plan.durationDays || 30) * 86400000).toISOString(),
            status: "active",
            autoRenew: true,
            plan,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      this.saveStoredMember(memberRecord);
      MOCK_MEMBERS.unshift(memberRecord);
    } else if (role === "trainer") {
      const trainerRecord: Trainer = {
        id: (result.user as any).trainer?.id || `trainer-${Date.now()}`,
        userId: result.user.id,
        specialization: body.specialization || "Strength & Conditioning",
        bio: body.bio || "Certified personal coach dedicated to helping athletes achieve peak results.",
        hourlyRate: parseFloat(body.hourlyRate) || 750,
        rating: 5.0,
        experienceYears: parseInt(body.experienceYears, 10) || 3,
        maxClients: 20,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: "trainer",
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          phone: result.user.phone || body.phone,
          status: "active",
          avatarUrl: `https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150`,
          createdAt: new Date().toISOString(),
        },
      };

      this.saveStoredTrainer(trainerRecord);
      MOCK_TRAINERS.unshift(trainerRecord);
    }

    return result;
  }

  async getMe(): Promise<User | null> {
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
    const stored = this.getStoredMembers();
    let members: Member[] = [];

    try {
      const params = new URLSearchParams();
      if (query.search) params.append("search", query.search);
      if (query.status) params.append("status", query.status);
      const apiMembers = await this.request<Member[]>(`/members?${params.toString()}`);
      
      const storedNotPresent = stored.filter(
        (sm) => !apiMembers.some((am) => am.user?.email.toLowerCase() === sm.user?.email.toLowerCase())
      );
      members = [...storedNotPresent, ...apiMembers];
    } catch {
      const storedNotPresent = stored.filter(
        (sm) => !MOCK_MEMBERS.some((mm) => mm.user?.email.toLowerCase() === sm.user?.email.toLowerCase())
      );
      members = [...storedNotPresent, ...MOCK_MEMBERS];
    }

    if (query.search) {
      const q = query.search.toLowerCase();
      members = members.filter(
        (m) =>
          m.memberCode.toLowerCase().includes(q) ||
          m.user?.firstName.toLowerCase().includes(q) ||
          m.user?.lastName.toLowerCase().includes(q) ||
          m.user?.email.toLowerCase().includes(q)
      );
    }

    if (query.status) {
      members = members.filter((m) => m.user?.status === query.status);
    }

    return members;
  }

  async getMember(id: string): Promise<Member | undefined> {
    try {
      return await this.request<Member>(`/members/${id}`);
    } catch {
      const stored = this.getStoredMembers();
      const allMembers = [...stored, ...MOCK_MEMBERS];
      return (
        allMembers.find(
          (m) =>
            m.id === id ||
            m.memberCode === id ||
            m.userId === id ||
            m.user?.id === id ||
            m.user?.email.toLowerCase() === id.toLowerCase()
        ) ||
        allMembers[0] ||
        undefined
      );
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
      this.saveStoredMember(newMember);
      return newMember;
    }
  }

  async updateMember(id: string, body: any): Promise<Member | undefined> {
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
      const stored = this.getStoredMembers();
      const sIdx = stored.findIndex((m) => m.id === id);
      if (sIdx !== -1) {
        if (body.status && stored[sIdx].user) {
          stored[sIdx].user!.status = body.status;
          localStorage.setItem("apex_registered_members", JSON.stringify(stored));
        }
        return stored[sIdx];
      }
      return MOCK_MEMBERS[0] || stored[0];
    }
  }

  async deleteMember(id: string): Promise<any> {
    try {
      return await this.request(`/members/${id}`, { method: "DELETE" });
    } catch {
      const idx = MOCK_MEMBERS.findIndex((m) => m.id === id);
      if (idx !== -1) MOCK_MEMBERS.splice(idx, 1);
      const stored = this.getStoredMembers();
      const sIdx = stored.findIndex((m) => m.id === id);
      if (sIdx !== -1) {
        stored.splice(sIdx, 1);
        localStorage.setItem("apex_registered_members", JSON.stringify(stored));
      }
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
      // Offline / client fallback check-in logic
      const stored = this.getStoredMembers();
      const allMembers = [...stored, ...MOCK_MEMBERS];
      const member = allMembers.find(
        (m) =>
          m.memberCode.toLowerCase() === identifier.toLowerCase() ||
          m.qrCodeToken.toLowerCase() === identifier.toLowerCase() ||
          m.user?.email.toLowerCase() === identifier.toLowerCase()
      );

      if (!member) {
        return {
          accessGranted: false,
          message: "No registered athlete matches this code. Please sign up at /register first.",
        };
      }

      const newAtt: Attendance = {
        id: `att-${Date.now()}`,
        memberId: member.id,
        checkInTime: new Date().toISOString(),
        checkInMethod: method,
        member,
      };
      MOCK_ATTENDANCES.unshift(newAtt);
      member.rewardCoins = (member.rewardCoins || 0) + 15;
      if (stored.length > 0) {
        localStorage.setItem("apex_registered_members", JSON.stringify(stored));
      }

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
          daysRemaining: 30,
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
    const stored = this.getStoredTrainers();
    const deletedIds = this.getDeletedTrainerIds();
    const isNotDeleted = (t: Trainer) => {
      const id = (t.id || "").toLowerCase();
      const uid = (t.userId || t.user?.id || "").toLowerCase();
      const email = (t.user?.email || "").toLowerCase();
      return (
        !deletedIds.includes(id) &&
        !deletedIds.includes(uid) &&
        !deletedIds.includes(email)
      );
    };

    let allTrainers: Trainer[] = [];
    try {
      const apiTrainers = await this.request<Trainer[]>("/bookings/trainers");
      const storedNotPresent = stored.filter(
        (st) => !apiTrainers.some((at) => at.user?.email.toLowerCase() === st.user?.email.toLowerCase())
      );
      allTrainers = [...storedNotPresent, ...apiTrainers];
    } catch {
      const storedNotPresent = stored.filter(
        (st) => !MOCK_TRAINERS.some((mt) => mt.user?.email.toLowerCase() === st.user?.email.toLowerCase())
      );
      allTrainers = [...storedNotPresent, ...MOCK_TRAINERS];
    }

    return allTrainers.filter(isNotDeleted);
  }

  async createTrainer(body: any): Promise<Trainer> {
    try {
      const res = await this.request<any>("/bookings/trainers", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const trainer: Trainer = res.data || res;
      this.saveStoredTrainer(trainer);
      return trainer;
    } catch {
      const id = `tr-${Date.now()}`;
      const userId = `usr-${Date.now()}`;
      const newTrainer: Trainer = {
        id,
        userId,
        specialization: body.specialization || "Strength & Conditioning",
        bio: body.bio || "Certified fitness specialist dedicated to helping you achieve your athletic potential.",
        experienceYears: Number(body.experienceYears) || 3,
        hourlyRate: Number(body.hourlyRate) || 75.0,
        rating: 5.0,
        maxClients: Number(body.maxClients) || 20,
        createdAt: new Date().toISOString(),
        user: {
          id: userId,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone || "",
          avatarUrl:
            body.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${body.firstName}_${body.lastName}`,
          role: "trainer",
          status: "active",
        },
      };
      this.saveStoredTrainer(newTrainer);
      return newTrainer;
    }
  }

  async deleteTrainer(id: string): Promise<any> {
    try {
      await this.request(`/bookings/trainers/${id}`, { method: "DELETE" });
    } catch {
      // Offline or error fallback
    }
    this.deleteStoredTrainer(id);
    return { success: true, message: "Trainer removed successfully." };
  }

  calculateTrainerCoins(hourlyRate: number | string): number {
    const rate = Number(hourlyRate) || 75;
    if (rate > 200) {
      return Math.round(rate / 5);
    }
    return Math.max(50, Math.round(rate));
  }

  getMemberCoins(memberId?: string): number {
    if (typeof window === "undefined") return 450;
    try {
      const customVal = localStorage.getItem("apex_member_coins");
      if (customVal !== null && !isNaN(parseInt(customVal, 10))) {
        return parseInt(customVal, 10);
      }
      const stored = this.getStoredMembers();
      const currentUser = this.getCurrentUser();
      const m = stored.find(
        (item) =>
          (memberId && item.id === memberId) ||
          item.userId === currentUser?.id ||
          item.user?.email?.toLowerCase() === currentUser?.email?.toLowerCase()
      ) || stored[0];
      if (m && m.rewardCoins !== undefined) {
        return m.rewardCoins;
      }
      return 450;
    } catch {
      return 450;
    }
  }

  setMemberCoins(amount: number, memberId?: string): void {
    if (typeof window === "undefined") return;
    try {
      const sanitized = Math.max(0, amount);
      localStorage.setItem("apex_member_coins", sanitized.toString());
      const stored = this.getStoredMembers();
      const currentUser = this.getCurrentUser();
      const mIdx = stored.findIndex(
        (item) =>
          (memberId && item.id === memberId) ||
          item.userId === currentUser?.id ||
          item.user?.email?.toLowerCase() === currentUser?.email?.toLowerCase()
      );
      if (mIdx !== -1) {
        stored[mIdx].rewardCoins = sanitized;
        localStorage.setItem("apex_registered_members", JSON.stringify(stored));
      }
      if (MOCK_MEMBERS.length > 0) {
        MOCK_MEMBERS[0].rewardCoins = sanitized;
      }
    } catch (e) {
      console.warn("Failed to update coins", e);
    }
  }

  async bookTrainer(body: any): Promise<any> {
    const isCoins = body.paymentMethod === "coins";
    const coinsRequired =
      body.coinsPaid !== undefined
        ? Number(body.coinsPaid)
        : this.calculateTrainerCoins(body.price || 75);

    if (isCoins) {
      const currentCoins = this.getMemberCoins(body.memberId);
      if (currentCoins < coinsRequired) {
        throw new Error(
          `Insufficient coin balance. You have ${currentCoins} coins, but this session requires ${coinsRequired} coins. Please choose cash/card or earn more coins.`
        );
      }
      const newBalance = currentCoins - coinsRequired;
      this.setMemberCoins(newBalance, body.memberId);
    }

    try {
      const res = await this.request<any>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...body,
          paymentMethod: isCoins ? "coins" : (body.paymentMethod || "cash"),
          coinsPaid: isCoins ? coinsRequired : undefined,
        }),
      });
      this.saveStoredBooking(res);
      return res;
    } catch {
      const bookingId = `book-${Date.now()}`;
      const newBooking = {
        id: bookingId,
        memberId: body.memberId,
        trainerId: body.trainerId,
        trainerUserId: body.trainerUserId,
        trainerEmail: body.trainerEmail,
        trainerName: body.trainerName,
        sessionDate: body.sessionDate,
        startTime: body.startTime,
        endTime: body.endTime || "11:00",
        sessionType: body.sessionType || "1-on-1 Fitness Coaching",
        status: "confirmed",
        paymentStatus: "paid",
        paymentMethod: isCoins ? "coins" : (body.paymentMethod || "cash"),
        coinsPaid: isCoins ? coinsRequired : undefined,
        price: body.price || 75.0,
        notes: body.notes || (isCoins ? `Redeemed ${coinsRequired} Coins` : ""),
        createdAt: new Date().toISOString(),
        member: {
          id: body.memberId,
          memberCode: body.memberCode || "MEM-10001",
          user: {
            firstName: body.memberName?.split(" ")[0] || "Athlete",
            lastName: body.memberName?.split(" ").slice(1).join(" ") || "",
            email: body.memberEmail || "",
            phone: body.memberPhone || "",
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${body.memberName || "Athlete"}`,
          },
        },
        trainer: {
          id: body.trainerId,
          userId: body.trainerUserId,
          email: body.trainerEmail,
          user: {
            firstName: body.trainerName?.split(" ")[0] || "Coach",
            lastName: body.trainerName?.split(" ").slice(1).join(" ") || "",
            email: body.trainerEmail || "",
          },
        },
      };
      this.saveStoredBooking(newBooking);

      if (isCoins) {
        MOCK_NOTIFICATIONS.unshift({
          id: `notif-${Date.now()}`,
          userId: body.memberId || "user-member",
          title: "Coins Redeemed for Trainer Session",
          message: `Redeemed ${coinsRequired} Loyalty Coins for 1-on-1 session with ${body.trainerName || "Coach"}. Remaining balance: ${this.getMemberCoins(body.memberId)} coins.`,
          type: "reward",
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        success: true,
        booking: newBooking,
        coinsPaid: isCoins ? coinsRequired : 0,
        remainingCoins: this.getMemberCoins(body.memberId),
        message: isCoins
          ? `Trainer session confirmed! Successfully redeemed ${coinsRequired} coins. Remaining balance: ${this.getMemberCoins(body.memberId)} coins.`
          : "Trainer session booked. Confirmed in schedule.",
      };
    }
  }

  async listBookings(params?: {
    trainerId?: string;
    trainerUserId?: string;
    trainerEmail?: string;
    memberId?: string;
    memberEmail?: string;
  }): Promise<any[]> {
    const stored = this.getStoredBookings();
    try {
      const query = new URLSearchParams();
      if (params?.trainerId) query.append("trainerId", params.trainerId);
      if (params?.memberId) query.append("memberId", params.memberId);
      const apiBookings = await this.request<any[]>(`/bookings?${query.toString()}`);
      const storedNotPresent = stored.filter(
        (sb) => !apiBookings.some((ab) => ab.id === sb.id)
      );
      let all = [...storedNotPresent, ...apiBookings];
      if (params?.trainerId || params?.trainerUserId || params?.trainerEmail) {
        all = all.filter((b) => {
          if (params.trainerId && (b.trainerId === params.trainerId || b.trainer?.id === params.trainerId)) return true;
          if (params.trainerUserId && (b.trainerUserId === params.trainerUserId || b.trainer?.userId === params.trainerUserId || b.trainer?.user?.id === params.trainerUserId)) return true;
          if (params.trainerEmail && (
            b.trainerEmail?.toLowerCase() === params.trainerEmail.toLowerCase() ||
            b.trainer?.email?.toLowerCase() === params.trainerEmail.toLowerCase() ||
            b.trainer?.user?.email?.toLowerCase() === params.trainerEmail.toLowerCase()
          )) return true;
          return false;
        });
      }
      if (params?.memberId || params?.memberEmail) {
        all = all.filter((b) => {
          if (params.memberId && (b.memberId === params.memberId || b.member?.id === params.memberId || b.member?.userId === params.memberId)) return true;
          if (params.memberEmail && (
            b.memberEmail?.toLowerCase() === params.memberEmail.toLowerCase() ||
            b.member?.user?.email?.toLowerCase() === params.memberEmail.toLowerCase()
          )) return true;
          return false;
        });
      }
      return all;
    } catch {
      let all = [...stored];
      if (params?.trainerId || params?.trainerUserId || params?.trainerEmail) {
        all = all.filter((b) => {
          if (params.trainerId && (b.trainerId === params.trainerId || b.trainer?.id === params.trainerId)) return true;
          if (params.trainerUserId && (b.trainerUserId === params.trainerUserId || b.trainer?.userId === params.trainerUserId || b.trainer?.user?.id === params.trainerUserId)) return true;
          if (params.trainerEmail && (
            b.trainerEmail?.toLowerCase() === params.trainerEmail.toLowerCase() ||
            b.trainer?.email?.toLowerCase() === params.trainerEmail.toLowerCase() ||
            b.trainer?.user?.email?.toLowerCase() === params.trainerEmail.toLowerCase()
          )) return true;
          return false;
        });
      }
      if (params?.memberId || params?.memberEmail) {
        all = all.filter((b) => {
          if (params.memberId && (b.memberId === params.memberId || b.member?.id === params.memberId || b.member?.userId === params.memberId)) return true;
          if (params.memberEmail && (
            b.memberEmail?.toLowerCase() === params.memberEmail.toLowerCase() ||
            b.member?.user?.email?.toLowerCase() === params.memberEmail.toLowerCase()
          )) return true;
          return false;
        });
      }
      return all;
    }
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<any> {
    try {
      return await this.request(`/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      const stored = this.getStoredBookings();
      const idx = stored.findIndex((b) => b.id === bookingId);
      if (idx !== -1) {
        stored[idx].status = status;
        localStorage.setItem("apex_trainer_bookings", JSON.stringify(stored));
      }
      return { success: true };
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
        const currentCoins = this.getMemberCoins();
        if (currentCoins >= r.pointsCost) {
          const newBalance = currentCoins - r.pointsCost;
          this.setMemberCoins(newBalance);
          return { success: true, reward: r, message: `Redeemed ${r.title}!` };
        } else {
          throw new Error(`Insufficient coins. You have ${currentCoins} coins, but this reward requires ${r.pointsCost} coins.`);
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
      const user = this.getCurrentUser();
      const memberName = user?.firstName || "Athlete";
      const coins = this.getMemberCoins();
      const goals = "Hypertrophy and Core Strength";
      const advice = generateSpecificAdvice(query, memberName, goals, 24.23, focusArea, coins);

      return {
        fitnessGoals: goals,
        currentBmi: 24.23,
        disclaimer:
          "⚠️ Disclaimer: This AI Fitness Coach provides athletic and educational recommendations based on logged activity. It is not medical advice or diagnostic service.",
        message: advice,
      };
    }
  }

  async getRetentionAlerts(): Promise<any[]> {
    try {
      return await this.request("/ai/retention-alerts");
    } catch {
      return [];
    }
  }

  // ANALYTICS
  async getAnalyticsOverview(): Promise<any> {
    const extraMembers = this.getStoredMembers().length;
    const extraTrainers = this.getStoredTrainers().length;
    try {
      const data = await this.request<any>("/analytics/overview");
      if (data?.members) {
        data.members.total += extraMembers;
        data.members.active += extraMembers;
      }
      if (data?.operations) {
        data.operations.trainers += extraTrainers;
      }
      return data;
    } catch {
      return {
        members: {
          total: extraMembers,
          active: extraMembers,
          expired: 0,
          suspended: 0,
          retentionRate: extraMembers > 0 ? 100 : 0,
        },
        attendance: { today: 0 },
        revenue: { total: extraMembers * 59.99, today: extraMembers > 0 ? 59.99 : 0 },
        operations: { trainers: extraTrainers, classes: 0, workoutsThisMonth: 0 },
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
