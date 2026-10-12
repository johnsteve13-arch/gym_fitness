"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dumbbell,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  Flame,
  ArrowRight,
  LogOut,
  Mail,
  Phone,
  Target,
  Sparkles,
  RefreshCw,
  UserCheck,
  Award,
} from "lucide-react";

export default function TrainerDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [trainerProfile, setTrainerProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [actionSuccess, setActionSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "confirmed" | "completed">("all");

  const loadData = async (user: any) => {
    setLoading(true);
    setCurrentUser(user);
    const storedTrainers = api.getStoredTrainers();
    const found = storedTrainers.find(
      (t) => t.userId === user?.id || t.user?.email?.toLowerCase() === user?.email?.toLowerCase()
    );
    if (found) {
      setTrainerProfile(found);
    }

    try {
      const bookings = await api.listBookings({
        trainerId: found?.id,
        trainerUserId: user?.id,
        trainerEmail: user?.email,
      });
      setSessions(bookings);
    } catch (err) {
      console.error("Failed to load coach bookings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = api.getCurrentUser();
    if (!user || user.role !== "trainer") {
      router.replace("/login?redirect=/trainer");
    } else {
      setAuthorized(true);
      loadData(user);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#090D14] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Verifying Coach Access...</p>
        </div>
      </div>
    );
  }

  const handleComplete = async (bookingId: string, clientName: string) => {
    try {
      await api.updateBookingStatus(bookingId, "completed");
      setSessions((prev) =>
        prev.map((s) => (s.id === bookingId ? { ...s, status: "completed" } : s))
      );
      setActionSuccess(`Session with ${clientName} marked as COMPLETED. Session logged.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      alert("Failed to update session status.");
    }
  };

  const displayName = currentUser?.firstName
    ? `Coach ${currentUser.firstName} ${currentUser.lastName || ""}`
    : "Certified Coach";
  const specialization = trainerProfile?.specialization || "Athletic Conditioning & Performance";
  const hourlyRate = trainerProfile?.hourlyRate ? `₱${Number(trainerProfile.hourlyRate).toFixed(2)}` : "₱75.00";

  const uniqueAthletes = Array.from(
    new Set(
      sessions.map((s) => s.member?.user?.email || s.memberEmail || s.memberId || s.memberName)
    )
  ).filter(Boolean).length;

  const confirmedSessions = sessions.filter((s) => s.status !== "completed");
  const completedCount = sessions.filter((s) => s.status === "completed").length;

  const filteredSessions = sessions.filter((s) => {
    if (filterTab === "confirmed") return s.status !== "completed";
    if (filterTab === "completed") return s.status === "completed";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#090D14] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
              <Flame className="w-6 h-6 fill-slate-950" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black tracking-wider text-white">BOOT CAMP FITNESS</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">• GYM MEMBERSHIP MANAGEMENT SYSTEM</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{displayName}</span>
                <Badge variant="emerald">Personal Trainer</Badge>
              </h1>
              <p className="text-xs text-slate-400">Specialization: {specialization} • Active Status</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/kiosk">
              <Button size="sm" variant="secondary">
                Open Reception Kiosk
              </Button>
            </Link>
            <Link href="/register?role=member">
              <Button size="sm" variant="outline">
                Member Registration
              </Button>
            </Link>
            <Link href="/trainer/logout">
              <Button size="sm" variant="danger" leftIcon={<LogOut className="w-4 h-4" />}>
                Log Out
              </Button>
            </Link>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/40">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
        )}

        {/* Quick Trainer Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Booked Appointments</span>
            <div className="mt-2 text-3xl font-black text-white">{sessions.length} Sessions</div>
            <div className="text-xs text-emerald-400 mt-1">
              {confirmedSessions.length} active • {completedCount} completed
            </div>
          </Card>

          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Athletes Coached</span>
            <div className="mt-2 text-3xl font-black text-cyan-400">
              {uniqueAthletes} Athletes
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Capacity: {uniqueAthletes} / {trainerProfile?.maxClients || 20} Athletes
            </div>
          </Card>

          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Coaching Rate</span>
            <div className="mt-2 text-3xl font-black text-emerald-400">{hourlyRate} / hr</div>
            <div className="text-xs text-slate-400 mt-1">Direct session billing</div>
          </Card>

          <Card className="glass-card border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
              <span>Coins Redeemed</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-3xl font-black text-amber-400">
              {sessions.filter((s) => s.paymentMethod === "coins" || s.coinsPaid).length} Sessions
            </div>
            <div className="text-xs text-amber-400/80 mt-1">
              Paid via member loyalty coins
            </div>
          </Card>
        </div>

        {/* Schedule & Sessions */}
        <Card className="glass-card border-slate-800 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Private Training Itinerary & Athlete Bookings</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Review athletes who scheduled coaching with you, check their fitness goals, and log session completion
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-900/90 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterTab === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("confirmed")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterTab === "confirmed" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Active ({confirmedSessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("completed")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterTab === "completed" ? "bg-slate-800 text-cyan-400" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Done ({completedCount})
                </button>
              </div>

              <Button size="sm" variant="ghost" onClick={loadData} title="Refresh bookings list">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              </Button>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
                <Dumbbell className="w-7 h-7 text-slate-500" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-1">No Coaching Appointments Found</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When members book 1-on-1 private coaching sessions with you at{" "}
                  <span className="text-emerald-400 font-mono">/member/trainers</span>, their athlete profile, contact info, training goals, and scheduled slots will instantly appear right here.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredSessions.map((s) => {
                const isDone = s.status === "completed";
                const athleteName = s.member?.user
                  ? `${s.member.user.firstName} ${s.member.user.lastName || ""}`.trim()
                  : (s.memberName || "Registered Athlete");
                const athleteCode = s.member?.memberCode || s.memberCode || "MEM-ATHLETE";
                const athleteEmail = s.member?.user?.email || s.memberEmail;
                const athletePhone = s.member?.user?.phone || s.memberPhone;
                const athleteAvatar =
                  s.member?.user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(athleteName)}`;
                const sessionFocus = s.sessionType || "1-on-1 Fitness Coaching";
                const sessionDateFormatted = s.sessionDate || "Scheduled Date";
                const sessionTimeFormatted = `${s.startTime || "10:00"} – ${s.endTime || "11:00"}`;
                const priceDisplay = s.price ? `₱${Number(s.price).toFixed(2)}` : hourlyRate;

                return (
                  <div
                    key={s.id}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <img
                        src={athleteAvatar}
                        alt={athleteName}
                        className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 object-cover shrink-0"
                      />

                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-white tracking-tight">{athleteName}</span>
                          <Badge variant="neutral" className="font-mono text-[10px]">
                            {athleteCode}
                          </Badge>
                          <Badge variant={isDone ? "success" : "info"}>
                            {isDone ? "Completed" : (s.status || "Confirmed")}
                          </Badge>
                          <Badge variant="emerald" className="text-[10px]">
                            {sessionFocus}
                          </Badge>
                          {s.paymentMethod === "coins" || s.coinsPaid ? (
                            <Badge variant="warning" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1 font-bold">
                              <Award className="w-3 h-3" />
                              <span>Redeemed via Coins ({s.coinsPaid || api.calculateTrainerCoins(s.price || 75)} Coins)</span>
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[10px]">
                              💳 Direct Payment
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{sessionDateFormatted}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{sessionTimeFormatted}</span>
                          </div>
                          <div className="text-slate-400 font-medium">
                            Payment:{" "}
                            {s.paymentMethod === "coins" || s.coinsPaid ? (
                              <span className="text-amber-400 font-bold">
                                🪙 {s.coinsPaid || api.calculateTrainerCoins(s.price || 75)} Coins (Redeemed)
                              </span>
                            ) : (
                              <span className="text-white font-bold">{priceDisplay}</span>
                            )}
                          </div>
                        </div>

                        {(athleteEmail || athletePhone) && (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                            {athleteEmail && (
                              <a
                                href={`mailto:${athleteEmail}`}
                                className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                              >
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                <span>{athleteEmail}</span>
                              </a>
                            )}
                            {athletePhone && (
                              <a
                                href={`tel:${athletePhone}`}
                                className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-500" />
                                <span>{athletePhone}</span>
                              </a>
                            )}
                          </div>
                        )}

                        {s.notes && (
                          <div className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 mt-2 max-w-2xl">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              <Target className="w-3 h-3 text-emerald-400" />
                              <span>Athlete Goals & Session Focus:</span>
                            </div>
                            <p className="text-slate-300 italic">&ldquo;{s.notes}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                      {!isDone ? (
                        <Button
                          size="sm"
                          onClick={() => handleComplete(s.id, athleteName)}
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                        >
                          Mark Completed
                        </Button>
                      ) : (
                        <Badge variant="success" className="py-1.5 px-3.5 text-xs flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Session Verified</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
