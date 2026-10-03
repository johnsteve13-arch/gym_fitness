"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { MembershipPlan, Trainer, GymClass } from "@/types";
import {
  Flame,
  ShieldCheck,
  Zap,
  Award,
  Users,
  Calendar,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Activity,
  QrCode,
  Sparkles,
  ChevronDown,
  Clock,
  MapPin,
} from "lucide-react";

export default function LandingPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    api.listPlans().then(setPlans);
    api.listTrainers().then(setTrainers);
    api.listClasses().then(setClasses);
  }, []);

  const faqs = [
    {
      q: "How does the QR Code Access Control system work?",
      a: "Upon activating your membership, your mobile portal generates a cryptographically signed QR code token. When scanned at our front desk kiosk or turnstiles, the server validates your account status, active dates, and logs your visit in under 200 milliseconds.",
    },
    {
      q: "Can I freeze or pause my membership if I travel?",
      a: "Yes! Quarterly Pro and Annual Championship members can freeze their membership directly from the member portal for up to 30 or 60 days per year with zero penalties. Expiration dates automatically shift accordingly.",
    },
    {
      q: "How do Reward Coins work?",
      a: "Members earn coins automatically by checking into the gym, completing scheduled classes, and logging personal records. Coins can be redeemed in our Rewards Store for gym apparel, shaker bottles, free 1-on-1 PT sessions, or membership renewal discounts.",
    },
    {
      q: "Are fitness classes included with standard memberships?",
      a: "Monthly Athlete Pass includes 1 group class per week. Quarterly Pro and Annual Championship members enjoy unlimited access to all classes including Olympic Barbell, Tactical HIIT, and Yoga Mobility.",
    },
    {
      q: "What makes the AI Fitness Coach different?",
      a: "Our AI Fitness Coach uses your actual logged gym attendance, workout sets, and body composition history to provide actionable progressive overload advice, recovery guidelines, and macronutrient strategies without generic internet boilerplate.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#090D14] flex flex-col">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Background glow and subtle grid */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-top-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Athletic Performance & Wellness Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
            BUILT FOR THE RELENTLESS. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              POWERED BY INTELLIGENCE.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            The premier training sanctuary combining heavy Olympic iron, calibrated athletic conditioning,
            instant QR access control, biometric body analytics, and contextual AI fitness coaching.
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="neon-glow font-bold">
                Start Your Journey <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link href="#plans">
              <Button size="lg" variant="secondary">
                Explore Memberships
              </Button>
            </Link>
            <Link href="/kiosk">
              <Button size="lg" variant="outline" leftIcon={<QrCode className="w-5 h-5" />}>
                Launch Reception Kiosk
              </Button>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="glass-card rounded-xl p-4 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">2,500+</div>
              <div className="text-xs text-slate-400 font-medium">Active Athletes Trained</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">99.8%</div>
              <div className="text-xs text-slate-400 font-medium">Check-in Uptime</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">15+</div>
              <div className="text-xs text-slate-400 font-medium">Certified Master Coaches</div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">24/7</div>
              <div className="text-xs text-slate-400 font-medium">Keyless Access Option</div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS / CORE PILLARS SECTION */}
      <section id="benefits" className="py-20 border-t border-slate-800/80 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Why Apex Iron</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
              EVERYTHING YOU NEED TO EXCEL. NO SHORTCUTS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="glass-card border-slate-800 hover:border-emerald-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Olympic Grade Calibrated Iron</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Eleiko barbells, competition bumper plates, custom squat racks, dumbbell rows up to 150 lbs, and state-of-the-art plate-loaded machines.
              </p>
            </Card>

            <Card className="glass-card border-slate-800 hover:border-emerald-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Biometrics & AI Coaching</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Log exercises, track body composition changes (BMI, body fat %, muscle mass), and receive AI training split insights based on your logged history.
              </p>
            </Card>

            <Card className="glass-card border-slate-800 hover:border-emerald-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Reward Coins & Perks</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Consistency deserves recognition. Earn coins on every visit, class completed, and PR achieved to redeem for premium merchandise and PT sessions.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* MEMBERSHIP PLANS PRICING SECTION */}
      <section id="plans" className="py-20 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Transparent Membership</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
              CHOOSE YOUR COMMITMENT LEVEL
            </p>
            <p className="mt-4 text-sm text-slate-400">
              No hidden fees, no predatory cancellation clauses. Transparent pricing with instant digital pass access.
            </p>

            {/* Toggle */}
            <div className="mt-6 inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                  billingCycle === "monthly" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Standard Term
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  billingCycle === "annual" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Annual Championship</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                  Save 30%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.slice(1, 4).map((plan, idx) => {
              const benefitsArray: string[] = (() => {
                try {
                  return JSON.parse(plan.benefits);
                } catch {
                  return ["Full gym access", "Locker room & sauna", "Free mobile app pass"];
                }
              })();
              const isPopular = idx === 1; // Quarterly Pro

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl flex flex-col justify-between transition-all duration-300 ${
                    isPopular
                      ? "bg-slate-900 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10 scale-105 z-10"
                      : "bg-slate-900/60 border border-slate-800"
                  } p-8`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                      Most Popular Choice
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{plan.description}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white">${Number(plan.price).toFixed(2)}</span>
                      <span className="text-xs text-slate-400 font-medium">/ {plan.durationDays} days</span>
                    </div>

                    <div className="border-t border-slate-800 mt-6 pt-6 space-y-3">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Included Perks</div>
                      {benefitsArray.map((benefit, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4">
                    <Link href={`/register?plan=${plan.id}`}>
                      <Button
                        className="w-full font-bold"
                        variant={isPopular ? "primary" : "secondary"}
                      >
                        Enroll Now
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PERSONAL TRAINERS SHOWCASE */}
      <section id="trainers" className="py-20 border-t border-slate-800/80 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Master Coaching Staff</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
              WORLD-CLASS ATHLETIC MENTORS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trainers.map((t) => (
              <Card key={t.id} className="glass-card border-slate-800 overflow-hidden p-0 group">
                <div className="h-48 w-full overflow-hidden relative bg-slate-800">
                  <img
                    src={t.user?.avatarUrl || "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=300"}
                    alt={t.user?.firstName || "Trainer"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-emerald-400 border border-emerald-500/30">
                    ★ {Number(t.rating).toFixed(2)}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white">
                    {t.user?.firstName} {t.user?.lastName}
                  </h3>
                  <div className="text-xs text-emerald-400 font-semibold mb-3">{t.specialization}</div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-3">{t.bio}</p>
                  <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs">
                    <span className="text-slate-400">Experience: <strong className="text-white">{t.experienceYears} Years</strong></span>
                    <span className="text-white font-bold">${Number(t.hourlyRate).toFixed(0)}/hr</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* GROUP CLASSES SCHEDULE PREVIEW */}
      <section id="classes" className="py-20 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Scheduled Conditioning</h2>
              <p className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
                DYNAMIC GROUP SESSIONS
              </p>
            </div>
            <Link href="/member/classes">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View All Sessions
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {classes.map((c) => (
              <Card key={c.id} className="glass-card border-slate-800 hover:border-emerald-500/40 transition">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="emerald" className="uppercase font-bold text-[10px]">
                    {c.category}
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    {c.durationMinutes} mins
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1.5">{c.name}</h3>
                <p className="text-xs text-slate-400 mb-4 line-clamp-2">{c.description}</p>

                <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-300">
                  <span>Room: <strong className="text-white">{c.room}</strong></span>
                  <span className="text-emerald-400 font-semibold">{c.startTime} – {c.endTime}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-20 border-t border-slate-800/80 bg-slate-950/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Frequently Asked Questions</h2>
            <p className="mt-2 text-3xl font-black text-white tracking-tight">CLEAR ANSWERS</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-sm font-bold text-white hover:text-emerald-400 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? "rotate-180 text-emerald-400" : ""}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
