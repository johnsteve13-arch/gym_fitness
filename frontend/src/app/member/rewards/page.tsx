"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Reward } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Gift, Award, CheckCircle, Sparkles, Clock } from "lucide-react";

export default function MemberRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [coinBalance, setCoinBalance] = useState(450);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState("");

  const loadData = async () => {
    const list = await api.listRewards();
    setRewards(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRedeem = async (reward: Reward) => {
    if (coinBalance < reward.pointsCost) {
      alert(`Insufficient coins. You have ${coinBalance} coins, but this perk requires ${reward.pointsCost} coins.`);
      return;
    }

    setLoadingId(reward.id);
    try {
      await api.redeemReward(reward.id);
      setCoinBalance((prev) => prev - reward.pointsCost);
      setActionSuccess(`Successfully redeemed '${reward.title}'! Show this confirmation at the front desk.`);
      setTimeout(() => setActionSuccess(""), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to redeem reward.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Coin Balance Hero Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 fill-amber-400" />
            <span>Athletic Loyalty Coins</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Perks & Rewards Store</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Earn coins for every gym check-in (+15), completed workout (+20), and personal record (+25).
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/40 text-center sm:text-right shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Your Balance</span>
          <div className="text-3xl font-black text-amber-400 flex items-center justify-center sm:justify-end gap-1.5 mt-0.5">
            <Award className="w-7 h-7" />
            <span>{coinBalance}</span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/10">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Rewards Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rewards.map((r) => {
          const canAfford = coinBalance >= r.pointsCost;

          return (
            <Card key={r.id} className="glass-card border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="emerald" className="uppercase font-mono text-[10px]">
                    {r.category}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">Stock: {r.stockQuantity}</span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{r.title}</h3>
                <p className="text-xs text-slate-400 mb-4 line-clamp-3">{r.description}</p>

                <div className="flex items-baseline gap-1.5 text-amber-400 font-black text-xl my-2">
                  <Award className="w-5 h-5" />
                  <span>{r.pointsCost} Coins</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <Button
                  size="sm"
                  variant={canAfford ? "primary" : "secondary"}
                  disabled={!canAfford}
                  isLoading={loadingId === r.id}
                  onClick={() => handleRedeem(r)}
                  className="w-full font-bold"
                >
                  {canAfford ? "Redeem Perk" : `Need ${r.pointsCost - coinBalance} More Coins`}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
