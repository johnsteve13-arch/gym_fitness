"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Reward } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Gift, Award, CheckCircle, Sparkles, Clock, ArrowRight, UserCheck } from "lucide-react";

export default function MemberRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [coinBalance, setCoinBalance] = useState(450);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState("");

  const loadData = async () => {
    const list = await api.listRewards();
    setRewards(list);
    setCoinBalance(api.getMemberCoins());
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
      const newBal = api.getMemberCoins();
      setCoinBalance(newBal);
      setActionSuccess(`Successfully redeemed '${reward.title}'! Remaining coins: ${newBal}. Show this confirmation at the front desk.`);
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

      {/* Pay Trainer with Coins Spotlight Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-emerald-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Use Your Coins to Pay a Personal Trainer</h3>
              <Badge variant="warning" className="text-[10px]">Now Available</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
              You can redeem your coins to pay for private 1-on-1 certified coaches for your workout routine, provided there is a sufficient balance for the session.
            </p>
          </div>
        </div>
        <Link href="/member/trainers">
          <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0">
            Book Trainer with Coins <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
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
