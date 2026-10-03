import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RoleSwitcher } from "@/components/common/RoleSwitcher";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Apex Iron Athletic Club — World-Class Fitness Platform",
  description:
    "Enterprise-grade gym membership management, attendance access control, smart workout tracking, personal trainer booking, and AI fitness coaching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#090D14] text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950`}>
        {children}
        <RoleSwitcher />
      </body>
    </html>
  );
}
