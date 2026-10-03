"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { ShieldCheck, UserCheck, Dumbbell, User, MonitorSmartphone } from "lucide-react";

export const RoleSwitcher: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<string>("super_admin");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const user = api.getCurrentUser();
    if (user) setCurrentRole(user.role);
  }, [pathname]);

  const handleSwitch = (role: "super_admin" | "admin" | "trainer" | "member") => {
    api.switchDemoRole(role);
    setCurrentRole(role);
    setIsOpen(false);

    if (role === "super_admin" || role === "admin") {
      router.push("/admin");
    } else if (role === "trainer") {
      router.push("/trainer");
    } else {
      router.push("/member");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-2 p-2 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col gap-1 w-56 animate-in slide-in-from-bottom-2">
          <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase border-b border-slate-800">
            Demo Portal Switcher
          </div>

          <button
            onClick={() => handleSwitch("super_admin")}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition ${
              currentRole === "super_admin"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div>Super Admin</div>
              <div className="text-[10px] text-slate-400">Full Business Controls</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitch("admin")}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition ${
              currentRole === "admin"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <div>
              <div>Gym Staff / Desk</div>
              <div className="text-[10px] text-slate-400">Operations & Check-ins</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitch("trainer")}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition ${
              currentRole === "trainer"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Dumbbell className="w-4 h-4 text-amber-400" />
            <div>
              <div>Personal Trainer</div>
              <div className="text-[10px] text-slate-400">Clients & Workouts</div>
            </div>
          </button>

          <button
            onClick={() => handleSwitch("member")}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition ${
              currentRole === "member"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <User className="w-4 h-4 text-purple-400" />
            <div>
              <div>Gym Member (Sarah)</div>
              <div className="text-[10px] text-slate-400">QR, Workouts, AI Coach</div>
            </div>
          </button>

          <div className="border-t border-slate-800 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/kiosk");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left text-slate-300 hover:bg-slate-800 transition"
            >
              <MonitorSmartphone className="w-4 h-4 text-emerald-400" />
              <div>
                <div>Reception Kiosk Mode</div>
                <div className="text-[10px] text-slate-400">Fast Front Desk Terminal</div>
              </div>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 rounded-full shadow-2xl backdrop-blur-md text-xs font-semibold tracking-wide transition active:scale-95"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Role: <span className="capitalize text-white font-bold">{currentRole.replace("_", " ")}</span>
      </button>
    </div>
  );
};
