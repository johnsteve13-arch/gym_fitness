"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Trainer } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Dumbbell, Star, Calendar, Clock, CheckCircle } from "lucide-react";

export default function MemberTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    api.listTrainers().then(setTrainers);
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;

    setSubmitting(true);
    try {
      await api.bookTrainer({
        trainerId: selectedTrainer.id,
        sessionDate,
        startTime,
        endTime: "11:00",
        notes,
      });

      setActionSuccess(`Private session with ${selectedTrainer.user?.firstName} scheduled for ${sessionDate} at ${startTime}!`);
      setSelectedTrainer(null);
      setTimeout(() => setActionSuccess(""), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

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
                  <span>Rate: <strong className="text-emerald-400">${Number(t.hourlyRate).toFixed(2)}/hr</strong></span>
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

      {/* BOOK TRAINER MODAL */}
      {selectedTrainer && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTrainer(null)}
          title={`Book 1-on-1 Coaching with ${selectedTrainer.user?.firstName}`}
        >
          <form onSubmit={handleBook} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Session Date</label>
                <input
                  type="date"
                  value={sessionDate}
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Focus & Goals for Session</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Scapular bar path on bench press or Olympic clean pull technique."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between text-xs">
              <span className="text-slate-400">Total Rate:</span>
              <span className="text-emerald-400 font-bold">${Number(selectedTrainer.hourlyRate).toFixed(2)} USD</span>
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
