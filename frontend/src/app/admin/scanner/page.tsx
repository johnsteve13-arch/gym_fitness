"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import CameraQrScanner from "@/components/attendance/CameraQrScanner";
import {
  QrCode,
  Users,
  Activity,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  History,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export default function AdminScannerPage() {
  const [stats, setStats] = useState({
    todayCheckIns: 0,
    todayUniqueMembers: 0,
    currentlyInGym: 0,
    totalVisits: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.getAttendanceStats();
      setStats(data);
    } catch {
      // Quiet fallback
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <QrCode className="w-6 h-6 text-emerald-400" />
              <span>Reception QR Scanner Terminal</span>
            </h1>
            <Badge variant="emerald" className="animate-pulse text-[10px]">
              LIVE CAMERA ACTIVE
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time optical QR validation, duplicate cooldown enforcement, and membership access authorization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={toggleFullscreen}
            leftIcon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen Terminal"}
          </Button>

          <Link href="/admin/attendance">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<History className="w-4 h-4" />}
            >
              Attendance Logs
            </Button>
          </Link>

          <Link href="/kiosk">
            <Button
              size="sm"
              className="bg-emerald-500 text-slate-950 font-bold"
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Public Kiosk
            </Button>
          </Link>
        </div>
      </div>

      {/* Real-time KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Today's Check-Ins</span>
            <LogIn className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.todayCheckIns}</div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Visits Recorded Today</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active on Floor</span>
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.currentlyInGym}</div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Currently In Gym</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Unique Members</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.todayUniqueMembers}</div>
          <div className="text-[10px] text-cyan-400 font-semibold mt-0.5">Distinct Athletes Today</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>All-Time Visits</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{stats.totalVisits}</div>
          <div className="text-[10px] text-amber-300 font-semibold mt-0.5">Total System Check-Ins</div>
        </Card>
      </div>

      {/* Embedded Camera QR Scanner */}
      <CameraQrScanner
        onScanComplete={() => {
          fetchStats();
        }}
      />
    </div>
  );
}
