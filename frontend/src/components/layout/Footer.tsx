import React from "react";
import Link from "next/link";
import { Flame, Shield, MapPin, Phone, Mail, Clock } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
              <Flame className="w-5 h-5 fill-slate-950" />
            </div>
            <span className="text-base font-bold text-white tracking-wider">APEX IRON CLUB</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            World-class athletic conditioning, Olympic lifting suites, recovery cryogenic pools, and AI-driven coaching.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <Shield className="w-4 h-4" />
            <span>TiDB Relational Enterprise Grade</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Operations</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/admin" className="hover:text-emerald-400 transition">Management Console</Link></li>
            <li><Link href="/kiosk" className="hover:text-emerald-400 transition">Reception Scanner Kiosk</Link></li>
            <li><Link href="/trainer" className="hover:text-emerald-400 transition">Trainer Schedule Portal</Link></li>
            <li><Link href="/member" className="hover:text-emerald-400 transition">Member Mobile Pass</Link></li>
          </ul>
        </div>

        {/* Contact info */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Club HQ</h4>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>100 Grand Olympic Blvd, Suite 500, Metro City, NY</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>+1 (800) 555-APEX</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>concierge@apexfitness.com</span>
            </li>
          </ul>
        </div>

        {/* Facility Hours */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Facility Hours</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-white font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Monday – Friday: 05:00 – 23:00</span>
            </div>
            <div className="text-slate-400 pl-5">Saturday: 06:00 – 21:00</div>
            <div className="text-slate-400 pl-5">Sunday & Holidays: 07:00 – 19:00</div>
            <div className="mt-2 text-[11px] text-emerald-400/90 font-medium">
              * VIP Championship Members have 24/7 keyless QR entry.
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Apex Iron Fitness Platform. All rights reserved. Production Architecture.
      </div>
    </footer>
  );
};
