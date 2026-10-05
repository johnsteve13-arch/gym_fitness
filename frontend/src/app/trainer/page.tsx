"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  const [sessions, setSessions] = useState([
    {
      id: "s-1",
      clientName: "Sarah Connor",
      clientCode: "MEM-10001",
      time: "10:00 – 11:00 AM",
      sessionType: "Hypertrophy Bench & Upper Body",
      status: "confirmed",
      notes: "Focus on scapular retraction and bar path trajectory.",
    },
    {
      id: "s-2",
      clientName: "Jordan Lee",
      clientCode: "MEM-10003",
      time: "02:00 – 03:00 PM",
      sessionType: "Powerlifting Deadlift Calibration",
      status: "pending",
      notes: "Testing 1-rep max attempt with calibrated competition plates.",
    },
  ]);

  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [actionSuccess, setActionSuccess] = useState("");

  const handleComplete = (id: string, name: string) => {
    setCompletedSessions([...completedSessions, id]);
    setActionSuccess(`Session with ${name} marked as COMPLETED. Session logged.`);
    setTimeout(() => setActionSuccess(""), 4000);
  };

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
                <span>Coach Marcus Steele</span>
                <Badge variant="emerald">Master Trainer</Badge>
              </h1>
              <p className="text-xs text-slate-400">Specialization: Hypertrophy & Powerlifting • Rating: 4.95 ★</p>
            </div>
          </div>

          <Link href="/kiosk">
            <Button size="sm" variant="secondary">
              Open Reception Kiosk
            </Button>
          </Link>
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
            <div className="text-xs text-emerald-400 mt-1">First session starts at 10:00 AM</div>
          </Card>

          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Assigned Athletes</span>
            <div className="mt-2 text-3xl font-black text-cyan-400">18 Athletes</div>
            <div className="text-xs text-slate-400 mt-1">Max capacity: 25 athletes</div>
          </Card>

          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Coaching Commission</span>
            <div className="mt-2 text-3xl font-black text-amber-400">₱75.00 / hr</div>
            <div className="text-xs text-slate-400 mt-1">Direct payout weekly</div>
          </Card>
        </div>

        {/* Schedule & Sessions */}
        <Card className="glass-card border-slate-800 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Today&apos;s Training Itinerary</span>
            </h3>
            <Badge variant="neutral">{sessions.length} Sessions</Badge>
          </div>

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
        </Card>
      </div>
    </div>
  );
}
