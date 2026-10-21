"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Trainer, TrainerUnavailability } from "@/types";
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
  AlertTriangle,
  Lock,
  RefreshCw,
  Zap,
  Timer,
  LogIn,
} from "lucide-react";

export default function MemberTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [specialtyFilter, setSpecialtyFilter] = useState("all");

  // Coin & Payment State
  const [coinBalance, setCoinBalance] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<"coins" | "cash">("coins");

  // Booking Form State (Customizable Time From and Time Until)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [targetWorkout, setTargetWorkout] = useState("Push & Shoulder Hypertrophy");
  const [sessionType, setSessionType] = useState("Hypertrophy & Progressive Overload");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [myBookings, setMyBookings] = useState<any[]>([]);

  // Real-Time Availability & Slot Checking State
  const [availabilityData, setAvailabilityData] = useState<{
    workingHours: { startTime: string; endTime: string };
    bookedSlots: { startTime: string; endTime: string; status: string }[];
    slots: {
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      status: "available" | "booked" | "outside_hours" | "unavailable";
      adminDescription?: string | null;
    }[];
    alternativeTrainers: any[];
    adminUnavailability?: TrainerUnavailability | null;
  } | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [activeUnavailabilities, setActiveUnavailabilities] = useState<TrainerUnavailability[]>([]);

  // Declined Booking Modal State (Alternatives & Payment Protection)
  const [declinedModalOpen, setDeclinedModalOpen] = useState(false);
  const [declinedInfo, setDeclinedInfo] = useState<{
    trainer: Trainer;
    date: string;
    startTime: string;
    endTime: string;
    message: string;
    availableSlots: string[];
    alternativeTrainers: any[];
  } | null>(null);

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

  const loadUnavailabilities = async () => {
    try {
      const unavs = await api.getTrainerUnavailabilities();
      setActiveUnavailabilities(unavs);
    } catch (e) {
      console.warn("Failed to load trainer unavailabilities:", e);
    }
  };

  const fetchAvailability = async (trainerId: string, date: string, time?: string, end?: string) => {
    setLoadingAvailability(true);
    try {
      const data = await api.getTrainerAvailability(trainerId, date, time, end);
      setAvailabilityData(data);
    } catch (e) {
      console.warn("Failed to fetch trainer availability:", e);
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    api.listTrainers().then(setTrainers);
    loadBookings();
    loadUnavailabilities();
    setCoinBalance(api.getMemberCoins());
  }, []);

  // Real-Time Availability fetch whenever selected trainer, date, or time window changes
  useEffect(() => {
    if (selectedTrainer) {
      fetchAvailability(selectedTrainer.id, sessionDate, startTime, endTime);
    } else {
      setAvailabilityData(null);
    }
  }, [selectedTrainer?.id, sessionDate, startTime, endTime]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking? The trainer's slot will be freed immediately in real-time.")) return;
    try {
      await api.updateBookingStatus(bookingId, "cancelled");
      await loadBookings();
      if (selectedTrainer) {
        await fetchAvailability(selectedTrainer.id, sessionDate, startTime);
      }
      setActionSuccess("Booking cancelled. The trainer's schedule has been freed in real-time.");
      setTimeout(() => setActionSuccess(""), 5000);
    } catch (e: any) {
      alert(e.message || "Failed to cancel booking.");
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;

    if (endTime <= startTime) {
      alert("Invalid session duration: 'Time to Finish' must be later than 'Time to Start'.");
      return;
    }

    const durationHours = api.calculateDurationHours(startTime, endTime);
    const durationText = api.formatDurationText(startTime, endTime);
    const trainerRate = Number(selectedTrainer.hourlyRate) === 500 ? 80 : Number(selectedTrainer.hourlyRate);
    const coinsCost = api.calculateTrainerCoins(trainerRate, durationHours);
    const calculatedPrice = Math.round(trainerRate * durationHours);

    if (paymentMethod === "coins" && coinBalance < coinsCost) {
      alert(`Insufficient coin balance. You have ${coinBalance} coins, but this ${durationHours}-hour private session requires ${coinsCost} coins. Please switch to Direct Payment or earn more coins.`);
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
        price: calculatedPrice,
        paymentMethod,
        coinsPaid: paymentMethod === "coins" ? coinsCost : undefined,
      });

      const updatedCoins = api.getMemberCoins();
      setCoinBalance(updatedCoins);

      if (paymentMethod === "coins") {
        setActionSuccess(
          `Personal Trainer booked! Successfully redeemed ${coinsCost} coins for Coach ${selectedTrainer.user?.firstName} (Time to Start: ${startTime} • Time to Finish: ${endTime} — Takes ${durationText} from start to finish). Remaining balance: ${updatedCoins} coins.`
        );
      } else {
        setActionSuccess(
          `Personal Trainer booked! Coach ${selectedTrainer.user?.firstName} reserved (Time to Start: ${startTime} • Time to Finish: ${endTime} — Takes ${durationText} from start to finish) on ${sessionDate} (₱${calculatedPrice.toFixed(2)} PHP)!`
        );
      }

      // Real-time Availability update
      await loadBookings();
      if (selectedTrainer) {
        await fetchAvailability(selectedTrainer.id, sessionDate, startTime);
      }

      setSelectedTrainer(null);
      setNotes("");
      setTimeout(() => setActionSuccess(""), 6000);
    } catch (err: any) {
      const errMsg = err?.message || "";
      const isDeclined =
        errMsg.includes("Booking Declined") ||
        errMsg.includes("Booking Blocked") ||
        errMsg.includes("unavailable") ||
        errMsg.includes("conflict") ||
        errMsg.includes("reservation") ||
        errMsg.includes("outside");

      if (isDeclined) {
        // Collect alternative slots & coaches from current availability
        const openSlots = availabilityData?.slots?.filter((s) => s.isAvailable && s.status !== "unavailable").map((s) => s.startTime) || [];
        const altTrainers = availabilityData?.alternativeTrainers || [];

        setDeclinedInfo({
          trainer: selectedTrainer,
          date: sessionDate,
          startTime,
          endTime,
          message: errMsg || "Booking Declined: The selected trainer is unavailable at your chosen date and time. Please select another trainer or choose a different time slot.",
          availableSlots: openSlots,
          alternativeTrainers: altTrainers,
        });

        // Close booking modal and pop declined conflict modal
        setSelectedTrainer(null);
        setDeclinedModalOpen(true);

        // Update bookings and availability in real-time
        loadBookings();
      } else {
        alert(err.message || "Failed to complete reservation.");
      }
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
            const activeUnav = activeUnavailabilities.find(
              (u) => (u.trainerId === t.id || u.trainerId === t.userId) && u.date === sessionDate
            );

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
                    <p className="text-xs text-slate-400 mb-3 line-clamp-3">{t.bio}</p>

                    {activeUnav && (
                      <div className="mb-3 p-2 rounded-lg bg-amber-950/60 border border-amber-600/40 text-[11px] text-amber-200">
                        <div className="flex items-center gap-1 font-bold text-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Admin Notice ({activeUnav.isFullDay ? "Full Day" : `${activeUnav.startTime}-${activeUnav.endTime}`}):</span>
                        </div>
                        <div className="mt-0.5 text-slate-300 italic line-clamp-2">
                          &ldquo;{activeUnav.description}&rdquo;
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-slate-300 border-t border-slate-800 pt-3">
                      <div>
                        <span className="text-slate-400 block">Rate:</span>
                        <strong className="text-emerald-400 font-bold">₱{Number(t.hourlyRate === 500 ? 80 : t.hourlyRate).toFixed(2)}/hr</strong>
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
                      <Badge
                        variant={
                          b.status === "completed"
                            ? "neutral"
                            : b.status === "declined"
                            ? "danger"
                            : b.status === "cancelled"
                            ? "warning"
                            : "success"
                        }
                        className="text-[10px]"
                      >
                        {b.status === "completed"
                          ? "Completed"
                          : b.status === "declined"
                          ? "Declined (Conflict Prevented)"
                          : b.status === "cancelled"
                          ? "Cancelled"
                          : "Confirmed"}
                      </Badge>
                      {b.status === "declined" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Payment Protected</span>
                        </span>
                      ) : isCoins ? (
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

                    <div className="text-xs text-emerald-400 font-medium flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{b.sessionDate}</span>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1.5 text-amber-300 font-mono">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Time to Start: <strong className="text-white">{b.startTime}</strong></span>
                        <span className="text-slate-600">→</span>
                        <span>Time to Finish: <strong className="text-white">{b.endTime}</strong></span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                        Takes {api.formatDurationText(b.startTime, b.endTime)} from start to finish
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-300">{b.sessionType || "1-on-1 Workout Coaching"}</span>
                    </div>

                    {b.notes && (
                      <div className="text-[11px] text-slate-400 italic">
                        {b.status === "declined" ? `Reason: ${b.notes}` : `Focus: ${b.notes}`}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {b.status === "declined" ? (
                      <div>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          ₱0.00 / 0 Coins
                        </span>
                        <div className="text-[10px] text-slate-500">No charge</div>
                      </div>
                    ) : isCoins ? (
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

                    {(b.status === "confirmed" || b.status === "pending") && (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(b.id)}
                        className="mt-2 text-[10px] text-rose-400 hover:text-rose-300 font-semibold hover:underline block ml-auto transition"
                      >
                        Cancel Session
                      </button>
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
        const durationHours = api.calculateDurationHours(startTime, endTime);
        const trainerRate = Number(selectedTrainer.hourlyRate) === 500 ? 80 : Number(selectedTrainer.hourlyRate);
        const coinsCost = api.calculateTrainerCoins(trainerRate, durationHours);
        const calculatedPrice = Math.round(trainerRate * durationHours);
        const hasSufficientCoins = coinBalance >= coinsCost;
        const isTimeValid = endTime > startTime;

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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Session Date</span>
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Start Time</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-normal">Time to Start</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartTime(newStart);
                      if (endTime <= newStart) {
                        const [h, m] = newStart.split(":").map(Number);
                        const nextH = ((h + 1) % 24).toString().padStart(2, "0");
                        setEndTime(`${nextH}:${(m || 0).toString().padStart(2, "0")}`);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>End Time</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-normal">Time to Finish</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 font-mono ${
                      !isTimeValid ? "border-rose-500 text-rose-300" : "border-slate-800"
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Quick Duration Presets for End Time */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px] font-medium">Quick End Time Presets:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "+1 hr", hours: 1 },
                    { label: "+1.5 hrs", hours: 1.5 },
                    { label: "+2 hrs", hours: 2 },
                    { label: "+3 hrs", hours: 3 },
                  ].map((preset) => {
                    const [sH, sM] = (startTime || "10:00").split(":").map(Number);
                    const totalMins = (sH || 10) * 60 + (sM || 0) + Math.round(preset.hours * 60);
                    const targetEnd = `${Math.floor((totalMins / 60) % 24).toString().padStart(2, "0")}:${(totalMins % 60).toString().padStart(2, "0")}`;
                    const isActive = endTime === targetEnd;

                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setEndTime(targetEnd)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition border ${
                          isActive
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold ring-1 ring-emerald-500/40"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {preset.label} ({targetEnd})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Duration and Pricing Preview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    It takes <strong className="text-white">{api.formatDurationText(startTime, endTime)}</strong> from start to finish
                    <span className="text-slate-500 text-[11px] block sm:inline sm:ml-1">
                      (Start: {startTime} → End: {endTime})
                    </span>
                  </span>
                </span>
                <span className="font-bold text-emerald-400 shrink-0">
                  ₱{calculatedPrice.toFixed(2)} / {coinsCost} Coins
                </span>
              </div>

              {!isTimeValid && (
                <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/50 text-[11px] text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Invalid Time Range: &ldquo;End Time&rdquo; must be later than &ldquo;Start Time&rdquo;.</span>
                </div>
              )}

              {/* REAL-TIME AVAILABILITY & INTERACTIVE SLOT SELECTOR */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Real-Time Trainer Availability ({sessionDate})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {loadingAvailability ? (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Checking schedule...
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Live Synced
                      </span>
                    )}
                  </div>
                </div>

                {/* Admin Unavailability Notice Banner */}
                {availabilityData?.adminUnavailability && (
                  <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-600/60 text-amber-200 text-xs shadow-lg space-y-1.5 animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-amber-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span>Admin Notice: Coach Unavailable</span>
                            <Badge variant="warning" className="text-[9px] py-0 px-1.5">
                              {availabilityData.adminUnavailability.isFullDay
                                ? "Full Day Locked"
                                : `${availabilityData.adminUnavailability.startTime} - ${availabilityData.adminUnavailability.endTime}`}
                            </Badge>
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {availabilityData.adminUnavailability.date}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-100 text-xs font-medium leading-relaxed">
                          <strong>Admin Description:</strong> &ldquo;{availabilityData.adminUnavailability.description}&rdquo;
                        </p>
                        <p className="text-[10px] text-amber-400/90 mt-0.5">
                          Category: <span className="font-semibold text-white capitalize">{availabilityData.adminUnavailability.reasonCategory.replace(/_/g, " ")}</span> • This coach has been marked unavailable by Gym Administration. Matching time slots are locked in real-time.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400">
                  Select an open time slot below. Each slot shows the exact Start Time and End Time. Booked and Admin-restricted slots are locked in real-time to prevent double booking.
                </p>

                {/* END TIME & REAL-TIME AVAILABILITY WINDOW BAR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Availability Time Window</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-400 text-[11px]">Start Time:</span>
                      <strong className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{startTime}</strong>
                      <span className="text-slate-500 font-bold">→</span>
                      <span className="text-slate-400 text-[11px]">End Time:</span>
                      <strong className="text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">{endTime}</strong>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        ({api.formatDurationText(startTime, endTime)})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-300 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>End Time:</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:border-amber-400 transition"
                      title="Adjust End Time for availability slot"
                    />
                  </div>
                </div>

                {/* GRID OF SLOTS WITH EXPLICIT START TIME AND END TIME */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {(availabilityData?.slots || [
                    { startTime: "08:00", endTime: "09:00", isAvailable: true, status: "available" },
                    { startTime: "09:00", endTime: "10:00", isAvailable: true, status: "available" },
                    { startTime: "10:00", endTime: "11:00", isAvailable: true, status: "available" },
                    { startTime: "11:00", endTime: "12:00", isAvailable: true, status: "available" },
                    { startTime: "13:00", endTime: "14:00", isAvailable: true, status: "available" },
                    { startTime: "14:00", endTime: "15:00", isAvailable: true, status: "available" },
                    { startTime: "15:00", endTime: "16:00", isAvailable: true, status: "available" },
                    { startTime: "16:00", endTime: "17:00", isAvailable: true, status: "available" },
                    { startTime: "17:00", endTime: "18:00", isAvailable: true, status: "available" },
                  ]).map((slot: any) => {
                    const isSelected = startTime === slot.startTime && endTime === slot.endTime;
                    const isUnavailable = slot.status === "unavailable" || !!slot.adminDescription;
                    const isBooked = !slot.isAvailable && !isUnavailable;
                    const isBlocked = isBooked || isUnavailable;

                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={isBlocked}
                        onClick={() => {
                          setStartTime(slot.startTime);
                          setEndTime(slot.endTime);
                        }}
                        className={`p-2.5 rounded-xl text-left transition border flex flex-col justify-between gap-2 ${
                          isUnavailable
                            ? "bg-amber-950/30 border-amber-800/50 text-slate-400 cursor-not-allowed opacity-80"
                            : isBooked
                            ? "bg-slate-950/80 border-rose-950 text-slate-500 cursor-not-allowed opacity-60"
                            : isSelected
                            ? "bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/40 shadow-sm"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                            {slot.startTime < "12:00" ? "Morning" : slot.startTime < "17:00" ? "Afternoon" : "Evening"}
                          </span>
                          {isUnavailable ? (
                            <span className="text-[9px] text-amber-300 font-sans font-bold flex items-center gap-1 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
                              <Lock className="w-2.5 h-2.5 text-amber-400" /> Unavailable
                            </span>
                          ) : isBooked ? (
                            <span className="text-[9px] text-rose-400 font-sans font-bold flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> Booked
                            </span>
                          ) : isSelected ? (
                            <span className="text-[9px] text-emerald-300 font-sans font-black bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40">
                              ✓ Picked
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-400/90 font-sans font-bold">
                              Open
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between font-mono text-xs font-bold">
                          <div className="flex flex-col text-left">
                            <span className="text-[9px] text-slate-400 font-sans uppercase font-normal">Start Time</span>
                            <span className="text-white">{slot.startTime}</span>
                          </div>
                          <span className="text-slate-600 font-normal">→</span>
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] text-amber-400 font-sans uppercase font-normal">End Time</span>
                            <span className="text-amber-300">{slot.endTime}</span>
                          </div>
                        </div>

                        {isUnavailable ? (
                          <div className="text-[10px] text-amber-300/90 flex flex-col pt-1 border-t border-slate-900 leading-tight">
                            <span className="text-[9px] text-amber-500 font-semibold uppercase tracking-wider">Admin Reason:</span>
                            <span className="truncate italic font-medium">
                              &ldquo;{slot.adminDescription || availabilityData?.adminUnavailability?.description || "Marked unavailable by Admin"}&rdquo;
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5 border-t border-slate-900">
                            <span>Duration: 1 hr</span>
                            <span className="text-[9px] font-sans text-slate-400">{isBooked ? "Locked" : "Click to select"}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
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
                          ₱{calculatedPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Cash or Card at desk (₱{trainerRate.toFixed(2)}/hr × {durationHours} hr{durationHours > 1 ? "s" : ""})
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
                          After this {durationHours}-hour reservation, your remaining balance will be{" "}
                          <strong className="text-emerald-300">{coinBalance - coinsCost} coins</strong>.
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-white">Insufficient Balance for Payment:</strong> This {durationHours}-hour private coach session requires{" "}
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
                  disabled={(paymentMethod === "coins" && !hasSufficientCoins) || !isTimeValid}
                  className={paymentMethod === "coins" ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold" : "neon-glow font-bold"}
                >
                  {!isTimeValid
                    ? "Invalid Time Range (End Time must be after Start Time)"
                    : paymentMethod === "coins"
                    ? (hasSufficientCoins ? `Redeem ${coinsCost} Coins & Book Coach` : `Insufficient Coins (${coinBalance}/${coinsCost})`)
                    : `Confirm Coach Reservation (₱${calculatedPrice.toFixed(2)})`}
                </Button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* BOOKING DECLINED & SUGGESTED ALTERNATIVES MODAL */}
      {declinedModalOpen && declinedInfo && (
        <Modal
          isOpen={true}
          onClose={() => setDeclinedModalOpen(false)}
          title="Booking Transaction Declined"
        >
          <div className="space-y-4">
            {/* Clear Notification Banner */}
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs shadow-lg space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-rose-100 text-sm">
                    Booking Declined
                  </h4>
                  <p className="mt-1 font-medium text-rose-200 leading-relaxed">
                    {declinedInfo.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Protection Guarantee Badge */}
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-600/50 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Payment Protected</span>
                  <Badge variant="success" className="text-[9px] py-0 px-1.5 font-mono">
                    ₱0.00 Charged • 0 Coins Deducted
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-300/90 mt-0.5 leading-snug">
                  No payment or coins were deducted from your account. Your transaction was safely stopped before any charges could occur.
                </p>
              </div>
            </div>

            {/* Suggest Alternatives */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Suggested Alternatives</span>
              </h4>

              {/* Alternative Open Slots with this Coach */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-200 block">
                  Option A: Choose another available time slot with Coach {declinedInfo.trainer.user?.firstName}:
                </span>
                {declinedInfo.availableSlots.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {declinedInfo.availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setStartTime(slot);
                          const [h, m] = slot.split(":");
                          const nextH = ((parseInt(h, 10) + 1) % 24).toString().padStart(2, "0");
                          setEndTime(`${nextH}:${m}`);
                          setSelectedTrainer(declinedInfo.trainer);
                          setDeclinedModalOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Clock className="w-3 h-3" />
                        <span>
                          Start: {slot} → End: {((parseInt(slot.split(":")[0], 10) + 1) % 24).toString().padStart(2, "0")}:{slot.split(":")[1]}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Coach {declinedInfo.trainer.user?.firstName} has no other open slots on {declinedInfo.date}. Please try another date or switch coaches below.
                  </p>
                )}
              </div>

              {/* Alternative Available Trainers */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-200 block">
                  Option B: Select another certified coach available at {declinedInfo.startTime} on {declinedInfo.date}:
                </span>
                {declinedInfo.alternativeTrainers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {declinedInfo.alternativeTrainers.map((alt) => {
                      const fullAlt = trainers.find((t) => t.id === alt.id);
                      return (
                        <div
                          key={alt.id}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 hover:border-emerald-500/50 transition"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{alt.name}</div>
                            <div className="text-[10px] text-emerald-400 truncate">{alt.specialization}</div>
                            <div className="text-[10px] text-slate-400 font-mono">₱{alt.hourlyRate === 500 ? 80 : alt.hourlyRate}/hr</div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (fullAlt) {
                                setSelectedTrainer(fullAlt);
                              } else {
                                const found = trainers.find((t) => t.id === alt.id) || null;
                                setSelectedTrainer(found);
                              }
                              setDeclinedModalOpen(false);
                            }}
                            className="text-[11px] py-1 px-2.5 font-bold shrink-0"
                          >
                            Select Coach
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    Browse other coaches in the catalog above to reserve a session.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeclinedModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
