"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { TrainerUnavailability } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Dumbbell,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  Flame,
  ArrowRight,
  LogOut,
  Mail,
  Phone,
  Target,
  Sparkles,
  RefreshCw,
  UserCheck,
  Award,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Send,
  Smartphone,
  MessageSquare,
  Check,
  Inbox,
  X,
  Bell,
} from "lucide-react";

export default function TrainerDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [trainerProfile, setTrainerProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [actionSuccess, setActionSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "confirmed" | "completed" | "declined">("all");
  const [unavailabilities, setUnavailabilities] = useState<TrainerUnavailability[]>([]);

  // Trainer Profile Unavailability (Sick Leave / Off-Duty) State
  const [isUnavailModalOpen, setIsUnavailModalOpen] = useState(false);
  const [unavailDate, setUnavailDate] = useState(new Date().toISOString().slice(0, 10));
  const [unavailIsFullDay, setUnavailIsFullDay] = useState(true);
  const [unavailStartTime, setUnavailStartTime] = useState("08:00");
  const [unavailEndTime, setUnavailEndTime] = useState("18:00");
  const [unavailCategory, setUnavailCategory] = useState("sick_leave");
  const [unavailDescription, setUnavailDescription] = useState("Feeling unwell with a fever / flu, resting today to recover.");
  const [submittingUnavail, setSubmittingUnavail] = useState(false);

  // Decline Booking Modal State
  const [bookingToDecline, setBookingToDecline] = useState<any | null>(null);
  const [declineReasonPreset, setDeclineReasonPreset] = useState<string>("schedule_conflict");
  const [customDeclineReason, setCustomDeclineReason] = useState<string>("");
  const [isDeclining, setIsDeclining] = useState<boolean>(false);

  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusMessageType, setStatusMessageType] = useState<"info" | "success">("info");
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [showIncomingSmsAlert, setShowIncomingSmsAlert] = useState(false);
  const [testSmsSuccess, setTestSmsSuccess] = useState(false);

  const handleTestSms = () => {
    setTestSmsSuccess(true);
    setShowIncomingSmsAlert(true);
    setTimeout(() => setTestSmsSuccess(false), 5000);
  };

  const loadData = async (user: any) => {
    setLoading(true);
    setCurrentUser(user);
    const storedTrainers = api.getStoredTrainers();
    const found = storedTrainers.find(
      (t) =>
        t.userId?.toLowerCase() === user?.id?.toLowerCase() ||
        t.user?.id?.toLowerCase() === user?.id?.toLowerCase() ||
        t.user?.email?.toLowerCase() === user?.email?.toLowerCase()
    );
    if (found) {
      if (Number(found.hourlyRate) === 500 || !found.hourlyRate) {
        found.hourlyRate = 80;
        api.saveStoredTrainer(found);
      }
      setTrainerProfile(found);
      // Synchronize status if stored trainer has updated status
      if (found.user?.status && found.user.status !== user.status) {
        user.status = found.user.status;
        user.declineReason = found.declineReason || (found.user as any)?.declineReason;
        setCurrentUser({ ...user });
        api.setSession(api.getToken() || "", user);
      }
    }

    // Trigger SMS delivery alert banner on status reception
    if (
      user?.status === "active" ||
      user?.status === "declined" ||
      found?.user?.status === "active" ||
      found?.user?.status === "declined"
    ) {
      setTimeout(() => {
        setShowIncomingSmsAlert(true);
      }, 600);
    }

    try {
      const bookings = await api.listBookings({
        trainerId: found?.id,
        trainerUserId: user?.id,
        trainerEmail: user?.email,
      });
      setSessions(bookings);

      const unavs = await api.getTrainerUnavailabilities(found?.id || user?.id);
      setUnavailabilities(unavs);
    } catch (err) {
      console.error("Failed to load coach bookings", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const user = api.getCurrentUser();
    if (!user || user.role !== "trainer") {
      router.replace("/login?redirect=/trainer");
    } else {
      setAuthorized(true);
      loadData(user);
    }
  }, [router]);

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setStatusMessage("");
    try {
      // 1. Try fetching refreshed profile from backend
      const refreshedUser = await api.getMe();
      if (refreshedUser && refreshedUser.status === "active") {
        setCurrentUser(refreshedUser);
        setStatusMessageType("success");
        setStatusMessage("Registration approved! Unlocking your coach dashboard...");
        setTimeout(() => {
          loadData(refreshedUser);
        }, 1200);
        return;
      }

      // 2. Also check stored trainers
      const stored = api.getStoredTrainers();
      const currentId = currentUser?.id?.toLowerCase();
      const currentEmail = currentUser?.email?.toLowerCase();
      const match = stored.find(
        (t) =>
          t.userId?.toLowerCase() === currentId ||
          t.user?.id?.toLowerCase() === currentId ||
          t.user?.email?.toLowerCase() === currentEmail
      );

      if (match?.user?.status === "active") {
        const updated = { ...currentUser, status: "active" };
        setCurrentUser(updated);
        api.setSession(api.getToken() || "", updated);
        setStatusMessageType("success");
        setStatusMessage("Registration accepted by administrator! Unlocking your coach dashboard...");
        setTimeout(() => {
          loadData(updated);
        }, 1200);
        return;
      }

      if (match?.user?.status === "declined" || match?.user?.status === "inactive") {
        const updated = {
          ...currentUser,
          status: "declined",
          declineReason: match.declineReason || (match.user as any)?.declineReason,
        };
        setCurrentUser(updated);
        api.setSession(api.getToken() || "", updated);
        return;
      }

      setStatusMessageType("info");
      setStatusMessage("Your trainer registration is currently awaiting admin review (accept or decline). Please check back shortly.");
      setTimeout(() => setStatusMessage(""), 5000);
    } catch (err) {
      setStatusMessageType("info");
      setStatusMessage("Unable to verify status at this moment. Please try again shortly.");
      setTimeout(() => setStatusMessage(""), 5000);
    } finally {
      setCheckingStatus(false);
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#090D14] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Verifying Coach Access...</p>
        </div>
      </div>
    );
  }

  const coachPhone = currentUser?.phone || trainerProfile?.user?.phone || "+63 917 555 0192";
  const coachName = currentUser?.firstName ? `Coach ${currentUser.firstName}` : "Coach";
  const effectiveDeclineReason =
    currentUser?.declineReason ||
    trainerProfile?.declineReason ||
    trainerProfile?.user?.declineReason ||
    "Application requirements not met or coaching roster currently full.";

  const activeSmsText = `Apex Iron Fitness: Congratulations ${coachName}! Your trainer registration has been accepted by gym administration. You may now access your trainer dashboard.`;
  const declinedSmsText = `Apex Iron Fitness: Notice regarding your coach registration. Your application was declined by gym administration. Reason: ${effectiveDeclineReason}. Inquiries: contact front desk.`;

  const isDeclined =
    currentUser?.status === "declined" ||
    currentUser?.status === "inactive" ||
    trainerProfile?.user?.status === "declined" ||
    trainerProfile?.user?.status === "inactive";

  const renderPhoneModalAndAlert = () => (
    <>
      {/* FLOATING INCOMING SMS ALERT BANNER */}
      {showIncomingSmsAlert && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950/80 text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>SMS Received • APEX-FITNESS</span>
                    <Badge variant="emerald" className="text-[8px] py-0 px-1 font-mono animate-pulse">
                      NEW SMS
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    To Number: {coachPhone}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowIncomingSmsAlert(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-200 line-clamp-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 font-mono leading-relaxed">
              {isDeclined ? declinedSmsText : activeSmsText}
            </p>

            <div className="flex items-center justify-between pt-1 text-[10px]">
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <Check className="w-3 h-3 text-emerald-400" /> Received on your phone
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowIncomingSmsAlert(false)}
                  className="text-[10px] py-1 px-2.5 h-auto text-slate-300"
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowIncomingSmsAlert(false);
                    setIsPhoneModalOpen(true);
                  }}
                  className="text-[10px] py-1 px-2.5 h-auto bg-emerald-600 hover:bg-emerald-500 font-bold text-white"
                  leftIcon={<Smartphone className="w-3 h-3" />}
                >
                  Open on Phone
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIRTUAL SMARTPHONE SMS VIEWER MODAL */}
      {isPhoneModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsPhoneModalOpen(false)}
          title={`Trainer Mobile SMS Inbox • ${coachPhone}`}
          maxWidth="sm"
        >
          <div className="flex flex-col items-center">
            {/* Smartphone Device Shell Mockup */}
            <div className="w-full max-w-[340px] bg-slate-950 rounded-[44px] border-[5px] border-slate-700 shadow-2xl p-4 relative overflow-hidden text-white font-sans ring-1 ring-slate-800">
              {/* Dynamic Island / Notch */}
              <div className="w-24 h-5 bg-black rounded-full mx-auto mb-3 flex items-center justify-center border border-slate-900 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-3 mb-3 font-semibold tracking-wider">
                <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <div className="w-5 h-2.5 border border-slate-400 rounded-xs p-0.5 flex items-center">
                    <div className="w-full h-full bg-emerald-400 rounded-3xs" />
                  </div>
                </div>
              </div>

              {/* Messages Header */}
              <div className="border-b border-slate-800/80 pb-3 mb-3 text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center mx-auto mb-1.5 shadow-md shadow-emerald-500/20">
                  APEX
                </div>
                <div className="font-bold text-sm text-white flex items-center justify-center gap-1">
                  <span>APEX-FITNESS</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 inline" />
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">Official Gym Telephony SMS Gateway</div>
                <div className="text-[9px] text-slate-400 mt-0.5 font-mono">Delivered to: {coachPhone}</div>
              </div>

              {/* SMS Message Thread */}
              <div className="space-y-3 min-h-[190px] flex flex-col justify-end pb-3 text-xs">
                <div className="text-[10px] text-slate-400 text-center font-medium">
                  Today • {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-white rounded-bl-xs max-w-[94%] shadow-lg leading-relaxed text-[11px] font-mono ${
                    isDeclined
                      ? "bg-rose-700/90 shadow-rose-950/40 border border-rose-500/30"
                      : "bg-emerald-600 shadow-emerald-950/40"
                  }`}
                >
                  {isDeclined ? declinedSmsText : activeSmsText}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 pt-1">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" /> Delivered via Cellular SMS
                  </span>
                  <span>Just now</span>
                </div>
              </div>

              {/* Virtual Home Bar */}
              <div className="w-28 h-1 bg-slate-600 rounded-full mx-auto mt-3" />
            </div>

            <div className="w-full flex items-center justify-between pt-4 border-t border-slate-800 mt-4 text-xs">
              <span className="text-slate-400 text-[11px]">
                Mobile Number: <strong className="text-white font-mono">{coachPhone}</strong>
              </span>
              <Button size="sm" onClick={() => setIsPhoneModalOpen(false)}>
                Close Phone Screen
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );

  if (isDeclined) {
    const declineReason = effectiveDeclineReason;

    return (
      <div className="min-h-screen bg-[#090D14] text-white">
        {/* Navigation Bar */}
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                  BOOT CAMP FITNESS
                  <Badge variant="danger" className="text-[10px] py-0 px-2 font-mono">
                    REGISTRATION DECLINED
                  </Badge>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  GYM MEMBERSHIP MANAGEMENT SYSTEM • TRAINER PORTAL
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white">
                  Coach {currentUser?.firstName} {currentUser?.lastName}
                </div>
                <div className="text-[10px] text-slate-400">{currentUser?.email}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  api.logout();
                  router.push("/login");
                }}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Declined Screen Content */}
        <main className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <Card className="glass-card border-rose-500/40 bg-rose-950/20 p-8 sm:p-10 relative overflow-hidden text-center shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-500/10">
              <XCircle className="w-10 h-10" />
            </div>

            <Badge variant="danger" className="text-xs py-1 px-3 font-bold mb-3 uppercase tracking-wider">
              Registration Declined by Admin
            </Badge>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
              Trainer Application Declined
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-xl mx-auto">
              Your registration application to join the coaching staff has been reviewed and declined by gym administration.
            </p>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-900/50 text-left max-w-xl mx-auto mb-6">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Administrative Notice / Decline Reason</span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
                {declineReason}
              </p>
            </div>

            {/* Official Multi-Channel Notification Dispatches (Gmail & Mobile SMS) */}
            <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-5 text-left max-w-xl mx-auto mb-6 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white tracking-tight">
                    Official Decision Alerts Delivered
                  </span>
                </div>
                <Badge variant="emerald" className="text-[10px] py-0 px-2 font-mono">
                  Transmitted to Gmail & SMS
                </Badge>
              </div>

              <div className="space-y-3">
                {/* Gmail Channel Notification Card */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-blue-400">
                      <Mail className="w-3.5 h-3.5" /> Gmail (Email)
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Delivered to Inbox
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>
                      <span>Recipient: </span>
                      <strong className="text-white font-mono">{currentUser?.email}</strong>
                    </div>
                    <div>
                      <span>Subject: </span>
                      <strong className="text-white">Apex Iron Fitness — Update on Your Coach Registration Application</strong>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-line mt-1">
                    {`Dear Coach ${currentUser?.firstName || "Coach"},\n\n` +
                      `Your coach registration application was reviewed and declined by gym administration.\n\n` +
                      `Official Reason: ${declineReason}\n\n` +
                      `If you have updated credentials or questions, please contact the front desk.\n\n` +
                      `Gym Administration & Management`}
                  </div>
                </div>

                {/* Mobile Phone SMS Notification Card */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <Smartphone className="w-3.5 h-3.5" /> Mobile Phone (SMS)
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Delivered via SMS Direct
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>
                      <span>Recipient: </span>
                      <strong className="text-white font-mono">{currentUser?.phone || "+63 917 555 0192"}</strong>
                    </div>
                    <div>
                      <span>Sender: </span>
                      <strong className="text-white font-mono">APEX-FITNESS</strong>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-[11px] text-emerald-200 font-mono leading-relaxed mt-1">
                    {`Apex Iron Fitness: Notice regarding your coach registration. Your application was declined by gym administration. Reason: ${declineReason}. Inquiries: contact front desk.`}
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" /> Received on {currentUser?.phone || "+63 917 555 0192"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsPhoneModalOpen(true)}
                      leftIcon={<Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
                      className="text-[10px] py-1 px-2.5 h-auto text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      View on Phone Screen
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto">
              If you have updated credentials, questions regarding this decision, or would like to submit a new inquiry, please contact gym management or visit the front desk.
            </p>


            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  api.logout();
                  router.push("/login");
                }}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Sign In With Another Account
              </Button>
              <Link href="/">
                <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white font-bold">
                  Return to Website
                </Button>
              </Link>
            </div>
          </Card>
        </main>
        {renderPhoneModalAndAlert()}
      </div>
    );
  }

  const isPending =
    currentUser?.status === "pending" ||
    (trainerProfile?.user?.status === "pending" && currentUser?.status !== "active");

  if (isPending) {
    const appSpecialization = trainerProfile?.specialization || "Strength & Conditioning";
    const rawAppRate = Number(trainerProfile?.hourlyRate);
    const effectiveAppRate = rawAppRate === 500 || !rawAppRate ? 80 : rawAppRate;
    const appRate = `₱${effectiveAppRate.toFixed(2)}`;
    const appExp = trainerProfile?.experienceYears || 3;
    const appBio = trainerProfile?.bio || "Certified coach awaiting profile authorization.";

    return (
      <div className="min-h-screen bg-[#090D14] text-white">
        {/* Navigation Bar */}
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                  BOOT CAMP FITNESS
                  <Badge variant="amber" className="text-[10px] py-0 px-2 font-mono">
                    PENDING CONFIRMATION
                  </Badge>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  GYM MEMBERSHIP MANAGEMENT SYSTEM • TRAINER PORTAL
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white">
                  Coach {currentUser?.firstName} {currentUser?.lastName}
                </div>
                <div className="text-[10px] text-slate-400">{currentUser?.email}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  api.logout();
                  router.push("/login");
                }}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Pending Screen Content */}
        <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Status Feedback Banner */}
            {statusMessage && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-center gap-3 shadow-xl animate-in fade-in ${
                  statusMessageType === "success"
                    ? "bg-emerald-950/80 border-emerald-600 text-emerald-300 shadow-emerald-950/40"
                    : "bg-amber-950/80 border-amber-600 text-amber-300 shadow-amber-950/40"
                }`}
              >
                {statusMessageType === "success" ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                )}
                <span className="font-semibold">{statusMessage}</span>
              </div>
            )}

            {/* Hero Locked Card */}
            <Card className="glass-card border-slate-800 p-8 sm:p-10 relative overflow-hidden text-center">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/10">
                  <Clock className="w-10 h-10 animate-pulse" />
                </div>

                <Badge variant="amber" className="text-xs py-1 px-3 font-bold mb-3 uppercase tracking-wider">
                  Registration Awaiting Admin Confirmation
                </Badge>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                  Trainer Dashboard Locked
                </h1>

                <p className="text-slate-300 text-sm leading-relaxed mb-8">
                  The gym administrator needs to accept or decline your trainer registration before you can access your dashboard, build workout programs, and accept member bookings.
                </p>

                {/* Steps Visualizer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>Step 1: Submitted</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Registration submitted to Boot Camp Fitness
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40">
                    <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Step 2: Admin Review</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Pending confirmation in Admin Trainers Hub
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 opacity-60">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span>Step 3: Unlocked</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Full dashboard access and client booking enabled
                    </p>
                  </div>
                </div>

                {/* Submitted Application Summary Card */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-3 mb-8">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Submitted Application Details
                    </span>
                    <Badge variant="amber" className="text-[10px]">
                      Status: Pending Approval
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Full Name:</span>
                      <strong className="text-white font-semibold">
                        Coach {currentUser?.firstName} {currentUser?.lastName}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px] block">Email Address:</span>
                      <strong className="text-white font-semibold">{currentUser?.email}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px] block">Specialization:</span>
                      <strong className="text-emerald-400 font-semibold">{appSpecialization}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px] block">Session Hourly Rate:</span>
                      <strong className="text-white font-semibold">{appRate}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px] block">Coaching Experience:</span>
                      <strong className="text-white font-semibold">{appExp} Years</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px] block">Phone Number:</span>
                      <strong className="text-white font-semibold">{currentUser?.phone || "Not specified"}</strong>
                    </div>
                  </div>

                  {appBio && (
                    <div className="pt-2 border-t border-slate-900 text-xs">
                      <span className="text-slate-500 text-[11px] block mb-1">Coaching Bio:</span>
                      <p className="text-slate-400 italic line-clamp-2">{appBio}</p>
                    </div>
                  )}

                  {/* Multi-Channel Alerts Ready Banner */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs space-y-1.5 mt-2">
                    <div className="flex items-center justify-between text-slate-300 font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Send className="w-3.5 h-3.5" /> Multi-Channel Decision Notification Active
                      </span>
                      <Badge variant="emerald" className="text-[9px] py-0 px-2 font-mono">
                        Ready
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      As soon as gym administration reviews and accepts or declines your coach registration, you will receive an automatic status alert sent directly to your Gmail (
                      <span className="text-white font-mono">{currentUser?.email}</span>) and mobile phone (
                      <span className="text-white font-mono">{currentUser?.phone || "+63 917 555 0192"}</span>).
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-800 gap-2">
                      <span className="text-[10px] text-slate-400">
                        Carrier Status: Connected to Cellular 5G Network
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestSms}
                        leftIcon={<Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
                        className="text-[10px] py-1 px-2.5 h-auto text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                      >
                        {testSmsSuccess ? "SMS Sent! Check Phone Alert" : "Test SMS to My Number"}
                      </Button>
                    </div>
                  </div>
                </div>



                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="md"
                    onClick={handleCheckStatus}
                    disabled={checkingStatus}
                    leftIcon={
                      <RefreshCw
                        className={`w-4 h-4 ${checkingStatus ? "animate-spin text-emerald-300" : ""}`}
                      />
                    }
                    className="w-full sm:w-auto font-bold shadow-lg shadow-emerald-950/40"
                  >
                    {checkingStatus ? "Checking Confirmation..." : "Check Status / Refresh"}
                  </Button>

                  <Button
                    size="md"
                    variant="outline"
                    onClick={() => {
                      api.logout();
                      router.push("/login");
                    }}
                    leftIcon={<LogOut className="w-4 h-4" />}
                    className="w-full sm:w-auto"
                  >
                    Sign Out
                  </Button>
                </div>

                <p className="text-[11px] text-slate-500 mt-6">
                  Need expedited approval? Reach out to the front desk or gym administration directly.
                </p>
              </div>
            </Card>
          </div>
        </main>
        {renderPhoneModalAndAlert()}
      </div>
    );
  }


  const handleComplete = async (bookingId: string, clientName: string) => {
    try {
      await api.updateBookingStatus(bookingId, "completed");
      setSessions((prev) =>
        prev.map((s) => (s.id === bookingId ? { ...s, status: "completed" } : s))
      );
      setActionSuccess(`Session with ${clientName} marked as COMPLETED. Session logged.`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      alert("Failed to update session status.");
    }
  };

  const handleDeclineBooking = async () => {
    if (!bookingToDecline) return;
    setIsDeclining(true);
    try {
      const presetLabels: Record<string, string> = {
        schedule_conflict: "Trainer unavailable: Schedule conflict / overlapping commitment",
        fully_booked: "Trainer unavailable: Fully booked for this hour",
        off_duty: "Trainer unavailable: Off-duty / outside coaching shift",
        personal_emergency: "Trainer unavailable: Personal emergency or illness",
        custom: customDeclineReason.trim() || "Trainer unavailable at this time",
      };

      const finalReason =
        declineReasonPreset === "custom"
          ? customDeclineReason.trim() || "Trainer unavailable at this time"
          : presetLabels[declineReasonPreset];

      await api.updateBookingStatus(bookingToDecline.id, "declined", finalReason);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === bookingToDecline.id
            ? { ...s, status: "declined", notes: `Declined by trainer: ${finalReason}` }
            : s
        )
      );

      const athleteName =
        bookingToDecline.member?.user
          ? `${bookingToDecline.member.user.firstName} ${bookingToDecline.member.user.lastName || ""}`.trim()
          : bookingToDecline.memberName || "Athlete";

      setActionSuccess(
        `Workout booking for ${athleteName} declined. The member was notified in real-time and any payment/coins were reversed.`
      );
      setBookingToDecline(null);
      setCustomDeclineReason("");
      setTimeout(() => setActionSuccess(""), 6000);
    } catch (err: any) {
      alert(err.message || "Failed to decline booking.");
    } finally {
      setIsDeclining(false);
    }
  };

  const handleSubmitUnavailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unavailDescription.trim()) {
      alert("Please provide an explanation for your unavailability (e.g. sick with flu/fever, medical clinic appointment, etc.).");
      return;
    }

    if (!unavailIsFullDay && unavailEndTime <= unavailStartTime) {
      alert("End Time must be later than Start Time.");
      return;
    }

    setSubmittingUnavail(true);
    try {
      const trainerId = trainerProfile?.id || currentUser?.id || "trainer-me";
      const trainerName = displayName;

      await api.setTrainerUnavailability({
        trainerId,
        trainerName,
        date: unavailDate,
        isFullDay: unavailIsFullDay,
        startTime: unavailIsFullDay ? undefined : unavailStartTime,
        endTime: unavailIsFullDay ? undefined : unavailEndTime,
        reasonCategory: unavailCategory,
        description: unavailDescription.trim(),
        setBy: "trainer",
      });

      const updated = await api.getTrainerUnavailabilities(trainerId);
      setUnavailabilities(updated);

      setActionSuccess(
        `Availability updated! Your profile is marked 'Not Available' on ${unavailDate} (${unavailCategory.replace(/_/g, " ")}). Athletes booking during this window will see your reason and payment is 100% protected.`
      );
      setIsUnavailModalOpen(false);
      setTimeout(() => setActionSuccess(""), 6000);
    } catch (err: any) {
      alert(err.message || "Failed to submit unavailability.");
    } finally {
      setSubmittingUnavail(false);
    }
  };

  const handleRemoveUnavailability = async (unavailId: string, date: string) => {
    if (!confirm(`Are you ready to restore your availability for ${date}? You will immediately be available for athlete bookings.`)) {
      return;
    }
    try {
      await api.removeTrainerUnavailability(unavailId);
      const trainerId = trainerProfile?.id || currentUser?.id || "trainer-me";
      const updated = await api.getTrainerUnavailabilities(trainerId);
      setUnavailabilities(updated);
      setActionSuccess(`Schedule restored! You are now marked Available on ${date}.`);
      setTimeout(() => setActionSuccess(""), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to remove unavailability.");
    }
  };

  const displayName = currentUser?.firstName
    ? `Coach ${currentUser.firstName} ${currentUser.lastName || ""}`
    : "Certified Coach";
  const specialization = trainerProfile?.specialization || "Athletic Conditioning & Performance";
  const rawRate = Number(trainerProfile?.hourlyRate);
  const effectiveRate = rawRate === 500 || !rawRate ? 80 : rawRate;
  const hourlyRate = `₱${effectiveRate.toFixed(2)}`;

  const uniqueAthletes = Array.from(
    new Set(
      sessions.map((s) => s.member?.user?.email || s.memberEmail || s.memberId || s.memberName)
    )
  ).filter(Boolean).length;

  const confirmedSessions = sessions.filter((s) => s.status === "confirmed" || s.status === "pending");
  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const declinedCount = sessions.filter((s) => s.status === "declined").length;

  const filteredSessions = sessions.filter((s) => {
    if (filterTab === "confirmed") return s.status === "confirmed" || s.status === "pending";
    if (filterTab === "completed") return s.status === "completed";
    if (filterTab === "declined") return s.status === "declined";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#090D14] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
              <Flame className="w-6 h-6 fill-slate-950" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black tracking-wider text-white">BOOT CAMP FITNESS</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">• GYM MEMBERSHIP MANAGEMENT SYSTEM</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{displayName}</span>
                <Badge variant="emerald">Personal Trainer</Badge>
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-slate-400">Specialization: {specialization} • Active Status</p>
                {unavailabilities.some((u) => u.date === new Date().toISOString().slice(0, 10)) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Not Available Today</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setUnavailCategory("sick_leave");
                setUnavailDescription("Feeling unwell with a fever / flu, resting today to recover.");
                setIsUnavailModalOpen(true);
              }}
              leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-950" />}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-md shadow-amber-400/20 text-xs"
            >
              Report Sick / Not Available
            </Button>
            <Link href="/kiosk">
              <Button size="sm" variant="secondary">
                Open Reception Kiosk
              </Button>
            </Link>
            <Link href="/trainer/logout">
              <Button size="sm" variant="danger" leftIcon={<LogOut className="w-4 h-4" />}>
                Log Out
              </Button>
            </Link>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/40">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
        )}

        {/* Coach Registration Confirmed Notification Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/50">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Trainer Registration Accepted by Admin</span>
                <Badge variant="emerald" className="text-[10px] py-0 px-2 font-mono">
                  Active & Verified
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official confirmation notifications were dispatched to your Gmail (
                <span className="text-emerald-400 font-mono">{currentUser?.email}</span>) and mobile SMS (
                <span className="text-emerald-400 font-mono">{currentUser?.phone || "+63 917 555 0192"}</span>).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPhoneModalOpen(true)}
              leftIcon={<Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
              className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
            >
              View SMS on Phone
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNotifModalOpen(true)}
              leftIcon={<MessageSquare className="w-3.5 h-3.5 text-emerald-400" />}
              className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
            >
              View Welcome Alerts
            </Button>
          </div>
        </div>

        {/* Coach Availability & Sick Leave Hub */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Coach Availability & Sick Leave Status
                </h3>
                {unavailabilities.length > 0 ? (
                  <Badge variant="warning" className="text-[10px] py-0 px-2 font-mono">
                    {unavailabilities.length} Unavailable {unavailabilities.length === 1 ? "Notice" : "Notices"}
                  </Badge>
                ) : (
                  <Badge variant="emerald" className="text-[10px] py-0 px-2 font-mono">
                    100% Open & Available
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Manage your real-time booking status. If you are sick, injured, or off-duty, report your unavailability here to automatically inform athletes and lock slots.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setUnavailCategory("sick_leave");
                setUnavailDescription("Feeling unwell with a fever / flu, resting today to recover.");
                setIsUnavailModalOpen(true);
              }}
              leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-950" />}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shrink-0 shadow-md shadow-amber-400/20 text-xs"
            >
              Report Sick / Not Available
            </Button>
          </div>

          {unavailabilities.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Your Calendar is Open for Member Bookings</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Athletes can schedule private sessions with you during standard hours (08:00 – 18:00).
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUnavailCategory("sick_leave");
                  setUnavailDescription("Feeling unwell with a fever / flu, resting today to recover.");
                  setIsUnavailModalOpen(true);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold hover:underline text-left sm:text-right shrink-0"
              >
                Calling in sick today? Click to set &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Active Unavailability & Sick Leave Records:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unavailabilities.map((u) => {
                  const isTrainerReported = u.setBy === "trainer";

                  return (
                    <div key={u.id} className="p-4 rounded-xl bg-slate-950 border border-amber-600/40 text-xs space-y-2.5 shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{u.date}</span>
                          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                            {u.isFullDay ? "Full Day" : `${u.startTime} - ${u.endTime}`}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 capitalize">
                          {u.reasonCategory.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">
                          {isTrainerReported ? "Your Reason Description:" : "Admin Override Reason:"}
                        </span>
                        <p className="text-amber-200 italic font-medium">
                          &ldquo;{u.description}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900">
                        <span className="text-slate-400 text-[10px]">
                          Origin: <strong className="text-slate-300">{isTrainerReported ? "Reported by You" : "Gym Administration"}</strong>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveUnavailability(u.id, u.date)}
                          className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 font-semibold transition text-[11px] flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Mark Available Again</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Trainer Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Booked Appointments</span>
            <div className="mt-2 text-3xl font-black text-white">{sessions.length} Sessions</div>
            <div className="text-xs text-emerald-400 mt-1">
              {confirmedSessions.length} active • {completedCount} completed
            </div>
          </Card>

          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Athletes Coached</span>
            <div className="mt-2 text-3xl font-black text-cyan-400">
              {uniqueAthletes} Athletes
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Capacity: {uniqueAthletes} / {trainerProfile?.maxClients || 20} Athletes
            </div>
          </Card>

          <Card className="glass-card border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Coaching Rate</span>
            <div className="mt-2 text-3xl font-black text-emerald-400">{hourlyRate}</div>
            <div className="text-xs text-slate-400 mt-1">Direct session billing</div>
          </Card>

          <Card className="glass-card border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
              <span>Coins Redeemed</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-3xl font-black text-amber-400">
              {sessions.filter((s) => s.paymentMethod === "coins" || s.coinsPaid).length} Sessions
            </div>
            <div className="text-xs text-amber-400/80 mt-1">
              150 coins = 1-day trainer payment
            </div>
          </Card>
        </div>

        {/* Schedule & Sessions */}
        <Card className="glass-card border-slate-800 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Private Training Itinerary & Athlete Bookings</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Review athletes who scheduled coaching with you, check their fitness goals, and log session completion
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-900/90 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterTab === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("confirmed")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterTab === "confirmed" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Active ({confirmedSessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("completed")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterTab === "completed" ? "bg-slate-800 text-cyan-400" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Done ({completedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("declined")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterTab === "declined" ? "bg-rose-950/80 text-rose-300 border border-rose-500/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Declined ({declinedCount})
                </button>
              </div>

              <Button size="sm" variant="ghost" onClick={loadData} title="Refresh bookings list">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              </Button>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
                <Dumbbell className="w-7 h-7 text-slate-500" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-1">No Coaching Appointments Found</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When members book 1-on-1 private coaching sessions with you at{" "}
                  <span className="text-emerald-400 font-mono">/member/trainers</span>, their athlete profile, contact info, training goals, and scheduled slots will instantly appear right here.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredSessions.map((s) => {
                const isDone = s.status === "completed";
                const isDeclined = s.status === "declined";
                const athleteName = s.member?.user
                  ? `${s.member.user.firstName} ${s.member.user.lastName || ""}`.trim()
                  : (s.memberName || "Registered Athlete");
                const athleteCode = s.member?.memberCode || s.memberCode || "MEM-ATHLETE";
                const athleteEmail = s.member?.user?.email || s.memberEmail;
                const athletePhone = s.member?.user?.phone || s.memberPhone;
                const athleteAvatar =
                  s.member?.user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(athleteName)}`;
                const sessionFocus = s.sessionType || "1-on-1 Fitness Coaching";
                const sessionDateFormatted = s.sessionDate || "Scheduled Date";
                const startTimeFormatted = s.startTime || "10:00";
                const endTimeFormatted = s.endTime || "11:00";
                const durationText = api.formatDurationText(startTimeFormatted, endTimeFormatted);
                const sessionRawPrice = Number(s.price);
                const sessionEffectivePrice = sessionRawPrice === 500 ? 80 : sessionRawPrice;
                const priceDisplay = s.price ? `₱${sessionEffectivePrice.toFixed(2)}` : hourlyRate;

                return (
                  <div
                    key={s.id}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <img
                        src={athleteAvatar}
                        alt={athleteName}
                        className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 object-cover shrink-0"
                      />

                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-white tracking-tight">{athleteName}</span>
                          <Badge variant="neutral" className="font-mono text-[10px]">
                            {athleteCode}
                          </Badge>
                          <Badge
                            variant={
                              isDone
                                ? "success"
                                : isDeclined
                                ? "danger"
                                : "info"
                            }
                          >
                            {isDone
                              ? "Completed"
                              : isDeclined
                              ? "Declined (Unavailable)"
                              : (s.status || "Confirmed")}
                          </Badge>
                          <Badge variant="emerald" className="text-[10px]">
                            {sessionFocus}
                          </Badge>
                          {s.paymentMethod === "coins" || s.coinsPaid ? (
                            <Badge variant="warning" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1 font-bold">
                              <Award className="w-3 h-3" />
                              <span>Redeemed via 150 Coins (1-Day Trainer Payment)</span>
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[10px]">
                              💳 Direct Payment
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{sessionDateFormatted}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-amber-300 font-semibold font-mono">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                            <span>Time to Start: <strong className="text-white">{startTimeFormatted}</strong></span>
                            <span className="text-slate-600">→</span>
                            <span>Time to Finish: <strong className="text-white">{endTimeFormatted}</strong></span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                            Takes {durationText} from start to finish
                          </span>
                          <div className="text-slate-400 font-medium">
                            Payment:{" "}
                            {isDeclined ? (
                              <span className="text-emerald-400 font-bold">100% Refunded / Protected</span>
                            ) : s.paymentMethod === "coins" || s.coinsPaid ? (
                              <span className="text-amber-400 font-bold">
                                🪙 {s.coinsPaid || 150} Coins (1-Day Trainer Payment)
                              </span>
                            ) : (
                              <span className="text-white font-bold">{priceDisplay}</span>
                            )}
                          </div>
                        </div>

                        {(athleteEmail || athletePhone) && (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                            {athleteEmail && (
                              <a
                                href={`mailto:${athleteEmail}`}
                                className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                              >
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                <span>{athleteEmail}</span>
                              </a>
                            )}
                            {athletePhone && (
                              <a
                                href={`tel:${athletePhone}`}
                                className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-500" />
                                <span>{athletePhone}</span>
                              </a>
                            )}
                          </div>
                        )}

                        {s.notes && (
                          <div className={`text-xs p-3 rounded-lg border mt-2 max-w-2xl ${
                            isDeclined
                              ? "bg-rose-950/30 border-rose-900/40 text-rose-200"
                              : "bg-slate-950/70 border-slate-800/80 text-slate-300"
                          }`}>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              {isDeclined ? (
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                              ) : (
                                <Target className="w-3 h-3 text-emerald-400" />
                              )}
                              <span>{isDeclined ? "Decline Note & Reason:" : "Athlete Goals & Session Focus:"}</span>
                            </div>
                            <p className="italic">&ldquo;{s.notes}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      {!isDone && !isDeclined ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleComplete(s.id, athleteName)}
                            leftIcon={<CheckCircle className="w-4 h-4" />}
                            className="font-bold"
                          >
                            Mark Completed
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setBookingToDecline(s)}
                            leftIcon={<XCircle className="w-4 h-4" />}
                            className="bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-semibold"
                          >
                            Decline (Unavailable)
                          </Button>
                        </>
                      ) : isDeclined ? (
                        <Badge variant="danger" className="py-1.5 px-3 text-xs flex items-center gap-1.5 font-semibold">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Declined • Slot Freed</span>
                        </Badge>
                      ) : (
                        <Badge variant="success" className="py-1.5 px-3.5 text-xs flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Session Verified</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* DECLINE BOOKING MODAL */}
        {bookingToDecline && (() => {
          const athleteName = bookingToDecline.member?.user
            ? `${bookingToDecline.member.user.firstName} ${bookingToDecline.member.user.lastName || ""}`.trim()
            : (bookingToDecline.memberName || "Athlete");
          const isCoins = bookingToDecline.paymentMethod === "coins" || bookingToDecline.coinsPaid !== undefined;
          const coinsAmount = bookingToDecline.coinsPaid || 150;

          return (
            <Modal
              isOpen={true}
              onClose={() => {
                if (!isDeclining) setBookingToDecline(null);
              }}
              title="Decline Member Workout Booking"
              maxWidth="md"
            >
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-700/50 text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p>
                    Are you unavailable for this workout appointment? Declining will immediately notify{" "}
                    <strong className="text-white">{athleteName}</strong>, free your schedule slot in real-time, and guarantee 100% payment protection.
                  </p>
                </div>

                {/* Booking Summary */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Athlete:</span>
                    <strong className="text-white">{athleteName}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Session Slot:</span>
                    <strong className="text-white text-right">
                      📅 {bookingToDecline.sessionDate} • Time to Start: {bookingToDecline.startTime} → Time to Finish: {bookingToDecline.endTime} ({api.formatDurationText(bookingToDecline.startTime, bookingToDecline.endTime)} from start to finish)
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Workout Focus:</span>
                    <span className="text-slate-300 truncate max-w-[200px]">{bookingToDecline.sessionType || "1-on-1 Workout"}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 border-t border-slate-900 pt-1.5">
                    <span>Payment Protection:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isCoins ? `Refund ${coinsAmount} Coins to Member` : "Direct Payment Reversed (₱0 Charged)"}
                    </span>
                  </div>
                </div>

                {/* Decline Reason Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Select Reason for Unavailability
                  </label>
                  <select
                    value={declineReasonPreset}
                    onChange={(e) => setDeclineReasonPreset(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500"
                  >
                    <option value="schedule_conflict">Unavailable: Personal schedule conflict / overlapping commitment</option>
                    <option value="fully_booked">Unavailable: Fully booked for this hour</option>
                    <option value="off_duty">Unavailable: Off-duty / outside coaching shift</option>
                    <option value="personal_emergency">Unavailable: Personal emergency or illness</option>
                    <option value="custom">Other / Custom reason...</option>
                  </select>
                </div>

                {declineReasonPreset === "custom" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Custom Reason / Note for Athlete
                    </label>
                    <textarea
                      rows={2}
                      value={customDeclineReason}
                      onChange={(e) => setCustomDeclineReason(e.target.value)}
                      placeholder="Provide context on your unavailability..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500"
                      required
                    />
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setBookingToDecline(null)}
                    disabled={isDeclining}
                  >
                    Keep Booking
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={handleDeclineBooking}
                    isLoading={isDeclining}
                    className="bg-rose-600 hover:bg-rose-500 font-bold shadow-md shadow-rose-950/40"
                  >
                    Confirm & Decline Booking
                  </Button>
                </div>
              </div>
            </Modal>
          );
        })()}

        {/* WELCOME NOTIFICATIONS MODAL (Gmail & SMS) */}
        {isNotifModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => setIsNotifModalOpen(false)}
            title="Official Account Notifications (Gmail & Mobile SMS)"
            maxWidth="md"
          >
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Your coach registration was reviewed and accepted by gym administration. The following official welcome notices were transmitted to your contact endpoints.
                </span>
              </div>

              {/* Gmail Message Card */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 font-bold text-blue-400">
                    <Mail className="w-4 h-4" /> Gmail (Email)
                  </span>
                  <Badge variant="emerald" className="text-[9px] py-0 px-1.5 font-mono">
                    ✓ Delivered to Inbox
                  </Badge>
                </div>
                <div className="text-[11px] space-y-0.5 text-slate-400">
                  <div>
                    <span>Recipient: </span>
                    <strong className="text-white font-mono">{currentUser?.email}</strong>
                  </div>
                  <div>
                    <span>Subject: </span>
                    <strong className="text-white">Apex Iron Fitness — Coach Registration Accepted!</strong>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-line">
                  {`Congratulations Coach ${currentUser?.firstName || "Coach"}!\n\n` +
                    `Your trainer registration has been officially approved and confirmed by gym administration.\n` +
                    `Your trainer dashboard is now fully unlocked. You may log in to configure your training schedule, ` +
                    `publish workout programs, and accept athlete workout bookings.\n\n` +
                    `Welcome to the Boot Camp Fitness Coaching Staff!\n` +
                    `Gym Administration & Management`}
                </div>
              </div>

              {/* SMS Message Card */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <Smartphone className="w-4 h-4" /> Mobile Phone (SMS)
                  </span>
                  <Badge variant="emerald" className="text-[9px] py-0 px-1.5 font-mono">
                    ✓ Delivered via SMS Direct
                  </Badge>
                </div>
                <div className="text-[11px] space-y-0.5 text-slate-400">
                  <div>
                    <span>Recipient: </span>
                    <strong className="text-white font-mono">{currentUser?.phone || "+63 917 555 0192"}</strong>
                  </div>
                  <div>
                    <span>Sender: </span>
                    <strong className="text-white font-mono">APEX-FITNESS</strong>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-[11px] text-emerald-200 font-mono leading-relaxed">
                  {`Apex Iron Fitness: Congratulations Coach ${currentUser?.firstName || "Coach"}! Your trainer registration has been accepted by gym administration. You may now access your trainer dashboard.`}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <Button size="sm" onClick={() => setIsNotifModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* REPORT NOT AVAILABLE / SICK LEAVE MODAL */}
        {isUnavailModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => setIsUnavailModalOpen(false)}
            title="Report Not Available / Sick Leave (Trainer Profile)"
            maxWidth="md"
          >
            <form onSubmit={handleSubmitUnavailability} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white block font-bold mb-0.5">Mark Your Profile as Not Available:</strong>
                  Use this to notify athletes and gym management if you are unwell or sick (e.g., fever, flu), have a medical emergency, or need off-duty time. Matching booking slots will be locked immediately in real-time, and athletes will see your reason description.
                </div>
              </div>

              {/* Date & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Unavailability Date</span>
                  </label>
                  <input
                    type="date"
                    value={unavailDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setUnavailDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Window Duration</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUnavailIsFullDay(true)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                        unavailIsFullDay
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Full Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnavailIsFullDay(false)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                        !unavailIsFullDay
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Specific Hours
                    </button>
                  </div>
                </div>
              </div>

              {/* Time Range if not full day */}
              {!unavailIsFullDay && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">From (Start Time)</label>
                    <input
                      type="time"
                      value={unavailStartTime}
                      onChange={(e) => setUnavailStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Until (End Time)</label>
                    <input
                      type="time"
                      value={unavailEndTime}
                      onChange={(e) => setUnavailEndTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-amber-400"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Reason Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Reason Category
                </label>
                <select
                  value={unavailCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setUnavailCategory(cat);
                    if (cat === "sick_leave") {
                      setUnavailDescription("Feeling unwell / sick with flu and fever, taking medical rest today.");
                    } else if (cat === "injury") {
                      setUnavailDescription("Resting physical muscle strain under medical recommendation.");
                    } else if (cat === "medical") {
                      setUnavailDescription("Attending a doctor's clinic appointment.");
                    } else if (cat === "emergency") {
                      setUnavailDescription("Attending to an urgent family personal emergency.");
                    } else if (cat === "off_duty") {
                      setUnavailDescription("Off-duty / personal rest day.");
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400"
                >
                  <option value="sick_leave">Sick Leave / Illness (e.g., Fever, Flu, Sick)</option>
                  <option value="injury">Injury / Physical Strain / Physical Rehab</option>
                  <option value="medical">Doctor / Medical Clinic Appointment</option>
                  <option value="emergency">Personal / Family Emergency</option>
                  <option value="off_duty">Off-Duty / Scheduled Rest Day</option>
                  <option value="training">Masterclass / Seminar / Offsite Coaching</option>
                  <option value="custom">Other Reason</option>
                </select>
              </div>

              {/* Description Input & Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-200">
                    Description & Explanation for Athletes & Admin
                  </label>
                  <span className="text-[10px] text-amber-400">Shown directly to athletes</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pb-1">
                  <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
                  {[
                    { label: "Sick with Flu/Fever", text: "Feeling unwell with high fever and flu, taking medical rest today to recover." },
                    { label: "Doctor Appointment", text: "Attending a medical clinic doctor's appointment." },
                    { label: "Muscle Strain", text: "Resting acute muscle strain under physiotherapy guidance." },
                    { label: "Family Emergency", text: "Attending to an urgent personal family emergency today." },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setUnavailDescription(preset.text)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 hover:text-white transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={unavailDescription}
                  onChange={(e) => setUnavailDescription(e.target.value)}
                  placeholder="e.g. I have a sick / feeling unwell with flu and fever, taking rest today."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400"
                  required
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Athlete View Preview:
                </span>
                <div className="text-amber-300 text-xs italic font-medium">
                  &ldquo;🚫 Unavailable: {unavailDescription || "Coach is unavailable"}&rdquo;
                </div>
                <div className="text-[10px] text-slate-500">
                  Window: {unavailDate} ({unavailIsFullDay ? "Full Day" : `${unavailStartTime} - ${unavailEndTime}`})
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsUnavailModalOpen(false)}
                  disabled={submittingUnavail}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={submittingUnavail}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-md shadow-amber-400/20"
                >
                  Save & Mark Profile Not Available
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {renderPhoneModalAndAlert()}
      </div>
    </div>
  );
}


