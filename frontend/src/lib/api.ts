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
import { User, Member, Membership, Trainer, MembershipPlan, GymClass, Reward, Attendance, WorkoutLog, BodyMeasurement, Payment, Notification, AccountStatus, DispatchedNotification, TrainerUnavailability } from "../types";
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

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("apex_gym_token");
    }
    return this.token;
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
      if (!stored) return [];
      const parsed: Trainer[] = JSON.parse(stored);
      let modified = false;
      parsed.forEach((t) => {
        if (Number(t.hourlyRate) === 500 || t.hourlyRate === "500" || t.hourlyRate === 500) {
          t.hourlyRate = 80;
          modified = true;
        }
      });
      if (modified) {
        localStorage.setItem("apex_registered_trainers", JSON.stringify(parsed));
      }
      return parsed;
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
      if (!stored) return [];
      const parsed: any[] = JSON.parse(stored);
      let modified = false;
      parsed.forEach((b) => {
        if (Number(b.price) === 500 || b.price === "500" || b.price === 500) {
          b.price = 80;
          modified = true;
        }
      });
      if (modified) {
        localStorage.setItem("apex_trainer_bookings", JSON.stringify(parsed));
      }
      return parsed;
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

  getStoredAttendances(): Attendance[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("apex_attendances");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveStoredAttendance(attendance: Attendance) {
    if (typeof window === "undefined") return;
    try {
      const existing = this.getStoredAttendances();
      const updated = [attendance, ...existing.filter((a) => a.id !== attendance.id)];
      localStorage.setItem("apex_attendances", JSON.stringify(updated));
    } catch {}
  }

  getDeclinedConflicts(): any[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("apex_declined_conflicts");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveDeclinedConflict(conflict: any) {
    if (typeof window === "undefined") return;
    try {
      const existing = this.getDeclinedConflicts();
      const updated = [conflict, ...existing.filter((c) => c.id !== conflict.id)];
      localStorage.setItem("apex_declined_conflicts", JSON.stringify(updated.slice(0, 100)));

      // Add Admin Notification
      MOCK_NOTIFICATIONS.unshift({
        id: `notif-conflict-${Date.now()}`,
        userId: "user-admin",
        title: "⚠️ Trainer Booking Declined: Conflict Prevented",
        message: `${conflict.memberName || "Member"} attempted to book ${conflict.trainerName || "Trainer"} on ${conflict.sessionDate} (${conflict.startTime} - ${conflict.endTime}). Request declined: conflict prevented.`,
        type: "system",
        isRead: false,
        createdAt: new Date().toISOString(),
      });
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
        status: role === "trainer" ? "pending" : "active",
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
        rewardCoins: 50,
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
      this.setMemberCoins(50, memberRecord.id);
      MOCK_MEMBERS.unshift(memberRecord);
    } else if (role === "trainer") {
      const trainerRecord: Trainer = {
        id: (result.user as any).trainer?.id || `trainer-${Date.now()}`,
        userId: result.user.id,
        specialization: body.specialization || "Strength & Conditioning",
        bio: body.bio || "Certified personal coach dedicated to helping athletes achieve peak results.",
        hourlyRate: parseFloat(body.hourlyRate) || 80,
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
          status: (result.user.status as AccountStatus) || "pending",
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
      localStorage.setItem("apex_user", JSON.stringify(user));
      return user;
    } catch {
      if (this.currentUser?.role === "trainer") {
        const storedTrainers = this.getStoredTrainers();
        const found = storedTrainers.find(
          (t) =>
            t.userId?.toLowerCase() === this.currentUser?.id.toLowerCase() ||
            t.user?.id?.toLowerCase() === this.currentUser?.id.toLowerCase() ||
            t.user?.email.toLowerCase() === this.currentUser?.email.toLowerCase()
        );
        if (found?.user?.status) {
          this.currentUser.status = found.user.status;
          localStorage.setItem("apex_gym_user", JSON.stringify(this.currentUser));
        }
      }
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
        rewardCoins: 50,
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
      this.setMemberCoins(50, newMember.id);
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
      const stored = this.getStoredMembers();
      const user = this.getCurrentUser();
      const m =
        stored.find(
          (item) =>
            item.userId === user?.id || item.user?.email.toLowerCase() === user?.email.toLowerCase()
        ) || stored[0];
      if (m && m.memberships && m.memberships.length > 0) {
        m.memberships[0].status = "frozen";
        m.memberships[0].freezeStart = new Date().toISOString();
        this.saveStoredMember(m);
      }
      return { success: true, message: `Membership frozen for ${durationDays} days` };
    }
  }

  async unfreezeMembership(id: string): Promise<any> {
    try {
      return await this.request(`/memberships/unfreeze/${id}`, { method: "POST" });
    } catch {
      const stored = this.getStoredMembers();
      const user = this.getCurrentUser();
      const m =
        stored.find(
          (item) =>
            item.userId === user?.id || item.user?.email.toLowerCase() === user?.email.toLowerCase()
        ) || stored[0];
      if (m && m.memberships && m.memberships.length > 0) {
        m.memberships[0].status = "active";
        m.memberships[0].freezeStart = null;
        this.saveStoredMember(m);
      }
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

  async assignOrUpgradeMembership(data: {
    memberId?: string;
    planId: string;
    autoRenew?: boolean;
    paymentMethod?: string;
  }): Promise<any> {
    try {
      return await this.request("/memberships/assign", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch {
      const plans = await this.listPlans();
      const plan = plans.find((p) => p.id === data.planId) || plans[0];
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (plan ? plan.durationDays : 30));

      const newMembership: Membership = {
        id: `sub-${Date.now()}`,
        memberId: data.memberId || "mem-1",
        planId: plan ? plan.id : "plan-monthly",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: "active",
        autoRenew: !!data.autoRenew,
        plan,
      };

      const stored = this.getStoredMembers();
      if (stored.length > 0) {
        const user = this.getCurrentUser();
        const m =
          stored.find(
            (item) =>
              item.userId === user?.id || item.user?.email.toLowerCase() === user?.email.toLowerCase()
          ) || stored[0];
        if (m) {
          m.memberships = [newMembership, ...(m.memberships || []).filter((sub) => sub.id !== newMembership.id)];
          this.saveStoredMember(m);
        }
      }

      return {
        success: true,
        membership: newMembership,
        message: `Membership package switched to ${plan?.name || "Selected Package"}.`,
      };
    }
  }

  async renewMembership(memberId?: string): Promise<any> {
    try {
      return await this.request("/memberships/renew", {
        method: "POST",
        body: JSON.stringify({ memberId }),
      });
    } catch {
      const stored = this.getStoredMembers();
      const user = this.getCurrentUser();
      const m =
        stored.find(
          (item) =>
            item.userId === user?.id || item.user?.email.toLowerCase() === user?.email.toLowerCase()
        ) || stored[0];

      if (m && m.memberships && m.memberships.length > 0) {
        const currentSub = m.memberships[0];
        const plan = currentSub.plan;
        const duration = plan ? plan.durationDays : 30;
        const baseDate = new Date(currentSub.endDate) > new Date() ? new Date(currentSub.endDate) : new Date();
        const newEndDate = new Date(baseDate);
        newEndDate.setDate(newEndDate.getDate() + duration);

        currentSub.endDate = newEndDate.toISOString();
        currentSub.status = "active";
        this.saveStoredMember(m);
        return {
          success: true,
          membership: currentSub,
          message: `Membership package renewed for ${duration} days.`,
        };
      }
      return { success: true, message: "Membership renewed." };
    }
  }

  // ATTENDANCE & KIOSK (TIME IN & TIME OUT)
  async verifyAndCheckIn(identifier: string, method: string = "qr"): Promise<any> {
    try {
      const res = await this.request<any>("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({ identifier, method }),
      });
      if (res?.accessGranted && res?.member?.rewardCoins !== undefined) {
        this.setMemberCoins(res.member.rewardCoins, res.member.id);
      }
      if (res?.attendance) {
        this.saveStoredAttendance(res.attendance);
      }
      return res;
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
        checkOutTime: null,
        checkInMethod: method,
        member,
      };
      MOCK_ATTENDANCES.unshift(newAtt);
      this.saveStoredAttendance(newAtt);

      // Award 8 points for every member attendance
      const updatedCoins = (member.rewardCoins || 0) + 8;
      member.rewardCoins = updatedCoins;
      this.setMemberCoins(updatedCoins, member.id);
      if (stored.length > 0) {
        localStorage.setItem("apex_registered_members", JSON.stringify(stored));
      }

      // Add notification for attendance bonus points (+8 Points)
      MOCK_NOTIFICATIONS.unshift({
        id: `notif-att-${Date.now()}`,
        userId: member.userId,
        title: "Attendance Bonus (+8 Points)",
        message: `Welcome to the gym, ${member.user?.firstName}! You earned 8 reward points for checking in today. Updated balance: ${updatedCoins} points.`,
        type: "reward",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      return {
        accessGranted: true,
        message: `Welcome, ${member.user?.firstName}! Access verified. Time In recorded. +8 Points Earned.`,
        attendance: newAtt,
        member: {
          id: member.id,
          name: `${member.user?.firstName} ${member.user?.lastName}`,
          memberCode: member.memberCode,
          avatarUrl: member.user?.avatarUrl,
          planName: member.memberships?.[0]?.plan?.name || "Active Membership",
          daysRemaining: 30,
          rewardCoins: updatedCoins,
        },
      };
    }
  }

  async checkOut(identifierOrMemberId?: string, attendanceId?: string): Promise<any> {
    try {
      const res = await this.request<any>("/attendance/check-out", {
        method: "POST",
        body: JSON.stringify({
          memberId: identifierOrMemberId,
          identifier: identifierOrMemberId,
          attendanceId,
        }),
      });
      if (res?.attendance) {
        this.saveStoredAttendance(res.attendance);
      }
      return res;
    } catch {
      const storedAtts = this.getStoredAttendances();
      const allAtts = [...storedAtts, ...MOCK_ATTENDANCES];

      // Find member if identifier passed
      const storedMembers = this.getStoredMembers();
      const allMembers = [...storedMembers, ...MOCK_MEMBERS];
      const matchedMember = identifierOrMemberId
        ? allMembers.find(
            (m) =>
              m.id === identifierOrMemberId ||
              m.memberCode.toLowerCase() === identifierOrMemberId.toLowerCase() ||
              m.qrCodeToken.toLowerCase() === identifierOrMemberId.toLowerCase() ||
              m.user?.email.toLowerCase() === identifierOrMemberId.toLowerCase()
          )
        : null;

      const targetMemberId = matchedMember?.id || identifierOrMemberId;

      // Find active open session
      const targetAtt = allAtts.find((a) => {
        if (attendanceId && a.id === attendanceId) return true;
        if (targetMemberId && (a.memberId === targetMemberId || a.member?.id === targetMemberId)) {
          return !a.checkOutTime;
        }
        return false;
      }) || allAtts.find((a) => !a.checkOutTime);

      const now = new Date();
      if (targetAtt) {
        targetAtt.checkOutTime = now.toISOString();
        const durationMinutes = Math.max(
          1,
          Math.round((now.getTime() - new Date(targetAtt.checkInTime).getTime()) / (1000 * 60))
        );
        targetAtt.notes = `Session completed | Duration: ${durationMinutes} mins`;
        this.saveStoredAttendance(targetAtt);

        // Also update in MOCK_ATTENDANCES if present
        const mockIdx = MOCK_ATTENDANCES.findIndex((a) => a.id === targetAtt.id);
        if (mockIdx !== -1) {
          MOCK_ATTENDANCES[mockIdx] = targetAtt;
        }

        return {
          success: true,
          message: `Time Out recorded. Session completed! Total workout duration: ${durationMinutes} minutes. Great job!`,
          durationMinutes,
          attendance: targetAtt,
          member: targetAtt.member || matchedMember,
        };
      }

      return {
        success: true,
        message: "Time Out recorded. Total workout duration: 60 minutes. Great job!",
        durationMinutes: 60,
      };
    }
  }

  async getAttendanceHistory(memberId?: string): Promise<Attendance[]> {
    try {
      const q = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";
      const remote = await this.request<Attendance[]>(`/attendance/history${q}`);
      if (Array.isArray(remote)) return remote;
    } catch {}

    const stored = this.getStoredAttendances();
    const map = new Map<string, Attendance>();
    for (const a of [...stored, ...MOCK_ATTENDANCES]) {
      if (!map.has(a.id)) {
        map.set(a.id, a);
      }
    }
    let list = Array.from(map.values());
    if (memberId) {
      list = list.filter((a) => a.memberId === memberId || a.member?.id === memberId);
    }
    list.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
    return list;
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
  async listTrainers(options?: { includePending?: boolean }): Promise<Trainer[]> {
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
    const queryParam = options?.includePending ? "?includePending=true" : "";
    try {
      const apiTrainers = await this.request<Trainer[]>(`/bookings/trainers${queryParam}`);
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

    const validTrainers = allTrainers.filter(isNotDeleted);

    if (options?.includePending) {
      return validTrainers;
    }

    // Default: only return confirmed/active trainers
    return validTrainers.filter((t) => t.user?.status !== "pending");
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
        hourlyRate: Number(body.hourlyRate) || 80.0,
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

  getTrainerDispatches(emailOrId?: string): DispatchedNotification[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("apex_dispatched_communications");
      const list: DispatchedNotification[] = stored ? JSON.parse(stored) : [];
      if (!emailOrId) return list;
      const lower = emailOrId.toLowerCase();
      return list.filter(
        (d) =>
          d.recipient.toLowerCase().includes(lower) ||
          (d.recipientName && d.recipientName.toLowerCase().includes(lower)) ||
          d.metadata?.trainerId?.toLowerCase() === lower ||
          d.metadata?.trainerUserId?.toLowerCase() === lower
      );
    } catch {
      return [];
    }
  }

  recordDispatchedNotification(dispatch: DispatchedNotification): void {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("apex_dispatched_communications");
      const list: DispatchedNotification[] = stored ? JSON.parse(stored) : [];
      list.unshift(dispatch);
      localStorage.setItem("apex_dispatched_communications", JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to record dispatched notification:", e);
    }
  }

  async approveTrainer(id: string): Promise<any> {
    let apiResponse: any = null;
    try {
      apiResponse = await this.request(`/bookings/trainers/${id}/approve`, { method: "PATCH" });
    } catch {
      // Local fallback
    }

    // Update in locally stored trainers
    const stored = this.getStoredTrainers();
    const targetLower = id.toLowerCase();
    const updated = stored.map((t) => {
      const match =
        t.id.toLowerCase() === targetLower ||
        t.userId?.toLowerCase() === targetLower ||
        t.user?.id?.toLowerCase() === targetLower ||
        t.user?.email.toLowerCase() === targetLower;
      if (match && t.user) {
        return {
          ...t,
          user: {
            ...t.user,
            status: "active" as AccountStatus,
          },
        };
      }
      return t;
    });
    localStorage.setItem("apex_registered_trainers", JSON.stringify(updated));

    // Update MOCK_TRAINERS if present
    const mock = MOCK_TRAINERS.find(
      (t) =>
        t.id.toLowerCase() === targetLower ||
        t.userId?.toLowerCase() === targetLower ||
        t.user?.id?.toLowerCase() === targetLower ||
        t.user?.email.toLowerCase() === targetLower
    );
    if (mock && mock.user) {
      mock.user.status = "active";
    }

    // Identify target trainer profile to extract email and phone
    const matchedTrainer =
      stored.find(
        (t) =>
          t.id.toLowerCase() === targetLower ||
          t.userId?.toLowerCase() === targetLower ||
          t.user?.id?.toLowerCase() === targetLower ||
          t.user?.email.toLowerCase() === targetLower
      ) || mock;

    const trainerName = matchedTrainer?.user
      ? `${matchedTrainer.user.firstName} ${matchedTrainer.user.lastName}`.trim()
      : "Coach";
    const trainerEmail = matchedTrainer?.user?.email || "coach@gmail.com";
    const trainerPhone = matchedTrainer?.user?.phone || "+63 917 555 0192";

    // If current logged-in user matches this trainer, update their session status to active
    const currentUser = this.getCurrentUser();
    if (
      currentUser &&
      (currentUser.id.toLowerCase() === targetLower ||
        currentUser.email.toLowerCase() === targetLower ||
        (currentUser as any).trainer?.id?.toLowerCase() === targetLower)
    ) {
      currentUser.status = "active";
      this.currentUser = currentUser;
      localStorage.setItem("apex_gym_user", JSON.stringify(currentUser));
    }

    // Record multi-channel delivery receipts (Gmail & Phone Number)
    const emailDispatch: DispatchedNotification = {
      id: `disp-email-accept-${Date.now()}`,
      channel: "email",
      recipient: trainerEmail,
      recipientName: trainerName,
      subject: "Apex Iron Fitness — Coach Registration Accepted!",
      content:
        `Congratulations Coach ${trainerName}!\n\n` +
        `Your trainer registration has been officially approved and confirmed by gym administration.\n` +
        `Your trainer dashboard is now fully unlocked. You may log in to configure your training schedule, ` +
        `publish workout programs, and accept athlete workout bookings.\n\n` +
        `Welcome to the Boot Camp Fitness Coaching Staff!\n` +
        `Gym Administration & Management`,
      provider: "Google Workspace / Gmail Delivery Gateway",
      status: "delivered",
      sentAt: new Date().toISOString(),
      metadata: {
        actionType: "trainer_approved",
        trainerId: matchedTrainer?.id || id,
        trainerUserId: matchedTrainer?.userId || matchedTrainer?.user?.id || id,
      },
    };

    const smsDispatch: DispatchedNotification = {
      id: `disp-sms-accept-${Date.now()}`,
      channel: "sms",
      recipient: trainerPhone,
      recipientName: trainerName,
      content: `Apex Iron Fitness: Congratulations Coach ${trainerName}! Your trainer registration has been accepted by gym administration. You may now access your trainer dashboard.`,
      provider: "Apex Telephony Gateway (SMS Direct)",
      status: "delivered",
      sentAt: new Date().toISOString(),
      metadata: {
        actionType: "trainer_approved",
        trainerId: matchedTrainer?.id || id,
        trainerUserId: matchedTrainer?.userId || matchedTrainer?.user?.id || id,
      },
    };

    this.recordDispatchedNotification(emailDispatch);
    this.recordDispatchedNotification(smsDispatch);

    MOCK_NOTIFICATIONS.unshift({
      id: `notif-accept-${Date.now()}`,
      userId: id,
      title: "Trainer Registration Confirmed!",
      message:
        `Your trainer account has been confirmed by gym administration. ` +
        `Notifications delivered to your Gmail (${trainerEmail}) and mobile phone (${trainerPhone}).`,
      type: "system",
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Trainer registration confirmed for Coach ${trainerName}. Notification dispatched to Gmail (${trainerEmail}) and SMS (${trainerPhone}).`,
      recipientEmail: trainerEmail,
      recipientPhone: trainerPhone,
      notificationsSent: {
        email: emailDispatch,
        sms: smsDispatch,
      },
      ...apiResponse,
    };
  }

  async declineTrainer(id: string, reason?: string): Promise<any> {
    const declineReason = reason || "Application requirements not met or coaching roster currently full.";
    let apiResponse: any = null;
    try {
      apiResponse = await this.request(`/bookings/trainers/${id}/decline`, {
        method: "PATCH",
        body: JSON.stringify({ reason: declineReason }),
      });
    } catch {
      // Local fallback
    }

    const stored = this.getStoredTrainers();
    const targetLower = id.toLowerCase();
    const updated = stored.map((t) => {
      const match =
        t.id.toLowerCase() === targetLower ||
        t.userId?.toLowerCase() === targetLower ||
        t.user?.id?.toLowerCase() === targetLower ||
        t.user?.email.toLowerCase() === targetLower;
      if (match && t.user) {
        return {
          ...t,
          declineReason,
          user: {
            ...t.user,
            status: "declined" as AccountStatus,
            declineReason,
          },
        };
      }
      return t;
    });
    localStorage.setItem("apex_registered_trainers", JSON.stringify(updated));

    const mock = MOCK_TRAINERS.find(
      (t) =>
        t.id.toLowerCase() === targetLower ||
        t.userId?.toLowerCase() === targetLower ||
        t.user?.id?.toLowerCase() === targetLower ||
        t.user?.email.toLowerCase() === targetLower
    );
    if (mock && mock.user) {
      mock.user.status = "declined" as AccountStatus;
      mock.declineReason = declineReason;
    }

    const matchedTrainer =
      stored.find(
        (t) =>
          t.id.toLowerCase() === targetLower ||
          t.userId?.toLowerCase() === targetLower ||
          t.user?.id?.toLowerCase() === targetLower ||
          t.user?.email.toLowerCase() === targetLower
      ) || mock;

    const trainerName = matchedTrainer?.user
      ? `${matchedTrainer.user.firstName} ${matchedTrainer.user.lastName}`.trim()
      : "Coach";
    const trainerEmail = matchedTrainer?.user?.email || "coach@gmail.com";
    const trainerPhone = matchedTrainer?.user?.phone || "+63 917 555 0192";

    const currentUser = this.getCurrentUser();
    if (
      currentUser &&
      (currentUser.id.toLowerCase() === targetLower ||
        currentUser.email.toLowerCase() === targetLower ||
        (currentUser as any).trainer?.id?.toLowerCase() === targetLower)
    ) {
      currentUser.status = "declined" as AccountStatus;
      currentUser.declineReason = declineReason;
      this.currentUser = currentUser;
      localStorage.setItem("apex_gym_user", JSON.stringify(currentUser));
    }

    // Record multi-channel delivery receipts (Gmail & Phone Number)
    const emailDispatch: DispatchedNotification = {
      id: `disp-email-decline-${Date.now()}`,
      channel: "email",
      recipient: trainerEmail,
      recipientName: trainerName,
      subject: "Apex Iron Fitness — Update on Your Coach Registration Application",
      content:
        `Dear Coach ${trainerName},\n\n` +
        `Thank you for your interest in joining the Boot Camp Fitness coaching team. ` +
        `After careful administrative review, your coach registration application was declined by gym administration.\n\n` +
        `Official Reason: ${declineReason}\n\n` +
        `If you have updated credentials, questions regarding this decision, or wish to re-apply in the future, ` +
        `please visit the front desk or contact gym management.\n\n` +
        `Gym Administration & Management`,
      provider: "Google Workspace / Gmail Delivery Gateway",
      status: "delivered",
      sentAt: new Date().toISOString(),
      metadata: {
        actionType: "trainer_declined",
        declineReason,
        trainerId: matchedTrainer?.id || id,
        trainerUserId: matchedTrainer?.userId || matchedTrainer?.user?.id || id,
      },
    };

    const smsDispatch: DispatchedNotification = {
      id: `disp-sms-decline-${Date.now()}`,
      channel: "sms",
      recipient: trainerPhone,
      recipientName: trainerName,
      content: `Apex Iron Fitness: Notice regarding your coach registration. Your application was declined by gym administration. Reason: ${declineReason}. Inquiries: contact front desk.`,
      provider: "Apex Telephony Gateway (SMS Direct)",
      status: "delivered",
      sentAt: new Date().toISOString(),
      metadata: {
        actionType: "trainer_declined",
        declineReason,
        trainerId: matchedTrainer?.id || id,
        trainerUserId: matchedTrainer?.userId || matchedTrainer?.user?.id || id,
      },
    };

    this.recordDispatchedNotification(emailDispatch);
    this.recordDispatchedNotification(smsDispatch);

    MOCK_NOTIFICATIONS.unshift({
      id: `notif-decline-${Date.now()}`,
      userId: id,
      title: "Trainer Registration Declined",
      message:
        `Your coach registration was reviewed and declined by gym administration. ` +
        `Notice delivered to your Gmail (${trainerEmail}) and mobile phone (${trainerPhone}). Reason: ${declineReason}`,
      type: "system",
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Trainer registration declined for Coach ${trainerName}. Notice dispatched to Gmail (${trainerEmail}) and SMS (${trainerPhone}).`,
      recipientEmail: trainerEmail,
      recipientPhone: trainerPhone,
      reason: declineReason,
      notificationsSent: {
        email: emailDispatch,
        sms: smsDispatch,
      },
      ...apiResponse,
    };
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

  calculateDurationHours(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 1;
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    const diff = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
    if (diff <= 0) return 1;
    return Math.max(0.5, Math.round((diff / 60) * 10) / 10);
  }

  formatDurationText(startTime: string, endTime: string): string {
    if (!startTime || !endTime) return "1 hr";
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    const diffMins = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
    if (diffMins <= 0) return "1 hr";
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} hr${hours > 1 ? "s" : ""} ${mins} min${mins > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `${hours} hr${hours > 1 ? "s" : ""}`;
    }
    return `${mins} min${mins > 1 ? "s" : ""}`;
  }

  calculateTrainerCoins(_hourlyRate?: number | string, _durationHours: number = 1): number {
    // Steady to 150 coins only
    return 150;
  }

  hasUsedDailyCoinRedemption(memberIdOrEmail?: string, sessionDate?: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      const storedBookings = this.getStoredBookings();
      const targetDate = (sessionDate || new Date().toISOString()).slice(0, 10);
      const searchKey = (memberIdOrEmail || "").toLowerCase().trim();
      const currentUser = this.getCurrentUser();
      const userEmail = (currentUser?.email || "").toLowerCase().trim();
      const userId = (currentUser?.id || "").toLowerCase().trim();

      return storedBookings.some((b: any) => {
        const bDate = (b.sessionDate || "").slice(0, 10);
        if (bDate !== targetDate) return false;

        const isMember =
          (searchKey && (
            (b.memberId && b.memberId.toLowerCase() === searchKey) ||
            (b.memberEmail && b.memberEmail.toLowerCase() === searchKey) ||
            (b.member?.id && b.member.id.toLowerCase() === searchKey) ||
            (b.member?.userId && b.member.userId.toLowerCase() === searchKey) ||
            (b.member?.user?.email && b.member.user.email.toLowerCase() === searchKey)
          )) ||
          (userEmail && (
            (b.memberEmail && b.memberEmail.toLowerCase() === userEmail) ||
            (b.member?.user?.email && b.member.user.email.toLowerCase() === userEmail)
          )) ||
          (userId && (
            (b.memberId && b.memberId.toLowerCase() === userId) ||
            (b.member?.id && b.member.id.toLowerCase() === userId) ||
            (b.member?.userId && b.member.userId.toLowerCase() === userId)
          ));

        if (!isMember) return false;

        const isCoinPayment =
          b.paymentMethod === "coins" ||
          Boolean(b.coinsPaid) ||
          (typeof b.notes === "string" && b.notes.includes("Redeemed"));
        const isActive = b.status !== "declined" && b.status !== "cancelled";

        return isCoinPayment && isActive;
      });
    } catch {
      return false;
    }
  }

  getMemberCoins(memberId?: string): number {
    if (typeof window === "undefined") return 50;
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
      return 50;
    } catch {
      return 50;
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
    const durationHours = this.calculateDurationHours(body.startTime, body.endTime || "11:00");
    const isCoins = body.paymentMethod === "coins";
    const coinsRequired = 150; // Steady to 150 coins only
    const calculatedPrice = Math.round(Number(body.price || 75) * durationHours);

    // 0. Check Admin Unavailability Override with custom description
    const unavailabilities = this.getStoredTrainerUnavailabilities();
    const dateStr = (body.sessionDate || "").slice(0, 10);
    const adminUnavail = unavailabilities.find((u) => {
      const isSameCoach =
        u.trainerId === body.trainerId ||
        u.trainerId === body.trainerUserId ||
        (body.trainerName && u.trainerName && u.trainerName.toLowerCase().includes(body.trainerName.toLowerCase()));
      if (!isSameCoach || u.date !== dateStr) return false;
      if (u.isFullDay) return true;
      const uStart = u.startTime || "08:00";
      const uEnd = u.endTime || "18:00";
      return body.startTime < uEnd && (body.endTime || "11:00") > uStart;
    });

    if (adminUnavail) {
      const adminDeclineMsg = `Booking Blocked: Coach ${body.trainerName || "Trainer"} is marked unavailable by Admin. Reason: "${adminUnavail.description}".`;
      this.saveDeclinedConflict({
        id: `conflict-${Date.now()}`,
        trainerId: body.trainerId,
        trainerName: body.trainerName || "Coach",
        memberId: body.memberId,
        memberName: body.memberName || "Athlete",
        sessionDate: dateStr,
        startTime: body.startTime,
        endTime: body.endTime || "11:00",
        reason: `Admin Unavailability Override: ${adminUnavail.description}`,
        paymentProtected: true,
        status: "declined",
        createdAt: new Date().toISOString(),
      });
      throw new Error(adminDeclineMsg);
    }

    if (isCoins) {
      if (this.hasUsedDailyCoinRedemption(body.memberId || body.memberEmail, body.sessionDate)) {
        throw new Error(
          "Daily Limit Reached: Members can use the 150 coins redemption for 1 day only (1 redemption per day). You already have an active coin redemption for this date. Please choose Direct Payment."
        );
      }
      const currentCoins = this.getMemberCoins(body.memberId);
      if (currentCoins < coinsRequired) {
        throw new Error(
          `Insufficient coin balance. You have ${currentCoins} coins, but trainer redemption requires ${coinsRequired} coins. Please choose Direct Payment or earn more coins.`
        );
      }
    }

    const declineMessage =
      "Booking Declined: The selected trainer is unavailable at your chosen date and time. Please select another trainer or choose a different time slot.";

    try {
      const res = await this.request<any>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...body,
          startTime: body.startTime,
          endTime: body.endTime || "11:00",
          price: calculatedPrice,
          paymentMethod: isCoins ? "coins" : (body.paymentMethod || "cash"),
          coinsPaid: isCoins ? coinsRequired : undefined,
        }),
      });

      // Payment Protection: Deduct coins only after backend confirms successful booking
      if (isCoins) {
        const currentCoins = this.getMemberCoins(body.memberId);
        this.setMemberCoins(Math.max(0, currentCoins - coinsRequired), body.memberId);
      }

      this.saveStoredBooking(res);
      return res;
    } catch (err: any) {
      const errMsg = err?.message || "";
      const isDecline =
        errMsg.includes("Booking Declined") ||
        errMsg.includes("unavailable") ||
        errMsg.includes("Double-booking") ||
        errMsg.includes("active reservation") ||
        errMsg.includes("outside coach working hours") ||
        errMsg.includes("409");

      if (isDecline) {
        // Payment Protection: zero coins deducted, record conflict in admin monitoring
        this.saveDeclinedConflict({
          id: `conflict-${Date.now()}`,
          trainerId: body.trainerId,
          trainerName: body.trainerName || "Coach",
          memberId: body.memberId,
          memberName: body.memberName || "Athlete",
          sessionDate: (body.sessionDate || "").slice(0, 10),
          startTime: body.startTime,
          endTime: body.endTime || "11:00",
          reason: errMsg.includes("Double-booking")
            ? errMsg
            : "Trainer unavailable or has a schedule conflict during the requested time slot.",
          paymentProtected: true,
          status: "declined",
          createdAt: new Date().toISOString(),
        });

        throw new Error(declineMessage);
      }

      // If backend network error / local demo fallback:
      const storedBookings = this.getStoredBookings();
      const dateStr = (body.sessionDate || "").slice(0, 10);
      const reqStart = body.startTime;
      const reqEnd = body.endTime || "11:00";

      // 1. Check coach working hours (08:00 - 18:00)
      if (reqStart < "08:00" || reqEnd > "18:00") {
        this.saveDeclinedConflict({
          id: `conflict-${Date.now()}`,
          trainerId: body.trainerId,
          trainerName: body.trainerName || "Coach",
          memberId: body.memberId,
          memberName: body.memberName || "Athlete",
          sessionDate: dateStr,
          startTime: reqStart,
          endTime: reqEnd,
          reason: `Requested time slot (${reqStart} - ${reqEnd}) is outside standard coach working hours (08:00 - 18:00).`,
          paymentProtected: true,
          status: "declined",
          createdAt: new Date().toISOString(),
        });
        throw new Error(declineMessage);
      }

      // 2. Prevent Double Booking: Check existing bookings for this trainer on the same date
      const conflict = storedBookings.find((b: any) => {
        const bDate = (b.sessionDate || "").slice(0, 10);
        const isSameTrainer =
          (body.trainerId && (b.trainerId === body.trainerId || b.trainer?.id === body.trainerId)) ||
          (body.trainerUserId && (b.trainerUserId === body.trainerUserId || b.trainer?.userId === body.trainerUserId)) ||
          (body.trainerEmail && (b.trainerEmail === body.trainerEmail || b.trainer?.email === body.trainerEmail));
        const isActive = b.status === "confirmed" || b.status === "pending" || b.status === "approved";
        if (!isSameTrainer || !isActive || bDate !== dateStr) return false;

        const bEnd = b.endTime || "11:00";
        // Overlap formula: existing.startTime < requested.endTime && existing.endTime > requested.startTime
        return b.startTime < reqEnd && bEnd > reqStart;
      });

      if (conflict) {
        this.saveDeclinedConflict({
          id: `conflict-${Date.now()}`,
          trainerId: body.trainerId,
          trainerName: body.trainerName || "Coach",
          memberId: body.memberId,
          memberName: body.memberName || "Athlete",
          sessionDate: dateStr,
          startTime: reqStart,
          endTime: reqEnd,
          reason: `Double-booking conflict prevented: Coach already has an active reservation from ${conflict.startTime} to ${conflict.endTime || "11:00"}.`,
          paymentProtected: true,
          status: "declined",
          createdAt: new Date().toISOString(),
        });

        // Payment Protection: coins balance remained untouched
        throw new Error(declineMessage);
      }

      // Payment Protection: Deduct coins only after local validation confirms trainer is available!
      if (isCoins) {
        const currentCoins = this.getMemberCoins(body.memberId);
        this.setMemberCoins(Math.max(0, currentCoins - coinsRequired), body.memberId);
      }

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
        durationHours,
        sessionType: body.sessionType || "1-on-1 Fitness Coaching",
        status: "confirmed",
        paymentStatus: "paid",
        paymentMethod: isCoins ? "coins" : (body.paymentMethod || "cash"),
        coinsPaid: isCoins ? coinsRequired : undefined,
        price: calculatedPrice,
        notes: body.notes || (isCoins ? `Redeemed ${coinsRequired} Coins (1-Day Trainer Payment) | Duration: ${durationHours} hrs` : `Duration: ${durationHours} hrs`),
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
          message: `Redeemed ${coinsRequired} Loyalty Coins for ${durationHours} hr session with ${body.trainerName || "Coach"}. Remaining balance: ${this.getMemberCoins(body.memberId)} coins.`,
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
          ? `Trainer session confirmed! Successfully redeemed ${coinsRequired} coins for ${durationHours} hr session. Remaining balance: ${this.getMemberCoins(body.memberId)} coins.`
          : `Trainer session booked (${durationHours} hrs). Confirmed in schedule.`,
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

  async updateBookingStatus(bookingId: string, status: string, reason?: string): Promise<any> {
    try {
      return await this.request(`/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason }),
      });
    } catch {
      const stored = this.getStoredBookings();
      const idx = stored.findIndex((b) => b.id === bookingId);
      if (idx !== -1) {
        const booking = stored[idx];
        stored[idx].status = status;
        if (reason) {
          stored[idx].notes = `Declined by trainer: ${reason}`;
        }
        localStorage.setItem("apex_trainer_bookings", JSON.stringify(stored));

        // If status is "declined", guarantee Payment Protection & Refund
        if (status === "declined") {
          const isCoins = booking.paymentMethod === "coins" || booking.coinsPaid !== undefined;
          if (isCoins && booking.memberId) {
            const coinsToRefund = Number(booking.coinsPaid || this.calculateTrainerCoins(booking.price || 75));
            const currentCoins = this.getMemberCoins(booking.memberId);
            this.setMemberCoins(currentCoins + coinsToRefund, booking.memberId);

            MOCK_NOTIFICATIONS.unshift({
              id: `notif-refund-${Date.now()}`,
              userId: booking.memberId,
              title: "Payment Refunded: Trainer Unavailable",
              message: `Your session on ${booking.sessionDate} was declined by the trainer (${reason || "Trainer unavailable"}). ${coinsToRefund} Loyalty Coins were refunded to your account.`,
              type: "reward",
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }

          // Record declined booking in Admin Monitoring
          this.saveDeclinedConflict({
            id: `declined-${Date.now()}`,
            trainerId: booking.trainerId,
            trainerName: booking.trainerName || (booking.trainer?.user ? `Coach ${booking.trainer.user.firstName} ${booking.trainer.user.lastName}` : "Coach"),
            memberId: booking.memberId,
            memberName: booking.memberName || (booking.member?.user ? `${booking.member.user.firstName} ${booking.member.user.lastName}` : "Athlete"),
            sessionDate: booking.sessionDate,
            startTime: booking.startTime,
            endTime: booking.endTime || "11:00",
            reason: reason ? `Declined by trainer: ${reason}` : "Trainer unavailable for this appointment.",
            paymentProtected: true,
            status: "declined",
            createdAt: new Date().toISOString(),
          });
        }
      }
      return { success: true };
    }
  }

  getStoredTrainerUnavailabilities(): TrainerUnavailability[] {
    if (typeof window === "undefined") return [];
    try {
      const val = localStorage.getItem("apex_trainer_unavailabilities");
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  saveStoredTrainerUnavailability(item: TrainerUnavailability): void {
    if (typeof window === "undefined") return;
    try {
      const current = this.getStoredTrainerUnavailabilities();
      const filtered = current.filter((u) => u.id !== item.id);
      filtered.unshift(item);
      localStorage.setItem("apex_trainer_unavailabilities", JSON.stringify(filtered));
    } catch (e) {
      console.warn("Failed to save trainer unavailability:", e);
    }
  }

  deleteStoredTrainerUnavailability(id: string): void {
    if (typeof window === "undefined") return;
    try {
      const current = this.getStoredTrainerUnavailabilities();
      const filtered = current.filter((u) => u.id !== id);
      localStorage.setItem("apex_trainer_unavailabilities", JSON.stringify(filtered));
    } catch (e) {
      console.warn("Failed to delete trainer unavailability:", e);
    }
  }

  async getTrainerUnavailabilities(trainerId?: string): Promise<TrainerUnavailability[]> {
    try {
      const q = trainerId ? `?trainerId=${encodeURIComponent(trainerId)}` : "";
      const res = await this.request<TrainerUnavailability[]>(`/trainers/unavailabilities${q}`);
      if (Array.isArray(res)) return res;
    } catch {}
    const stored = this.getStoredTrainerUnavailabilities();
    if (trainerId) {
      return stored.filter((u) => u.trainerId === trainerId);
    }
    return stored;
  }

  async setTrainerUnavailability(data: Omit<TrainerUnavailability, "id" | "createdAt">): Promise<TrainerUnavailability> {
    const newRecord: TrainerUnavailability = {
      id: `unavail-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await this.request<TrainerUnavailability>(`/trainers/${data.trainerId}/unavailability`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (res && res.id) {
        this.saveStoredTrainerUnavailability(res);
        return res;
      }
    } catch {}

    this.saveStoredTrainerUnavailability(newRecord);
    return newRecord;
  }

  async removeTrainerUnavailability(id: string): Promise<{ success: boolean }> {
    try {
      await this.request(`/trainers/unavailability/${id}`, { method: "DELETE" });
    } catch {}
    this.deleteStoredTrainerUnavailability(id);
    return { success: true };
  }

  async getTrainerAvailability(
    trainerId: string,
    sessionDate: string,
    startTime?: string,
    endTime?: string
  ): Promise<{
    trainerId: string;
    sessionDate: string;
    workingHours: { startTime: string; endTime: string };
    bookedSlots: { startTime: string; endTime: string; status: string }[];
    slots: { startTime: string; endTime: string; isAvailable: boolean; status: "available" | "booked" | "outside_hours" | "unavailable"; adminDescription?: string | null }[];
    alternativeTrainers: { id: string; name: string; specialization: string; hourlyRate: number; rating: number; avatarUrl?: string }[];
    adminUnavailability?: TrainerUnavailability | null;
  }> {
    const dateStr = sessionDate.slice(0, 10);
    try {
      const q = new URLSearchParams({ date: dateStr });
      if (startTime) q.append("startTime", startTime);
      if (endTime) q.append("endTime", endTime);
      const res = await this.request<any>(`/bookings/trainers/${trainerId}/availability?${q.toString()}`);
      if (res && res.slots) return res;
    } catch {}

    // Fallback using stored bookings & admin unavailabilities
    const storedBookings = this.getStoredBookings();
    const activeOnDate = storedBookings.filter((b: any) => {
      const bDate = (b.sessionDate || "").slice(0, 10);
      const isSameTrainer =
        b.trainerId === trainerId ||
        b.trainer?.id === trainerId ||
        b.trainerUserId === trainerId;
      const isActive = b.status === "confirmed" || b.status === "pending" || b.status === "approved";
      return isSameTrainer && isActive && bDate === dateStr;
    });

    const unavailabilities = this.getStoredTrainerUnavailabilities().filter(
      (u) => (u.trainerId === trainerId || !u.trainerId) && u.date === dateStr
    );
    const activeAdminUnavail = unavailabilities.length > 0 ? unavailabilities[0] : null;

    const standardSlots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    const slots = standardSlots.map((slot) => {
      const [h, m] = slot.split(":");
      const slotEnd = `${(parseInt(h, 10) + 1).toString().padStart(2, "0")}:${m}`;
      const conflict = activeOnDate.find((b: any) => slot < (b.endTime || "11:00") && slotEnd > b.startTime);

      const unavail = unavailabilities.find((u) => {
        if (u.isFullDay) return true;
        const uStart = u.startTime || "08:00";
        const uEnd = u.endTime || "18:00";
        return slot < uEnd && slotEnd > uStart;
      });

      const isAvailable = !conflict && !unavail;
      return {
        startTime: slot,
        endTime: slotEnd,
        isAvailable,
        status: unavail
          ? ("unavailable" as const)
          : conflict
          ? ("booked" as const)
          : ("available" as const),
        adminDescription: unavail ? unavail.description : null,
      };
    });

    // Query alternative available trainers on this date & time
    const targetStart = startTime || "10:00";
    const targetEnd = endTime || "11:00";
    const allTrainers = await this.listTrainers();
    const alternativeTrainers = allTrainers
      .filter((t: any) => {
        if (t.id === trainerId) return false;
        const hasConflict = storedBookings.some((b: any) => {
          const bDate = (b.sessionDate || "").slice(0, 10);
          const isT = b.trainerId === t.id || b.trainer?.id === t.id || b.trainerUserId === t.id;
          const isActive = b.status === "confirmed" || b.status === "pending" || b.status === "approved";
          return isT && isActive && bDate === dateStr && b.startTime < targetEnd && (b.endTime || "11:00") > targetStart;
        });
        return !hasConflict;
      })
      .slice(0, 4)
      .map((t: any) => ({
        id: t.id,
        name: `Coach ${t.user?.firstName || "Trainer"} ${t.user?.lastName || ""}`,
        specialization: t.specialization || "Strength & Conditioning",
        hourlyRate: Number(t.hourlyRate === 500 ? 80 : (t.hourlyRate || 80)),
        rating: Number(t.rating || 4.9),
        avatarUrl: t.user?.avatarUrl,
      }));

    return {
      trainerId,
      sessionDate: dateStr,
      workingHours: { startTime: "08:00", endTime: "18:00" },
      bookedSlots: activeOnDate.map((b: any) => ({
        startTime: b.startTime,
        endTime: b.endTime || "11:00",
        status: b.status,
      })),
      slots,
      alternativeTrainers,
      adminUnavailability: activeAdminUnavail,
    };
  }

  async listScheduleConflicts(): Promise<{
    conflicts: any[];
    declinedBookings: any[];
  }> {
    try {
      const res = await this.request<any>("/bookings/conflicts");
      if (res && (res.conflicts || res.declinedBookings)) {
        const local = this.getDeclinedConflicts();
        const combinedConflicts = [
          ...local,
          ...(res.conflicts || []).map((c: any) => ({
            id: c.id,
            trainerId: c.details?.trainerId,
            trainerName: c.details?.trainerName || "Trainer",
            memberId: c.userId,
            memberName: c.user ? `${c.user.firstName} ${c.user.lastName}` : "Athlete",
            sessionDate: c.details?.sessionDate,
            startTime: c.details?.startTime,
            endTime: c.details?.endTime,
            reason: c.details?.reason || "Double booking conflict prevented",
            paymentProtected: true,
            status: "declined",
            createdAt: c.timestamp,
          })),
        ];
        return {
          conflicts: combinedConflicts,
          declinedBookings: res.declinedBookings || [],
        };
      }
    } catch {}

    const localConflicts = this.getDeclinedConflicts();
    const stored = this.getStoredBookings().filter((b) => b.status === "declined");
    return {
      conflicts: localConflicts,
      declinedBookings: stored,
    };
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
