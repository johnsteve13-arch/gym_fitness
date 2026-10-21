"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { Member, Trainer } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  QrCode,
  Calendar,
  Clock,
  Award,
  Sparkles,
  Dumbbell,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Flame,
  Scale,
  UserCheck,
  Users,
  Target,
  Timer,
  AlertTriangle,
} from "lucide-react";

export default function MemberOverviewPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [coinBalance, setCoinBalance] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<"coins" | "cash">("coins");

  // Quick Book Form State (Customizable Time From and Time Until)
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [workoutRoutine, setWorkoutRoutine] = useState("Push & Shoulder Hypertrophy");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const user = api.getCurrentUser();
    const storedMembers = api.getStoredMembers();
    const memberRecord =
      storedMembers.find(
        (m) => m.userId === user?.id || m.user?.email.toLowerCase() === user?.email.toLowerCase()
      ) || storedMembers[0];

    const memberId = memberRecord?.id || (user as any)?.member?.id || user?.id || "";

    api.getMember(memberId).then((res) => {
      if (res) {
        setMember(res);
        if (res.rewardCoins !== undefined) setCoinBalance(res.rewardCoins);
      } else if (memberRecord) {
        setMember(memberRecord);
        if (memberRecord.rewardCoins !== undefined) setCoinBalance(memberRecord.rewardCoins);
      }
    });

    api.listBookings({ memberId }).then((b) => {
      if (b) setBookings(b);
    });

    api.listTrainers().then((trList) => {
      setTrainers(trList);
      if (trList.length > 0) {
        setSelectedTrainerId(trList[0].id);
      }
    });

    setCoinBalance(api.getMemberCoins());
  }, []);

  const handleQuickBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const coach = trainers.find((t) => t.id === selectedTrainerId) || trainers[0];
    if (!coach) {
      alert("No personal trainer selected.");
      return;
    }

    if (endTime <= startTime) {
      alert("Invalid session time: 'Time to Finish' must be later than 'Time to Start'.");
      return;
    }

    const durationHours = api.calculateDurationHours(startTime, endTime);
    const durationText = api.formatDurationText(startTime, endTime);
    const coinsCost = api.calculateTrainerCoins(coach.hourlyRate, durationHours);
    const calculatedPrice = Math.round(Number(coach.hourlyRate) * durationHours);

    if (paymentMethod === "coins" && coinBalance < coinsCost) {
      alert(`Insufficient coin balance. You have ${coinBalance} coins, but this ${durationHours}-hour session requires ${coinsCost} coins. Please switch to Direct Payment or earn more coins.`);
      return;
    }

    setBookingLoading(true);
    try {
      const user = api.getCurrentUser();
      const storedMembers = api.getStoredMembers();
      const memberRecord =
        storedMembers.find(
          (m) => m.userId === user?.id || m.user?.email.toLowerCase() === user?.email.toLowerCase()
        ) || storedMembers[0];

      await api.bookTrainer({
        trainerId: coach.id,
        trainerUserId: coach.userId || coach.user?.id,
        trainerEmail: coach.user?.email,
        trainerName: `${coach.user?.firstName || "Coach"} ${coach.user?.lastName || ""}`,
        memberId: memberRecord?.id || `mem-${user?.id || Date.now()}`,
        memberName: `${user?.firstName || "Athlete"} ${user?.lastName || ""}`,
        memberEmail: user?.email || "athlete@apexfitness.com",
        memberPhone: user?.phone || memberRecord?.user?.phone || "+63 (917) 000-0000",
        memberCode: memberRecord?.memberCode || "MEM-ATHLETE",
        sessionDate,
        startTime,
        endTime,
        sessionType: workoutRoutine || "1-on-1 Workout Coaching",
        notes: `Target Workout: ${workoutRoutine}. ${bookingNotes || "Lifting form critique and progressive overload assistance."}`,
        price: calculatedPrice,
        paymentMethod,
        coinsPaid: paymentMethod === "coins" ? coinsCost : undefined,
      });

      const updatedCoins = api.getMemberCoins();
      setCoinBalance(updatedCoins);
      if (member) {
        setMember({ ...member, rewardCoins: updatedCoins });
      }

      setIsQuickBookOpen(false);
      setBookingNotes("");

      if (paymentMethod === "coins") {
        setActionSuccess(
          `Personal trainer booked! Redeemed ${coinsCost} coins for Coach ${coach.user?.firstName} (Time to Start: ${startTime} • Time to Finish: ${endTime} — Takes ${durationText} from start to finish). Remaining balance: ${updatedCoins} coins.`
        );
      } else {
        setActionSuccess(
          `Personal trainer booked! Coach ${coach.user?.firstName} reserved (Time to Start: ${startTime} • Time to Finish: ${endTime} — Takes ${durationText} from start to finish) on ${sessionDate}!`
        );
      }

      const memberId = memberRecord?.id || user?.id || "";
      const updatedBookings = await api.listBookings({ memberId });
      setBookings(updatedBookings);
      setTimeout(() => setActionSuccess(""), 6000);
    } catch (err: any) {
      alert(err.message || "Failed to complete reservation.");
    } finally {
      setBookingLoading(false);
    }
  };

  const activeMembership = member?.memberships?.[0];
  const planName = activeMembership?.plan?.name || "Active Membership Pass";
  const daysRemaining = activeMembership?.endDate
    ? Math.max(0, Math.ceil((new Date(activeMembership.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;
  const expiryFormatted = activeMembership?.endDate
    ? new Date(activeMembership.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Active Term";

  const nextBooking = bookings.find((b) => b.status !== "completed") || bookings[0];
  const chosenCoach = trainers.find((t) => t.id === selectedTrainerId) || trainers[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4 fill-emerald-400" />
            <span>Athletic Profile Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome, {member?.user?.firstName || "Athlete"}!
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Member Code: <strong className="text-white font-mono">{member?.memberCode || "MEM-PENDING"}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsQuickBookOpen(true)}
            leftIcon={<UserCheck className="w-4 h-4 text-emerald-400" />}
          >
            Book Personal Trainer
          </Button>
          <Link href="/member/workouts">
            <Button size="sm" leftIcon={<Dumbbell className="w-4 h-4" />}>
              Log Workout Session
            </Button>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/40">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {/* DEDICATED TRAINER BOOKING NAVIGATION BAR */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 p-3 sm:p-4 shadow-xl shadow-emerald-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  Trainer Booking Hub
                </span>
                <Badge variant="emerald" className="text-[10px] py-0 px-2">
                  {trainers.length} Certified Coaches
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Book private workout coaching, form check & progressive overload
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Link
              href="/member/trainers"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Browse All Coaches</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setWorkoutRoutine("Push & Shoulder Hypertrophy");
                setIsQuickBookOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
              <span>Book for Workout</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWorkoutRoutine("Barbell PR Spotting & Technique Check");
                setIsQuickBookOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Form Check / Spotter</span>
            </button>

            <Link
              href="/member/trainers"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>My Schedule ({bookings.length})</span>
            </Link>

            <Button
              size="sm"
              onClick={() => setIsQuickBookOpen(true)}
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
              className="text-xs font-bold"
            >
              Book Trainer Now
            </Button>
          </div>
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
                value={member?.qrCodeToken || "APEX-MEMBER-PASS"}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="mt-4">
              <div className="text-base font-black text-white">
                {member?.user?.firstName || "Athlete"} {member?.user?.lastName || ""}
              </div>
              <div className="text-xs text-emerald-400 font-medium mt-0.5">{planName}</div>
              <div className="font-mono text-[11px] text-slate-500 mt-1">
                Token: {member?.qrCodeToken?.slice(0, 16) || "APEX-PASS"}...
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
              <span>Status: <strong className="text-emerald-400">Active Entry</strong></span>
              <Link href="/member/package" className="text-emerald-400 font-bold hover:underline">
                Manage Package →
              </Link>
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
              <Link href="/member/package" className="text-[11px] text-emerald-400 hover:underline mt-1 block">
                Upgrade / Renew Package →
              </Link>
            </Card>

            <Card className="glass-card border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Reward Coins</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-400">
                {coinBalance} Coins
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Link href="/member/trainers" className="text-[11px] text-emerald-400 hover:underline">
                  Pay Trainer with Coins →
                </Link>
                <span className="text-slate-600">•</span>
                <Link href="/member/rewards" className="text-[11px] text-amber-400 hover:underline">
                  Store →
                </Link>
              </div>
            </Card>
          </div>

          {/* Personal Trainer Coaching Banner / Card */}
          <Card className="glass-card border-slate-800 p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Personal Trainer • Workout Coaching
                  </h3>
                </div>
                {nextBooking ? (
                  <div>
                    <p className="text-sm font-bold text-white">
                      Scheduled: {nextBooking.trainerName || (nextBooking.trainer?.user ? `Coach ${nextBooking.trainer.user.firstName} ${nextBooking.trainer.user.lastName}` : "Certified Coach")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                      <span className="text-emerald-400 font-semibold">{nextBooking.sessionDate}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-300 font-mono">
                        Time to Start: <strong className="text-white">{nextBooking.startTime}</strong> → Time to Finish: <strong className="text-white">{nextBooking.endTime}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                        Takes {api.formatDurationText(nextBooking.startTime, nextBooking.endTime)} from start to finish
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">{nextBooking.sessionType}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-white">
                      Book a Personal Trainer for Your Workout
                    </p>
                    <p className="text-xs text-slate-400">
                      Pick any certified coach you want to spot your lifts, critique form, and program your workouts.
                    </p>
                  </div>
                )}
              </div>

              <Link href="/member/trainers">
                <Button size="sm" variant="outline" className="text-xs font-semibold shrink-0" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  {nextBooking ? "View All Sessions" : "Choose Your Trainer"}
                </Button>
              </Link>
            </div>
          </Card>

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <Link
              href="/member/trainers"
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center gap-3"
            >
              <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-white">Personal Trainers</div>
                <div className="text-[10px] text-slate-400">Book 1-on-1 Coach</div>
              </div>
            </Link>

            <Link
              href="/member/measurements"
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center gap-3"
            >
              <Scale className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <div className="font-bold text-white">Body Composition</div>
                <div className="text-[10px] text-slate-400">Current BMI: 24.23</div>
              </div>
            </Link>

            <Link
              href="/member/ai-coach"
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center gap-3"
            >
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-white">AI Fitness Coach</div>
                <div className="text-[10px] text-slate-400">Personalized Workout Advice</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK BOOK TRAINER MODAL */}
      <Modal
        isOpen={isQuickBookOpen}
        onClose={() => setIsQuickBookOpen(false)}
        title="Book Personal Trainer for Your Workout"
        maxWidth="lg"
      >
        <form onSubmit={handleQuickBook} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select Your Preferred Personal Trainer
            </label>
            {trainers.length === 0 ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                No certified coaches currently registered. Coaches can register at /register.
              </div>
            ) : (
              <select
                value={selectedTrainerId}
                onChange={(e) => setSelectedTrainerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              >
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    Coach {t.user?.firstName} {t.user?.lastName} — {t.specialization} (₱{Number(t.hourlyRate).toFixed(2)}/hr)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Workout / Muscle Group
            </label>
            <input
              type="text"
              value={workoutRoutine}
              onChange={(e) => setWorkoutRoutine(e.target.value)}
              placeholder="e.g. Heavy Barbell Bench & Incline Press, Squat Day & Form Correction"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              required
            />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Time to Start</span>
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
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Time to Finish</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 font-mono ${
                  endTime <= startTime ? "border-rose-500 text-rose-300" : "border-slate-800"
                }`}
                required
              />
            </div>
          </div>

          {/* Dynamic Duration and Pricing Preview */}
          {(() => {
            const isTimeValid = endTime > startTime;
            const durationHours = api.calculateDurationHours(startTime, endTime);
            const durationText = api.formatDurationText(startTime, endTime);
            const calculatedPrice = chosenCoach ? Math.round(Number(chosenCoach.hourlyRate) * durationHours) : 75;
            const coachCoins = chosenCoach ? api.calculateTrainerCoins(chosenCoach.hourlyRate, durationHours) : 50;

            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      It takes <strong className="text-white">{durationText}</strong> from start to finish
                      <span className="text-slate-500 text-[11px] block sm:inline sm:ml-1">
                        (Start: {startTime} → Finish: {endTime})
                      </span>
                    </span>
                  </span>
                  <span className="font-bold text-emerald-400 shrink-0">
                    ₱{calculatedPrice.toFixed(2)} / {coachCoins} Coins
                  </span>
                </div>

                {!isTimeValid && (
                  <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/50 text-[11px] text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Invalid Time Range: &ldquo;Time to Finish&rdquo; must be after &ldquo;Time to Start&rdquo;.</span>
                  </div>
                )}
              </>
            );
          })()}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              What do you want the coach to help you with during this workout?
            </label>
            <textarea
              rows={2}
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="e.g. Spotting heavy singles on bench, checking lower back alignment on squats, progressive overload pacing."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          {chosenCoach && (() => {
            const isTimeValid = endTime > startTime;
            const durationHours = api.calculateDurationHours(startTime, endTime);
            const coachCoins = api.calculateTrainerCoins(chosenCoach.hourlyRate, durationHours);
            const calculatedPrice = Math.round(Number(chosenCoach.hourlyRate) * durationHours);
            const hasSufficient = coinBalance >= coachCoins;

            return (
              <div className="space-y-3 pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Payment Selection</span>
                  <span className="text-[11px] text-slate-400">
                    Balance: <strong className="text-amber-400">{coinBalance} Coins</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          {coachCoins} Coins
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {hasSufficient ? (
                          <span className="text-emerald-400 font-medium">✓ Sufficient</span>
                        ) : (
                          <span className="text-rose-400 font-medium">✗ Insufficient ({coinBalance}/{coachCoins})</span>
                        )}
                      </div>
                    </div>
                  </button>

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
                        Cash or Card (₱{Number(chosenCoach.hourlyRate).toFixed(2)}/hr × {durationHours} hr{durationHours > 1 ? "s" : ""})
                      </div>
                    </div>
                  </button>
                </div>

                {paymentMethod === "coins" && (
                  <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    hasSufficient
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}>
                    {hasSufficient ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-white">Sufficient Balance:</strong> {coinBalance} coins available. Remaining after booking:{" "}
                          <strong className="text-emerald-300">{coinBalance - coachCoins} coins</strong>.
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-white">Insufficient Coins:</strong> You need{" "}
                          <strong className="text-white">{coachCoins} coins</strong>, but only have{" "}
                          <strong className="text-rose-400">{coinBalance} coins</strong>. Please choose Direct Payment or earn more coins.
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsQuickBookOpen(false)}>
              Cancel
            </Button>
            {chosenCoach && (() => {
              const isTimeValid = endTime > startTime;
              const durationHours = api.calculateDurationHours(startTime, endTime);
              const coachCoins = api.calculateTrainerCoins(chosenCoach.hourlyRate, durationHours);
              const calculatedPrice = Math.round(Number(chosenCoach.hourlyRate) * durationHours);
              const hasSufficient = coinBalance >= coachCoins;

              return (
                <Button
                  type="submit"
                  isLoading={bookingLoading}
                  disabled={
                    trainers.length === 0 ||
                    !isTimeValid ||
                    (paymentMethod === "coins" && !hasSufficient)
                  }
                  className={paymentMethod === "coins" ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold" : "neon-glow font-bold"}
                >
                  {!isTimeValid
                    ? "Invalid Time Range (Until > From)"
                    : paymentMethod === "coins"
                    ? (hasSufficient
                        ? `Redeem ${coachCoins} Coins & Book Coach`
                        : `Insufficient Coins (${coinBalance}/${coachCoins})`)
                    : `Confirm Coach Reservation (₱${calculatedPrice.toFixed(2)})`}
                </Button>
              );
            })()}
          </div>
        </form>
      </Modal>
    </div>
  );
}
