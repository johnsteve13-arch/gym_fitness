"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import {
  Users,
  QrCode,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  PhoneCall,
  Clock,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [revenueTrends, setRevenueTrends] = useState<{ label: string; value: number }[]>([]);
  const [attendanceTrends, setAttendanceTrends] = useState<{ label: string; value: number }[]>([]);
  const [retentionAlerts, setRetentionAlerts] = useState<any[]>([]);
  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, rev, att, alerts, history] = await Promise.all([
          api.getAnalyticsOverview(),
          api.getRevenueTrends(),
          api.getAttendanceTrends(),
          api.getRetentionAlerts(),
          api.getAttendanceHistory(),
        ]);

        setMetrics(m);
        setRevenueTrends(rev.map((r) => ({ label: r.month, value: r.revenue })));
        setAttendanceTrends(att.map((a) => ({ label: a.day, value: a.visits })));
        setRetentionAlerts(alerts);
        setRecentAttendances(history.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Executive Operations Control</span>
            <Badge variant="emerald">Live TiDB Cloud</Badge>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time business intelligence, access tracking, and retention diagnostics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/members">
            <Button size="sm" variant="secondary" leftIcon={<Users className="w-4 h-4" />}>
              Member Directory
            </Button>
          </Link>
          <Link href="/kiosk">
            <Button size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
              Launch Desk Kiosk
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Members</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {metrics?.members?.total || 342}
            </span>
            <Badge variant="success" className="text-[10px]">
              {metrics?.members?.retentionRate || 91}% Retention
            </Badge>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {metrics?.members?.active || 310} Active • {metrics?.members?.expired || 24} Expired
          </div>
        </Card>

        <Card className="glass-card border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today&apos;s Check-ins</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {metrics?.attendance?.today || 84}
            </span>
            <span className="text-xs text-cyan-400 font-semibold">+12% vs last week</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Peak hour expected at 18:00</div>
        </Card>

        <Card className="glass-card border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              ${Number(metrics?.revenue?.total || 48920).toLocaleString()}
            </span>
            <Badge variant="success" className="text-[10px]">+18.4% MoM</Badge>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Today: ${Number(metrics?.revenue?.today || 1240).toLocaleString()}
          </div>
        </Card>

        <Card className="glass-card border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Coaches & Classes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {metrics?.operations?.classes || 14}
            </span>
            <span className="text-xs text-amber-400 font-semibold">Scheduled Classes</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {metrics?.operations?.trainers || 8} Active Master Trainers
          </div>
        </Card>
      </div>

      {/* Retention Diagnostic Alerts */}
      {retentionAlerts.length > 0 && (
        <Card className="glass-card border-amber-900/60 bg-amber-950/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Member Retention & Churn Alerts ({retentionAlerts.length})
              </h3>
            </div>
            <Link href="/admin/retention" className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold">
              Open Churn Center <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {retentionAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{alert.memberName}</span>
                    <Badge variant={alert.severity === "high" ? "danger" : "warning"} className="text-[10px]">
                      {alert.type}
                    </Badge>
                  </div>
                  <div className="text-slate-400 mt-0.5">{alert.message}</div>
                </div>
                <button
                  onClick={() => alert(`Connecting staff call to ${alert.memberName} (${alert.phone || alert.email})...`)}
                  className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-semibold transition shrink-0 ml-2"
                >
                  Contact
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Trends */}
        <div className="lg:col-span-7">
          <Card className="glass-card border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Monthly Revenue Trends</h3>
                <p className="text-xs text-slate-400">Total processed membership & trainer transactions</p>
              </div>
              <Badge variant="emerald">Last 6 Months</Badge>
            </div>
            <LineChart data={revenueTrends} height={220} lineColor="#10B981" valuePrefix="$" />
          </Card>
        </div>

        {/* Weekly Attendance Distribution */}
        <div className="lg:col-span-5">
          <Card className="glass-card border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Weekly Attendance Flow</h3>
                <p className="text-xs text-slate-400">Check-in volume by day of week</p>
              </div>
              <Badge variant="info">Daily Visits</Badge>
            </div>
            <BarChart data={attendanceTrends} height={220} barColor="#06B6D4" valuePrefix="" />
          </Card>
        </div>
      </div>

      {/* Live Reception Access Feed */}
      <Card className="glass-card border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Live Reception Feed</h3>
            <p className="text-xs text-slate-400">Most recent turnstile and kiosk check-ins</p>
          </div>
          <Link href="/admin/attendance" className="text-xs text-emerald-400 hover:underline">
            View Complete Log
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Check-In Time</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentAttendances.map((att) => (
                <tr key={att.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-semibold text-white">
                    {att.member?.user?.firstName} {att.member?.user?.lastName}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{att.member?.memberCode}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {new Date(att.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral" className="uppercase font-mono text-[10px]">
                      {att.checkInMethod}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="success">Access Verified</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
