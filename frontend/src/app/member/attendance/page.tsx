"use client";

import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "@/lib/api";
import { Member, Attendance } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  QrCode,
  Clock,
  LogIn,
  LogOut,
  Download,
  Award,
  Calendar,
  Timer,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Activity,
} from "lucide-react";

export default function MemberAttendancePage() {
  const [member, setMember] = useState<Member | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const user = api.getCurrentUser();
      const storedMembers = api.getStoredMembers();
      const memberRecord =
        storedMembers.find(
          (m) => m.userId === user?.id || m.user?.email.toLowerCase() === user?.email.toLowerCase()
        ) || storedMembers[0];

      const memberId = memberRecord?.id || (user as any)?.member?.id || user?.id || "";

      let profile: Member | undefined = memberRecord;
      if (memberId) {
        const fetched = await api.getMember(memberId).catch(() => undefined);
        if (fetched) profile = fetched;
      }

      if (profile) {
        setMember(profile);
        const history = await api.getAttendanceHistory(profile.id);
        setAttendances(history);
      }
    } catch (e) {
      console.warn("Failed to load member attendance data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadQr = () => {
    if (!member) return;
    const canvas = document.getElementById("member-qr-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `apex-pass-${member.memberCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelfCheckOut = async () => {
    if (!member) return;
    setCheckingOut(true);
    try {
      const res = await api.checkOut(member.id);
      setFeedback(res.message || "Time Out recorded. Session completed!");
      loadData();
    } catch (err: any) {
      setFeedback(err.message || "Failed to record check-out.");
    } finally {
      setCheckingOut(false);
    }
  };

  const activeSession = attendances.find((a) => !a.checkOutTime);
  const totalVisits = attendances.length;
  const totalPointsFromAttendance = totalVisits * 8;

  // Total workout duration in hours
  const totalMinutes = attendances.reduce((acc, curr) => {
    if (!curr.checkOutTime) return acc;
    const diff = Math.max(
      0,
      (new Date(curr.checkOutTime).getTime() - new Date(curr.checkInTime).getTime()) / (1000 * 60)
    );
    return acc + diff;
  }, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const qrValue = member?.qrCodeToken || member?.memberCode || "APEX-PASS";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <QrCode className="w-6 h-6 text-emerald-400" />
          <span>My Access Pass & Gym Attendance</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Scan your unique QR code at any turnstile or reception terminal to record Time In and earn 8 reward points per visit.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Pass & Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Digital QR Pass Card */}
        <div className="md:col-span-5">
          <Card className="glass-card border-slate-800 p-6 relative overflow-hidden text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />

            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                Official Access Pass
              </span>
              <Badge variant="emerald" className="text-[10px]">
                {member?.memberships?.[0]?.plan?.name || "Active Member"}
              </Badge>
            </div>

            <h3 className="text-lg font-black text-white">
              {member?.user?.firstName} {member?.user?.lastName}
            </h3>
            <div className="text-xs font-mono text-emerald-400 mt-0.5">
              {member?.memberCode}
            </div>

            {/* QR Code */}
            <div className="my-5 p-4 bg-white rounded-2xl inline-block shadow-2xl mx-auto border-4 border-slate-900">
              <QRCodeCanvas
                id="member-qr-canvas"
                value={qrValue}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
              Scan this pass at reception or turnstile scanner. Cooldown of 30 seconds prevents double-entry.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={handleDownloadQr}
                className="w-full bg-emerald-500 text-slate-950 font-bold"
                leftIcon={<Download className="w-4 h-4" />}
              >
                Save Pass to Photo Gallery
              </Button>

              {activeSession && (
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={checkingOut}
                  onClick={handleSelfCheckOut}
                  className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 font-bold"
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Record Time Out (Departure)
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Stats & Floor Status */}
        <div className="md:col-span-7 space-y-4">
          {/* Active Floor Banner */}
          <Card className="glass-card border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Gym Floor Session Status
                </div>
                <div className="text-lg font-black text-white mt-1 flex items-center gap-2">
                  {activeSession ? (
                    <>
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-400">Currently Checked In</span>
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3 rounded-full bg-slate-600" />
                      <span className="text-slate-300">Not in Gym</span>
                    </>
                  )}
                </div>
              </div>

              {activeSession && (
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Time In:</div>
                  <div className="text-xs font-mono text-emerald-400 font-bold">
                    {new Date(activeSession.checkInTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="glass-card border-slate-800 p-3.5">
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Total Visits</span>
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">{totalVisits}</div>
              <div className="text-[9px] text-emerald-400 font-semibold">Recorded Visits</div>
            </Card>

            <Card className="glass-card border-slate-800 p-3.5">
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Workout Time</span>
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">{totalHours}h</div>
              <div className="text-[9px] text-cyan-400 font-semibold">Hours Logged</div>
            </Card>

            <Card className="glass-card border-slate-800 p-3.5">
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Visit Points</span>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-400 mt-1">{totalPointsFromAttendance}</div>
              <div className="text-[9px] text-amber-300 font-semibold">+8 pts / check-in</div>
            </Card>
          </div>

          {/* Attendance History Table */}
          <Card className="glass-card border-slate-800 p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>My Check-In History</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
                {attendances.length} visits recorded
              </span>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Time In</th>
                    <th className="px-3 py-2.5">Time Out</th>
                    <th className="px-3 py-2.5">Duration</th>
                    <th className="px-3 py-2.5 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {attendances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-xs">
                        No attendance history yet. Scan your pass when entering the gym!
                      </td>
                    </tr>
                  ) : (
                    attendances.map((att) => {
                      const checkIn = new Date(att.checkInTime);
                      const checkOut = att.checkOutTime ? new Date(att.checkOutTime) : null;
                      let durationStr = "Ongoing";
                      if (checkOut) {
                        const mins = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)));
                        durationStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} mins`;
                      }

                      return (
                        <tr key={att.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-2.5 font-medium text-white">
                            {checkIn.toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5 text-emerald-400 font-mono">
                            {checkIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300 font-mono">
                            {checkOut ? (
                              checkOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            ) : (
                              <span className="text-emerald-400 font-bold">Active</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-400 font-mono">
                            {durationStr}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="text-amber-400 font-bold text-[11px]">+8 Pts</span>
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
      </div>
    </div>
  );
}
