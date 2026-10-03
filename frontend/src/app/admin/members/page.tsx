"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Member, MembershipPlan } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Search,
  UserPlus,
  Download,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Filter,
  CheckCircle,
  Clock,
  Award,
} from "lucide-react";

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Add Member form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    planId: "",
    fitnessGoals: "General Conditioning",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await api.listMembers({ search, status: statusFilter });
      setMembers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    api.listPlans().then(setPlans);
  }, [search, statusFilter]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const newMember = await api.createMember(formData);
      setMembers([newMember, ...members]);
      setIsAddModalOpen(false);
      setFormData({ firstName: "", lastName: "", email: "", phone: "", planId: "", fitnessGoals: "General Conditioning" });
      setActionSuccess("Member registered successfully with 100 bonus reward coins!");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to add member.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.user?.status === "suspended" ? "active" : "suspended";
    const confirmMsg = `Are you sure you want to change ${member.user?.firstName}'s status to ${newStatus}?`;
    if (!confirm(confirmMsg)) return;

    await api.updateMember(member.id, { status: newStatus });
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id && m.user ? { ...m, user: { ...m.user, status: newStatus } } : m))
    );
    setActionSuccess(`Status updated to ${newStatus}.`);
    setTimeout(() => setActionSuccess(""), 3000);
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Permanently delete member profile for ${name}?`)) return;
    await api.deleteMember(id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (selectedMember?.id === id) setSelectedMember(null);
    setActionSuccess(`Member ${name} deleted.`);
    setTimeout(() => setActionSuccess(""), 3000);
  };

  const handleExportCsv = () => {
    const headers = ["Member Code", "Name", "Email", "Phone", "Status", "Coins", "Plan"];
    const rows = members.map((m) => [
      m.memberCode,
      `"${m.user?.firstName} ${m.user?.lastName}"`,
      m.user?.email,
      m.user?.phone || "",
      m.user?.status || "active",
      m.rewardCoins,
      `"${m.memberships?.[0]?.plan?.name || "None"}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex-members-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Member Roster & Profiles</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage registrations, digital access keys, account statuses, and memberships
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleExportCsv} leftIcon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setIsAddModalOpen(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
            New Member
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="glass-card border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, member code (MEM-10001), or email..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Account Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Members Table */}
      <Card className="glass-card border-slate-800 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Athlete</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5">Current Plan</th>
                <th className="px-4 py-3.5">Reward Coins</th>
                <th className="px-4 py-3.5">Account Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    No members match your current filter query.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const plan = member.memberships?.[0]?.plan?.name || "No Plan";
                  const isSuspended = member.user?.status === "suspended";

                  return (
                    <tr key={member.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {member.user?.avatarUrl ? (
                            <img
                              src={member.user.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                              {member.user?.firstName?.charAt(0) || "M"}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white">
                              {member.user?.firstName} {member.user?.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400">{member.user?.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">{member.memberCode}</td>

                      <td className="px-4 py-3.5">
                        <Badge variant="neutral">{plan}</Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          {member.rewardCoins}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant={isSuspended ? "danger" : "success"}>
                          {member.user?.status || "active"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedMember(member)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(member)}
                          className={`p-1.5 rounded-lg transition ${
                            isSuspended
                              ? "bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900"
                              : "bg-amber-950/60 text-amber-400 hover:bg-amber-900"
                          }`}
                          title={isSuspended ? "Reactivate Account" : "Suspend Access"}
                        >
                          {isSuspended ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteMember(member.id, `${member.user?.firstName} ${member.user?.lastName}`)
                          }
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition"
                          title="Delete Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ADD MEMBER MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Athlete Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assign Initial Plan</label>
              <select
                value={formData.planId}
                onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                <option value="">No Plan (Gym Pass only)</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${Number(p.price).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Fitness Goals</label>
            <input
              type="text"
              value={formData.fitnessGoals}
              onChange={(e) => setFormData({ ...formData, fitnessGoals: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={formSubmitting}>
              Create Member Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW MEMBER DETAILS MODAL */}
      {selectedMember && (
        <Modal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          title={`Athlete Dossier: ${selectedMember.user?.firstName} ${selectedMember.user?.lastName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-lg">
                {selectedMember.user?.firstName?.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  {selectedMember.user?.firstName} {selectedMember.user?.lastName}
                </div>
                <div className="text-slate-400">{selectedMember.user?.email} • {selectedMember.user?.phone || "No phone"}</div>
                <div className="font-mono text-emerald-400 text-[11px] mt-0.5">ID: {selectedMember.memberCode}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Active Membership</span>
                <span className="text-white font-bold block">
                  {selectedMember.memberships?.[0]?.plan?.name || "Standard Membership"}
                </span>
                <span className="text-[10px] text-emerald-400">Status: {selectedMember.memberships?.[0]?.status || "active"}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Reward Coins</span>
                <span className="text-amber-400 font-bold block text-sm flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {selectedMember.rewardCoins} Coins
                </span>
                <span className="text-[10px] text-slate-500">Earned via workouts & visits</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block mb-1 font-semibold">Primary Goal</span>
              <span className="text-white">{selectedMember.fitnessGoals || "General Health"}</span>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setSelectedMember(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
