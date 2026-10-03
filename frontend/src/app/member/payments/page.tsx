"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Payment } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Receipt, CreditCard, CheckCircle, RefreshCw } from "lucide-react";

export default function MemberPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [renewing, setRenewing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    api.listPayments().then(setPayments);
  }, []);

  const handleRenew = async () => {
    setRenewing(true);
    try {
      await api.processPayment({
        amount: 159.99,
        paymentMethod: "credit_card",
        paymentType: "membership",
        notes: "Quarterly Pro Conditioning Term Renewal",
      });
      setActionSuccess("Membership renewed successfully for another 90 days! Invoice issued.");
      const updated = await api.listPayments();
      setPayments(updated);
      setTimeout(() => setActionSuccess(""), 5000);
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            <span>Membership Billing & Invoices</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            View transaction history, download verified tax receipts, or renew subscription
          </p>
        </div>

        <Button size="sm" isLoading={renewing} onClick={handleRenew} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Renew Term Now
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Payment History Table */}
      <Card className="glass-card border-slate-800 p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Billing History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Invoice #</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Method</th>
                <th className="px-4 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 font-mono text-emerald-400 font-semibold">{p.invoiceNumber}</td>
                  <td className="px-4 py-3.5 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5 uppercase font-mono text-[10px] text-slate-300">{p.paymentType}</td>
                  <td className="px-4 py-3.5 font-bold text-white">${Number(p.netAmount).toFixed(2)}</td>
                  <td className="px-4 py-3.5 capitalize text-slate-300">{p.paymentMethod.replace("_", " ")}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Badge variant="success">Completed</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
