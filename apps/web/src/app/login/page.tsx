"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { ShieldAlert, Mail, KeyRound, AlertCircle, UserCheck, ArrowRight } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Platform Admin",
    email: "admin@sentinel.ner.internal",
    password: "SentinelAdmin@2026!",
    role: "PLATFORM_ADMIN",
    org: "Mizoram SDMA (Global)",
  },
  {
    label: "DDMA Incident Commander",
    email: "ddma.aizawl@sentinel.ner.internal",
    password: "SentinelDdma@2026!",
    role: "DDMA",
    org: "Aizawl DDMA",
  },
  {
    label: "Highway Patrol Officer",
    email: "field.kolasib@sentinel.ner.internal",
    password: "SentinelField@2026!",
    role: "FIELD_OFFICER",
    org: "Aizawl DDMA (Kolasib Sector)",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Both email and password are required for operational authentication.");
      return;
    }

    const ok = await login(email, password);
    if (ok) {
      router.push("/");
    }
  };

  const handleSelectDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setLocalError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#F8FAFC] dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-gov-blue dark:text-cyan-400 mx-auto shadow-sm">
            <ShieldAlert className="h-8 w-8" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              OPERATIONAL AUTHENTICATION
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
              Authoritative Role-Based Access Control • Northeast India Sector
            </p>
          </div>
        </div>

        {/* Login Form Panel */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-gov-lg space-y-6 relative overflow-hidden">
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gov-saffron to-gov-blue"></div>

          {(error || localError) && (
            <div
              id="login-error"
              role="alert"
              aria-live="assertive"
              className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm flex items-start space-x-3 shadow-sm animate-in fade-in"
            >
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span className="font-medium font-sans">{error || localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 font-sans">
                Official Agency Email
              </label>
              <div className="relative group">
                <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3 transition-colors group-focus-within:text-gov-blue dark:group-focus-within:text-cyan-400" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@sentinel.ner.internal"
                  required
                  aria-invalid={Boolean(error || localError)}
                  aria-describedby={(error || localError) ? "login-error" : undefined}
                  className={`w-full bg-slate-50 dark:bg-slate-800/80 border rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all font-medium font-sans ${
                    error || localError
                      ? "border-red-500 ring-2 ring-red-500/20"
                      : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-gov-blue/20 focus:border-gov-blue dark:focus:border-cyan-400"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 font-sans">
                Credential Password
              </label>
              <div className="relative group">
                <KeyRound className="h-5 w-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3 transition-colors group-focus-within:text-gov-blue dark:group-focus-within:text-cyan-400" aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  aria-invalid={Boolean(error || localError)}
                  aria-describedby={(error || localError) ? "login-error" : undefined}
                  className={`w-full bg-slate-50 dark:bg-slate-800/80 border rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all font-medium font-sans ${
                    error || localError
                      ? "border-red-500 ring-2 ring-red-500/20"
                      : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-gov-blue/20 focus:border-gov-blue dark:focus:border-cyan-400"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-gov-blue hover:bg-gov-blue-dark dark:bg-cyan-700 dark:hover:bg-cyan-600 disabled:opacity-70 text-white text-sm font-bold tracking-wide flex items-center justify-center space-x-2 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gov-blue/20 font-sans"
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                  <span>Verifying Identity...</span>
                </span>
              ) : (
                <>
                  <span>AUTHENTICATE OPERATIONAL SESSION</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Select Demo Roles Drawer */}
          {process.env.NEXT_PUBLIC_APP_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_DEV_FIXTURES !== "false" && (
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">
                <span className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-gov-saffron" />
                  <span>Development Quick-Select</span>
                </span>
                <span className="text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px]">Stage 2 Fixtures</span>
              </div>

              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectDemo(acc)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left flex items-center justify-between text-sm transition-all focus:outline-none focus:ring-2 focus:ring-gov-blue/20"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 font-sans">{acc.label}</div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-sans">{acc.email} • {acc.org}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-gov-blue dark:text-cyan-300 border border-blue-100 dark:border-blue-900/50 uppercase tracking-wide font-mono">
                      {acc.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="text-center">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 font-sans">
            Protected by Government of India Security Protocols
          </p>
        </div>
      </div>
    </div>
  );
}
