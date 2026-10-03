"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Trainer } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dumbbell, Star, Clock, DollarSign, Award, Users } from "lucide-react";

export default function AdminTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  useEffect(() => {
    api.listTrainers().then(setTrainers);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Coaching Staff & Personal Trainers</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage certified training specialists, rates, client allocations, and performance ratings
        </p>
      </div>

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

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block">Experience</span>
                    <strong className="text-white">{t.experienceYears} Years</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Hourly Rate</span>
                    <strong className="text-emerald-400">${Number(t.hourlyRate).toFixed(2)}/hr</strong>
                  </div>
                  <div className="pt-2 col-span-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Max Client Load:</span>
                    <span className="text-white font-bold">{t.maxClients} Active Clients</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
