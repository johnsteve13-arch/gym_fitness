"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { Attendance, Member } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Clock,
  LogIn,
  LogOut,
  Award,
  Calendar,
  Sparkles,
  QrCode,
  Timer,
  CheckCircle,
  Activity,
  ArrowRight,
  Flame,
} from "lucide-react";

export default function MemberAttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSelfCheckingOut, setIsSelfCheckingOut] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    const user = api.getCurrentUser();
    const storedMembers = api.getStoredMembers();
    const memberRecord =
      storedMembers.find(
        (m) => m.userId === user?.id || m.user?.email.toLowerCase() === user?.email.toLowerCase()
      ) || storedMembers[0];

    const memberId = memberRecord?.id || (user as any)?.member?.id || user?.id || "";

    if (memberRecord) {
      setMember(memberRecord);
    } else if (memberId) {
      const m = await api.getMember(memberId);
      if (m) setMember(m);
    }

    const allAtts = await api.getAttendanceHistory(memberId);
    setAttendances(allAtts);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelfCheckOut = async () => {
    if (!member) return;
    setIsSelfCheckingOut(true);
    try {
      const res = await api.checkOut(member.id);
      setActionMessage(res.message || "Time Out recorded. Great session!");
      await loadData();
      setTimeout(() => setActionMessage(""), 5000);
    } catch (e: any) {
      alert(e.message || "Failed to record Time Out.");
    } finally {
      setIsSelfCheckingOut(false);
    }
  };

  const activeSession = attendances.find((a) => !a.checkOutTime);
  const totalVisits = attendances.length;
  const totalPointsGained = totalVisits * 8;

  // Calculate total workout minutes
  let totalWorkoutMinutes = 0;
  attendances.forEach((a) => {
    if (a.checkOutTime) {
      const diff = Math.max(
        1,
        Math.round(
          (new Date(a.checkOutTime).getTime() - new Date(a.checkInTime).getTime()) / (1000 * 60)
        )
      );
      totalWorkoutMinutes += diff;
    }
  });
  const totalWorkoutHours = (totalWorkoutMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 fill-emerald-400" />
            <span>Turnstile & Floor Access Logs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Gym Attendance & Time Records
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Every gym visit awards you <strong className="text-amber-400 font-bold">+8 Reward Points</strong>.
            Keep track of your Time In, Time Out, and training session durations.
          </p>
        </div>

        <Link href="/kiosk">
          <Button
            size="sm"
            className="neon-glow font-bold shrink-0"
            leftIcon={<QrCode className="w-4 h-4" />}
          >
            Launch Turnstile Kiosk
          </Button>
        </Link>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/10">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Visits</span>
            <LogIn className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalVisits}</div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Turnstile Check-Ins</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Points Earned</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">+{totalPointsGained}</div>
          <div className="text-[10px] text-amber-300 font-semibold mt-0.5">+8 Points / Attendance</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Workout Hours</span>
            <Timer className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalWorkoutHours} hrs</div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Logged on Gym Floor</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Current Floor Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black mt-1">
            {activeSession ? (
              <span className="text-emerald-400 flex items-center gap-1.5 text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Workout
              </span>
            ) : (
              <span className="text-slate-400 text-sm font-semibold">Outside Gym</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {activeSession ? "Checked In (Time In)" : "Ready for next workout"}
          </div>
        </Card>
      </div>

      {/* Active Session Callout if currently in Gym */}
      {activeSession && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">You Are Currently Timed In</h3>
                <Badge variant="success" className="text-[10px]">Active on Gym Floor</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Time In: <strong>{new Date(activeSession.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>.
                When you finish training, record your Time Out at the exit gate or with the button below.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleSelfCheckOut}
            isLoading={isSelfCheckingOut}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Record Time Out (Exit)
          </Button>
        </div>
      )}

      {/* Attendance History Table */}
      <Card className="glass-card border-slate-800 p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Attendance History (Time In & Time Out)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified turnstile entry and exit timestamps with points earned
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{attendances.length} Sessions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-4 py-3.5">Time In</th>
                <th className="px-4 py-3.5">Time Out</th>
                <th className="px-4 py-3.5">Workout Duration</th>
                <th className="px-4 py-3.5">Points Earned</th>
                <th className="px-4 py-3.5">Method</th>
                <th className="px-4 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No attendance records yet. Scan your member QR badge at the front desk or kiosk to log your first Time In!
                  </td>
                </tr>
              ) : (
                attendances.map((att) => {
                  const isOngoing = !att.checkOutTime;
                  let durationStr = "In Progress";
                  if (att.checkOutTime) {
                    const diffMins = Math.max(
                      1,
                      Math.round(
                        (new Date(att.checkOutTime).getTime() - new Date(att.checkInTime).getTime()) /
                          (1000 * 60)
                      )
                    );
                    const hours = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;
                  }

                  return (
                    <tr key={att.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-medium text-white">
                        {new Date(att.checkInTime).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <LogIn className="w-3.5 h-3.5" />
                          {new Date(att.checkInTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {att.checkOutTime ? (
                          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                            <LogOut className="w-3.5 h-3.5" />
                            {new Date(att.checkOutTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Active on Floor
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-300">
                        {durationStr}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
                          <Award className="w-3 h-3" />
                          +8 Points
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant="neutral" className="uppercase font-mono text-[10px]">
                          {att.checkInMethod || "QR Pass"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <Badge variant={isOngoing ? "success" : "neutral"}>
                          {isOngoing ? "Active Workout" : "Completed"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
