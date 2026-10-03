"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { WorkoutLog, WorkoutLogEntry } from "@/types";
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
  TrendingUp,
  Trophy,
} from "lucide-react";

export default function MemberWorkoutsPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [workoutName, setWorkoutName] = useState("Push & Shoulder Hypertrophy");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [caloriesBurned, setCaloriesBurned] = useState(450);
  const [notes, setNotes] = useState("");

  const [entries, setEntries] = useState([
    { exerciseName: "Barbell Bench Press", muscleGroup: "Chest", setNumber: 1, repsCompleted: 8, weightKg: 85 },
    { exerciseName: "Incline Dumbbell Press", muscleGroup: "Chest", setNumber: 2, repsCompleted: 10, weightKg: 32 },
    { exerciseName: "Overhead Barbell Press", muscleGroup: "Shoulders", setNumber: 3, repsCompleted: 6, weightKg: 55 },
  ]);

  const loadLogs = async () => {
    const list = await api.listWorkoutLogs();
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
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
      setActionSuccess(`Workout recorded! ${res.prsAchieved} Personal Record smashed. +${res.rewardCoinsEarned} coins awarded! 🔥`);
      setTimeout(() => setActionSuccess(""), 5000);
    } finally {
      setSubmitting(false);
    }
  };

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
            Log sets, mechanical intensity, calories burned, and celebrate automatic personal records
          </p>
        </div>

        <Button size="sm" onClick={() => setIsLogModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Log New Workout
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/10">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

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
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Logged Training Sessions</h3>
        {logs.map((log) => (
          <Card key={log.id} className="glass-card border-slate-800 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-3 gap-2">
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

              <Badge variant="emerald">Rating: {log.rating || 5}/5 ★</Badge>
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
