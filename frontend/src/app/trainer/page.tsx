"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dumbbell,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  Flame,
  ArrowRight,
} from "lucide-react";

export default function TrainerDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [trainerProfile, setTrainerProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    const user = api.getCurrentUser();
    setCurrentUser(user);
    const storedTrainers = api.getStoredTrainers();
    const found = storedTrainers.find(
      (t) => t.userId === user?.id || t.user?.email.toLowerCase() === user?.email.toLowerCase()
    );
    if (found) {
      setTrainerProfile(found);
    }
  }, []);

  const handleComplete = (id: string, name: string) => {
    setCompletedSessions([...completedSessions, id]);
    setActionSuccess(`Session with ${name} marked as COMPLETED. Session logged.`);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const displayName = currentUser?.firstName
    ? `Coach ${currentUser.firstName} ${currentUser.lastName || ""}`
    : "Certified Coach";
  const specialization = trainerProfile?.specialization || "Athletic Conditioning & Performance";
  const hourlyRate = trainerProfile?.hourlyRate ? `₱${Number(trainerProfile.hourlyRate).toFixed(2)}` : "₱75.00";

  return (
    <div className="min-h-screen bg-[#090D14] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
              <Flame className="w-6 h-6 fill-slate-950" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{displayName}</span>
                <Badge variant="emerald">Personal Trainer</Badge>
              </h1>
              <p className="text-xs text-slate-400">Specialization: {specialization} • Active Status</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/kiosk">
              <Button size="sm" variant="secondary">
                Open Reception Kiosk
              </Button>
            </Link>
            <Link href="/register?role=member">
              <Button size="sm" variant="outline">
                Member Registration
              </Button>
            </Link>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Quick Trainer Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Today&apos;s Sessions</span>
            <div className="mt-2 text-3xl font-black text-white">{sessions.length} Appointments</div>
            <div className="text-xs text-emerald-400 mt-1">
              {sessions.length > 0 ? "First session scheduled" : "No appointments scheduled today"}
            </div>
          </Card>

          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Client Roster</span>
            <div className="mt-2 text-3xl font-black text-cyan-400">
              {trainerProfile?.maxClients || 20} Capacity
            </div>
            <div className="text-xs text-slate-400 mt-1">Available for 1-on-1 member bookings</div>
          </Card>

          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Coaching Rate</span>
            <div className="mt-2 text-3xl font-black text-amber-400">{hourlyRate} / hr</div>
            <div className="text-xs text-slate-400 mt-1">Direct payout per completed session</div>
          </Card>
        </div>

        {/* Schedule & Sessions */}
        <Card className="glass-card border-slate-800 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Training Itinerary</span>
            </h3>
            <Badge variant="neutral">{sessions.length} Sessions</Badge>
          </div>

          {sessions.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              <Dumbbell className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              No client training sessions booked yet. Member bookings made at /member/trainers will appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {sessions.map((s) => {
                const isDone = completedSessions.includes(s.id);

                return (
                  <div key={s.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{s.clientName}</span>
                        <Badge variant="neutral" className="font-mono text-[10px]">
                          {s.clientCode}
                        </Badge>
                        <Badge variant={isDone ? "neutral" : "success"}>
                          {isDone ? "Completed" : s.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{s.time}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">{s.sessionType}</span>
                      </div>

                      <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mt-2 max-w-xl">
                        <strong>Coach Notes:</strong> {s.notes}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isDone ? (
                        <Button
                          size="sm"
                          onClick={() => handleComplete(s.id, s.clientName)}
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                        >
                          Mark Completed
                        </Button>
                      ) : (
                        <Badge variant="success" className="py-1 px-3 text-xs">
                          Verified & Logged
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
