"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Trainer } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Star,
  DollarSign,
  Users,
  UserPlus,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  Briefcase,
  Award,
  Sparkles,
  Clock,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";

const SPECIALIZATION_PRESETS = [
  "Strength & Conditioning",
  "Hypertrophy & Bodybuilding",
  "Olympic Weightlifting & Powerlifting",
  "Functional Training & Mobility",
  "HIIT & Fat Loss Conditioning",
  "Boxing & Combat Fitness",
  "Post-Rehab & Corrective Exercise",
  "Endurance & Athletic Performance",
];

export default function AdminTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [search, setSearch] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [trainerToDelete, setTrainerToDelete] = useState<Trainer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Add Trainer form state
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialization: "Strength & Conditioning",
    customSpecialization: "",
    bio: "",
    experienceYears: 3,
    hourlyRate: 75.0,
    maxClients: 20,
    avatarUrl: "",
    password: "Password@123",
  });

  const [statusTab, setStatusTab] = useState<"all" | "active" | "pending" | "conflicts">("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Admin Monitoring: Schedule Conflicts & Declined Attempts
  const [conflictsData, setConflictsData] = useState<{ conflicts: any[]; declinedBookings: any[] }>({
    conflicts: [],
    declinedBookings: [],
  });
  const [loadingConflicts, setLoadingConflicts] = useState(false);

  const loadConflicts = async () => {
    setLoadingConflicts(true);
    try {
      const data = await api.listScheduleConflicts();
      setConflictsData(data);
    } catch (e) {
      console.warn("Failed to load schedule conflicts:", e);
    } finally {
      setLoadingConflicts(false);
    }
  };

  const loadTrainers = async () => {
    setLoading(true);
    try {
      const data = await api.listTrainers({ includePending: true });
      setTrainers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTrainer = async (trainer: Trainer) => {
    setApprovingId(trainer.id);
    setActionError("");
    try {
      await api.approveTrainer(trainer.id);
      setActionSuccess(
        `Registration confirmed! Coach ${trainer.user?.firstName} ${trainer.user?.lastName} is now active and can access their trainer dashboard.`
      );
      setTimeout(() => setActionSuccess(""), 5000);
      await loadTrainers();
    } catch (err: any) {
      setActionError(err.message || "Failed to confirm trainer registration.");
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    loadTrainers();
    loadConflicts();
  }, []);

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError("");

    const finalSpecialization =
      form.specialization === "custom"
        ? form.customSpecialization.trim() || "Strength & Conditioning"
        : form.specialization;

    try {
      const newTrainer = await api.createTrainer({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        specialization: finalSpecialization,
        bio:
          form.bio.trim() ||
          `Certified ${finalSpecialization} specialist dedicated to helping members achieve their athletic goals.`,
        experienceYears: Number(form.experienceYears) || 1,
        hourlyRate: Number(form.hourlyRate) || 75.0,
        maxClients: Number(form.maxClients) || 20,
        avatarUrl:
          form.avatarUrl.trim() ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${form.firstName}_${form.lastName}`,
        password: form.password || "Password@123",
      });

      setTrainers((prev) => [newTrainer, ...prev.filter((t) => t.id !== newTrainer.id)]);
      setIsAddModalOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        specialization: "Strength & Conditioning",
        customSpecialization: "",
        bio: "",
        experienceYears: 3,
        hourlyRate: 75.0,
        maxClients: 20,
        avatarUrl: "",
        password: "Password@123",
      });
      setActionSuccess(`Coach ${newTrainer.user?.firstName} ${newTrainer.user?.lastName} added successfully!`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      setActionError(err.message || "Failed to create trainer. Please verify fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrainer = async () => {
    if (!trainerToDelete) return;
    setIsSubmitting(true);
    setActionError("");

    try {
      await api.deleteTrainer(trainerToDelete.id);
      setTrainers((prev) =>
        prev.filter((t) => t.id !== trainerToDelete.id && t.userId !== trainerToDelete.userId)
      );
      setActionSuccess(
        `Coach ${trainerToDelete.user?.firstName} ${trainerToDelete.user?.lastName} was permanently deleted.`
      );
      setTrainerToDelete(null);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      setActionError(err.message || "Failed to delete trainer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingTrainers = trainers.filter((t) => t.user?.status === "pending");
  const activeTrainers = trainers.filter((t) => t.user?.status !== "pending");

  // Filtered trainers list
  const filteredTrainers = trainers.filter((t) => {
    const fullName = `${t.user?.firstName || ""} ${t.user?.lastName || ""}`.toLowerCase();
    const email = (t.user?.email || "").toLowerCase();
    const spec = (t.specialization || "").toLowerCase();
    const q = search.toLowerCase().trim();

    const matchesSearch = !q || fullName.includes(q) || email.includes(q) || spec.includes(q);
    const matchesSpec =
      specializationFilter === "all" ||
      spec.toLowerCase().includes(specializationFilter.toLowerCase());

    const isPending = t.user?.status === "pending";
    const matchesStatus =
      statusTab === "all" ||
      (statusTab === "pending" && isPending) ||
      (statusTab === "active" && !isPending);

    return matchesSearch && matchesSpec && matchesStatus;
  });

  // Calculate statistics
  const totalTrainers = trainers.length;
  const avgRate =
    totalTrainers > 0
      ? (trainers.reduce((acc, t) => acc + (Number(t.hourlyRate) || 0), 0) / totalTrainers).toFixed(0)
      : "0";
  const uniqueSpecs = Array.from(new Set(trainers.map((t) => t.specialization))).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Coaching Staff & Personal Trainers</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Add certified fitness specialists, configure hourly rates, client capacities, and confirm trainer registrations
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setActionError("");
            setIsAddModalOpen(true);
          }}
          leftIcon={<UserPlus className="w-4 h-4" />}
          className="font-bold shadow-lg shadow-emerald-950/40"
        >
          Add New Trainer
        </Button>
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

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Registered Coaches</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{totalTrainers}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{activeTrainers.length} active coaches</div>
        </Card>

        <Card
          className={`glass-card p-4 transition cursor-pointer ${
            pendingTrainers.length > 0
              ? "border-amber-500/50 bg-amber-950/20 hover:border-amber-400"
              : "border-slate-800"
          }`}
          onClick={() => setStatusTab(pendingTrainers.length > 0 ? "pending" : "all")}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className={pendingTrainers.length > 0 ? "text-amber-300 font-semibold" : ""}>
              Pending Confirmation
            </span>
            <Clock className={`w-4 h-4 ${pendingTrainers.length > 0 ? "text-amber-400 animate-pulse" : "text-slate-500"}`} />
          </div>
          <div className={`mt-2 text-2xl font-black ${pendingTrainers.length > 0 ? "text-amber-400" : "text-slate-400"}`}>
            {pendingTrainers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {pendingTrainers.length > 0 ? "Requires admin confirmation" : "No pending applications"}
          </div>
        </Card>

        <Card
          className={`glass-card p-4 transition cursor-pointer ${
            conflictsData.conflicts.length > 0
              ? "border-rose-500/50 bg-rose-950/20 hover:border-rose-400"
              : "border-slate-800"
          }`}
          onClick={() => setStatusTab("conflicts")}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className={conflictsData.conflicts.length > 0 ? "text-rose-300 font-semibold" : ""}>
              Conflicts Prevented
            </span>
            <ShieldAlert className={`w-4 h-4 ${conflictsData.conflicts.length > 0 ? "text-rose-400" : "text-slate-500"}`} />
          </div>
          <div className={`mt-2 text-2xl font-black ${conflictsData.conflicts.length > 0 ? "text-rose-400" : "text-slate-400"}`}>
            {conflictsData.conflicts.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {conflictsData.conflicts.length > 0 ? "Double-booking guard active" : "Zero active conflicts"}
          </div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Average Hourly Rate</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">₱{avgRate} / hr</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across all training tiers</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Specializations Offered</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">{uniqueSpecs} Disciplines</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Strength, Hypertrophy, Mobility, etc.</div>
        </Card>
      </div>

      {/* Pending Trainer Registrations Alert Banner & Review Section */}
      {pendingTrainers.length > 0 && (
        <Card className="glass-card border-amber-500/50 bg-amber-950/25 p-5 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  Trainer Registrations Awaiting Admin Confirmation
                  <Badge variant="amber" className="text-[10px] py-0 px-2 font-mono">
                    {pendingTrainers.length} PENDING
                  </Badge>
                </h3>
                <p className="text-[11px] text-amber-200/80">
                  Confirm coach registrations so they can access their dashboard, manage bookings, and train athletes.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingTrainers.map((pt) => (
              <div
                key={pt.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between gap-3 shadow-md"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={
                      pt.user?.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${pt.user?.firstName || "Coach"}`
                    }
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white truncate">
                        Coach {pt.user?.firstName} {pt.user?.lastName}
                      </h4>
                      <Badge variant="amber" className="text-[10px] shrink-0 font-mono">
                        Awaiting Confirmation
                      </Badge>
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold">{pt.specialization}</div>
                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>✉️ {pt.user?.email}</span>
                      {pt.user?.phone && <span>📞 {pt.user.phone}</span>}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1.5 font-mono">
                      Rate: <strong className="text-emerald-400 font-bold">₱{Number(pt.hourlyRate).toFixed(2)}/hr</strong> • Exp: <strong>{pt.experienceYears} yrs</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTrainerToDelete(pt)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveTrainer(pt)}
                    disabled={approvingId === pt.id}
                    leftIcon={<CheckCircle className="w-3.5 h-3.5 text-white" />}
                    className="font-bold text-xs bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-950/40"
                  >
                    {approvingId === pt.id ? "Confirming..." : "Confirm Registration"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setStatusTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            statusTab === "all"
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          All Coaches ({trainers.length})
        </button>
        <button
          onClick={() => setStatusTab("active")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            statusTab === "active"
              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Active Coaches ({activeTrainers.length})
        </button>
        <button
          onClick={() => setStatusTab("pending")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusTab === "pending"
              ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Pending Approvals</span>
          {pendingTrainers.length > 0 && (
            <Badge variant="amber" className="text-[10px] py-0 px-1.5 font-mono">
              {pendingTrainers.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setStatusTab("conflicts")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusTab === "conflicts"
              ? "bg-rose-950/80 text-rose-300 border border-rose-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Schedule Conflicts & Declines</span>
          {conflictsData.conflicts.length > 0 && (
            <Badge variant="danger" className="text-[10px] py-0 px-1.5 font-mono">
              {conflictsData.conflicts.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Main Content: Conflicts Monitor or Trainers Catalog */}
      {statusTab === "conflicts" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Trainer Schedule Conflict & Double-Booking Audit Log</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time admin monitoring of declined booking transactions, overlap interceptions, and payment protections
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadConflicts}
              isLoading={loadingConflicts}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs shrink-0"
            >
              Sync Conflicts
            </Button>
          </div>

          {conflictsData.conflicts.length === 0 ? (
            <Card className="glass-card border-slate-800 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">No Scheduling Conflicts Recorded</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All booking transactions have proceeded cleanly without collisions. The system automatically intercepts overlapping requests and protects payments.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {conflictsData.conflicts.map((conflict: any, index: number) => (
                <Card
                  key={conflict.id || index}
                  className="glass-card border-rose-900/40 bg-slate-900/60 p-4 space-y-3 hover:border-rose-700/60 transition shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="danger" className="text-[10px] font-mono">
                        Double-Booking Prevented
                      </Badge>
                      <span className="text-xs font-bold text-white">
                        {conflict.memberName} → Coach {conflict.trainerName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {new Date(conflict.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                        Requested Session Slot
                      </span>
                      <span className="font-semibold text-white mt-0.5 block">
                        📅 {conflict.sessionDate} • ⏰ {conflict.startTime} – {conflict.endTime}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                        Payment Protection Status
                      </span>
                      <span className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> 100% Protected (₱0.00 / 0 Coins)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                        Interception Action
                      </span>
                      <span className="font-semibold text-rose-300 mt-0.5 block">
                        Auto-Declined by System
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/30 text-xs text-rose-200">
                    <strong className="font-bold text-rose-100">Conflict Reason: </strong>
                    {conflict.reason || "Coach already had an active reservation or conflict during this time slot."}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coaches by name, email, or specialization..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="all">All Specializations</option>
            {SPECIALIZATION_PRESETS.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trainers Grid */}
      {filteredTrainers.length === 0 ? (
        <Card className="glass-card border-slate-800 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Coaches Found</h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto mb-6">
            {search || specializationFilter !== "all"
              ? "No coaches match your search criteria. Try clearing search or filter terms."
              : "No coaches are registered yet. Click 'Add New Trainer' to register your first personal trainer."}
          </p>
          {search || specializationFilter !== "all" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearch("");
                setSpecializationFilter("all");
              }}
            >
              Clear Filters
            </Button>
          ) : (
            <Button size="sm" onClick={() => setIsAddModalOpen(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
              Add First Trainer
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrainers.map((t) => (
            <Card
              key={t.id}
              className="glass-card border-slate-800 overflow-hidden p-0 flex flex-col justify-between hover:border-slate-700 transition group shadow-lg"
            >
              <div>
                {/* Header Image & Rating */}
                <div className="h-44 w-full bg-slate-950 relative overflow-hidden">
                  <img
                    src={
                      t.user?.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.user?.firstName || "Coach"}`
                    }
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Rating Tag */}
                  <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                    <span>{Number(t.rating || 5.0).toFixed(2)}</span>
                  </div>

                  {/* Loyalty Coin Rate Tag */}
                  <div className="absolute bottom-3 left-3 bg-amber-500/20 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-300 border border-amber-500/40">
                    🪙 {api.calculateTrainerCoins(t.hourlyRate)} Coins / hr
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {t.user?.firstName} {t.user?.lastName}
                      </h3>
                      <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                        {t.specialization}
                      </div>
                    </div>
                    {t.user?.status === "pending" ? (
                      <Badge variant="amber" className="text-[10px] py-0.5 px-2 font-mono">
                        Pending Confirmation
                      </Badge>
                    ) : (
                      <Badge variant="emerald" className="text-[10px] py-0.5 px-2">
                        Active
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-2.5 mb-4 line-clamp-2 leading-relaxed">
                    {t.bio}
                  </p>

                  {/* Key Metrics Matrix */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs mb-4">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Experience</span>
                      <strong className="text-white font-bold">{t.experienceYears} Years</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Hourly Rate</span>
                      <strong className="text-emerald-400 font-bold">
                        ₱{Number(t.hourlyRate).toFixed(2)}
                      </strong>
                    </div>
                    <div className="pt-2 col-span-2 border-t border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Max Capacity:</span>
                      <span className="text-white font-semibold">{t.maxClients} Active Clients</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{t.user?.email}</span>
                    </div>
                    {t.user?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{t.user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  ID: {t.id.slice(0, 8)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTrainerToDelete(t)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.user?.status === "pending" ? "Decline" : "Delete Trainer"}</span>
                  </button>

                  {t.user?.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleApproveTrainer(t)}
                      disabled={approvingId === t.id}
                      leftIcon={<CheckCircle className="w-3.5 h-3.5 text-white" />}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 shadow-sm"
                    >
                      {approvingId === t.id ? "Confirming..." : "Confirm"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
        </>
      )}

      {/* ================= ADD TRAINER MODAL ================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsAddModalOpen(false);
        }}
        title="Register New Personal Trainer"
        maxWidth="xl"
      >
        <form onSubmit={handleAddTrainer} className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                First Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="e.g. Marcus"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Last Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="e.g. Steele"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. marcus@bootcampfitness.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+63 917 123 4567"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Specialization Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Primary Specialization / Discipline <span className="text-rose-400">*</span>
            </label>
            <select
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {SPECIALIZATION_PRESETS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
              <option value="custom">Other / Custom Specialization...</option>
            </select>

            {form.specialization === "custom" && (
              <input
                type="text"
                required
                value={form.customSpecialization}
                onChange={(e) => setForm({ ...form, customSpecialization: e.target.value })}
                placeholder="Enter custom specialization (e.g. Kettlebell Athletics)"
                className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>

          {/* Experience, Rate, and Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Experience (Years)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hourly Rate (₱/hr)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Clients Capacity
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.maxClients}
                onChange={(e) => setForm({ ...form, maxClients: parseInt(e.target.value, 10) || 20 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Bio & Philosophy */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Bio, Certifications & Coaching Background
            </label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="e.g. CSCS Certified Strength Specialist with 5+ years experience in compound lift biomechanics and athletic powerlifting."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Optional Profile Avatar URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Profile Photo URL <span className="text-slate-500">(Optional — auto-generated if left blank)</span>
            </label>
            <input
              type="url"
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              placeholder="https://images.unsplash.com/... or leave empty"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Initial Password */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Account Login Password <span className="text-slate-500">(Trainer portal sign-in)</span>
            </label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Default: Password@123"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="font-bold">
              Add Personal Trainer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= DELETE TRAINER CONFIRMATION MODAL ================= */}
      <Modal
        isOpen={!!trainerToDelete}
        onClose={() => {
          if (!isSubmitting) setTrainerToDelete(null);
        }}
        title="Confirm Trainer Deletion"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-white text-sm">Permanently Delete Coach?</h4>
              <p className="text-rose-200/80 mt-1 leading-relaxed">
                You are about to delete{" "}
                <strong className="text-white">
                  Coach {trainerToDelete?.user?.firstName} {trainerToDelete?.user?.lastName}
                </strong>{" "}
                ({trainerToDelete?.specialization}).
              </p>
              <p className="text-slate-400 mt-2 text-[11px]">
                This will revoke their portal access and remove their profile from the Booking Hub.
              </p>
            </div>
          </div>

          {actionError && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 text-xs">
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setTrainerToDelete(null)}
            >
              Keep Trainer
            </Button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteTrainer}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-rose-950/50 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
