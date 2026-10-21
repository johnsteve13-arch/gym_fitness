"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RotateCw,
  Phone,
  Radio,
} from "lucide-react";

export default function AdminSmsPage() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Test SMS State
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Apex Iron: Test notification from the management console.");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Retry State
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.getSmsStats(),
        api.getSmsLogs(1, 30),
      ]);
      setStats(statsRes);
      setLogs(logsRes.logs || statsRes.recentLogs || []);
    } catch (err) {
      console.error("Failed to load SMS data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await api.sendTestSms(testPhone, testMessage);
      setTestResult({
        success: res.success,
        message: res.message || "Test SMS processed successfully.",
      });
      loadData();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to deliver test SMS.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleRetry = async (logId: string) => {
    setRetryingId(logId);
    try {
      await api.retrySms(logId);
      loadData();
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge variant="emerald">Delivered</Badge>;
      case "accepted":
        return <Badge variant="emerald">Accepted</Badge>;
      case "failed":
        return <Badge variant="danger">Failed</Badge>;
      case "undelivered":
        return <Badge variant="amber">Opted-Out</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            <span>Philippine SMS Communications Gateway</span>
            <Badge variant="emerald">Semaphore.co v4</Badge>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time cellular dispatch outbox, event notification tracking, and delivery diagnostics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Outbox</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-800 bg-[#14171C]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Messages</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {stats?.metrics?.total ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Recorded outbound dispatches</p>
        </Card>

        <Card className="p-5 border-slate-800 bg-[#14171C]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Delivery Success Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {stats?.metrics?.successRate ?? 100}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {(stats?.metrics?.delivered ?? 0) + (stats?.metrics?.accepted ?? 0)} delivered or accepted
          </p>
        </Card>

        <Card className="p-5 border-slate-800 bg-[#14171C]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Failed Dispatches</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {stats?.metrics?.failed ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Invalid numbers or timeouts</p>
        </Card>

        <Card className="p-5 border-slate-800 bg-[#14171C]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Gateway Mode</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-sm font-bold text-white flex items-center gap-2">
            <span>{stats?.dryRun ? "Dry-Run (Simulated)" : "Live Cellular"}</span>
            <Badge variant={stats?.dryRun ? "amber" : "emerald"}>
              {stats?.dryRun ? "Safe Dev" : "Production"}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Sender: {stats?.senderName || "SEMAPHORE"} • Code +63
          </p>
        </Card>
      </div>

      {/* Main Grid: Send Test & Outbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Dispatch Card */}
        <Card className="p-6 border-slate-800 bg-[#14171C] space-y-4 lg:col-span-1">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Send Test SMS</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify your Semaphore credentials by delivering a sample notification to a Philippine mobile number.
            </p>
          </div>

          <form onSubmit={handleSendTest} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Recipient Mobile (Philippines)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="09171234567 or +639171234567"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Test Message ({testMessage.length} / 160 chars)
              </label>
              <textarea
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                maxLength={160}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.success
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={sendingTest}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
            >
              {sendingTest ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Delivering via Semaphore...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Test Message</span>
                </>
              )}
            </Button>
          </form>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
            <p>• Supported prefixes: 09xx, +639xx, 639xx</p>
            <p>• Dry-run mode logs delivery to DB without credit deduction</p>
            <p>• Switch SMS_DRY_RUN=false in Render to dispatch cellular SMS</p>
          </div>
        </Card>

        {/* Live Outbox Logs Table */}
        <Card className="p-6 border-slate-800 bg-[#14171C] lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Persistent SMS Notification Outbox</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Recent automated dispatches for bookings, payments, renewals, and class reminders
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Showing last {logs.length} entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-1">Recipient</th>
                  <th className="pb-3">Event</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Message</th>
                  <th className="pb-3">Sent At</th>
                  <th className="pb-3 text-right pr-1">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No SMS notification records yet. Send a test message or create a booking.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 pl-1">
                        <div className="font-semibold text-white font-mono">
                          {log.recipientPhone}
                        </div>
                        {log.recipientName && (
                          <div className="text-[10px] text-slate-400">{log.recipientName}</div>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {log.event}
                        </span>
                      </td>
                      <td className="py-3">{getStatusBadge(log.status)}</td>
                      <td className="py-3 max-w-[220px]">
                        <p className="text-slate-300 truncate" title={log.messageContent}>
                          {log.messageContent}
                        </p>
                        {log.errorMessage && (
                          <p className="text-[10px] text-red-400 truncate" title={log.errorMessage}>
                            Error: {log.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {log.sentAt
                          ? new Date(log.sentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date(log.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </td>
                      <td className="py-3 text-right pr-1">
                        {log.status === "failed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={retryingId === log.id}
                            onClick={() => handleRetry(log.id)}
                            className="text-[10px] h-6 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            {retryingId === log.id ? "Retrying..." : "Retry"}
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono">OK</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
