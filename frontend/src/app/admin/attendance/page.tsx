"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Attendance } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BarChart } from "@/components/charts/BarChart";
import {
  QrCode,
  Clock,
  LogOut,
  Search,
  ExternalLink,
  CheckCircle,
  Activity,
  Flame,
} from "lucide-react";

export default function AdminAttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [peakHours, setPeakHours] = useState<{ label: string; value: number }[]>([]);
  const [manualId, setManualId] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = async () => {
    const [att, peak] = await Promise.all([
      api.getAttendanceHistory(),
      api.getPeakHours(),
    ]);
    setAttendances(att);
    setPeakHours(peak.map((p) => ({ label: p.hour, value: p.visits })));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;

    setManualLoading(true);
    setFeedback(null);
    try {
      const res = await api.verifyAndCheckIn(manualId, "manual_id");
      if (res.accessGranted) {
        setFeedback({ success: true, message: res.message });
        setManualId("");
        loadData();
      } else {
        setFeedback({ success: false, message: res.reason || "Access Denied" });
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || "Failed to check in." });
    } finally {
      setManualLoading(false);
    }
  };

  const handleManualCheckOut = async (memberId: string) => {
    await api.checkOut(memberId);
    setFeedback({ success: true, message: "Check-out departure recorded." });
    loadData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Gym Attendance & Access Control</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Turnstile monitoring, peak load distribution, and manual reception entry verification
          </p>
        </div>

        <Link href="/kiosk">
          <Button size="sm" leftIcon={<QrCode className="w-4 h-4" />} rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
            Full Reception Kiosk
          </Button>
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.success
              ? "bg-emerald-950/70 border border-emerald-800 text-emerald-300"
              : "bg-red-950/70 border border-red-800 text-red-300"
          }`}
        >
          {feedback.success ? <CheckCircle className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Manual Check-in & Peak Hours Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Manual Reception Desk Check-in Box */}
        <div className="lg:col-span-5">
          <Card className="glass-card border-slate-800 p-5">
            <h3 className="text-sm font-bold text-white mb-1">Manual Reception Check-In</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter member code, email, or badge string to verify pass and log entry.
            </p>

            <form onSubmit={handleManualCheckIn} className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="e.g. MEM-10001 or sarah@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <Button type="submit" isLoading={manualLoading} size="sm" className="w-full font-bold">
                Verify Pass & Open Turnstile
              </Button>
            </form>
          </Card>
        </div>

        {/* Peak Hours Analysis Bar Chart */}
        <div className="lg:col-span-7">
          <Card className="glass-card border-slate-800 p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">Peak-Hour Traffic Density</h3>
                <p className="text-xs text-slate-400">Visits by hour of day (06:00 to 21:00)</p>
              </div>
              <Badge variant="emerald">Real-Time Distribution</Badge>
            </div>
            <BarChart data={peakHours} height={170} barColor="#10B981" />
          </Card>
        </div>
      </div>

      {/* Attendance History Table */}
      <Card className="glass-card border-slate-800 p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">Recent Turnstile Check-Ins</h3>
          <span className="text-xs text-slate-400">{attendances.length} Sessions Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Athlete</th>
                <th className="px-4 py-3.5">Check-In</th>
                <th className="px-4 py-3.5">Check-Out</th>
                <th className="px-4 py-3.5">Method</th>
                <th className="px-4 py-3.5">Session Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {attendances.map((att) => {
                const isOngoing = !att.checkOutTime;

                return (
                  <tr key={att.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white">
                        {att.member?.user?.firstName} {att.member?.user?.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{att.member?.memberCode}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        {new Date(att.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-400">
                      {att.checkOutTime ? (
                        new Date(att.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Currently in Gym
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge variant="neutral" className="uppercase font-mono text-[10px]">
                        {att.checkInMethod}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge variant={isOngoing ? "success" : "neutral"}>
                        {isOngoing ? "Active Workout" : "Completed"}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {isOngoing ? (
                        <button
                          onClick={() => handleManualCheckOut(att.memberId)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[11px] font-semibold transition"
                        >
                          Check Out
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Departed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
