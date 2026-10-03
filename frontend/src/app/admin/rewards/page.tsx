"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Reward } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Gift, Plus, Award, Package, CheckCircle } from "lucide-react";

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    pointsCost: 200,
    category: "merchandise",
    stockQuantity: 25,
  });

  const loadData = async () => {
    const list = await api.listRewards();
    setRewards(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newReward: Reward = {
        id: `rew-${Date.now()}`,
        title: form.title,
        description: form.description,
        pointsCost: form.pointsCost,
        category: form.category,
        stockQuantity: form.stockQuantity,
        isActive: true,
      };

      setRewards([...rewards, newReward]);
      setIsCreateOpen(false);
      setActionSuccess(`Reward '${form.title}' added to catalog.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Reward Store & Coin Economics</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure catalog perks, points costs, and stock inventory for member loyalty rewards
          </p>
        </div>

        <Button size="sm" onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add Reward Item
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rewards.map((r) => (
          <Card key={r.id} className="glass-card border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="emerald" className="uppercase font-mono text-[10px]">
                  {r.category}
                </Badge>
                <span className="text-xs text-slate-400">Stock: {r.stockQuantity} units</span>
              </div>

              <h3 className="text-base font-bold text-white mb-1">{r.title}</h3>
              <p className="text-xs text-slate-400 mb-4 line-clamp-2">{r.description}</p>

              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-lg my-2">
                <Award className="w-5 h-5" />
                <span>{r.pointsCost} Reward Coins</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* CREATE REWARD MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Reward Catalog Item">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Item Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Apex Custom Gym Towel"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Points Cost (Coins) *</label>
              <input
                type="number"
                value={form.pointsCost}
                onChange={(e) => setForm({ ...form, pointsCost: parseInt(e.target.value, 10) || 100 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Stock Quantity</label>
              <input
                type="number"
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: parseInt(e.target.value, 10) || 10 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            >
              <option value="merchandise">Gym Merchandise / Apparel</option>
              <option value="discount">Renewal Discount Voucher</option>
              <option value="free_session">1-on-1 PT Coaching Pass</option>
              <option value="class_pass">Guest Pass Voucher</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Add to Catalog
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
