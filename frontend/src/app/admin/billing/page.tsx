"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Payment } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  DollarSign,
  Receipt,
  Download,
  Printer,
  CheckCircle,
  RefreshCcw,
  ArrowUpRight,
  CreditCard,
  Flame,
} from "lucide-react";

export default function AdminBillingPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [actionSuccess, setActionSuccess] = useState("");

  const loadData = async () => {
    const [p, a] = await Promise.all([api.listPayments(), api.getFinancialAnalytics()]);
    setPayments(p);
    setAnalytics(a);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefund = async (paymentId: string) => {
    if (!confirm("Are you sure you want to process a full refund for this invoice?")) return;
    await api.refundPayment(paymentId, "Member requested refund");
    setActionSuccess("Payment marked as refunded.");
    loadData();
    setTimeout(() => setActionSuccess(""), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Financial Billing & Transactions</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Atomic relational payment processing, revenue auditing, and verified tax invoices
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Gross Revenue</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white">
            ${Number(analytics?.totalRevenue || 24950).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Today: ${Number(analytics?.todayRevenue || 859.97).toFixed(2)}</span>
          </div>
        </Card>

        <Card className="glass-card border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Membership Revenue</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-400">
            ${Number(analytics?.membershipRevenue || 19800).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">Primary recurring cashflow</div>
        </Card>

        <Card className="glass-card border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trainer Sessions</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-cyan-400">
            ${Number(analytics?.trainerRevenue || 3450).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">1-on-1 private coaching</div>
        </Card>

        <Card className="glass-card border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Classes & Merchandise</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-400">
            ${Number((analytics?.classRevenue || 1200) + (analytics?.otherRevenue || 500)).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">Ancillary retail & drop-ins</div>
        </Card>
      </div>

      {/* Transaction Invoices Table */}
      <Card className="glass-card border-slate-800 p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">Transaction Ledger</h3>
          <span className="text-xs text-slate-400">{payments.length} Payments Processed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Invoice #</th>
                <th className="px-4 py-3.5">Member</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Method</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Receipt & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.map((p) => {
                const isRefunded = p.paymentStatus === "refunded";

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-mono text-emerald-400 font-semibold">{p.invoiceNumber}</td>

                    <td className="px-4 py-3.5 font-medium text-white">
                      {p.member?.user?.firstName} {p.member?.user?.lastName}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-white">${Number(p.netAmount).toFixed(2)}</td>

                    <td className="px-4 py-3.5 capitalize text-slate-300">
                      {p.paymentMethod.replace("_", " ")}
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge variant="neutral" className="uppercase font-mono text-[10px]">
                        {p.paymentType}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge variant={isRefunded ? "danger" : "success"}>
                        {p.paymentStatus}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition"
                      >
                        Receipt
                      </button>
                      {!isRefunded && (
                        <button
                          onClick={() => handleRefund(p.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 text-[11px] font-semibold transition"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PRINTABLE RECEIPT / INVOICE MODAL */}
      {selectedReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReceipt(null)}
          title={`Official Gym Receipt — ${selectedReceipt.invoiceNumber}`}
        >
          <div className="bg-white text-slate-900 p-6 rounded-xl space-y-6 text-xs printable-receipt">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-emerald-600 flex items-center justify-center text-white font-black">
                    <Flame className="w-4 h-4 fill-white" />
                  </div>
                  <span className="text-base font-black tracking-wider text-slate-900">APEX IRON CLUB</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  100 Grand Olympic Blvd, Suite 500, Metro City, NY
                </div>
                <div className="text-[11px] text-slate-500">Tax ID: US-84910294-A</div>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-slate-900">{selectedReceipt.invoiceNumber}</div>
                <div className="text-[11px] text-slate-500">
                  Date: {new Date(selectedReceipt.createdAt).toLocaleDateString()}
                </div>
                <Badge variant="success" className="mt-1">
                  PAID IN FULL
                </Badge>
              </div>
            </div>

            {/* Billed To */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Billed To</div>
              <div className="font-bold text-slate-900">
                {selectedReceipt.member?.user?.firstName} {selectedReceipt.member?.user?.lastName}
              </div>
              <div className="text-slate-500">{selectedReceipt.member?.user?.email}</div>
              <div className="font-mono text-slate-500 text-[11px]">ID: {selectedReceipt.member?.memberCode}</div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-800">
                      {selectedReceipt.notes || "Gym Membership Dues"}
                    </td>
                    <td className="p-2.5 uppercase font-mono text-[10px] text-slate-500">
                      {selectedReceipt.paymentType}
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900">
                      ${Number(selectedReceipt.amount).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-48 space-y-1.5 text-right">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>${Number(selectedReceipt.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Discount:</span>
                  <span>-${Number(selectedReceipt.discountAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-300 pt-1.5">
                  <span>Total Paid:</span>
                  <span>${Number(selectedReceipt.netAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-4">
              Payment Method: {selectedReceipt.paymentMethod.toUpperCase()} • TXN: {selectedReceipt.transactionId}
              <br />
              Thank you for training at Apex Iron Athletic Club!
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button size="sm" variant="secondary" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
              <Button size="sm" onClick={handlePrint} leftIcon={<Printer className="w-4 h-4" />}>
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
