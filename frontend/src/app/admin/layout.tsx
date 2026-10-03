"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  QrCode,
  Calendar,
  Dumbbell,
  Receipt,
  Gift,
  ShieldAlert,
  Settings,
  LogOut,
  Flame,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Members", href: "/admin/members", icon: Users },
    { label: "Memberships", href: "/admin/memberships", icon: CreditCard },
    { label: "Attendance", href: "/admin/attendance", icon: QrCode },
    { label: "Classes", href: "/admin/classes", icon: Calendar },
    { label: "Trainers", href: "/admin/trainers", icon: Dumbbell },
    { label: "Billing & Revenue", href: "/admin/billing", icon: Receipt },
    { label: "Rewards Shop", href: "/admin/rewards", icon: Gift },
    { label: "Retention & AI", href: "/admin/retention", icon: ShieldAlert },
  ];

  const handleLogout = () => {
    api.logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#090D14] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800 bg-slate-950/90 backdrop-blur-md fixed inset-y-0 z-30">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
            <Flame className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <div className="text-sm font-black text-white tracking-wider">APEX ADMIN</div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">HQ Operations</div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <Link
              href="/kiosk"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition"
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Launch Kiosk</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 border-b border-slate-800 bg-slate-950 z-30 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
            <Flame className="w-4 h-4 fill-slate-950" />
          </div>
          <span className="text-sm font-bold text-white">APEX ADMIN</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-400 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Slide-over */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm">
          <div className="w-64 bg-slate-950 h-full p-4 space-y-1">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Navigation</span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900"
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 pt-16 lg:pt-0 min-h-screen flex flex-col">
        <div className="p-4 sm:p-6 lg:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
