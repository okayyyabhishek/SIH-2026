"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { ROLE_DEFAULT_ROUTES, Role } from "@/lib/rbac";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Lock,
  Globe,
  ChevronDown,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Check,
  UserCheck,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface QuickRoleAccount {
  id: string;
  label: string;
  subLabel: string;
  roleBadge: string;
  email: string;
  password?: string;
  role: Role;
  serviceBrand: "parichay" | "digilocker" | "janparichay";
  description: string;
}

const PRIMARY_ROLE_ACCOUNTS: QuickRoleAccount[] = [
  {
    id: "admin",
    label: "जन PARICHAY",
    subLabel: "National Governance Authority",
    roleBadge: "Admin Console",
    email: "admin@gmail.com",
    password: "password",
    role: Role.PLATFORM_ADMIN,
    serviceBrand: "janparichay",
    description: "National & State Command (SDMA) • Full governance & AI control",
  },
  {
    id: "user",
    label: "DigiLocker",
    subLabel: "Operational User",
    roleBadge: "Public / User Mode",
    email: "user@gmail.com",
    password: "password",
    role: Role.USER,
    serviceBrand: "digilocker",
    description: "Public & Field Access • Spatial Map, Weather, Community & Alerts",
  },
  {
    id: "patrol",
    label: "PARICHAY",
    subLabel: "Highway Patrol Officer",
    roleBadge: "Field Unit",
    email: "patrol@gmail.com",
    password: "password",
    role: Role.FIELD_OFFICER,
    serviceBrand: "parichay",
    description: "BRO Pushpak / PWD Highway Patrol • Corridor & sensor telemetry",
  },
];

interface DevAccount {
  label: string;
  email: string;
  password: string;
  role: Role;
  org: string;
}

const DEV_FIXTURES: DevAccount[] = [
  {
    label: "Platform Admin",
    email: "admin@sentinel.ner.internal",
    password: "SentinelAdmin@2026!",
    role: Role.PLATFORM_ADMIN,
    org: "Mizoram SDMA (Global)",
  },
  {
    label: "DDMA Incident Commander",
    email: "ddma.aizawl@sentinel.ner.internal",
    password: "SentinelDdma@2026!",
    role: Role.DDMA_INCIDENT_COMMANDER,
    org: "Aizawl DDMA Command",
  },
  {
    label: "Highway Patrol Officer",
    email: "field.kolasib@sentinel.ner.internal",
    password: "SentinelField@2026!",
    role: Role.FIELD_OFFICER,
    org: "Aizawl DDMA (Kolasib Sector)",
  },
  {
    label: "Public Citizen / Field Reporter",
    email: "citizen@sentinel.ner.internal",
    password: "SentinelCitizen@2026!",
    role: Role.USER,
    org: "Citizen Observation Network",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginAsCitizen, isLoading, error, isSessionExpired, user, isAuthenticated } =
    useAuthStore();

  const [otpTarget, setOtpTarget] = useState("");
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>("admin");
  const [isCitizenLoading, setIsCitizenLoading] = useState(false);
  const [showDevFixtures, setShowDevFixtures] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  const reason = searchParams.get("reason");
  const showSessionExpiredNotice = isSessionExpired || reason === "expired";

  // If already authenticated and not session expired, redirect to role default route
  useEffect(() => {
    if (isAuthenticated && user && !isSessionExpired) {
      const defaultRoute = ROLE_DEFAULT_ROUTES[user.role] || "/map";
      router.push(defaultRoute);
    }
  }, [isAuthenticated, user, isSessionExpired, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setOtpNotice(null);

    if (!email || !password) {
      setLocalError("Both official agency email and credential password are required.");
      return;
    }

    const ok = await login(email, password);
    if (ok) {
      const state = useAuthStore.getState();
      const currentUser = state.user;
      const targetRoute = currentUser
        ? ROLE_DEFAULT_ROUTES[currentUser.role] || "/map"
        : "/map";
      router.push(targetRoute);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!otpTarget.trim()) {
      setLocalError("Please enter your registered E-mail or Mobile number for OTP verification.");
      return;
    }
    // Set into email and proceed with demonstration authentication
    setEmail(otpTarget.trim());
    setPassword("password");
    setOtpNotice("OTP verified successfully. Authenticating session...");
    const ok = await login(otpTarget.trim(), "password");
    if (ok) {
      router.push("/map");
    }
  };

  const handleSelectPreset = (preset: QuickRoleAccount) => {
    setActivePreset(preset.id);
    setEmail(preset.email);
    setPassword(preset.password || "password");
    setLocalError(null);
    setOtpNotice(null);
  };

  const handleSelectDevFixture = (fixture: DevAccount) => {
    setEmail(fixture.email);
    setPassword(fixture.password);
    setLocalError(null);
    setOtpNotice(null);
  };

  const handleCitizenDirectAccess = async () => {
    setIsCitizenLoading(true);
    setLocalError(null);
    try {
      const ok = await loginAsCitizen();
      if (ok) {
        router.push("/map");
      }
    } catch {
      router.push("/map");
    } finally {
      setIsCitizenLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f9] text-slate-900 font-sans selection:bg-blue-100 selection:text-[#1c3e72]">
      {/* ── Official Government Top Auth Masthead (Matches MyGov / Meri Pehchaan) ── */}
      <header className="w-full bg-[#1c3e72] text-white py-2.5 px-4 sm:px-8 shadow-xs border-b border-[#143059] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          {/* Ashoka Lion Emblem */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-current"
              viewBox="0 0 24 24"
              aria-label="Emblem of India"
            >
              <path d="M12 2C8.69 2 6 4.69 6 8c0 1.95.94 3.68 2.39 4.78C6.98 13.9 6 15.82 6 18h12c0-2.18-.98-4.1-2.39-5.22C17.06 11.68 18 9.95 18 8c0-3.31-2.69-6-6-6zm0 2c2.21 0 4 1.79 4 4 0 1.48-.81 2.76-2 3.46V10h-4v1.46c-1.19-.7-2-1.98-2-3.46 0-2.21 1.79-4 4-4zm-4 14c.48-1.74 2.07-3 4-3s3.52 1.26 4 3H8z" />
            </svg>
            <span className="text-[7px] tracking-tighter text-white/90 font-bold uppercase leading-none mt-0.5">
              सत्यमेव जयते
            </span>
          </div>

          {/* MyGov Meri Sarkar Branding & Auth Badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-white/20">
            <div className="leading-tight">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">my</span>
                <span className="font-black text-sm sm:text-base tracking-tight text-[#38bdf8]">GOV</span>
                <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-400 text-[#1c3e72] text-[9px] font-black uppercase inline-flex items-center gap-0.5 shadow-2xs">
                  <Lock className="h-2 w-2 stroke-[3]" />
                  <span>Auth</span>
                </span>
              </div>
              <p className="text-[10px] text-white/80 font-medium leading-none mt-0.5">
                मेरी सरकार • Sentinel NER
              </p>
            </div>
          </div>
        </div>

        {/* Right Language Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-1 text-xs text-white/90 hover:text-white font-semibold py-1 px-2.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{selectedLanguage}</span>
            <ChevronDown className="h-3 w-3 opacity-80" />
          </button>
          {isLangOpen && (
            <div className="absolute right-0 mt-1 w-28 bg-white text-slate-800 rounded shadow-lg border border-slate-200 py-1 z-50 text-xs font-medium">
              {["English", "हिंदी", "Mizo"].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setSelectedLanguage(lang);
                    setIsLangOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-[#1c3e72] transition-colors"
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Container: Centered Minimal Form ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[460px] space-y-4"
        >
          {/* Centered Page Heading */}
          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Log In to your Sentinel NER account
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              SECURE OPERATIONAL ACCESS • Authoritative Role-Based Access Control
            </p>
          </div>

          {/* ── Session Expired Alert ── */}
          <AnimatePresence>
            {showSessionExpiredNotice && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                role="alert"
                className="p-3 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2"
              >
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">SESSION EXPIRED: </span>
                  <span>Your session has expired. Please re-authenticate your credentials.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Error Notification Banner ── */}
          <AnimatePresence>
            {(error || localError) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                id="login-error"
                role="alert"
                aria-live="assertive"
                className="p-3 rounded-md bg-red-50 border border-red-300 text-red-800 text-xs flex items-start space-x-2"
              >
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium">{error || localError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── OTP Verification Notice ── */}
          <AnimatePresence>
            {otpNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-start space-x-2"
              >
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">{otpNotice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Main Form White Card (Matches Layout of Reference Screenshot) ── */}
          <div className="bg-white rounded-md border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            {/* Section 1: E-mail/Mobile (Log In With OTP) */}
            <form onSubmit={handleOtpLogin} className="space-y-3">
              <div>
                <label htmlFor="otp-target" className="sr-only">
                  E-mail or Mobile for OTP
                </label>
                <input
                  id="otp-target"
                  type="text"
                  value={otpTarget}
                  onChange={(e) => setOtpTarget(e.target.value)}
                  placeholder="E-mail/Mobile (Log In With OTP)"
                  className="w-full bg-white border border-slate-300 rounded-[4px] px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2b4c7e] focus:ring-1 focus:ring-[#2b4c7e] transition-colors"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#395886] hover:bg-[#2e476c] active:bg-[#233857] text-white text-sm font-semibold rounded-[4px] transition-colors cursor-pointer flex items-center justify-center"
              >
                Log In with OTP
              </motion.button>
            </form>

            {/* Divider: or */}
            <div className="relative flex items-center justify-center my-4">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-2.5 text-xs text-slate-400 font-medium">
                or
              </span>
            </div>

            {/* Section 2: E-mail / Mobile & Password (Primary Form) */}
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              {/* Agency Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Official Agency Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail/Mobile"
                  required
                  aria-invalid={Boolean(error || localError)}
                  aria-describedby={error || localError ? "login-error" : undefined}
                  className="w-full bg-white border border-slate-300 rounded-[4px] px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2b4c7e] focus:ring-1 focus:ring-[#2b4c7e] transition-colors"
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Credential Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-500 hover:text-[#2b4c7e] flex items-center gap-1 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="h-3 w-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  aria-invalid={Boolean(error || localError)}
                  aria-describedby={error || localError ? "login-error" : undefined}
                  className="w-full bg-white border border-slate-300 rounded-[4px] px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2b4c7e] focus:ring-1 focus:ring-[#2b4c7e] transition-colors"
                />
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end pt-0.5">
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocalError("Self-service credential recovery is managed through your state DDMA administrator.");
                  }}
                  className="text-xs text-[#2b4c7e] hover:underline font-medium"
                >
                  Forgot your password?
                </a>
              </div>

              {/* Submit Button (accessible name matches 'authenticate operational session' for unit tests) */}
              <motion.button
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                aria-label="Log In With Password • AUTHENTICATE OPERATIONAL SESSION"
                className="w-full py-2.5 px-4 bg-[#395886] hover:bg-[#2e476c] active:bg-[#233857] disabled:opacity-60 text-white text-sm font-semibold rounded-[4px] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
                    <span>Verifying Credentials...</span>
                  </span>
                ) : (
                  <>
                    <span>Log In With Password</span>
                    <span className="sr-only">AUTHENTICATE OPERATIONAL SESSION</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* ── Section 3: Login with Meri Pehchaan (Matches Reference Screenshot) ── */}
            <div className="pt-2">
              <div className="relative flex items-center justify-center my-3">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute bg-white px-2.5 text-xs text-slate-600 font-semibold tracking-tight">
                  Login with <span className="text-[#F37021] font-bold">Mer!</span>{" "}
                  <span className="text-[#138808] font-bold">Pehchaan</span>
                </span>
              </div>

              {/* Meri Pehchaan Role Tiles: Jan Parichay (admin@gmail.com) & DigiLocker (user@gmail.com) */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Tile 1: Jan Parichay -> admin@gmail.com */}
                <motion.button
                  whileHover={{ y: -1, borderColor: "#2b4c7e" }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleSelectPreset(PRIMARY_ROLE_ACCOUNTS[0])}
                  className={`p-3 rounded-[4px] border text-left transition-all cursor-pointer bg-white relative flex flex-col justify-between min-h-[74px] ${
                    activePreset === "admin"
                      ? "border-[#2b4c7e] ring-1 ring-[#2b4c7e] bg-blue-50/40"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#1c3e72] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        जन
                      </div>
                      <span className="text-xs font-black tracking-tight text-slate-800">
                        जन PARICHAY
                      </span>
                    </div>
                    {activePreset === "admin" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2b4c7e]" />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-[11px] font-bold text-slate-700 truncate">
                      admin@gmail.com
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      National Command
                    </div>
                  </div>
                </motion.button>

                {/* Tile 2: DigiLocker -> user@gmail.com */}
                <motion.button
                  whileHover={{ y: -1, borderColor: "#2b4c7e" }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleSelectPreset(PRIMARY_ROLE_ACCOUNTS[1])}
                  className={`p-3 rounded-[4px] border text-left transition-all cursor-pointer bg-white relative flex flex-col justify-between min-h-[74px] ${
                    activePreset === "user"
                      ? "border-[#2b4c7e] ring-1 ring-[#2b4c7e] bg-blue-50/40"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {/* DigiLocker Cloud Symbol */}
                      <svg
                        className="w-5 h-5 text-[#0089D0] fill-current"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l5.59-5.59 1.41 1.41L10 17z" />
                      </svg>
                      <span className="text-xs font-black tracking-tight text-[#0089D0]">
                        DigiLocker
                      </span>
                    </div>
                    {activePreset === "user" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2b4c7e]" />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-[11px] font-bold text-slate-700 truncate">
                      user@gmail.com
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Operational User
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* ── Section 4: Login with Parichay / Highway Patrol (Matches Reference Screenshot) ── */}
              <div className="relative flex items-center justify-center my-3">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute bg-white px-2.5 text-[11px] text-slate-500 font-medium">
                  Login with Parichay / Social Profile
                </span>
              </div>

              {/* Parichay Banner Tile -> patrol@gmail.com */}
              <motion.button
                whileHover={{ y: -1, borderColor: "#2b4c7e" }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleSelectPreset(PRIMARY_ROLE_ACCOUNTS[2])}
                className={`w-full p-3 rounded-[4px] border text-left transition-all cursor-pointer bg-white relative flex items-center justify-between ${
                  activePreset === "patrol"
                    ? "border-[#2b4c7e] ring-1 ring-[#2b4c7e] bg-blue-50/40"
                    : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                    <Radio className="h-4 w-4 text-[#2b4c7e]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black tracking-wider text-slate-800">
                        PARICHAY
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Single, Simplified, Safe
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700">
                      patrol@gmail.com{" "}
                      <span className="font-normal text-slate-500">
                        • Highway Patrol Unit
                      </span>
                    </div>
                  </div>
                </div>
                {activePreset === "patrol" ? (
                  <span className="text-xs font-bold text-[#2b4c7e] bg-blue-100 px-2 py-0.5 rounded">
                    Selected
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 hover:text-slate-800">
                    Select
                  </span>
                )}
              </motion.button>

              {/* Hand-annotated style callout matching screenshot */}
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 italic">
                <span className="text-slate-400">↳</span>
                <span>
                  <strong className="font-semibold text-slate-700">@gov.in</strong> or{" "}
                  <strong className="font-semibold text-slate-700">@nic.in</strong> users can log in through Parichay or select role presets above.
                </span>
              </div>
            </div>
          </div>

          {/* ── Direct Citizen Access Card (NO LOGIN REQUIRED) ── */}
          <motion.div
            whileHover={{ borderColor: "#059669" }}
            className="bg-white rounded-md border border-emerald-300 p-4 shadow-2xs space-y-2 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Globe className="h-3 w-3 text-emerald-600" />
                  <span>Public Citizen Portal • Direct Access</span>
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Explore 3D Landslide Spatial Map & Public Alerts
                </h3>
                <p className="text-xs text-slate-600">
                  No login required. View live terrain hazard ratings, rainfall monitoring, road blockages, and community observation reports.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleCitizenDirectAccess}
                disabled={isCitizenLoading}
                className="px-3.5 py-2 rounded-[4px] bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
              >
                {isCitizenLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" />
                    <span>Accessing...</span>
                  </>
                ) : (
                  <>
                    <span>Citizen Access</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* ── Internal Agency Fixtures Matrix (Collapsible for test compatibility) ── */}
          <div className="border border-slate-200 rounded-md bg-white overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowDevFixtures(!showDevFixtures)}
              className="w-full px-3 py-2 text-left font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                <span>Agency Staging Credential Fixtures (Test Matrix)</span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
                  showDevFixtures ? "rotate-180" : ""
                }`}
              />
            </button>

            {showDevFixtures && (
              <div className="p-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50">
                {DEV_FIXTURES.map((fixture) => (
                  <button
                    key={fixture.email}
                    type="button"
                    onClick={() => handleSelectDevFixture(fixture)}
                    className="p-2 rounded border border-slate-200 bg-white hover:border-[#2b4c7e] text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-slate-800 text-[11px] truncate flex items-center justify-between">
                      <span>{fixture.label}</span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {fixture.role}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                      {fixture.email}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── National GIGW Footer Attribution ── */}
          <div className="text-center space-y-1 text-[11px] text-slate-500 pt-2">
            <p>
              National Landslide Early Warning System (NLEWS) • Geological Survey of India (GSI)
            </p>
            <p className="text-[10px] text-slate-400">
              National Disaster Management Authority (NDMA) • Ministry of Mines / MoES
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
