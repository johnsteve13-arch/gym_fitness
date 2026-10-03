"use client";

import React, { useState } from "react";
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
} from "lucide-react";

export default function KioskPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [checkoutMessage, setCheckoutMessage] = useState("");

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

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setResult(null);
    setCheckoutMessage("");

    try {
      const data = await api.verifyAndCheckIn(identifier, "kiosk");
      setResult(data);
      playChime(data.accessGranted);
    } catch (err: any) {
      setResult({
        accessGranted: false,
        reason: err.message || "Access Denied: Unrecognized ID or network error.",
      });
      playChime(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await api.checkOut(result?.member?.id);
      setCheckoutMessage(res.message);
    } catch (err: any) {
      setCheckoutMessage("Check-out recorded.");
    }
  };

  const handleQuickScan = (code: string) => {
    setIdentifier(code);
    setLoading(true);
    api.verifyAndCheckIn(code, "kiosk").then((data) => {
      setResult(data);
      playChime(data.accessGranted);
      setLoading(false);
    });
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
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              FRONT DESK ENTRY ACCESS TERMINAL
            </h1>
            <p className="text-xs text-slate-400">Station #01 • Real-Time TiDB Relational Pass Validator</p>
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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Scan Member QR or Enter ID</h2>
                <p className="text-xs text-slate-400">Position mobile QR barcode in front of camera or type code</p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. MEM-10001 or scan barcode..."
                  className="w-full bg-slate-950 border-2 border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-base text-white placeholder-slate-500 focus:outline-none transition shadow-inner font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" isLoading={loading} size="lg" className="flex-1 font-bold">
                  Validate & Check In
                </Button>
                {identifier && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setIdentifier("");
                      setResult(null);
                      setCheckoutMessage("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>

            {/* Quick Test Demo Barcodes */}
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulate Hardware Scanners</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleQuickScan("MEM-10001")}
                  className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition font-mono"
                >
                  <div className="text-emerald-400 font-bold">Sarah Connor</div>
                  <div className="text-[10px] text-slate-400">MEM-10001 (Valid Pass)</div>
                </button>
                <button
                  onClick={() => handleQuickScan("MEM-10002")}
                  className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition font-mono"
                >
                  <div className="text-cyan-400 font-bold">Alex Mercer</div>
                  <div className="text-[10px] text-slate-400">MEM-10002 (Active Monthly)</div>
                </button>
                <button
                  onClick={() => handleQuickScan("MEM-10003")}
                  className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition font-mono"
                >
                  <div className="text-amber-400 font-bold">Jordan Lee</div>
                  <div className="text-[10px] text-slate-400">MEM-10003 (Championship VIP)</div>
                </button>
                <button
                  onClick={() => handleQuickScan("MEM-10004")}
                  className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition font-mono"
                >
                  <div className="text-red-400 font-bold">Chloe Bennett</div>
                  <div className="text-[10px] text-slate-400">MEM-10004 (Expired Plan)</div>
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Real-time Status Card Display */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          {result ? (
            <div
              className={`w-full rounded-2xl border-2 p-8 shadow-2xl transition-all duration-300 transform animate-in zoom-in-95 ${
                result.accessGranted
                  ? "bg-slate-900 border-emerald-500/80 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                  : "bg-slate-900 border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
              }`}
            >
              <div className="flex items-center gap-4 mb-6">
                {result.accessGranted ? (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-10 h-10" />
                  </div>
                )}
                <div>
                  <div
                    className={`text-2xl font-black tracking-tight ${
                      result.accessGranted ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {result.accessGranted ? "ACCESS GRANTED" : "ACCESS DENIED"}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {result.accessGranted ? "Turnstile gate unlocked" : "Please resolve at reception counter"}
                  </div>
                </div>
              </div>

              {result.accessGranted && result.member ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    {result.member.avatarUrl ? (
                      <img
                        src={result.member.avatarUrl}
                        alt={result.member.name}
                        className="w-14 h-14 rounded-full border border-emerald-500/40 object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-lg">
                        {result.member.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-lg font-bold text-white">{result.member.name}</div>
                      <div className="text-xs text-slate-400 font-mono">Member ID: {result.member.memberCode}</div>
                      <div className="text-xs text-emerald-400 font-medium mt-0.5">{result.member.planName}</div>
                    </div>
                  </div>

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
                        <div className="text-slate-400">Reward Balance</div>
                        <div className="text-sm font-bold text-white">{result.member.rewardCoins} Coins (+15 earned)</div>
                      </div>
                    </div>
                  </div>

                  {checkoutMessage ? (
                    <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs text-center font-medium">
                      {checkoutMessage}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleCheckOut}
                      className="w-full text-xs font-semibold"
                      leftIcon={<LogOut className="w-4 h-4" />}
                    >
                      Record Check-Out Departure
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
              <div className="text-base font-bold text-slate-400">Awaiting Member Badge Scan</div>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Scan member QR pass or choose a simulated badge above to trigger verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
