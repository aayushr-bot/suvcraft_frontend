"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircleSolid } from "../components/icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type User = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  image?: string;
  has_password?: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password form
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");

  // Toast
  const [toast, setToast] = useState("");

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  // Override body bg with white for this page (same trick the cart/checkout pages use).
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = "#ffffff";
    return () => { document.body.style.background = prevBg; };
  }, []);

  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const u = j?.data?.user as User | null;
        if (!u) { router.replace("/"); return; }
        setUser(u);
        setName(u.name || "");
        setEmail(u.email || "");
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [router]);

  async function saveProfile() {
    setProfileError("");
    if (!name.trim()) { setProfileError("Name is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setProfileError("Enter a valid email address.");
      return;
    }
    setProfileBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/me`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const j = await res.json();
      if (j.error) { setProfileError(j.message || "Could not update profile."); return; }
      setUser(j.data?.user || null);
      flashToast("Profile updated.");
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword() {
    setPwdError("");
    if (newPwd.length < 6) { setPwdError("Password must be at least 6 characters."); return; }
    if (newPwd !== confirmPwd) { setPwdError("Passwords do not match."); return; }
    if (user?.has_password && !currentPwd) {
      setPwdError("Current password is required.");
      return;
    }
    setPwdBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/me`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_password: newPwd,
          ...(user?.has_password ? { current_password: currentPwd } : {}),
        }),
      });
      const j = await res.json();
      if (j.error) { setPwdError(j.message || "Could not update password."); return; }
      setUser(j.data?.user || null);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      flashToast(user?.has_password ? "Password changed." : "Password set.");
    } catch {
      setPwdError("Network error. Please try again.");
    } finally {
      setPwdBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8">
        <p className="text-center text-[14px] text-[#8c8c8c]">Loading…</p>
      </div>
    );
  }

  const inputCls = "w-full h-[48px] px-4 rounded-[8px] border border-[#d4d4d4] text-[14px] outline-none focus:border-ink transition-colors bg-white";
  const labelCls = "block text-[13px] font-semibold text-ink mb-1.5";
  const cardCls = "rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-6";
  const headerCls = "text-[18px] font-bold text-ink mb-1";
  const subHeaderCls = "text-[13px] text-[#878787] mb-5";

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-1 pb-10 md:px-8 bg-white min-h-screen">
      {/* Breadcrumb */}
      <nav className="text-[13px] text-[#8c8c8c] mb-4">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5">›</span>
        <span className="text-ink">Edit Profile</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-ink md:text-[30px]">Edit Profile</h1>
        <p className="mt-0.5 text-[13px] text-[#525151]">Update your account details and password.</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        {/* Personal details */}
        <div className={`${cardCls} flex-1`}>
          <h2 className={headerCls}>Personal Details</h2>
          <p className={subHeaderCls}>Your name and email used across the site.</p>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            {user?.mobile && (
              <div>
                <label className={labelCls}>Mobile</label>
                <input
                  type="text"
                  value={user.mobile}
                  readOnly
                  className={`${inputCls} bg-[#f9f9f9] text-[#878787]`}
                />
                <p className="mt-1 text-[11.5px] text-[#878787]">Mobile is verified — contact support to change it.</p>
              </div>
            )}
          </div>

          {profileError && (
            <p className="mt-4 text-[13px] font-medium text-red-600">{profileError}</p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={saveProfile}
              disabled={profileBusy}
              className="inline-flex h-[52px] min-w-[220px] items-center justify-center rounded-[8px] bg-ink-soft px-12 text-[14px] font-bold text-white tracking-[0.15em] hover:bg-black disabled:opacity-60"
            >
              {profileBusy ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className={`${cardCls} flex-1 w-full lg:w-[500px] lg:shrink-0`}>
          <h2 className={headerCls}>{user?.has_password ? "Change Password" : "Set Password"}</h2>
          <p className={subHeaderCls}>
            {user?.has_password
              ? "Enter your current password to set a new one."
              : "Add a password so you can sign in with email + password instead of OTP."}
          </p>

          <div className="grid grid-cols-1 gap-4">
            {user?.has_password && (
              <div>
                <label className={labelCls}>Current Password</label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className={inputCls}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            )}
            <div>
              <label className={labelCls}>New Password</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className={inputCls}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className={inputCls}
                placeholder="Re-enter the new password"
                autoComplete="new-password"
              />
            </div>
          </div>

          {pwdError && (
            <p className="mt-4 text-[13px] font-medium text-red-600">{pwdError}</p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={savePassword}
              disabled={pwdBusy}
              className="inline-flex h-[52px] min-w-[220px] items-center justify-center rounded-[8px] bg-ink-soft px-12 text-[14px] font-bold text-white tracking-[0.15em] hover:bg-black disabled:opacity-60"
            >
              {pwdBusy ? "Saving…" : (user?.has_password ? "Change Password" : "Set Password")}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]" />
          <div className="fixed bottom-10 left-1/2 z-[100] flex -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-[12px] bg-white px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#e7e7e7]">
              <CheckCircleSolid className="h-6 w-6 text-green-600" />
              <span className="text-[15px] font-medium text-ink">{toast}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
