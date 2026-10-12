"use client";

import React, { useState, useEffect } from "react";
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
  User,
  ShieldCheck,
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function MemberTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [sessionType, setSessionType] = useState("Hypertrophy & Progressive Overload");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [myBookings, setMyBookings] = useState<any[]>([]);

  const loadBookings = async () => {
    const currentUser = api.getCurrentUser();
    const storedMembers = api.getStoredMembers();
    const memberRecord = storedMembers.find(
      (m) => m.userId === currentUser?.id || m.user?.email.toLowerCase() === currentUser?.email.toLowerCase()
    ) || storedMembers[0];
    const memberId = memberRecord?.id || currentUser?.id;
    const b = await api.listBookings({ memberId });
    setMyBookings(b);
  };

  useEffect(() => {
    api.listTrainers().then(setTrainers);
    loadBookings();
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;

    setSubmitting(true);
    try {
      const currentUser = api.getCurrentUser();
      const storedMembers = api.getStoredMembers();
      const memberRecord = storedMembers.find(
        (m) => m.userId === currentUser?.id || m.user?.email.toLowerCase() === currentUser?.email.toLowerCase()
      ) || storedMembers[0];

      const [hours, minutes] = startTime.split(":");
      const endHour = ((parseInt(hours, 10) + 1) % 24).toString().padStart(2, "0");
      const endTime = `${endHour}:${minutes || "00"}`;

      await api.bookTrainer({
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
        sessionType,
        notes: notes || "Form analysis and calibrated strength testing",
        price: selectedTrainer.hourlyRate,
      });

      setActionSuccess(
        `Private session with Coach ${selectedTrainer.user?.firstName} reserved for ${sessionDate} at ${startTime}!`
      );
      setSelectedTrainer(null);
      setNotes("");
      await loadBookings();
      setTimeout(() => setActionSuccess(""), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to complete reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-emerald-400" />
          <span>Master Personal Coaches</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Schedule 1-on-1 private coaching sessions for calibrated strength, form analysis, and progressive overload
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/40">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {/* TRAINERS ROSTER GRID */}
      {trainers.length === 0 ? (
        <Card className="glass-card border-slate-800 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Coaches Available Yet</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Personal coaches are currently onboarding. Private 1-on-1 booking slots will open as soon as certified trainers register.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trainers.map((t) => (
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
                    {t.user?.firstName} {t.user?.lastName}
                  </h3>
                  <div className="text-xs text-emerald-400 font-semibold mb-2">{t.specialization}</div>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-3">{t.bio}</p>

                  <div className="flex justify-between items-center text-xs text-slate-300 border-t border-slate-800 pt-3">
                    <span>Rate: <strong className="text-emerald-400">₱{Number(t.hourlyRate).toFixed(2)}/hr</strong></span>
                    <span>{t.experienceYears} Years Exp</span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Button
                  size="sm"
                  className="w-full font-bold"
                  onClick={() => setSelectedTrainer(t)}
                  leftIcon={<Calendar className="w-4 h-4" />}
                >
                  Book 1-on-1 Session
                </Button>
              </div>
            </Card>
          ))}
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
            <p className="text-xs text-slate-400 mt-0.5">Upcoming appointments reserved with your coaches</p>
          </div>
          <Badge variant="neutral">{myBookings.length} Booked</Badge>
        </div>

        {myBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Clock className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            You have no active 1-on-1 coaching reservations. Click &ldquo;Book 1-on-1 Session&rdquo; on any coach card above to schedule.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {myBookings.map((b) => (
              <div key={b.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {b.trainerName || (b.trainer?.user ? `Coach ${b.trainer.user.firstName} ${b.trainer.user.lastName}` : "Certified Coach")}
                    </span>
                    <Badge variant={b.status === "completed" ? "neutral" : "success"} className="text-[10px]">
                      {b.status === "completed" ? "Completed" : "Confirmed"}
                    </Badge>
                  </div>

                  <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{b.sessionDate} • {b.startTime} – {b.endTime}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">{b.sessionType || "1-on-1 Fitness"}</span>
                  </div>

                  {b.notes && (
                    <div className="text-[11px] text-slate-400 italic">
                      Focus: {b.notes}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ₱{Number(b.price || 75).toFixed(2)}
                  </span>
                  <div className="text-[10px] text-slate-500">Reserved</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* BOOK TRAINER MODAL */}
      {selectedTrainer && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTrainer(null)}
          title={`Book 1-on-1 Coaching with Coach ${selectedTrainer.user?.firstName} ${selectedTrainer.user?.lastName || ""}`}
        >
          <form onSubmit={handleBook} className="space-y-4">
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Coaching Program Focus</label>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Athlete Notes & Specific Target</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Scapular bar path check on incline bench or clean & jerk pull technique."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Session Rate (60 mins):</span>
              <span className="text-emerald-400 font-bold text-sm">₱{Number(selectedTrainer.hourlyRate).toFixed(2)} PHP</span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedTrainer(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                Confirm Reservation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
