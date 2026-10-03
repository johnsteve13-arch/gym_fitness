"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { BodyMeasurement } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Scale, Plus, TrendingDown, TrendingUp, CheckCircle, Activity, Award } from "lucide-react";

export default function MemberMeasurementsPage() {
  const [data, setData] = useState<{
    initial: any;
    current: any;
    history: BodyMeasurement[];
    weightChangeKg: number;
    bmiChange: number;
  }>({
    initial: null,
    current: null,
    history: [],
    weightChangeKg: 0,
    bmiChange: 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const [form, setForm] = useState({
    weightKg: 73.8,
    heightCm: 175,
    bodyFatPercentage: 17.0,
    muscleMassKg: 60.5,
    waistCm: 79.0,
    chestCm: 104.0,
    armCm: 38.2,
    notes: "Post-workout morning weigh-in",
  });

  const loadData = async () => {
    const res = await api.getMeasurements();
    setData(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.recordMeasurement(form);
      setIsModalOpen(false);
      setActionSuccess("Biometric entry recorded successfully!");
      loadData();
      setTimeout(() => setActionSuccess(""), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-cyan-400" />
            <span>Body Composition & Biometrics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor visceral body fat, muscle hypertrophy, BMI indices, and anatomical circumferences
          </p>
        </div>

        <Button size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Log Measurement
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Progress Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="glass-card border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Current Weight</span>
          <div className="mt-2 text-3xl font-black text-white">
            {data.current?.weightKg ? Number(data.current.weightKg).toFixed(1) : "74.2"} kg
          </div>
          <div className="mt-1 text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{data.weightChangeKg} kg since baseline</span>
          </div>
        </Card>

        <Card className="glass-card border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Body Mass Index (BMI)</span>
          <div className="mt-2 text-3xl font-black text-white">
            {data.current?.bmi ? Number(data.current.bmi).toFixed(2) : "24.23"}
          </div>
          <div className="mt-1 text-xs text-emerald-400 font-semibold">
            {data.bmiChange} points (Optimal Athletic Range)
          </div>
        </Card>

        <Card className="glass-card border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Body Fat Estimate</span>
          <div className="mt-2 text-3xl font-black text-cyan-400">
            {data.current?.bodyFatPercentage ? Number(data.current.bodyFatPercentage).toFixed(1) : "17.5"}%
          </div>
          <div className="mt-1 text-xs text-emerald-400 font-semibold">-3.5% Fat Reduction</div>
        </Card>

        <Card className="glass-card border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Muscle Mass</span>
          <div className="mt-2 text-3xl font-black text-amber-400">
            {data.current?.muscleMassKg ? Number(data.current.muscleMassKg).toFixed(1) : "60.1"} kg
          </div>
          <div className="mt-1 text-xs text-amber-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+1.9 kg Hypertrophy Gain</span>
          </div>
        </Card>
      </div>

      {/* Anatomical Measurements Table */}
      <Card className="glass-card border-slate-800 p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Anatomical History & Logs</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-4 py-3.5">Weight</th>
                <th className="px-4 py-3.5">BMI</th>
                <th className="px-4 py-3.5">Body Fat %</th>
                <th className="px-4 py-3.5">Chest</th>
                <th className="px-4 py-3.5">Waist</th>
                <th className="px-4 py-3.5">Arms</th>
                <th className="px-4 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.history.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 text-white font-medium">
                    {new Date(m.recordedDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-white">{Number(m.weightKg).toFixed(1)} kg</td>
                  <td className="px-4 py-3.5 font-mono text-emerald-400">{Number(m.bmi).toFixed(2)}</td>
                  <td className="px-4 py-3.5">{m.bodyFatPercentage ? `${m.bodyFatPercentage}%` : "—"}</td>
                  <td className="px-4 py-3.5">{m.chestCm ? `${m.chestCm} cm` : "—"}</td>
                  <td className="px-4 py-3.5">{m.waistCm ? `${m.waistCm} cm` : "—"}</td>
                  <td className="px-4 py-3.5">{m.armCm ? `${m.armCm} cm` : "—"}</td>
                  <td className="px-4 py-3.5 text-slate-400 italic">{m.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* LOG MEASUREMENT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Biometric Composition">
        <form onSubmit={handleRecord} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Height (cm) *</label>
              <input
                type="number"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: parseInt(e.target.value, 10) || 170 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Body Fat % (Est)</label>
              <input
                type="number"
                step="0.1"
                value={form.bodyFatPercentage}
                onChange={(e) => setForm({ ...form, bodyFatPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Muscle Mass (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.muscleMassKg}
                onChange={(e) => setForm({ ...form, muscleMassKg: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Waist (cm)</label>
              <input
                type="number"
                step="0.5"
                value={form.waistCm}
                onChange={(e) => setForm({ ...form, waistCm: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Chest (cm)</label>
              <input
                type="number"
                step="0.5"
                value={form.chestCm}
                onChange={(e) => setForm({ ...form, chestCm: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Arm (cm)</label>
              <input
                type="number"
                step="0.5"
                value={form.armCm}
                onChange={(e) => setForm({ ...form, armCm: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Composition Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
