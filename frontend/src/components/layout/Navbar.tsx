"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { User, Notification } from "@/types";
import {
  Bell,
  LogOut,
  User as UserIcon,
  Shield,
  Dumbbell,
  Menu,
  X,
  QrCode,
  Flame,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const currentUser = api.getCurrentUser();
    setUser(currentUser);

    api.listNotifications().then((res) => {
      setNotifications(res.notifications.slice(0, 5));
      setUnreadCount(res.unreadCount);
    });
  }, []);

  const handleLogout = () => {
    api.logout();
    router.push("/login");
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 fill-slate-950 text-slate-950" />
          </div>
          <div>
            <span className="text-lg font-black tracking-wider text-white">APEX IRON</span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-400 -mt-1">
              ATHLETIC CLUB
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/#benefits" className="text-slate-300 hover:text-white transition">
            Benefits
          </Link>
          <Link href="/#plans" className="text-slate-300 hover:text-white transition">
            Plans
          </Link>
          <Link href="/#trainers" className="text-slate-300 hover:text-white transition">
            Trainers
          </Link>
          <Link href="/#classes" className="text-slate-300 hover:text-white transition">
            Classes
          </Link>
          <Link href="/kiosk" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold">
            <QrCode className="w-4 h-4" />
            Desk Kiosk
          </Link>
        </nav>

        {/* User Status & Action Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notification dropdown */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-emerald-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-xs text-slate-500 text-center py-4">No notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2 rounded-lg text-xs ${
                              n.isRead ? "bg-slate-800/40 text-slate-400" : "bg-emerald-950/40 text-emerald-300 border border-emerald-900/50"
                            }`}
                          >
                            <div className="font-semibold text-white">{n.title}</div>
                            <div className="text-[11px] text-slate-300 mt-0.5">{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Portal link button based on role */}
              {user.role === "super_admin" || user.role === "admin" ? (
                <Link
                  href="/admin"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Portal
                </Link>
              ) : user.role === "trainer" ? (
                <Link
                  href="/trainer"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  Trainer Portal
                </Link>
              ) : (
                <Link
                  href="/member"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  Member Portal
                </Link>
              )}

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20"
              >
                Join Now
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-2">
          <Link
            href="/#benefits"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
          >
            Benefits
          </Link>
          <Link
            href="/#plans"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
          >
            Plans
          </Link>
          <Link
            href="/#trainers"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
          >
            Trainers
          </Link>
          <Link
            href="/#classes"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
          >
            Classes
          </Link>
          <Link
            href="/kiosk"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-emerald-400 font-semibold hover:bg-slate-800"
          >
            Reception Kiosk Terminal
          </Link>
        </div>
      )}
    </header>
  );
};
