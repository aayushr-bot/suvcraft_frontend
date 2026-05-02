"use client";

import { useState } from "react";
import Modal from "./Modal";
import { ArrowRight } from "./icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const inputCls = "h-[54px] w-full rounded-[10px] bg-[#f8f8fb] px-5 text-[14px] outline-none border border-transparent focus:border-brand-purple placeholder:text-[#8c8c8c] transition-all shadow-sm";

function SubmitBtn({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="button"
      disabled={busy}
      className="h-[54px] w-[180px] rounded-[32px] bg-[#3E0149] flex items-center justify-center gap-4 text-white font-bold text-[15px] hover:brightness-110 transition-all shadow-lg uppercase disabled:opacity-60"
    >
      {busy ? "Please wait…" : label}
      {!busy && <ArrowRight className="h-5 w-5" />}
    </button>
  );
}

export type AuthUser = { name: string; email: string; mobile?: string };

export default function AuthModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [signinTab, setSigninTab] = useState<"password" | "otp">("otp");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"form" | "verify">("form");
  const [mobileHint, setMobileHint] = useState("");
  const [otpPreview, setOtpPreview] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function resetAll() {
    setName(""); setEmail(""); setPassword(""); setConfirmPassword("");
    setMobile(""); setOtp(""); setOtpStep("form"); setMobileHint(""); setOtpPreview("");
    setError(""); setBusy(false);
  }

  function switchMode(m: "signin" | "signup") {
    setMode(m); resetAll();
    setSigninTab("otp");
  }

  async function submitPassword() {
    setError("");
    if (mode === "signup") {
      if (!name.trim()) { setError("Full name is required."); return; }
      if (!email.trim()) { setError("Email is required."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    } else {
      if (!email.trim() || !password) { setError("Email/mobile and password are required."); return; }
    }
    setBusy(true);
    try {
      const endpoint = mode === "signin" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body = mode === "signin"
        ? { identity: email.trim(), password }
        : { name: name.trim(), email: email.trim(), password };
      const res = await fetch(`${API}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const json = await res.json();
      if (json.error) { setError(json.message || "Something went wrong."); return; }
      const u = json.data?.user || {};
      onSuccess({ name: u.name || u.username || email, email: u.email || email });
      onClose(); resetAll();
    } catch { setError("Network error. Please try again."); }
    finally { setBusy(false); }
  }

  async function sendOtp() {
    setError("");
    const mob = mobile.trim().replace(/\D/g, "");
    if (mob.length < 6) { setError("Enter a valid mobile number."); return; }
    // Name and email are optional for OTP signup — backend auto-fills if missing.

    setBusy(true);
    try {
      const bodyObj: Record<string, string> = { action: "send", mobile: mob };
      if (mode === "signup") {
        if (name.trim()) bodyObj.name = name.trim();
        if (email.trim()) bodyObj.email = email.trim();
      }
      const res = await fetch(`${API}/api/v1/auth/otp`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(bodyObj) });
      const json = await res.json();
      if (json.error) { setError(json.message || "Failed to send OTP."); return; }
      setMobileHint(json.data?.mobile_hint || mob);
      setOtpPreview(json.data?.otp_preview || "");
      setOtpStep("verify");
    } catch { setError("Network error. Please try again."); }
    finally { setBusy(false); }
  }

  async function verifyOtp() {
    setError("");
    if (otp.length !== 6) { setError("Enter the 6-digit OTP."); return; }
    setBusy(true);
    try {
      const mob = mobile.trim().replace(/\D/g, "");
      const res = await fetch(`${API}/api/v1/auth/otp`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "verify", mobile: mob, otp }) });
      const json = await res.json();
      if (json.error) { setError(json.message || "Invalid OTP."); return; }
      const u = json.data?.user || {};
      onSuccess({ name: u.name || u.username || "", email: u.email || "", mobile: u.mobile || mobile });
      onClose(); resetAll();
    } catch { setError("Network error. Please try again."); }
    finally { setBusy(false); }
  }

  const isSignin = mode === "signin";
  const useOtp = signinTab === "otp" || mode === "signup";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-start w-full">
        <div className="flex items-center gap-4 mb-6">
          <img src="/figma/suvcraft-logo.png" alt="" className="h-[42px] w-auto" />
          <span className="font-bruno text-[22px] font-bold text-brand-purple uppercase tracking-[0.08em]">SUVCRAFT</span>
        </div>

        <div className="w-full flex flex-col gap-5">
          <div>
            <span className="text-[13px] text-[#8c8c8c] font-medium">{isSignin ? "Welcome back !!!" : "Join us today !!!"}</span>
            <h2 className="text-[38px] font-bold text-ink leading-tight">{isSignin ? "Sign in" : "Sign up"}</h2>
          </div>

          {isSignin && (
            <div className="flex gap-1 rounded-[10px] bg-[#f0f0f0] p-1">
              <button
                type="button"
                onClick={() => { setSigninTab("otp"); setError(""); setOtpStep("form"); }}
                className={`flex-1 rounded-[8px] py-2 text-[13px] font-semibold transition-all ${signinTab === "otp" ? "bg-white text-brand-purple shadow-sm" : "text-[#8c8c8c]"}`}
              >
                Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => { setSigninTab("password"); setError(""); }}
                className={`flex-1 rounded-[8px] py-2 text-[13px] font-semibold transition-all ${signinTab === "password" ? "bg-white text-brand-purple shadow-sm" : "text-[#8c8c8c]"}`}
              >
                Password
              </button>
            </div>
          )}

          {(useOtp) && otpStep === "form" && (
            <div className="flex flex-col gap-4">
              {!isSignin && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-semibold text-ink">Full Name <span className="text-[#8c8c8c] font-normal text-[12px]">(optional)</span></label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-semibold text-ink">Email <span className="text-[#8c8c8c] font-normal text-[12px]">(optional)</span></label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-ink">Mobile Number <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <span className="flex h-[54px] items-center rounded-[10px] bg-[#f8f8fb] px-3 text-[14px] text-[#8c8c8c] border border-transparent shadow-sm">+91</span>
                  <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendOtp()} placeholder="9876543210" className={`${inputCls} flex-1`} />
                </div>
              </div>
              {error && <p className="text-[13px] text-red-500">{error}</p>}
              <div className="flex flex-col items-center gap-4 mt-1" onClick={sendOtp}>
                <SubmitBtn busy={busy} label="SEND OTP" />
              </div>
            </div>
          )}

          {(useOtp) && otpStep === "verify" && (
            <div className="flex flex-col gap-4">
              <p className="text-[14px] text-[#525151]">OTP sent to <span className="font-semibold text-ink">+91 {mobileHint}</span></p>
              {otpPreview && (
                <div className="rounded-[8px] border border-amber-300 bg-amber-50 px-4 py-2 text-[13px] text-amber-800">
                  <span className="font-semibold">Dev mode OTP:</span> {otpPreview}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-ink">Enter 6-digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                  placeholder="_ _ _ _ _ _"
                  className={`${inputCls} tracking-[0.4em] text-center text-[20px] font-bold`}
                />
              </div>
              {error && <p className="text-[13px] text-red-500">{error}</p>}
              <div className="flex flex-col items-center gap-3 mt-1">
                <div onClick={verifyOtp}>
                  <SubmitBtn busy={busy} label="VERIFY OTP" />
                </div>
                <div className="flex items-center gap-3 text-[13px] text-[#8c8c8c]">
                  <button type="button" onClick={() => { setOtp(""); setBusy(false); sendOtp(); }} className="hover:text-brand-purple font-medium">Resend OTP</button>
                  <span>·</span>
                  <button type="button" onClick={() => { setOtpStep("form"); setOtp(""); setError(""); }} className="hover:text-brand-purple font-medium">Change number</button>
                </div>
              </div>
            </div>
          )}

          {(!useOtp) && (
            <div className="flex flex-col gap-4">
              {!isSignin && (
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-semibold text-ink">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className={inputCls} />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-ink">Email or Mobile</label>
                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-semibold text-ink">Password</label>
                  {isSignin && <button type="button" className="text-[12px] font-medium text-[#8c8c8c] hover:text-ink">Forgot Password?</button>}
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="*************" className={inputCls} />
              </div>
              {!isSignin && (
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-semibold text-ink">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="*************" className={inputCls} />
                </div>
              )}
              {error && <p className="text-[13px] text-red-500 -mt-1">{error}</p>}
              <div className="flex flex-col items-center gap-4 mt-1" onClick={submitPassword}>
                <SubmitBtn busy={busy} label={isSignin ? "LOG IN" : "SIGN UP"} />
              </div>
            </div>
          )}

          {!(useOtp && otpStep === "verify") && (
            <p className="text-center text-[14px] text-[#8c8c8c]">
              {isSignin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button type="button" onClick={() => switchMode(isSignin ? "signup" : "signin")} className="font-bold text-brand-purple hover:underline">
                {isSignin ? "Sign up" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
