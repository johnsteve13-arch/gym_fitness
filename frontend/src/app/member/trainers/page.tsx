"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Trainer } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Dumbbell,
  Star,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  User,
  ShieldCheck,
  FileText,
  Sparkles,
  ArrowRight,
  Filter,
  UserCheck,
  Target,
  Flame,
  Award,
} from "lucide-react";

export default function MemberTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [specialtyFilter, setSpecialtyFilter] = useState("all");

  // Coin & Payment State
  const [coinBalance, setCoinBalance] = useState<number>(450);
  const [paymentMethod, setPaymentMethod] = useState<"coins" | "cash">("coins");

  // Booking Form State
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [targetWorkout, setTargetWorkout] = useState("Push & Shoulder Hypertrophy");
  const [sessionType, setSessionType] = useState("Hypertrophy & Progressive Overload");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [myBookings, setMyBookings] = useState<any[]>([]);

  const loadBookings = async () => {
    const currentUser = api.getCurrentUser();
    const storedMembers = api.getStoredMembers();
    const memberRecord =
      storedMembers.find(
        (m) => m.userId === currentUser?.id || m.user?.email.toLowerCase() === currentUser?.email.toLowerCase()
      ) || storedMembers[0];
    const memberId = memberRecord?.id || currentUser?.id;
    const b = await api.listBookings({ memberId });
    setMyBookings(b);
    setCoinBalance(api.getMemberCoins(memberId));
  };

  useEffect(() => {
    api.listTrainers().then(setTrainers);
    loadBookings();
    setCoinBalance(api.getMemberCoins());
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;

    const coinsCost = api.calculateTrainerCoins(selectedTrainer.hourlyRate);
    if (paymentMethod === "coins" && coinBalance < coinsCost) {
      alert(`Insufficient coin balance. You have ${coinBalance} coins, but this private session requires ${coinsCost} coins. Please switch to Direct Payment or earn more coins.`);
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = api.getCurrentUser();
      const storedMembers = api.getStoredMembers();
      const memberRecord =
        storedMembers.find(
          (m) => m.userId === currentUser?.id || m.user?.email.toLowerCase() === currentUser?.email.toLowerCase()
        ) || storedMembers[0];

      const [hours, minutes] = startTime.split(":");
      const endHour = ((parseInt(hours, 10) + 1) % 24).toString().padStart(2, "0");
      const endTime = `${endHour}:${minutes || "00"}`;

      const finalWorkoutType = targetWorkout ? `${targetWorkout} (${sessionType})` : sessionType;
      const combinedNotes = targetWorkout
        ? `Target Workout: ${targetWorkout}. ${notes || "Coaching on technique, progressive overload, and spotting."}`
        : notes || "Form analysis and calibrated strength testing";

      const res = await api.bookTrainer({
        trainerId: selectedTrainer.id,
        trainerUserId: selectedTrainer.userId || selectedTrainer.user?.id,
        trainerEmail: selectedTrainer.user?.email,
        trainerName: `${selectedTrainer.user?.firstName || "Coach"} ${selectedTrainer.user?.lastName || ""}`,
        memberId: memberRecord?.id || `mem-${currentUser?.id || Date.now()}`,
        memberName: `${currentUser?.firstName || "Athlete"} ${currentUser?.lastName || ""}`,
        memberEmail: currentUser?.email || "athlete@apexfitness.com",
        memberPhone: currentUser?.phone || memberRecord?.user?.phone || "+63 (917) 000-0000",
        memberCode: memberRecord?.memberCode || "MEM-ATHLETE",
        sessionDate,
        startTime,
        endTime,
        sessionType: finalWorkoutType,
        notes: combinedNotes,
        price: selectedTrainer.hourlyRate,
        paymentMethod,
        coinsPaid: paymentMethod === "coins" ? coinsCost : undefined,
      });

      const updatedCoins = api.getMemberCoins();
      setCoinBalance(updatedCoins);

      if (paymentMethod === "coins") {
        setActionSuccess(
          `Personal Trainer booked! Successfully redeemed ${coinsCost} coins for Coach ${selectedTrainer.user?.firstName}. Remaining balance: ${updatedCoins} coins.`
        );
      } else {
        setActionSuccess(
          `Personal Trainer booked! Coach ${selectedTrainer.user?.firstName} reserved for your "${targetWorkout}" workout on ${sessionDate} at ${startTime} (₱${Number(selectedTrainer.hourlyRate).toFixed(2)} PHP)!`
        );
      }

      setSelectedTrainer(null);
      setNotes("");
      await loadBookings();
      setTimeout(() => setActionSuccess(""), 6000);
    } catch (err: any) {
      alert(err.message || "Failed to complete reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTrainers = trainers.filter((t) => {
    if (specialtyFilter === "all") return true;
    const spec = (t.specialization || "").toLowerCase();
    const bio = (t.bio || "").toLowerCase();
    if (specialtyFilter === "strength") return spec.includes("strength") || bio.includes("strength") || spec.includes("power");
    if (specialtyFilter === "hypertrophy") return spec.includes("hypertrophy") || bio.includes("hypertrophy") || spec.includes("bodybuilding");
    if (specialtyFilter === "barbell") return spec.includes("barbell") || bio.includes("barbell") || spec.includes("olympic");
    if (specialtyFilter === "conditioning") return spec.includes("conditioning") || bio.includes("conditioning") || spec.includes("hiit");
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-400" />
            <span>Book a Personal Trainer for Your Workout</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Choose the trainer you want for your workout to spot your lifts, analyze biomechanics, and optimize progressive overload
          </p>
        </div>

        <Link href="/member/workouts">
          <Button size="sm" variant="outline" leftIcon={<Dumbbell className="w-4 h-4 text-emerald-400" />}>
            Go to Workout Tracker
          </Button>
        </Link>
      </div>

      {/* Loyalty Coin Balance Hero Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Loyalty Coin Balance</span>
              <Badge variant="warning" className="text-[10px]">Use coins to pay trainers</Badge>
            </div>
            <div className="text-2xl font-black text-white flex items-center gap-2 mt-0.5">
              <span>{coinBalance} Coins Available</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 sm:text-right max-w-sm leading-relaxed">
          You can use or redeem coins earned from workouts and check-ins to pay your trainer, provided there is a sufficient balance for the session!
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/40">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <span className="text-xs text-slate-400 mr-1 flex items-center gap-1 font-semibold">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Workout Specialization:</span>
        </span>
        {[
          { key: "all", label: `All Coaches (${trainers.length})` },
          { key: "strength", label: "Strength & Power" },
          { key: "hypertrophy", label: "Hypertrophy & Muscle" },
          { key: "barbell", label: "Olympic Barbell" },
          { key: "conditioning", label: "Conditioning & HIIT" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSpecialtyFilter(tab.key)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              specialtyFilter === tab.key
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TRAINERS ROSTER GRID */}
      {filteredTrainers.length === 0 ? (
        <Card className="glass-card border-slate-800 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Coaches Found</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {trainers.length === 0
              ? "Personal coaches are currently onboarding. Private 1-on-1 booking slots will open as soon as certified trainers register."
              : "No coaches match this specific specialization filter. Click 'All Coaches' to view all available trainers."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredTrainers.map((t) => {
            const coinsCost = api.calculateTrainerCoins(t.hourlyRate);
            const canAffordWithCoins = coinBalance >= coinsCost;

            return (
              <Card key={t.id} className="glass-card border-slate-800 overflow-hidden p-0 flex flex-col justify-between">
                <div>
                  <div className="h-44 w-full bg-slate-800 relative">
                    <img
                      src={t.user?.avatarUrl || "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=300"}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-emerald-400" />
                      <span>{Number(t.rating).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white">
                      Coach {t.user?.firstName} {t.user?.lastName}
                    </h3>
                    <div className="text-xs text-emerald-400 font-semibold mb-2">{t.specialization}</div>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-3">{t.bio}</p>

                    <div className="flex justify-between items-center text-xs text-slate-300 border-t border-slate-800 pt-3">
                      <div>
                        <span className="text-slate-400 block">Rate:</span>
                        <strong className="text-emerald-400 font-bold">₱{Number(t.hourlyRate).toFixed(2)}/hr</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">Or Redeem:</span>
                        <span className={`font-bold flex items-center justify-end gap-1 ${
                          canAffordWithCoins ? "text-amber-400" : "text-slate-500"
                        }`}>
                          <Award className="w-3.5 h-3.5" />
                          <span>{coinsCost} Coins</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <Button
                    size="sm"
                    className="w-full font-bold"
                    onClick={() => {
                      setSelectedTrainer(t);
                      setPaymentMethod(canAffordWithCoins ? "coins" : "cash");
                      setTargetWorkout("Push & Shoulder Hypertrophy");
                    }}
                    leftIcon={<Calendar className="w-4 h-4" />}
                  >
                    Book for Your Workout
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MEMBER'S SCHEDULED SESSIONS */}
      <Card className="glass-card border-slate-800 p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Your Scheduled Private Coaching Sessions</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Upcoming workout appointments reserved with your coaches</p>
          </div>
          <Badge variant="neutral">{myBookings.length} Booked</Badge>
        </div>

        {myBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Clock className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            You have no active 1-on-1 coaching reservations. Click &ldquo;Book for Your Workout&rdquo; on any coach card above to schedule.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {myBookings.map((b) => {
              const isCoins = b.paymentMethod === "coins" || b.coinsPaid !== undefined;
              const coinsPaid = b.coinsPaid || api.calculateTrainerCoins(b.price || 75);

              return (
                <div key={b.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {b.trainerName || (b.trainer?.user ? `Coach ${b.trainer.user.firstName} ${b.trainer.user.lastName}` : "Certified Coach")}
                      </span>
                      <Badge variant={b.status === "completed" ? "neutral" : "success"} className="text-[10px]">
                        {b.status === "completed" ? "Completed" : "Confirmed"}
                      </Badge>
                      {isCoins ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                          <Award className="w-3 h-3" />
                          <span>Paid with Coins</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          <span>Direct Payment</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{b.sessionDate} • {b.startTime} – {b.endTime}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">{b.sessionType || "1-on-1 Workout Coaching"}</span>
                    </div>

                    {b.notes && (
                      <div className="text-[11px] text-slate-400 italic">
                        Focus: {b.notes}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {isCoins ? (
                      <div>
                        <div className="flex items-center justify-end gap-1 text-xs font-black text-amber-400">
                          <Award className="w-3.5 h-3.5" />
                          <span>{coinsPaid} Coins</span>
                        </div>
                        <div className="text-[10px] text-amber-400/80 font-medium">Redeemed via Coins</div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          ₱{Number(b.price || 75).toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-500">Reserved</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* BOOK TRAINER MODAL */}
      {selectedTrainer && (() => {
        const coinsCost = api.calculateTrainerCoins(selectedTrainer.hourlyRate);
        const hasSufficientCoins = coinBalance >= coinsCost;

        return (
          <Modal
            isOpen={true}
            onClose={() => setSelectedTrainer(null)}
            title={`Book Coach ${selectedTrainer.user?.firstName} ${selectedTrainer.user?.lastName || ""} for Your Workout`}
          >
            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Workout Routine / Muscle Group
                </label>
                <input
                  type="text"
                  value={targetWorkout}
                  onChange={(e) => setTargetWorkout(e.target.value)}
                  placeholder="e.g. Heavy Barbell Bench & Shoulder Hypertrophy, Leg Day & Squat Technique"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Session Date</label>
                  <input
                    type="date"
                    value={sessionDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Coaching Methodology & Focus</label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                >
                  <option value="Hypertrophy & Progressive Overload">Hypertrophy & Progressive Overload</option>
                  <option value="Olympic Barbell Technique & Power">Olympic Barbell Technique & Power</option>
                  <option value="HIIT Conditioning & Metabolic Acceleration">HIIT Conditioning & Metabolic Acceleration</option>
                  <option value="Functional Mobility, Recovery & Joint Rehab">Functional Mobility, Recovery & Joint Rehab</option>
                  <option value="Body Recomposition & Caloric Assessment">Body Recomposition & Caloric Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  What do you want the coach to assist you with in this workout?
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Scapular bar path check on heavy incline bench, spotting PR singles, or squat depth check."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                />
              </div>

              {/* PAYMENT METHOD SELECTION & COIN BALANCE CHECK */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    Payment Method
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Your Balance: <strong className="text-amber-400">{coinBalance} Coins</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pay with Coins Card */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("coins")}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                      paymentMethod === "coins"
                        ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      paymentMethod === "coins" ? "bg-amber-500/20 text-amber-400" : "bg-slate-900 text-slate-500"
                    }`}>
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Redeem Coins</span>
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                          {coinsCost} Coins
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {hasSufficientCoins ? (
                          <span className="text-emerald-400 font-medium">✓ Balance Sufficient</span>
                        ) : (
                          <span className="text-rose-400 font-medium">✗ Insufficient ({coinBalance}/{coinsCost})</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Cash / Card Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                      paymentMethod === "cash"
                        ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/50"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      paymentMethod === "cash" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-900 text-slate-500"
                    }`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Direct Payment</span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                          ₱{Number(selectedTrainer.hourlyRate).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Cash or Card at desk
                      </div>
                    </div>
                  </button>
                </div>

                {/* Coin Balance Status Notification */}
                {paymentMethod === "coins" && (
                  <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                    hasSufficientCoins
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}>
                    {hasSufficientCoins ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-white">Sufficient Balance:</strong> You have {coinBalance} coins.
                          After this reservation, your remaining balance will be{" "}
                          <strong className="text-emerald-300">{coinBalance - coinsCost} coins</strong>.
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-white">Insufficient Balance for Payment:</strong> This private coach session requires{" "}
                          <strong className="text-white">{coinsCost} coins</strong>, but your balance is only{" "}
                          <strong className="text-rose-400">{coinBalance} coins</strong>. Please switch to Direct Payment or earn more coins through workouts.
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setSelectedTrainer(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={submitting}
                  disabled={paymentMethod === "coins" && !hasSufficientCoins}
                  className={paymentMethod === "coins" ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold" : "neon-glow font-bold"}
                >
                  {paymentMethod === "coins"
                    ? (hasSufficientCoins ? `Redeem ${coinsCost} Coins & Book Coach` : `Insufficient Coins (${coinBalance}/${coinsCost})`)
                    : "Confirm Coach Reservation"}
                </Button>
              </div>
            </form>
          </Modal>
        );
      })()}
    </div>
  );
}
