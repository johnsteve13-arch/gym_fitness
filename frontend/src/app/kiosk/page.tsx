"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  QrCode,
  CheckCircle,
  XCircle,
  LogOut,
  Maximize2,
  Volume2,
  VolumeX,
  Search,
  Sparkles,
  ArrowLeft,
  Clock,
  Award,
  LogIn,
  Timer,
} from "lucide-react";

export default function KioskPage() {
  const [mode, setMode] = useState<"in" | "out">("in"); // "in" = Time In (Entry), "out" = Time Out (Exit)
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [registeredMembers, setRegisteredMembers] = useState<any[]>([]);

  useEffect(() => {
    const stored = api.getStoredMembers();
    setRegisteredMembers(stored);
  }, []);

  const playChime = (granted: boolean) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (granted) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(220.0, ctx.currentTime);
        osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // AudioContext not permitted without interaction
    }
  };

  const handleProcess = async (e?: React.FormEvent, forcedMode?: "in" | "out", targetId?: string) => {
    if (e) e.preventDefault();
    const idToUse = targetId || identifier;
    if (!idToUse.trim()) return;

    const activeMode = forcedMode || mode;
    setLoading(true);
    setResult(null);

    try {
      if (activeMode === "in") {
        // TIME IN: verify membership and award +8 points
        const data = await api.verifyAndCheckIn(idToUse, "kiosk");
        setResult({
          type: "in",
          ...data,
        });
        playChime(data.accessGranted);
      } else {
        // TIME OUT: record departure and duration
        const data = await api.checkOut(idToUse);
        setResult({
          type: "out",
          accessGranted: true,
          ...data,
        });
        playChime(true);
      }
    } catch (err: any) {
      setResult({
        type: activeMode,
        accessGranted: false,
        reason: err.message || "Access Denied: Unrecognized ID or network error.",
      });
      playChime(false);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickScan = (code: string, quickMode?: "in" | "out") => {
    setIdentifier(code);
    const chosenMode = quickMode || mode;
    handleProcess(undefined, chosenMode, code);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Return to website"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white tracking-wider flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full animate-pulse ${mode === "in" ? "bg-emerald-500" : "bg-amber-500"}`} />
              RECEPTION TURNSTILE KIOSK • {mode === "in" ? "TIME IN (ENTRY)" : "TIME OUT (EXIT)"}
            </h1>
            <p className="text-xs text-slate-400">
              Station #01 • Real-Time Attendance Pass Validator & +8 Points Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title={soundEnabled ? "Audio chime on" : "Audio chime muted"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Terminal Viewport */}
      <div className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-8">
        {/* Scanner / ID Input Form */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="glass-card border-slate-800 p-6 sm:p-8">
            {/* Mode Switcher: Time In vs Time Out */}
            <div className="flex rounded-xl bg-slate-950 p-1.5 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("in");
                  setResult(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  mode === "in"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>TIME IN (Entry)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900/40 text-slate-950 font-black">+8 Pts</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("out");
                  setResult(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  mode === "out"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>TIME OUT (Exit)</span>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  mode === "in" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}
              >
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {mode === "in" ? "Scan to Time In" : "Scan to Time Out"}
                </h2>
                <p className="text-xs text-slate-400">
                  {mode === "in"
                    ? "Position QR pass or type ID to unlock gate and receive 8 points"
                    : "Scan pass or type ID to record departure and workout duration"}
                </p>
              </div>
            </div>

            <form onSubmit={handleProcess} className="space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. MEM-10001 or scan QR token..."
                  className={`w-full bg-slate-950 border-2 rounded-xl pl-11 pr-4 py-3 text-base text-white placeholder-slate-500 focus:outline-none transition shadow-inner font-mono ${
                    mode === "in" ? "border-slate-800 focus:border-emerald-500" : "border-slate-800 focus:border-amber-500"
                  }`}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  isLoading={loading}
                  size="lg"
                  className={`flex-1 font-bold ${
                    mode === "in"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  }`}
                >
                  {mode === "in" ? "Validate & Record Time In (+8 Points)" : "Record Time Out Departure"}
                </Button>
                {identifier && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setIdentifier("");
                      setResult(null);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>

            {/* Quick Test Barcodes for registered members */}
            {registeredMembers.length > 0 ? (
              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center justify-between uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Quick Scan Athletes</span>
                  </span>
                  <span className="text-[10px] text-slate-500 lowercase">Click In or Out</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {registeredMembers.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-white font-bold truncate">
                          {m.user?.firstName} {m.user?.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{m.memberCode}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickScan(m.memberCode, "in")}
                          className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-bold text-[10px] transition"
                          title="Record Time In"
                        >
                          In (+8)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickScan(m.memberCode, "out")}
                          className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 font-bold text-[10px] transition"
                          title="Record Time Out"
                        >
                          Out
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 py-2">
                <span>No athlete passes registered yet. </span>
                <Link href="/register?role=member" className="text-emerald-400 hover:underline">
                  Sign up as member
                </Link>
                <span> to test instant turnstile access.</span>
              </div>
            )}
          </Card>
        </div>

        {/* Real-time Status Card Display */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          {result ? (
            <div
              className={`w-full rounded-2xl border-2 p-8 shadow-2xl transition-all duration-300 transform animate-in zoom-in-95 ${
                result.accessGranted
                  ? result.type === "in"
                    ? "bg-slate-900 border-emerald-500/80 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                    : "bg-slate-900 border-amber-500/80 shadow-[0_0_50px_rgba(245,158,11,0.2)]"
                  : "bg-slate-900 border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
              }`}
            >
              <div className="flex items-center gap-4 mb-6">
                {result.accessGranted ? (
                  result.type === "in" ? (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Timer className="w-10 h-10" />
                    </div>
                  )
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-10 h-10" />
                  </div>
                )}
                <div>
                  <div
                    className={`text-2xl font-black tracking-tight ${
                      result.accessGranted
                        ? result.type === "in"
                          ? "text-emerald-400"
                          : "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {result.accessGranted
                      ? result.type === "in"
                        ? "TIME IN RECORDED"
                        : "TIME OUT RECORDED"
                      : "ACCESS DENIED"}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {result.accessGranted
                      ? result.type === "in"
                        ? "Turnstile gate unlocked • Welcome to the gym!"
                        : "Turnstile exit unlocked • Session completed!"
                      : "Please resolve at reception counter"}
                  </div>
                </div>
              </div>

              {result.accessGranted ? (
                <div className="space-y-4">
                  {/* Points Bonus Banner on Time In */}
                  {result.type === "in" && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-amber-950/40 border border-emerald-500/50 flex items-center justify-between gap-3 shadow-lg shadow-emerald-500/10">
                      <div className="flex items-center gap-2.5">
                        <Award className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white">+8 Reward Points Earned!</div>
                          <div className="text-[11px] text-slate-300">Awarded for member gym attendance</div>
                        </div>
                      </div>
                      <Badge variant="warning" className="font-bold">+8 Points</Badge>
                    </div>
                  )}

                  {/* Duration Banner on Time Out */}
                  {result.type === "out" && (
                    <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-center justify-between gap-3 shadow-lg shadow-amber-500/10">
                      <div className="flex items-center gap-2.5">
                        <Timer className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white">Workout Session Complete!</div>
                          <div className="text-[11px] text-amber-200">
                            Total Gym Duration: <strong>{result.durationMinutes || 60} minutes</strong>
                          </div>
                        </div>
                      </div>
                      <Badge variant="warning" className="font-bold">{result.durationMinutes || 60} mins</Badge>
                    </div>
                  )}

                  {result.member && (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                      {result.member.avatarUrl ? (
                        <img
                          src={result.member.avatarUrl}
                          alt={result.member.name}
                          className="w-14 h-14 rounded-full border border-emerald-500/40 object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-lg">
                          {(result.member.name || "A").charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-lg font-bold text-white">{result.member.name}</div>
                        <div className="text-xs text-slate-400 font-mono">Member ID: {result.member.memberCode}</div>
                        <div className="text-xs text-emerald-400 font-medium mt-0.5">{result.member.planName || "Active Member"}</div>
                      </div>
                    </div>
                  )}

                  {result.member && result.type === "in" && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="text-slate-400">Remaining Days</div>
                          <div className="text-sm font-bold text-white">{result.member.daysRemaining} Days</div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-slate-400">Total Points</div>
                          <div className="text-sm font-bold text-white">{result.member.rewardCoins} Points</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick toggle action */}
                  {result.type === "in" ? (
                    <Button
                      variant="outline"
                      onClick={() => handleProcess(undefined, "out", result.member?.memberCode || identifier)}
                      className="w-full text-xs font-semibold border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                      leftIcon={<LogOut className="w-4 h-4" />}
                    >
                      Record Time Out (Exit Gate)
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMode("in");
                        setResult(null);
                        setIdentifier("");
                      }}
                      className="w-full text-xs font-semibold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                      leftIcon={<LogIn className="w-4 h-4" />}
                    >
                      Ready for Next Turnstile Check-In
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 space-y-2">
                  <div className="font-semibold text-sm text-red-200">Refusal Reason:</div>
                  <p>{result.reason || "Membership expired or inactive."}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-80 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <QrCode className="w-16 h-16 mb-4 text-slate-700" />
              <div className="text-base font-bold text-slate-400">
                Awaiting {mode === "in" ? "Time In" : "Time Out"} Badge Scan
              </div>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Scan member QR pass or choose a simulated badge on the left to trigger {mode === "in" ? "Time In (+8 Points)" : "Time Out departure"}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
