"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { GymClass, Trainer } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Calendar,
  Plus,
  Users,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "strength",
    trainerId: "",
    room: "Studio A",
    maxCapacity: 15,
    startTime: "10:00",
    endTime: "11:00",
    scheduleDate: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const loadData = async () => {
    const [c, t] = await Promise.all([api.listClasses(), api.listTrainers()]);
    setClasses(c);
    setTrainers(t);
    if (!form.trainerId && t.length > 0) {
      setForm((prev) => ({ ...prev, trainerId: t[0].id }));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newClass: GymClass = {
        id: `class-${Date.now()}`,
        name: form.name,
        description: form.description,
        category: form.category,
        trainerId: form.trainerId,
        room: form.room,
        maxCapacity: form.maxCapacity,
        startTime: form.startTime,
        endTime: form.endTime,
        scheduleDate: form.scheduleDate,
        durationMinutes: 60,
        trainer: trainers.find((t) => t.id === form.trainerId),
        bookings: [],
      };

      setClasses([...classes, newClass]);
      setIsCreateOpen(false);
      setActionSuccess(`Class '${form.name}' scheduled successfully.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Group Fitness & Classes</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Class schedules, capacity limits, automated waitlists, and room assignments
          </p>
        </div>

        <Button size="sm" onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Schedule Class
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((c) => {
          const bookedCount = c.bookings?.filter((b) => b.status === "booked").length || 0;
          const waitlistCount = c.bookings?.filter((b) => b.status === "waitlisted").length || 0;
          const percentFull = Math.min(100, Math.round((bookedCount / c.maxCapacity) * 100));

          return (
            <Card key={c.id} className="glass-card border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="emerald" className="uppercase text-[10px] font-bold">
                    {c.category}
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    {c.startTime} - {c.endTime}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{c.name}</h3>
                <p className="text-xs text-slate-400 mb-4 line-clamp-2">{c.description}</p>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Assigned Coach:</span>
                    <strong className="text-white">
                      {c.trainer?.user?.firstName} {c.trainer?.user?.lastName}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Studio / Space:</span>
                    <strong className="text-white">{c.room}</strong>
                  </div>

                  {/* Capacity Bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Roster Capacity</span>
                      <span className="font-bold text-white">
                        {bookedCount} / {c.maxCapacity} ({percentFull}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentFull >= 100 ? "bg-red-500" : percentFull >= 80 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${percentFull}%` }}
                      />
                    </div>
                    {waitlistCount > 0 && (
                      <div className="text-[10px] text-amber-400 mt-1 font-medium">
                        {waitlistCount} athlete(s) in automated waitlist
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CREATE CLASS MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Schedule New Group Class">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Class Title *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tactical Kettlebell & Core"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                <option value="strength">Strength Training</option>
                <option value="hiit">Tactical HIIT</option>
                <option value="yoga">Yoga & Mobility</option>
                <option value="crossfit">CrossFit Conditioning</option>
                <option value="boxing">Combat Boxing</option>
                <option value="cycling">Endurance Cycling</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Lead Coach</label>
              <select
                value={form.trainerId}
                onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              >
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user?.firstName} {t.user?.lastName} ({t.specialization})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Room / Studio</label>
              <input
                type="text"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Max Capacity</label>
              <input
                type="number"
                value={form.maxCapacity}
                onChange={(e) => setForm({ ...form, maxCapacity: parseInt(e.target.value, 10) || 10 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Session breakdown, required gear, and conditioning intensity."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Schedule Class
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
