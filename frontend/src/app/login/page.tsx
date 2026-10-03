"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Flame, Lock, Mail, ShieldAlert, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.login(email, password);
      redirectRole(res.user.role);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (role: "super_admin" | "admin" | "trainer" | "member") => {
    const user = api.switchDemoRole(role);
    redirectRole(user.role);
  };

  const redirectRole = (role: string) => {
    if (role === "super_admin" || role === "admin") {
      router.push("/admin");
    } else if (role === "trainer") {
      router.push("/trainer");
    } else {
      router.push("/member");
    }
  };

  return (
    <div className="min-h-screen bg-[#090D14] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Flame className="w-6 h-6 fill-slate-950" />
          </div>
          <span className="text-xl font-black text-white tracking-wider">APEX IRON</span>
        </Link>
        <h2 className="text-2xl font-black text-white tracking-tight">Portal Authentication</h2>
        <p className="mt-1 text-xs text-slate-400">Secure credential access to club management and services</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Quick Demo Access Bar */}
        <div className="mb-6 p-3.5 bg-slate-900/90 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant One-Click Demo Logins</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickDemoLogin("super_admin")}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium transition"
            >
              👑 Super Admin
            </button>
            <button
              onClick={() => handleQuickDemoLogin("admin")}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium transition"
            >
              🏢 Desk Staff
            </button>
            <button
              onClick={() => handleQuickDemoLogin("trainer")}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium transition"
            >
              🏋️ Personal Trainer
            </button>
            <button
              onClick={() => handleQuickDemoLogin("member")}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-left font-medium transition"
            >
              ⚡ Member (Sarah)
            </button>
          </div>
        </div>

        <Card className="glass-card border-slate-800 p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@apexfitness.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <span className="text-[11px] text-emerald-400 hover:underline cursor-pointer">
                  Default: Password@123
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <Button type="submit" isLoading={loading} className="w-full mt-2 font-bold">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don&apos;t have a membership profile yet?{" "}
            <Link href="/register" className="text-emerald-400 font-semibold hover:underline">
              Join the Club
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
