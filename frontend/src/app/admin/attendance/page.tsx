"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Attendance } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BarChart } from "@/components/charts/BarChart";
import CameraQrScanner from "@/components/attendance/CameraQrScanner";
import {
  QrCode,
  Clock,
  LogOut,
  LogIn,
  Search,
  ExternalLink,
  CheckCircle,
  Activity,
  Award,
  Users,
  Timer,
  Trash2,
  Download,
  Filter,
  Camera,
  Calendar,
} from "lucide-react";

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<"logs" | "scanner">("logs");
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [peakHours, setPeakHours] = useState<{ label: string; value: number }[]>([]);
  const [stats, setStats] = useState({
    todayCheckIns: 0,
    todayUniqueMembers: 0,
    currentlyInGym: 0,
    totalVisits: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

  // Manual turnstile form state
  const [manualId, setManualId] = useState("");
  const [manualMode, setManualMode] = useState<"in" | "out">("in");
  const [manualLoading, setManualLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [att, peak, statData] = await Promise.all([
        api.getAttendanceHistory(),
        api.getPeakHours(),
        api.getAttendanceStats(),
      ]);
      setAttendances(att);
      setPeakHours(peak.map((p) => ({ label: p.hour, value: p.visits })));
      setStats(statData);
    } catch (e) {
      console.warn("Failed to load attendance page data:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;

    setManualLoading(true);
    setFeedback(null);
    try {
      if (manualMode === "in") {
        const res = await api.verifyAndCheckIn(manualId, "manual_desk");
        if (res.accessGranted) {
          setFeedback({
            success: true,
            message: `Time In logged successfully for ${res.member?.name || manualId}! +8 Points awarded.`,
          });
          setManualId("");
          loadData();
        } else {
          setFeedback({ success: false, message: res.reason || res.message || "Access Denied" });
        }
      } else {
        const res = await api.checkOut(manualId);
        setFeedback({
          success: true,
          message: res.message || `Time Out departure logged for ${manualId}.`,
        });
        setManualId("");
        loadData();
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || "Failed to process attendance." });
    } finally {
      setManualLoading(false);
    }
  };

  const handleManualCheckOut = async (memberId: string) => {
    try {
      const res = await api.checkOut(memberId);
      setFeedback({ success: true, message: res.message || "Check-out departure recorded." });
      loadData();
    } catch (e: any) {
      setFeedback({ success: false, message: e.message || "Failed to record check-out." });
    }
  };

  const handleDeleteAttendance = async (attendanceId: string, athleteName: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Are you sure you want to delete this attendance record for ${athleteName}?`)
    ) {
      return;
    }
    try {
      await api.deleteAttendance(attendanceId);
      setAttendances((prev) => prev.filter((a) => a.id !== attendanceId));
      setFeedback({
        success: true,
        message: `Attendance entry for ${athleteName} deleted successfully.`,
      });
      loadData();
    } catch (e: any) {
      setFeedback({ success: false, message: e.message || "Failed to delete attendance record." });
    }
  };

  // Filtered attendances based on search, date, and status
  const filteredAttendances = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return attendances.filter((att) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${att.member?.user?.firstName || ""} ${att.member?.user?.lastName || ""}`.toLowerCase();
        const code = (att.member?.memberCode || "").toLowerCase();
        const email = (att.member?.user?.email || "").toLowerCase();
        if (!fullName.includes(q) && !code.includes(q) && !email.includes(q)) {
          return false;
        }
      }

      // 2. Date Filter
      const checkInTime = new Date(att.checkInTime).getTime();
      if (dateFilter === "today" && checkInTime < startOfToday) return false;
      if (dateFilter === "week" && checkInTime < sevenDaysAgo) return false;
      if (dateFilter === "month" && checkInTime < thirtyDaysAgo) return false;

      // 3. Status Filter
      if (statusFilter === "active" && att.checkOutTime) return false;
      if (statusFilter === "completed" && !att.checkOutTime) return false;

      return true;
    });
  }, [attendances, searchQuery, dateFilter, statusFilter]);

  // Export Attendance to CSV
  const handleExportCSV = () => {
    if (filteredAttendances.length === 0) {
      alert("No attendance records to export based on the selected filters.");
      return;
    }

    const headers = [
      "Attendance ID",
      "Member Name",
      "Member Code",
      "Email",
      "Check-In Date",
      "Check-In Time",
      "Check-Out Date",
      "Check-Out Time",
      "Duration (Minutes)",
      "Method",
      "Status",
      "Points Awarded",
    ];

    const rows = filteredAttendances.map((att) => {
      const checkIn = new Date(att.checkInTime);
      const checkOut = att.checkOutTime ? new Date(att.checkOutTime) : null;
      let durationMins = 0;
      if (checkOut) {
        durationMins = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)));
      }

      const athleteName = `${att.member?.user?.firstName || "Athlete"} ${att.member?.user?.lastName || ""}`.trim();
      const memberCode = att.member?.memberCode || "N/A";
      const email = att.member?.user?.email || "N/A";

      return [
        `"${att.id}"`,
        `"${athleteName.replace(/"/g, '""')}"`,
        `"${memberCode}"`,
        `"${email}"`,
        `"${checkIn.toLocaleDateString()}"`,
        `"${checkIn.toLocaleTimeString()}"`,
        checkOut ? `"${checkOut.toLocaleDateString()}"` : `""`,
        checkOut ? `"${checkOut.toLocaleTimeString()}"` : `""`,
        checkOut ? durationMins : `"Ongoing"`,
        `"${att.checkInMethod || "qr"}"`,
        checkOut ? `"Completed"` : `"Active on Floor"`,
        8,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.setAttribute("download", `apex-attendance-report-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeOnFloorCount = attendances.filter((a) => !a.checkOutTime).length;
  const totalPointsAwarded = attendances.length * 8;

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
            Real-time turnstile monitoring, camera QR scanner, Time In & Time Out logs, and attendance reward points (+8 Pts per visit)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "logs"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Logs & Reports</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scanner")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "scanner"
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Camera Scanner</span>
            </button>
          </div>

          <Link href="/kiosk">
            <Button size="sm" leftIcon={<QrCode className="w-4 h-4" />} rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
              Open Kiosk
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Today's Check-Ins</span>
            <LogIn className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.todayCheckIns}</div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Visits Today</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active on Floor</span>
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeOnFloorCount}</div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Currently Training</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Unique Athletes Today</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.todayUniqueMembers}</div>
          <div className="text-[10px] text-cyan-400 font-semibold mt-0.5">Distinct Members</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Points Awarded</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{totalPointsAwarded}</div>
          <div className="text-[10px] text-amber-300 font-semibold mt-0.5">+8 Points Per Visit</div>
        </Card>
      </div>

      {/* Live Camera Scanner Tab */}
      {activeTab === "scanner" && (
        <CameraQrScanner
          onScanComplete={() => {
            loadData();
          }}
        />
      )}

      {/* Logs and Analytics Tab */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 font-medium shadow-lg transition ${
                feedback.success
                  ? "bg-emerald-950/80 border border-emerald-500/50 text-emerald-300"
                  : "bg-red-950/80 border border-red-500/50 text-red-300"
              }`}
            >
              {feedback.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <LogOut className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Manual Action & Peak Hours Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Reception Desk Manual Entry Box */}
            <div className="lg:col-span-5">
              <Card className="glass-card border-slate-800 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white">Manual Reception Turnstile</h3>
                  <Badge variant={manualMode === "in" ? "emerald" : "warning"} className="text-[10px]">
                    {manualMode === "in" ? "Time In (+8 Pts)" : "Time Out"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  {manualMode === "in"
                    ? "Enter member ID, code, or email to verify membership, open turnstile, and award 8 attendance points."
                    : "Enter member code or email to record departure time and calculate workout duration."}
                </p>

                {/* Mode Switcher */}
                <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 mb-3">
                  <button
                    type="button"
                    onClick={() => setManualMode("in")}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      manualMode === "in"
                        ? "bg-emerald-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Time In (+8)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMode("out")}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      manualMode === "out"
                        ? "bg-amber-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Time Out</span>
                  </button>
                </div>

                <form onSubmit={handleManualAction} className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      placeholder="e.g. MEM-10025 or athlete@apexfitness.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    isLoading={manualLoading}
                    size="sm"
                    className={`w-full font-bold ${
                      manualMode === "in"
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                    }`}
                  >
                    {manualMode === "in" ? "Log Time In (+8 Points)" : "Log Time Out Departure"}
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
                  <Badge variant="emerald">Live Gym Floor</Badge>
                </div>
                <BarChart data={peakHours} height={170} barColor="#10B981" />
              </Card>
            </div>
          </div>

          {/* Filter Bar & Export Toolbar */}
          <Card className="glass-card border-slate-800 p-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by athlete name, member code (MEM-...), or email..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={dateFilter}
                    onChange={(e: any) => setDateFilter(e.target.value)}
                    className="bg-transparent text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900">All Time</option>
                    <option value="today" className="bg-slate-900">Today Only</option>
                    <option value="week" className="bg-slate-900">Last 7 Days</option>
                    <option value="month" className="bg-slate-900">This Month</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900">All Statuses</option>
                    <option value="active" className="bg-slate-900">Active on Floor</option>
                    <option value="completed" className="bg-slate-900">Completed Sessions</option>
                  </select>
                </div>

                {/* Export CSV Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  leftIcon={<Download className="w-3.5 h-3.5 text-emerald-400" />}
                  className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </Card>

          {/* Attendance History Table */}
          <Card className="glass-card border-slate-800 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Turnstile Attendance Records (Time In & Time Out)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live tracking of check-in times, departure times, workout durations, and points gained
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredAttendances.length} of {attendances.length} Sessions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Athlete</th>
                    <th className="px-4 py-3.5">Time In</th>
                    <th className="px-4 py-3.5">Time Out</th>
                    <th className="px-4 py-3.5">Duration</th>
                    <th className="px-4 py-3.5">Points Gained</th>
                    <th className="px-4 py-3.5">Method</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredAttendances.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                        No check-in entries found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendances.map((att) => {
                      const isOngoing = !att.checkOutTime;
                      let durationStr = "Ongoing";
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
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-white">
                              {att.member?.user?.firstName || "Athlete"} {att.member?.user?.lastName || ""}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {att.member?.memberCode || "MEM-ATHLETE"}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                              <LogIn className="w-3.5 h-3.5" />
                              {new Date(att.checkInTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              {new Date(att.checkInTime).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {att.checkOutTime ? (
                              <div>
                                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                                  <LogOut className="w-3.5 h-3.5" />
                                  {new Date(att.checkOutTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <div className="text-[10px] text-slate-500">
                                  {new Date(att.checkOutTime).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Active on Floor
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-mono text-slate-300 flex items-center gap-1">
                              <Timer className="w-3.5 h-3.5 text-slate-500" />
                              {durationStr}
                            </span>
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

                          <td className="px-4 py-3.5">
                            <Badge variant={isOngoing ? "success" : "neutral"}>
                              {isOngoing ? "Active Workout" : "Completed"}
                            </Badge>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isOngoing ? (
                                <button
                                  type="button"
                                  onClick={() => handleManualCheckOut(att.memberId || att.member?.id || "")}
                                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/40 text-[11px] font-semibold transition"
                                  title="Record athlete departure time"
                                >
                                  Time Out
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-500">Departed</span>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteAttendance(
                                    att.id,
                                    `${att.member?.user?.firstName || "Athlete"} ${att.member?.user?.lastName || ""}`.trim()
                                  )
                                }
                                className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition flex items-center justify-center"
                                title="Delete attendance record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}
    </div>
  );
}
