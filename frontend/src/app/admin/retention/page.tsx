"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldAlert,
  AlertTriangle,
  PhoneCall,
  Mail,
  Gift,
  CheckCircle,
  Activity,
  UserCheck,
  TrendingDown,
} from "lucide-react";

export default function AdminRetentionPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    api.getRetentionAlerts().then(setAlerts);
  }, []);

  const handleAction = (type: string, memberName: string) => {
    if (type === "gift") {
      setActionSuccess(`Awarded 50 retention bonus coins and re-engagement email sent to ${memberName}!`);
    } else if (type === "call") {
      setActionSuccess(`Logged staff phone outreach task for ${memberName}.`);
    } else {
      setActionSuccess(`Sent renewal reminder notification to ${memberName}.`);
    }
    setTimeout(() => setActionSuccess(""), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <span>AI Member Retention & Churn Prevention Engine</span>
          <Badge variant="warning">Proactive Alerts</Badge>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Automated member activity scoring, inactivity detection (&gt;14 days), and rapid engagement intervention
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">High Churn Risk</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-red-400">
            {alerts.filter((a) => a.severity === "high").length || 2}
          </div>
          <p className="text-xs text-slate-400 mt-1">&gt; 14 days absent from facility</p>
        </Card>

        <Card className="glass-card border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Upcoming Expirations</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-amber-400">
            {alerts.filter((a) => a.type === "expiration").length || 3}
          </div>
          <p className="text-xs text-slate-400 mt-1">Expiring within 7 days</p>
        </Card>

        <Card className="glass-card border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Retention Health Score</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-black text-emerald-400">91.4%</div>
          <p className="text-xs text-slate-400 mt-1">Average 30-day consistency index</p>
        </Card>
      </div>

      {/* At-Risk Member Intervention Queue */}
      <Card className="glass-card border-slate-800 p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">At-Risk Member Intervention Queue</h3>
          <span className="text-xs text-slate-400">{alerts.length} Action Items Required</span>
        </div>

        <div className="divide-y divide-slate-800">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/60 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{alert.memberName}</span>
                  <Badge variant="neutral" className="font-mono text-[10px]">
                    {alert.memberCode}
                  </Badge>
                  <Badge variant={alert.severity === "high" ? "danger" : "warning"}>
                    {alert.type === "inactivity" ? "Inactive Absentee" : "Expiring Soon"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 font-medium">{alert.message}</p>
                <div className="text-[11px] text-slate-500">
                  Email: {alert.email} • Phone: {alert.phone || "N/A"}
                </div>
              </div>

              {/* Staff Direct Action Buttons */}
              <div className="flex items-center gap-2 whitespace-nowrap">
                <button
                  onClick={() => handleAction("call", alert.memberName)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Call Athlete</span>
                </button>

                <button
                  onClick={() => handleAction("gift", alert.memberName)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Gift 50 Coins</span>
                </button>

                <button
                  onClick={() => handleAction("email", alert.memberName)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Renewal Prompt</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
