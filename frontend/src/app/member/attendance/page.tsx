"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MemberAttendancePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/member");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Redirecting to Member Dashboard...</p>
      </div>
    </div>
  );
}
