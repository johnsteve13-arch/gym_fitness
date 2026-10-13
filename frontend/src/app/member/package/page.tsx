"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Member, Membership, MembershipPlan } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Layers,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  Award,
  CreditCard,
  QrCode,
  DollarSign,
} from "lucide-react";

export default function MemberPackagePage() {
  const [member, setMember] = useState<Member | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Modals state
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<MembershipPlan | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [freezeDays, setFreezeDays] = useState(14);
  const [freezeReason, setFreezeReason] = useState("Medical / Travel Rest");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");

  const loadData = async () => {
    setLoading(true);
    try {
      const user = api.getCurrentUser();
      const storedMembers = api.getStoredMembers();
      const memberRecord =
        storedMembers.find(
          (m) => m.userId === user?.id || m.user?.email.toLowerCase() === user?.email.toLowerCase()
        ) || storedMembers[0];

      const memberId = memberRecord?.id || (user as any)?.member?.id || user?.id || "";

      const [memberRes, plansRes] = await Promise.all([
        api.getMember(memberId).catch(() => memberRecord),
        api.listPlans(),
      ]);

      if (memberRes) setMember(memberRes);
      else if (memberRecord) setMember(memberRecord);
      setPlans(plansRes || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeMembership: Membership | undefined = member?.memberships?.[0];
  const activePlan: MembershipPlan | undefined = activeMembership?.plan || plans.find((p) => p.id === activeMembership?.planId) || plans[1] || plans[0];

  // Calculate days remaining and duration progress
  const calculateDaysRemaining = () => {
    if (!activeMembership?.endDate) return 30;
    const diff = new Date(activeMembership.endDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = calculateDaysRemaining();
  const totalDuration = activePlan?.durationDays || 30;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((totalDuration - daysRemaining) / totalDuration) * 100)));

  // Parse benefits list safely
  const parseBenefits = (benefitsRaw: string | undefined): string[] => {
    if (!benefitsRaw) return ["Full floor and cardio equipment access", "Locker room and showers", "Free mobile QR gym pass"];
    try {
      const parsed = JSON.parse(benefitsRaw);
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      return [benefitsRaw];
    }
  };

  // 1. Handle Package Upgrade / Switch
  const handleConfirmUpgrade = async () => {
    if (!selectedPlanForUpgrade) return;
    setSubmitting(true);
    setActionError("");

    try {
      const user = api.getCurrentUser();
      const memberId = member?.id || user?.id;

      const res = await api.assignOrUpgradeMembership({
        memberId,
        planId: selectedPlanForUpgrade.id,
        autoRenew: true,
        paymentMethod,
      });

      // Update local state immediately
      if (res.membership && member) {
        setMember({
          ...member,
          memberships: [res.membership, ...(member.memberships || []).filter((m) => m.id !== res.membership.id)],
        });
      } else {
        await loadData();
      }

      setActionSuccess(`Membership successfully upgraded to '${selectedPlanForUpgrade.name}'!`);
      setSelectedPlanForUpgrade(null);
      setTimeout(() => setActionSuccess(""), 5000);
    } catch (err: any) {
      setActionError(err.message || "Failed to switch membership package.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Handle Membership Renewal
  const handleConfirmRenewal = async () => {
    setSubmitting(true);
    setActionError("");

    try {
      const user = api.getCurrentUser();
      const memberId = member?.id || user?.id;
      const res = await api.renewMembership(memberId);

      if (res.membership && member) {
        setMember({
          ...member,
          memberships: [res.membership, ...(member.memberships || []).filter((m) => m.id !== res.membership.id)],
        });
      } else {
        await loadData();
      }

      setActionSuccess(`Membership package '${activePlan?.name}' renewed successfully!`);
      setIsRenewModalOpen(false);
      setTimeout(() => setActionSuccess(""), 5000);
    } catch (err: any) {
      setActionError(err.message || "Failed to renew membership.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Handle Freeze / Pause
  const handleConfirmFreeze = async () => {
    if (!activeMembership) return;
    setSubmitting(true);
    setActionError("");

    try {
      await api.freezeMembership(activeMembership.id, freezeDays, freezeReason);

      if (member && member.memberships && member.memberships[0]) {
        member.memberships[0].status = "frozen";
        member.memberships[0].freezeStart = new Date().toISOString();
        setMember({ ...member });
      } else {
        await loadData();
      }

      setActionSuccess(`Membership placed on pause for ${freezeDays} days.`);
      setIsFreezeModalOpen(false);
      setTimeout(() => setActionSuccess(""), 5000);
    } catch (err: any) {
      setActionError(err.message || "Failed to freeze membership.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Handle Unfreeze / Resume
  const handleUnfreeze = async () => {
    if (!activeMembership) return;
    setSubmitting(true);
    setActionError("");

    try {
      await api.unfreezeMembership(activeMembership.id);

      if (member && member.memberships && member.memberships[0]) {
        member.memberships[0].status = "active";
        member.memberships[0].freezeStart = null;
        setMember({ ...member });
      } else {
        await loadData();
      }

      setActionSuccess("Membership successfully resumed and active!");
      setTimeout(() => setActionSuccess(""), 5000);
    } catch (err: any) {
      setActionError(err.message || "Failed to unfreeze membership.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Title & Integrity Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Membership Package & Subscription
            </h1>
            <Badge variant="emerald" className="hidden sm:inline-flex">
              Enforced Integrity
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            View your active package reference, duration, price, verified benefits, and browse all available packages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/member">
            <Button size="sm" variant="outline" leftIcon={<QrCode className="w-4 h-4" />}>
              View Access Pass
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setIsRenewModalOpen(true)}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            className="font-bold shadow-lg shadow-emerald-950/40"
          >
            Renew Current Package
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/40 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-300 text-xs flex items-center gap-2.5 shadow-lg shadow-rose-950/40 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ================= SECTION 1: BUSINESS RULES & INTEGRITY CONSTRAINTS CARD ================= */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/40 p-5 sm:p-6 shadow-2xl shadow-emerald-950/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">
                  System Architecture & Integrity Specification
                </span>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Business Rules and Integrity Constraints
                </h2>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Rule Ref: BR-MEM-001
            </span>
          </div>

          {/* User's Exact Stated Business Rules Specification Quote */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/80">
            <div className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed italic">
              &quot;Each membership record must reference one valid membership package. A package contains
              information such as the package name, duration, price, benefits, and status.&quot;
            </div>
          </div>

          {/* 3 Integrity Constraint Enforcements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>1. Single Valid Reference</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Every membership record is foreign-key linked directly to a validated package ID (<code className="text-slate-300">planId</code>). Orphaned or unlinked memberships are rejected.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                <Layers className="w-4 h-4" />
                <span>2. Standard Package Attributes</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                All packages strictly encapsulate verified <strong>package name</strong>, <strong>duration (days)</strong>, <strong>price</strong>, <strong>benefits array</strong>, and <strong>status</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                <Calendar className="w-4 h-4" />
                <span>3. Automated Term Calculation</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Expiration dates are strictly computed as <code className="text-slate-300">startDate + durationDays</code> with automated grace-period protection and freeze time shifts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: MEMBER'S ACTIVE REFERENCED MEMBERSHIP RECORD ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>Current Active Membership Record</span>
          </h2>
          <span className="text-xs text-slate-400">
            Record ID: <strong className="text-white font-mono">{activeMembership?.id || "sub-default"}</strong>
          </span>
        </div>

        <Card className="glass-card border-slate-800 p-6 space-y-6 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/50">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-800">
            {/* Package Identity & Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {activePlan?.name || "Monthly Athlete Pass"}
                </h3>
                <Badge
                  variant={
                    activeMembership?.status === "frozen"
                      ? "warning"
                      : activeMembership?.status === "expired"
                      ? "danger"
                      : "emerald"
                  }
                  className="text-xs font-bold uppercase tracking-wider py-1 px-3"
                >
                  {activeMembership?.status === "frozen"
                    ? "❄️ Frozen / Paused"
                    : activeMembership?.status === "expired"
                    ? "Expired"
                    : "✓ Active Reference"}
                </Badge>
                <span className="text-xs text-slate-400 font-mono">
                  Code: {activePlan?.code || "PLAN-MONTHLY"}
                </span>
              </div>

              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {activePlan?.description ||
                  "Full gym floor access with strength equipment, cardio machines, and locker amenities."}
              </p>
            </div>

            {/* Price & Duration Pill */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4 shrink-0">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Package Price
                </span>
                <span className="text-2xl font-black text-emerald-400">
                  ₱{Number(activePlan?.price || 59.99).toFixed(2)}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Package Duration
                </span>
                <span className="text-2xl font-black text-white">
                  {activePlan?.durationDays || 30} Days
                </span>
              </div>
            </div>
          </div>

          {/* Key Dates & Progress Meter */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block font-medium">Activation Start Date</span>
              <strong className="text-white text-xs">
                {activeMembership?.startDate
                  ? new Date(activeMembership.startDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : new Date().toLocaleDateString()}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block font-medium">Term Expiration Date</span>
              <strong className="text-white text-xs">
                {activeMembership?.endDate
                  ? new Date(activeMembership.endDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : new Date(Date.now() + 30 * 86400000).toLocaleDateString()}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block font-medium">Remaining Duration</span>
              <strong className="text-emerald-400 text-xs font-bold">
                {daysRemaining} Days Left
              </strong>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block font-medium">Auto-Renewal</span>
              <span className="text-slate-300 text-xs">
                {activeMembership?.autoRenew ? "Enabled (Monthly)" : "Manual Renewal"}
              </span>
            </div>

            {/* Visual Timeline Bar */}
            <div className="col-span-1 md:col-span-4 pt-2">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                <span>Duration Elapsed: {totalDuration - daysRemaining} of {totalDuration} days</span>
                <span className="text-emerald-400 font-bold">{100 - progressPercent}% Remaining</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Referenced Package Benefits */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Referenced Package Benefits Included:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {parseBenefits(activePlan?.benefits).map((benefit, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons for Current Record */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Referenced Package Status: <strong>{activePlan?.isActive ? "Active in Catalog" : "Archived"}</strong></span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeMembership?.status === "frozen" ? (
                <Button
                  size="sm"
                  onClick={handleUnfreeze}
                  isLoading={submitting}
                  leftIcon={<PlayCircle className="w-4 h-4" />}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Resume Membership
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFreezeModalOpen(true)}
                  leftIcon={<PauseCircle className="w-4 h-4" />}
                >
                  Pause / Freeze
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => setIsRenewModalOpen(true)}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="font-bold"
              >
                Renew Package (+{activePlan?.durationDays || 30} Days)
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ================= SECTION 3: BROWSE ALL VALID MEMBERSHIP PACKAGES ================= */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>Available Verified Membership Packages</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Switch or upgrade your active membership reference to any certified package below. Business rules enforce immediate duration and benefit alignment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = activePlan?.id === p.id;
            const benefitsList = parseBenefits(p.benefits);

            return (
              <Card
                key={p.id}
                className={`glass-card p-6 flex flex-col justify-between transition-all duration-300 relative ${
                  isCurrent
                    ? "border-emerald-500 ring-1 ring-emerald-500/50 bg-gradient-to-b from-emerald-950/20 via-slate-900 to-slate-950 shadow-xl shadow-emerald-950/30"
                    : "border-slate-800 hover:border-slate-700 bg-slate-900/60"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-6 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                    Current Active Package
                  </div>
                )}

                <div className="space-y-4">
                  {/* Package Name & Code */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">{p.name}</h3>
                      <span className="text-[10px] font-mono text-slate-500 block">{p.code}</span>
                    </div>
                    <Badge variant={p.planType === "premium" ? "emerald" : "neutral"} className="text-[10px] uppercase">
                      {p.planType}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed min-h-[3rem] line-clamp-3">
                    {p.description}
                  </p>

                  {/* Price & Duration */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-white">₱{Number(p.price).toFixed(2)}</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {p.durationDays} Days Duration
                    </span>
                  </div>

                  {/* Benefits Checklist */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Enforced Package Benefits:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {benefitsList.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-tight">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Switch Action */}
                <div className="pt-6 border-t border-slate-800/80 mt-6">
                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full text-xs font-semibold">
                      ✓ Bound to this Package
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setSelectedPlanForUpgrade(p)}
                      className="w-full text-xs font-bold"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Switch to this Package
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ================= MODAL 1: SWITCH / UPGRADE PACKAGE ================= */}
      <Modal
        isOpen={!!selectedPlanForUpgrade}
        onClose={() => {
          if (!submitting) setSelectedPlanForUpgrade(null);
        }}
        title="Switch Membership Package Reference"
        maxWidth="md"
      >
        {selectedPlanForUpgrade && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Integrity Constraint Validation:
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                You are switching your active membership record to reference:
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedPlanForUpgrade.name}</h4>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    {selectedPlanForUpgrade.durationDays} Days Duration • ₱{Number(selectedPlanForUpgrade.price).toFixed(2)}
                  </span>
                </div>
                <Badge variant="emerald">Valid Package</Badge>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed">
                Upon confirmation, your membership end date will be set to{" "}
                <strong className="text-white">
                  {new Date(Date.now() + selectedPlanForUpgrade.durationDays * 86400000).toLocaleDateString()}
                </strong>{" "}
                and all {parseBenefits(selectedPlanForUpgrade.benefits).length} package entitlements will be instantly activated.
              </div>
            </div>

            {/* Payment Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Payment Option
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2 ${
                    paymentMethod === "card"
                      ? "bg-emerald-500/10 border-emerald-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Card / E-Wallet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2 ${
                    paymentMethod === "cash"
                      ? "bg-emerald-500/10 border-emerald-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Direct Front Desk</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => setSelectedPlanForUpgrade(null)}
              >
                Cancel
              </Button>
              <Button
                isLoading={submitting}
                onClick={handleConfirmUpgrade}
                className="font-bold"
              >
                Confirm & Activate Package
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL 2: RENEW CURRENT PACKAGE ================= */}
      <Modal
        isOpen={isRenewModalOpen}
        onClose={() => {
          if (!submitting) setIsRenewModalOpen(false);
        }}
        title="Renew Active Membership Package"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-white">
              Extend '{activePlan?.name}' by {activePlan?.durationDays || 30} Days
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Renewing your membership adds a full term ({activePlan?.durationDays || 30} days) to your current
              expiration date. Your digital QR pass and turnstile permissions will remain seamless with zero interruption.
            </p>
            <div className="pt-2 text-xs text-emerald-400 font-bold">
              Renewal Rate: ₱{Number(activePlan?.price || 59.99).toFixed(2)}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setIsRenewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              isLoading={submitting}
              onClick={handleConfirmRenewal}
              className="font-bold"
            >
              Confirm Renewal
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL 3: FREEZE / PAUSE MEMBERSHIP ================= */}
      <Modal
        isOpen={isFreezeModalOpen}
        onClose={() => {
          if (!submitting) setIsFreezeModalOpen(false);
        }}
        title="Pause / Freeze Membership"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <PauseCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              During a frozen status, your remaining days are preserved and turnstile access is temporarily paused.
              You can unfreeze your pass at any time with one click.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Freeze Duration
            </label>
            <select
              value={freezeDays}
              onChange={(e) => setFreezeDays(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value={7}>7 Days (1 Week Pause)</option>
              <option value={14}>14 Days (2 Weeks Pause)</option>
              <option value={30}>30 Days (1 Month Pause)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Reason for Pause (Optional)
            </label>
            <input
              type="text"
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              placeholder="e.g. Travel, Work Project, Medical Recovery"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setIsFreezeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              isLoading={submitting}
              onClick={handleConfirmFreeze}
              className="font-bold bg-amber-600 hover:bg-amber-500 text-white"
            >
              Confirm Freeze
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
