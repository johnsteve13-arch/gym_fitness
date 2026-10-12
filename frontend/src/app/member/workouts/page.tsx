"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { WorkoutLog, WorkoutLogEntry, Trainer } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Dumbbell,
  Plus,
  Flame,
  Clock,
  Award,
  CheckCircle,
  XCircle,
  ShieldCheck,
  TrendingUp,
  Trophy,
  UserCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  Target,
} from "lucide-react";

export default function MemberWorkoutsPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isTrainerModalOpen, setIsTrainerModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number>(450);
  const [paymentMethod, setPaymentMethod] = useState<"coins" | "cash">("coins");

  // Form state for Workout Logging
  const [workoutName, setWorkoutName] = useState("Push & Shoulder Hypertrophy");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [caloriesBurned, setCaloriesBurned] = useState(450);
  const [notes, setNotes] = useState("");

  const [entries, setEntries] = useState([
    { exerciseName: "Barbell Bench Press", muscleGroup: "Chest", setNumber: 1, repsCompleted: 8, weightKg: 85 },
    { exerciseName: "Incline Dumbbell Press", muscleGroup: "Chest", setNumber: 2, repsCompleted: 10, weightKg: 32 },
    { exerciseName: "Overhead Barbell Press", muscleGroup: "Shoulders", setNumber: 3, repsCompleted: 6, weightKg: 55 },
  ]);

  // Form state for Personal Trainer Booking
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [trainerWorkoutFocus, setTrainerWorkoutFocus] = useState("Push & Shoulder Hypertrophy");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [trainerNotes, setTrainerNotes] = useState("");
  const [bookingTrainer, setBookingTrainer] = useState(false);

  const loadLogsAndTrainers = async () => {
    const [list, trList] = await Promise.all([
      api.listWorkoutLogs(),
      api.listTrainers(),
    ]);
    setLogs(list);
    setTrainers(trList);
    if (trList.length > 0) {
      setSelectedTrainerId(trList[0].id);
    }
    setCoinBalance(api.getMemberCoins());
  };

  useEffect(() => {
    loadLogsAndTrainers();
  }, []);

  const handleAddExerciseRow = () => {
    setEntries([
      ...entries,
      { exerciseName: "Cable Lateral Raise", muscleGroup: "Shoulders", setNumber: entries.length + 1, repsCompleted: 12, weightKg: 15 },
    ]);
  };

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.logWorkout({
        workoutName,
        durationMinutes,
        caloriesBurned,
        overallNotes: notes,
        entries,
      });

      setLogs([res.log, ...logs]);
      setIsLogModalOpen(false);
      setCoinBalance(api.getMemberCoins());
      setActionSuccess(`Workout recorded! ${res.prsAchieved} Personal Record smashed. +${res.rewardCoinsEarned} coins awarded! 🔥`);
      setTimeout(() => setActionSuccess(""), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const openTrainerBookingForWorkout = (routineName?: string) => {
    if (routineName) {
      setTrainerWorkoutFocus(routineName);
    }
    setCoinBalance(api.getMemberCoins());
    setIsTrainerModalOpen(true);
  };

  const handleBookTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenCoach = trainers.find((t) => t.id === selectedTrainerId) || trainers[0];
    if (!chosenCoach) {
      alert("Please select a trainer to book.");
      return;
    }

    const coinsCost = api.calculateTrainerCoins(chosenCoach.hourlyRate);
    if (paymentMethod === "coins" && coinBalance < coinsCost) {
      alert(`Insufficient coin balance. You have ${coinBalance} coins, but this session requires ${coinsCost} coins. Please switch to Direct Payment or earn more coins.`);
      return;
    }

    setBookingTrainer(true);
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

      await api.bookTrainer({
        trainerId: chosenCoach.id,
        trainerUserId: chosenCoach.userId || chosenCoach.user?.id,
        trainerEmail: chosenCoach.user?.email,
        trainerName: `${chosenCoach.user?.firstName || "Coach"} ${chosenCoach.user?.lastName || ""}`,
        memberId: memberRecord?.id || `mem-${currentUser?.id || Date.now()}`,
        memberName: `${currentUser?.firstName || "Athlete"} ${currentUser?.lastName || ""}`,
        memberEmail: currentUser?.email || "athlete@apexfitness.com",
        memberPhone: currentUser?.phone || memberRecord?.user?.phone || "+63 (917) 000-0000",
        memberCode: memberRecord?.memberCode || "MEM-ATHLETE",
        sessionDate,
        startTime,
        endTime,
        sessionType: trainerWorkoutFocus || "1-on-1 Workout Coaching",
        notes: trainerNotes || `Coaching for workout: ${trainerWorkoutFocus}`,
        price: chosenCoach.hourlyRate,
        paymentMethod,
        coinsPaid: paymentMethod === "coins" ? coinsCost : undefined,
      });

      const updatedCoins = api.getMemberCoins();
      setCoinBalance(updatedCoins);

      setIsTrainerModalOpen(false);
      setTrainerNotes("");

      if (paymentMethod === "coins") {
        setActionSuccess(
          `Personal Trainer booked! Redeemed ${coinsCost} coins for Coach ${chosenCoach.user?.firstName}. Remaining balance: ${updatedCoins} coins.`
        );
      } else {
        setActionSuccess(
          `Personal Trainer booked! Coach ${chosenCoach.user?.firstName} reserved for your "${trainerWorkoutFocus}" workout on ${sessionDate} at ${startTime}!`
        );
      }

      setTimeout(() => setActionSuccess(""), 6000);
    } catch (err: any) {
      alert(err.message || "Failed to book trainer for workout.");
    } finally {
      setBookingTrainer(false);
    }
  };

  const chosenCoach = trainers.find((t) => t.id === selectedTrainerId) || trainers[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-emerald-400" />
            <span>Athletic Workout & PR Tracker</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Log sets, mechanical intensity, calories burned, and book dedicated personal coaches for your workouts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openTrainerBookingForWorkout("Progressive Overload Workout")}
            leftIcon={<UserCheck className="w-4 h-4 text-emerald-400" />}
          >
            Book Trainer for Workout
          </Button>

          <Button size="sm" onClick={() => setIsLogModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Log New Workout
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/10">
          <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Book Trainer Callout Banner */}
      <Card className="glass-card border-slate-800 p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                1-on-1 Personal Trainer Workout Coaching
              </h3>
            </div>
            <p className="text-sm font-bold text-white">
              Want a Personal Coach for Your Next Workout?
            </p>
            <p className="text-xs text-slate-400 max-w-xl">
              Select the personal trainer you want to oversee your lifting technique, spot heavy sets, break strength plateaus, and optimize progressive overload.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => openTrainerBookingForWorkout("Heavy Strength & Form Check")}
              leftIcon={<Calendar className="w-4 h-4" />}
            >
              Book Trainer Now
            </Button>
            <Link href="/member/trainers">
              <Button size="sm" variant="ghost" className="text-xs text-slate-400 hover:text-white">
                View All Coaches →
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* PR Trophy Wall Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Barbell Bench Press</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">85.0 kg</div>
          <div className="text-[11px] text-emerald-400 mt-1 font-semibold">New Personal Record!</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Standing Overhead Press</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">55.0 kg</div>
          <div className="text-[11px] text-emerald-400 mt-1 font-semibold">PR Confirmed</div>
        </Card>

        <Card className="glass-card border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Workouts Logged</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{logs.length + 14} Sessions</div>
          <div className="text-[11px] text-slate-400 mt-1">Consistency Score: 92/100</div>
        </Card>
      </div>

      {/* Workout Logs History */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Logged Training Sessions</h3>
          <span className="text-xs text-slate-400">{logs.length} Recorded Workouts</span>
        </div>

        {logs.map((log) => (
          <Card key={log.id} className="glass-card border-slate-800 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-3 gap-3">
              <div>
                <h4 className="text-base font-bold text-white">{log.workoutName}</h4>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    {log.durationMinutes} minutes
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    {log.caloriesBurned} kcal
                  </span>
                  <span>•</span>
                  <span>{new Date(log.date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                  onClick={() => openTrainerBookingForWorkout(log.workoutName)}
                  leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                >
                  Book Coach for this Routine
                </Button>
                <Badge variant="emerald">Rating: {log.rating || 5}/5 ★</Badge>
              </div>
            </div>

            {log.overallNotes && (
              <p className="text-xs text-slate-300 italic mb-4 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                &quot;{log.overallNotes}&quot;
              </p>
            )}

            {/* Exercise Entries Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-2">Exercise</th>
                    <th className="p-2">Muscle Group</th>
                    <th className="p-2">Set</th>
                    <th className="p-2">Reps</th>
                    <th className="p-2">Weight (kg)</th>
                    <th className="p-2 text-right">Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {log.entries?.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30">
                      <td className="p-2 font-medium text-white">{entry.exerciseName}</td>
                      <td className="p-2 text-slate-400">{entry.muscleGroup}</td>
                      <td className="p-2">#{entry.setNumber}</td>
                      <td className="p-2 font-bold text-white">{entry.repsCompleted}</td>
                      <td className="p-2 font-bold text-emerald-400">{entry.weightKg ? `${entry.weightKg} kg` : "Bodyweight"}</td>
                      <td className="p-2 text-right">
                        {entry.isPersonalRecord && (
                          <Badge variant="warning" className="text-[10px]">
                            🏆 PR
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      {/* BOOK TRAINER FOR WORKOUT MODAL */}
      <Modal
        isOpen={isTrainerModalOpen}
        onClose={() => setIsTrainerModalOpen(false)}
        title="Book Personal Trainer for Your Workout"
        maxWidth="lg"
      >
        <form onSubmit={handleBookTrainerSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select Your Preferred Trainer
            </label>
            {trainers.length === 0 ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                No certified coaches currently registered. New trainers can register at /register.
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
              Workout Routine / Session Focus
            </label>
            <input
              type="text"
              value={trainerWorkoutFocus}
              onChange={(e) => setTrainerWorkoutFocus(e.target.value)}
              placeholder="e.g. Heavy Barbell Bench & Incline Press, Leg Day & Squats"
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
            <label className="block text-xs font-medium text-slate-300 mb-1">
              What do you want the coach to help you with during this workout?
            </label>
            <textarea
              rows={2}
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              placeholder="e.g. Spotting heavy bench singles, checking thoracic extension on squats, progressive overload pacing."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          {chosenCoach && (() => {
            const coachCoins = api.calculateTrainerCoins(chosenCoach.hourlyRate);
            const hasSufficient = coinBalance >= coachCoins;

            return (
              <div className="space-y-3 pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Payment Method</span>
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
                          ₱{Number(chosenCoach.hourlyRate).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Cash or Card at desk
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
                          <strong className="font-bold text-white">Sufficient Balance:</strong> {coinBalance} coins available.
                          Remaining balance after booking:{" "}
                          <strong className="text-emerald-300">{coinBalance - coachCoins} coins</strong>.
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-white">Insufficient Balance for Payment:</strong> You need{" "}
                          <strong className="text-white">{coachCoins} coins</strong>, but only have{" "}
                          <strong className="text-rose-400">{coinBalance} coins</strong>. Please switch to Direct Payment or earn coins by smashing PRs.
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsTrainerModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={bookingTrainer}
              disabled={
                trainers.length === 0 ||
                (paymentMethod === "coins" && chosenCoach && coinBalance < api.calculateTrainerCoins(chosenCoach.hourlyRate))
              }
              className={paymentMethod === "coins" ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold" : "neon-glow font-bold"}
            >
              {paymentMethod === "coins"
                ? (chosenCoach && coinBalance < api.calculateTrainerCoins(chosenCoach.hourlyRate)
                    ? `Insufficient Coins (${coinBalance}/${api.calculateTrainerCoins(chosenCoach.hourlyRate)})`
                    : `Redeem Coins & Book Coach`)
                : "Confirm Coach for Workout"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* LOG WORKOUT MODAL */}
      <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="Log Training Session" maxWidth="xl">
        <form onSubmit={handleSaveWorkout} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">Session Title</label>
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Duration (Mins)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Calories (Est)</label>
              <input
                type="number"
                value={caloriesBurned}
                onChange={(e) => setCaloriesBurned(parseInt(e.target.value, 10) || 200)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider">Exercise Sets</label>
              <button
                type="button"
                onClick={handleAddExerciseRow}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                + Add Movement
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {entries.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                  <input
                    type="text"
                    value={item.exerciseName}
                    onChange={(e) => {
                      const updated = [...entries];
                      updated[idx].exerciseName = e.target.value;
                      setEntries(updated);
                    }}
                    placeholder="Exercise name"
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                  />
                  <input
                    type="text"
                    value={item.muscleGroup}
                    onChange={(e) => {
                      const updated = [...entries];
                      updated[idx].muscleGroup = e.target.value;
                      setEntries(updated);
                    }}
                    placeholder="Muscle group"
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                  />
                  <input
                    type="number"
                    value={item.repsCompleted}
                    onChange={(e) => {
                      const updated = [...entries];
                      updated[idx].repsCompleted = parseInt(e.target.value, 10) || 1;
                      setEntries(updated);
                    }}
                    placeholder="Reps"
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={item.weightKg}
                    onChange={(e) => {
                      const updated = [...entries];
                      updated[idx].weightKg = parseFloat(e.target.value) || 0;
                      setEntries(updated);
                    }}
                    placeholder="Weight (kg)"
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-bold text-emerald-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Session Notes & RPE</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Felt great on presses, slight shoulder fatigue on last set."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Session & Check PRs
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
