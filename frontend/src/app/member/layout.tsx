"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  User,
  QrCode,
  Dumbbell,
  Scale,
  Calendar,
  Gift,
  Sparkles,
  Bell,
  LogOut,
  Flame,
  Menu,
  X,
  UserCheck,
  ArrowRight,
} from "lucide-react";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = api.getCurrentUser();
    if (!user || user.role !== "member") {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  const navItems = [
    { label: "Overview & Pass", href: "/member", icon: QrCode },
    { label: "Workout Logger", href: "/member/workouts", icon: Dumbbell },
    { label: "Personal Trainers", href: "/member/trainers", icon: UserCheck },
    { label: "Body Composition", href: "/member/measurements", icon: Scale },
    { label: "Group Classes", href: "/member/classes", icon: Calendar },
    { label: "Rewards Shop", href: "/member/rewards", icon: Gift },
    { label: "AI Fitness Coach", href: "/member/ai-coach", icon: Sparkles },
    { label: "Notifications", href: "/member/notifications", icon: Bell },
  ];

  const handleLogout = () => {
    api.logout();
    router.push("/login");
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#090D14] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Verifying Member Access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D14] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
              <Flame className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-black text-white tracking-wider block leading-tight">
                BOOT CAMP FITNESS
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 block tracking-wider -mt-0.5">
                GYM MEMBERSHIP MANAGEMENT SYSTEM
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-slate-900 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    isActive ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Dedicated Trainer Booking Navigation Bar */}
        <div className="border-t border-slate-800/80 bg-slate-950/70 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Trainer Booking:</span>
              </span>
              <Link
                href="/member/trainers"
                className={`shrink-0 px-2.5 py-1 rounded-md transition font-medium text-[11px] flex items-center gap-1 ${
                  pathname === "/member/trainers"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span>Find Coach</span>
              </Link>
              <Link
                href="/member/workouts"
                className="shrink-0 px-2.5 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-900 transition font-medium text-[11px] flex items-center gap-1"
              >
                <Dumbbell className="w-3 h-3 text-cyan-400" />
                <span>Book for Workout</span>
              </Link>
              <Link
                href="/member/trainers"
                className="shrink-0 px-2.5 py-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-900 transition font-medium text-[11px] flex items-center gap-1"
              >
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>Coaching Schedule</span>
              </Link>
            </div>

            <Link
              href="/member/trainers"
              className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:underline shrink-0"
            >
              <span>1-on-1 Certified Coaches Available</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
