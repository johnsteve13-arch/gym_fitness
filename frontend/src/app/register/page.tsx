"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { MembershipPlan } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Flame,
  Lock,
  Mail,
  User,
  Phone,
  ShieldAlert,
  Dumbbell,
  CheckCircle2,
  Award,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "trainer" ? "trainer" : "member";
  const initialPlanId = searchParams.get("plan");

  const [role, setRole] = useState<"member" | "trainer">(initialRole);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    fitnessGoals: "Athletic Conditioning and Hypertrophy",
    planId: initialPlanId || "",
    specialization: "Strength & Conditioning",
    experienceYears: "4",
    hourlyRate: "750",
    bio: "Certified athletic coach specializing in barbell mechanics, functional movement, and hypertrophy programming.",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listPlans().then((p) => {
      setPlans(p);
      if (!formData.planId && p.length > 0) {
        setFormData((prev) => ({ ...prev, planId: p[1]?.id || p[0]?.id }));
      }
    });
  }, [formData.planId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError("Please complete all required fields.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role,
      };

      if (role === "member") {
        payload.fitnessGoals = formData.fitnessGoals;
        payload.planId = formData.planId;
      } else {
        payload.specialization = formData.specialization;
        payload.experienceYears = parseInt(formData.experienceYears, 10) || 3;
        payload.hourlyRate = parseFloat(formData.hourlyRate) || 750;
        payload.bio = formData.bio;
      }

      await api.register(payload);

      if (role === "trainer") {
        router.push("/trainer");
      } else {
        router.push("/member");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D14] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Flame className="w-6 h-6 fill-slate-950" />
          </div>
          <span className="text-xl font-black text-white tracking-wider">APEX IRON</span>
        </Link>
        <h2 className="text-2xl font-black text-white tracking-tight">
          {role === "member" ? "Athlete Enrollment" : "Coach Registration"}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {role === "member"
            ? "Activate your membership profile, choose your training pass, and get instant QR gym access"
            : "Join our master coaching staff, build client workout programs, and manage sessions"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        <Card className="glass-card border-slate-800 p-6 sm:p-8">
          {/* Role Selection Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setRole("member")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition ${
                role === "member"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Gym Member</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("trainer")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition ${
                role === "trainer"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>Personal Trainer</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">First Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last Name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={role === "member" ? "member@example.com" : "coach@apexfitness.com"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+63 (912) 345-6789"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* MEMBER SPECIFIC FIELDS */}
            {role === "member" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Membership Package</label>
                  <select
                    value={formData.planId}
                    onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₱{Number(p.price).toFixed(2)} ({p.durationDays} days)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Primary Athletic Objective</label>
                  <input
                    type="text"
                    value={formData.fitnessGoals}
                    onChange={(e) => setFormData({ ...formData, fitnessGoals: e.target.value })}
                    placeholder="e.g. Strength, Olympic lifting, Fat Loss, Endurance"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </>
            )}

            {/* TRAINER SPECIFIC FIELDS */}
            {role === "trainer" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Coaching Specialization *</label>
                    <select
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      required
                    >
                      <option value="Strength & Conditioning">Strength & Conditioning</option>
                      <option value="Hypertrophy & Bodybuilding">Hypertrophy & Bodybuilding</option>
                      <option value="Olympic Weightlifting">Olympic Weightlifting</option>
                      <option value="HIIT & Functional Fitness">HIIT & Functional Fitness</option>
                      <option value="Mobility & Injury Rehab">Mobility & Injury Rehab</option>
                      <option value="Endurance & Cardiovascular">Endurance & Cardiovascular</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Experience (Years) *</label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Hourly Coaching Rate (₱ PHP) *</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder="750"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Coaching Bio & Philosophy</label>
                  <textarea
                    rows={2}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Summarize your training background, certifications, and philosophy."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              isLoading={loading}
              className={`w-full mt-4 font-bold ${
                role === "trainer"
                  ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              }`}
            >
              {role === "member"
                ? "Complete Enrollment & Get QR Pass"
                : "Register Coaching Profile & Open Itinerary"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already registered?{" "}
            <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090D14] flex items-center justify-center text-slate-400 text-xs">
          Loading registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
