"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { MembershipPlan, Member } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  CreditCard,
  Plus,
  Clock,
  Snowflake,
  Play,
  XCircle,
  RefreshCw,
  CheckCircle,
  Calendar,
  Layers,
} from "lucide-react";

export default function AdminMembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<"plans" | "subscriptions">("plans");

  // Create Plan Modal
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "",
    code: "",
    description: "",
    durationDays: 30,
    price: 59.99,
    planType: "standard",
    benefitsText: "Unlimited gym access\nLocker & sauna access\nFree hydration bar",
  });

  // Action Modals for Subscriptions
  const [actionModal, setActionModal] = useState<{
    type: "extend" | "freeze" | "cancel" | null;
    member?: Member;
  }>({ type: null });
  const [extendDays, setExtendDays] = useState(30);
  const [freezeDays, setFreezeDays] = useState(14);
  const [cancelReason, setCancelReason] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const [p, m] = await Promise.all([api.listPlans(), api.listMembers()]);
    setPlans(p);
    setMembers(m);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const benefits = planForm.benefitsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await api.createPlan({
        ...planForm,
        benefits,
      });

      setPlans([...plans, created]);
      setIsCreatePlanOpen(false);
      setActionSuccess(`Plan '${created.name}' created successfully.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to create plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtend = async () => {
    if (!actionModal.member) return;
    setSubmitting(true);
    try {
      const subId = actionModal.member.memberships?.[0]?.id || "sub-1";
      await api.extendMembership(subId, extendDays, "Staff courtesy extension");
      setActionSuccess(`Extended ${actionModal.member.user?.firstName}'s membership by ${extendDays} days.`);
      setActionModal({ type: null });
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleFreeze = async () => {
    if (!actionModal.member) return;
    setSubmitting(true);
    try {
      const subId = actionModal.member.memberships?.[0]?.id || "sub-1";
      await api.freezeMembership(subId, freezeDays, "Member temporary travel");
      setActionSuccess(`Membership for ${actionModal.member.user?.firstName} frozen for ${freezeDays} days.`);
      setActionModal({ type: null });
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!actionModal.member) return;
    setSubmitting(true);
    try {
      const subId = actionModal.member.memberships?.[0]?.id || "sub-1";
      await api.cancelMembership(subId, cancelReason || "Cancelled by admin request");
      setActionSuccess(`Membership for ${actionModal.member.user?.firstName} cancelled.`);
      setActionModal({ type: null });
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Memberships & Plans Engine</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure subscription packages, terms, automatic renewal, and lifecycle events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsCreatePlanOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Create Plan
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === "plans" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
          }`}
        >
          Catalog of Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === "subscriptions" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
          }`}
        >
          Active Member Subscriptions ({members.length})
        </button>
      </div>

      {activeTab === "plans" ? (
        /* Plans Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const perks: string[] = (() => {
              try {
                return JSON.parse(p.benefits);
              } catch {
                return ["Full gym access", "Locker room"];
              }
            })();

            return (
              <Card key={p.id} className="glass-card border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="emerald" className="uppercase font-mono text-[10px]">
                      {p.code}
                    </Badge>
                    <Badge variant="neutral">{p.planType}</Badge>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{p.description}</p>

                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-3xl font-black text-white">${Number(p.price).toFixed(2)}</span>
                    <span className="text-xs text-slate-400">/ {p.durationDays} days</span>
                  </div>

                  <div className="border-t border-slate-800 pt-3 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Perks</span>
                    {perks.map((perk, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Subscriptions Table */
        <Card className="glass-card border-slate-800 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Athlete</th>
                  <th className="px-4 py-3.5">Active Plan</th>
                  <th className="px-4 py-3.5">Expiration Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Subscription Lifecycle Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {members.map((member) => {
                  const sub = member.memberships?.[0];
                  const planName = sub?.plan?.name || "Standard";
                  const expiryDate = sub?.endDate ? new Date(sub.endDate).toLocaleDateString() : "Active";
                  const status = sub?.status || "active";

                  return (
                    <tr key={member.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">
                          {member.user?.firstName} {member.user?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{member.memberCode}</div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-200">{planName}</td>

                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          {expiryDate}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            status === "active"
                              ? "success"
                              : status === "frozen"
                              ? "info"
                              : "danger"
                          }
                        >
                          {status}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setActionModal({ type: "extend", member })}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition"
                        >
                          + Extend
                        </button>
                        <button
                          onClick={() => setActionModal({ type: "freeze", member })}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-[11px] font-semibold transition"
                        >
                          ❄ Freeze
                        </button>
                        <button
                          onClick={() => setActionModal({ type: "cancel", member })}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950 text-red-400 border border-slate-700 text-[11px] font-semibold transition"
                        >
                          ✕ Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CREATE PLAN MODAL */}
      <Modal isOpen={isCreatePlanOpen} onClose={() => setIsCreatePlanOpen(false)} title="Create Membership Plan">
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Plan Name *</label>
              <input
                type="text"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="Semi-Annual Elite"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Code *</label>
              <input
                type="text"
                value={planForm.code}
                onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                placeholder="PLAN-SEMI"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 uppercase font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Duration (Days) *</label>
              <input
                type="number"
                value={planForm.durationDays}
                onChange={(e) => setPlanForm({ ...planForm, durationDays: parseInt(e.target.value, 10) || 30 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Price ($ USD) *</label>
              <input
                type="number"
                step="0.01"
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <input
              type="text"
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              placeholder="Full 180-day conditioning package with all privileges."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Perks & Benefits (1 per line)</label>
            <textarea
              rows={3}
              value={planForm.benefitsText}
              onChange={(e) => setPlanForm({ ...planForm, benefitsText: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreatePlanOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ACTION MODAL (Extend / Freeze / Cancel) */}
      {actionModal.type && actionModal.member && (
        <Modal
          isOpen={true}
          onClose={() => setActionModal({ type: null })}
          title={`${actionModal.type.toUpperCase()} Subscription: ${actionModal.member.user?.firstName}`}
        >
          <div className="space-y-4 text-xs">
            {actionModal.type === "extend" && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Additional Extension Days</label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This will append {extendDays} days to their current expiration date.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setActionModal({ type: null })}>
                    Cancel
                  </Button>
                  <Button isLoading={submitting} onClick={handleExtend}>
                    Confirm Extension
                  </Button>
                </div>
              </div>
            )}

            {actionModal.type === "freeze" && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Freeze Duration (Days)</label>
                <input
                  type="number"
                  value={freezeDays}
                  onChange={(e) => setFreezeDays(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  The account access will pause and push the expiration date back by {freezeDays} days.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setActionModal({ type: null })}>
                    Cancel
                  </Button>
                  <Button isLoading={submitting} onClick={handleFreeze}>
                    Confirm Freeze
                  </Button>
                </div>
              </div>
            )}

            {actionModal.type === "cancel" && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason for Cancellation</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Relocation, member request, or policy violation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-[11px] text-red-400 mt-1">
                  Warning: Cancellation terminates turnstile gate access immediately.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setActionModal({ type: null })}>
                    Keep Membership
                  </Button>
                  <Button variant="danger" isLoading={submitting} onClick={handleCancel}>
                    Confirm Cancellation
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
