"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { GymClass } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Calendar, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

export default function MemberClassesPage() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [bookedClassIds, setBookedClassIds] = useState<string[]>(["class-1"]);
  const [actionSuccess, setActionSuccess] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    api.listClasses().then(setClasses);
  }, []);

  const handleBook = async (classId: string, className: string) => {
    setLoadingId(classId);
    try {
      await api.bookClass(classId);
      setBookedClassIds([...bookedClassIds, classId]);
      setActionSuccess(`Spot confirmed for '${className}'! See you on the training floor.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (classId: string, className: string) => {
    setLoadingId(classId);
    try {
      await api.cancelClassBooking(classId);
      setBookedClassIds(bookedClassIds.filter((id) => id !== classId));
      setActionSuccess(`Reservation cancelled for '${className}'. Spot released.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-400" />
          <span>Group Conditioning & Classes</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Reserve spots in Olympic lifting clinics, metabolic HIIT, and recovery mobility sessions
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((c) => {
          const isBooked = bookedClassIds.includes(c.id);
          const bookedCount = (c.bookings?.length || 0) + (isBooked ? 1 : 0);
          const isFull = bookedCount >= c.maxCapacity;

          return (
            <Card key={c.id} className="glass-card border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="emerald" className="uppercase font-bold text-[10px]">
                    {c.category}
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    {c.startTime}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{c.name}</h3>
                <p className="text-xs text-slate-400 mb-4 line-clamp-2">{c.description}</p>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Coach:</span>
                    <strong className="text-white">
                      {c.trainer?.user?.firstName} {c.trainer?.user?.lastName}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Studio:</span>
                    <strong className="text-white">{c.room}</strong>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                    <span>Roster:</span>
                    <span className="font-bold text-emerald-400">
                      {bookedCount} / {c.maxCapacity} spots
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2">
                {isBooked ? (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full font-bold"
                    isLoading={loadingId === c.id}
                    onClick={() => handleCancel(c.id, c.name)}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Cancel Spot
                  </Button>
                ) : (
                  <Button
                    variant={isFull ? "secondary" : "primary"}
                    size="sm"
                    className="w-full font-bold"
                    isLoading={loadingId === c.id}
                    onClick={() => handleBook(c.id, c.name)}
                  >
                    {isFull ? "Join Waitlist" : "Reserve Spot"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
