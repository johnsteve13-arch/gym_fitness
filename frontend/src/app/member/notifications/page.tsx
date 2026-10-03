"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Notification } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Bell,
  CheckCheck,
  Award,
  CreditCard,
  Calendar,
  Flame,
  Clock,
  Sparkles,
} from "lucide-react";

export default function MemberNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = async () => {
    const res = await api.listNotifications();
    setNotifications(res.notifications);
    setUnreadCount(res.unreadCount);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case "workout":
        return <Flame className="w-4 h-4 text-emerald-400" />;
      case "reward":
        return <Award className="w-4 h-4 text-amber-400" />;
      case "payment":
        return <CreditCard className="w-4 h-4 text-cyan-400" />;
      case "booking":
        return <Calendar className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-400" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            System announcements, membership alerts, and workout achievements
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleMarkAllRead}
            leftIcon={<CheckCheck className="w-4 h-4 text-emerald-400" />}
          >
            Mark All Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === "all" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === "unread" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
          }`}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="glass-card border-slate-800 text-center py-12 text-slate-500 text-xs">
            No notifications to display.
          </Card>
        ) : (
          filtered.map((n) => (
            <Card
              key={n.id}
              className={`glass-card transition p-4 flex items-start gap-4 ${
                n.isRead
                  ? "border-slate-800 bg-slate-900/60"
                  : "border-emerald-500/40 bg-emerald-950/20 shadow-md shadow-emerald-500/5"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{n.title}</h4>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
              </div>

              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-2" />
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
