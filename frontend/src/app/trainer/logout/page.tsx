"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  LogOut,
  ShieldCheck,
  Flame,
  ArrowLeft,
  CheckCircle,
  Dumbbell,
  Clock,
  UserCheck,
  Lock,
} from "lucide-react";

export default function TrainerLogoutPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [trainerProfile, setTrainerProfile] = useState<any>(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);

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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoggedOut && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isLoggedOut && countdown === 0) {
      router.push("/login");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoggedOut, countdown, router]);

  const handleConfirmLogout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      api.logout();
      setIsProcessing(false);
      setIsLoggedOut(true);
    }, 400);
  };

  const displayName = currentUser?.firstName
    ? `Coach ${currentUser.firstName} ${currentUser.lastName || ""}`
    : "Personal Trainer";

  return (
    <div className="min-h-screen bg-[#090D14] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
            <Flame className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <span className="font-black text-white text-base tracking-tight block leading-tight">
              BOOT CAMP FITNESS
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase">
              Gym Membership Management System
            </span>
          </div>
        </Link>

        {!isLoggedOut && (
          <Link href="/trainer">
            <Button size="sm" variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Dashboard
            </Button>
          </Link>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-md w-full mx-auto my-12">
        {!isLoggedOut ? (
          /* Confirmation State */
          <Card className="glass-card border-slate-800 p-8 shadow-2xl relative overflow-hidden text-center">
            {/* Ambient Red Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-44 h-44 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Logout Icon Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-500/10">
              <LogOut className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight mb-1">
              End Coaching Session?
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              You are about to sign out from the certified coaching workstation.
            </p>

            {/* Coach Profile Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left mb-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  {displayName}
                </span>
                <Badge variant="emerald" className="text-[10px]">
                  Online Coach
                </Badge>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                {currentUser?.email || "trainer@apexfitness.com"}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
                <span>Specialization:</span>
                <span className="text-emerald-400 font-semibold truncate max-w-[180px]">
                  {trainerProfile?.specialization || "Strength & Hypertrophy"}
                </span>
              </div>
            </div>

            {/* Safety Checklist */}
            <div className="text-left text-xs text-slate-400 space-y-2 mb-8 bg-slate-900/40 p-3.5 rounded-lg border border-slate-800/60">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Client session attendance logs saved</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Workstation turns into locked security state</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Upcoming schedule stays queued in system</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                variant="danger"
                size="md"
                className="w-full font-bold"
                onClick={handleConfirmLogout}
                isLoading={isProcessing}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Sign Out & Disconnect
              </Button>

              <Link href="/trainer" className="block">
                <Button variant="secondary" size="md" className="w-full">
                  Cancel & Stay Logged In
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          /* Logged Out Success State */
          <Card className="glass-card border-slate-800 p-8 shadow-2xl relative overflow-hidden text-center">
            {/* Ambient Emerald Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/10 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight mb-1">
              Shift Terminated Successfully
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Your trainer session has been securely closed. The coaching terminal has been locked.
            </p>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center mb-6">
              <span className="text-xs text-slate-400 block mb-1">Auto-Redirect Status</span>
              <span className="text-xs font-semibold text-emerald-400">
                Redirecting to public login in <strong className="font-mono text-white text-sm">{countdown}s</strong>...
              </span>
            </div>

            <div className="space-y-3">
              <Link href="/login" className="block">
                <Button size="md" className="w-full font-bold">
                  Log In Again
                </Button>
              </Link>

              <Link href="/" className="block">
                <Button variant="secondary" size="md" className="w-full">
                  Back to Homepage
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* Footer Info */}
      <div className="max-w-4xl w-full mx-auto text-center pt-6 border-t border-slate-800/80 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Boot Camp Fitness Gym — Staff Security & Access Protocol</span>
        <span>Secure Local Session Guard</span>
      </div>
    </div>
  );
}
