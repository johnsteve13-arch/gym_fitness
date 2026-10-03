"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { Member } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  QrCode,
  Calendar,
  Clock,
  Award,
  Sparkles,
  Dumbbell,
  CheckCircle,
  ArrowRight,
  Flame,
  Scale,
} from "lucide-react";

export default function MemberOverviewPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<"pass" | "details">("pass");

  useEffect(() => {
    api.getMember("mem-1").then(setMember);
  }, []);

  const activeMembership = member?.memberships?.[0];
  const planName = activeMembership?.plan?.name || "Quarterly Pro Conditioning";
  const daysRemaining = 58;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4 fill-emerald-400" />
            <span>Athletic Profile Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome, {member?.user?.firstName || "Sarah"}!
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Member Code: <strong className="text-white font-mono">{member?.memberCode || "MEM-10001"}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/member/workouts">
            <Button size="sm" leftIcon={<Dumbbell className="w-4 h-4" />}>
              Log Workout Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Digital Pass & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Digital QR Access Pass */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-emerald-500/60 p-6 shadow-2xl shadow-emerald-500/10 text-center relative overflow-hidden">
            {/* Ambient pass glow */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="text-left">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase block">
                  APEX IRON ATHLETIC
                </span>
                <span className="text-xs font-bold text-white">Digital Access Key</span>
              </div>
              <Badge variant="success">PASS VALID</Badge>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto my-2">
              <QRCodeSVG
                value={member?.qrCodeToken || "APEX-MEM-10001-TOKEN-8A9B"}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="mt-4">
              <div className="text-base font-black text-white">
                {member?.user?.firstName} {member?.user?.lastName}
              </div>
              <div className="text-xs text-emerald-400 font-medium mt-0.5">{planName}</div>
              <div className="font-mono text-[11px] text-slate-500 mt-1">
                Token: {member?.qrCodeToken?.slice(0, 16) || "APEX-MEM-10001"}...
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
              <span>Status: <strong className="text-emerald-400">Active Entry</strong></span>
              <span>Expires: <strong className="text-white">Nov 30, 2026</strong></span>
            </div>
          </div>
        </div>

        {/* Dashboard Widgets */}
        <div className="md:col-span-7 space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="glass-card border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Days Remaining</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white">{daysRemaining} Days</div>
              <div className="text-[11px] text-slate-400 mt-1">Auto-renewal enabled</div>
            </Card>

            <Card className="glass-card border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Reward Coins</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-400">
                {member?.rewardCoins || 450} Coins
              </div>
              <Link href="/member/rewards" className="text-[11px] text-amber-400 hover:underline mt-1 block">
                Redeem rewards store →
              </Link>
            </Card>
          </div>

          {/* AI Coach Insight Snippet */}
          <Card className="glass-card border-emerald-900/60 bg-emerald-950/20 p-5">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">AI Fitness Coach • Daily Insight</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              &quot;Great consistency this week! You logged your Bench Press PR at 85 kg. Today is an ideal day for a
              progressive overload Lower Body session focusing on Barbell Squats and hamstring curls.&quot;
            </p>
            <div className="mt-3 flex justify-end">
              <Link href="/member/ai-coach">
                <Button size="sm" variant="outline" className="text-xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Chat with AI Coach
                </Button>
              </Link>
            </div>
          </Card>

          {/* Quick Nav Options */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Link
              href="/member/measurements"
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center gap-3"
            >
              <Scale className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="font-bold text-white">Body Measurements</div>
                <div className="text-[10px] text-slate-400">Current BMI: 24.23</div>
              </div>
            </Link>

            <Link
              href="/member/classes"
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center gap-3"
            >
              <Calendar className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="font-bold text-white">Upcoming Classes</div>
                <div className="text-[10px] text-slate-400">Book Olympic Clinic</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
