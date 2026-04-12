"use client";
import { useState, useEffect, useRef } from "react";
import { C, F, inputBase, lbl } from "@/lib/design";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import { BackIcon, CheckIcon } from "@/components/Icons";
import { api } from "@/lib/api";

export default function ProfileScreen({ user, token, avatarUrl, onAvatarChange, onBack, onLogout, onDeleteAccount }) {
  const [p, setP] = useState({
    first: "",
    last: "",
    email: user?.email || "",
    cc: "+49",
    phone: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [changePw, setChangePw] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  // Load profile from backend on mount
  useEffect(() => {
    if (!token) return;
    api.getMe(token).then(data => {
      const fullName = data.name || "";
      const parts = fullName.split(" ");
      const first = parts[0] || "";
      const last = parts.slice(1).join(" ") || "";
      // Parse phone: match against known country codes (longest first)
      let cc = "+49", phone = "";
      if (data.phone) {
        const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
        const found = sorted.find(c => data.phone.startsWith(c.code));
        if (found) { cc = found.code; phone = data.phone.slice(found.code.length); }
        else phone = data.phone;
      }
      setP({ first, last, email: data.email || "", cc, phone });
    }).catch(() => {});
  }, [token]);

  const save = async () => {
    setError("");
    try {
      const name = [p.first, p.last].filter(Boolean).join(" ");
      const phone = p.phone ? `${p.cc}${p.phone}` : "";
      await api.updateProfile(token, { name, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (pw.next !== pw.confirm) { setPwError("Passwords do not match"); return; }
    if (pw.next.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    try {
      await api.changePassword(token, { current_password: pw.current, new_password: pw.next });
      setPwSaved(true);
      setChangePw(false);
      setPw({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSaved(false), 2000);
    } catch (e) {
      setPwError(e.message);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      await api.uploadAvatar(token, file);
      onAvatarChange?.(api.getAvatarUrl(token));
    } catch (err) {
      setError(err.message);
    }
    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleAvatarDelete = async () => {
    setAvatarUploading(true);
    try {
      await api.deleteAvatar(token);
      onAvatarChange?.(null);
    } catch (err) {
      setError(err.message);
    }
    setAvatarUploading(false);
  };

  const getInitials = () => {
    const first = p.first?.trim();
    const last = p.last?.trim();
    if (first && last) return (first[0] + last[0]).toUpperCase();
    if (first) return first[0].toUpperCase();
    return (p.email || "?")[0].toUpperCase();
  };

  const f = (k) => (e) => setP({ ...p, [k]: e.target.value });

  const fB = (e) => { e.target.style.borderColor = C.green; e.target.style.boxShadow = `0 0 0 3px rgba(139,197,63,0.12)`; };
  const bB = (e) => { e.target.style.borderColor = C.border2; e.target.style.boxShadow = "none"; };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 24px", fontFamily: F.sans, animation: "fadeUp .3s ease" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0, marginBottom: 24, fontFamily: F.sans, fontSize: 13 }}>
        <BackIcon /> Back
      </button>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: C.text1 }}>Profile Settings</h2>
      <p style={{ margin: "0 0 28px", fontSize: 13, color: C.text2 }}>Manage your account information</p>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {avatarUrl ? (
            <img src={avatarUrl} onError={() => onAvatarChange?.(null)} style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${C.green}, ${C.navy})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>
              {getInitials()}
            </div>
          )}
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarUpload} />
          <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} title="Change photo"
            style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%", background: C.green, border: `2px solid ${C.bg1}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text1 }}>{p.first || p.last ? `${p.first} ${p.last}`.trim() : p.email}</div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 4 }}>{p.email}</div>
          {avatarUrl && (
            <button onClick={handleAvatarDelete} disabled={avatarUploading}
              style={{ fontSize: 11, color: C.err, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: F.sans, opacity: avatarUploading ? 0.5 : 1 }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
              Remove photo
            </button>
          )}
        </div>
      </div>

      {/* Personal info */}
      <div style={{ background: C.bg1, borderRadius: 12, padding: 22, border: `1px solid ${C.border}`, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 13, fontWeight: 600, color: C.text1, textTransform: "uppercase", letterSpacing: "0.05em" }}>Personal Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><label style={lbl}>First Name</label><input style={inputBase} value={p.first} onChange={f("first")} onFocus={fB} onBlur={bB} /></div>
          <div><label style={lbl}>Last Name</label><input style={inputBase} value={p.last} onChange={f("last")} onFocus={fB} onBlur={bB} /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Email</label>
          <input style={{ ...inputBase, opacity: 0.6 }} type="email" value={p.email} disabled />
        </div>
        <div>
          <label style={lbl}>Phone Number</label>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
            <select style={{ ...inputBase, cursor: "pointer", padding: "11px 8px" }} value={p.cc} onChange={f("cc")}>
              {COUNTRY_CODES.map((c, i) => (
                <option key={i} value={c.code}>{c.code} {c.country}</option>
              ))}
            </select>
            <input style={inputBase} type="tel"
              placeholder={COUNTRY_CODES.find(c => c.code === p.cc)?.placeholder || "000 000 0000"}
              value={p.phone} onChange={f("phone")} onFocus={fB} onBlur={bB} />
          </div>
        </div>
      </div>

      {/* Security */}
      <div style={{ background: C.bg1, borderRadius: 12, padding: 22, border: `1px solid ${C.border}`, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 13, fontWeight: 600, color: C.text1, textTransform: "uppercase", letterSpacing: "0.05em" }}>Security</h3>
        {pwSaved && <div style={{ marginBottom: 14, padding: "9px 12px", background: "rgba(139,197,63,0.08)", border: `1px solid rgba(139,197,63,0.2)`, borderRadius: 6, color: C.green, fontSize: 13 }}>Password updated successfully</div>}
        {!changePw ? (
          <button onClick={() => setChangePw(true)}
            style={{ padding: "10px 18px", background: "transparent", border: `1px solid ${C.greenBorder}`, borderRadius: 8, color: C.green, cursor: "pointer", fontSize: 13, fontFamily: F.sans, fontWeight: 600 }}
            onMouseEnter={e => e.target.style.background = C.greenSubtle} onMouseLeave={e => e.target.style.background = "transparent"}>
            Change Password
          </button>
        ) : (
          <div style={{ animation: "fadeUp .2s ease" }}>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Current Password</label><input style={inputBase} type="password" placeholder="Enter current password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} onFocus={fB} onBlur={bB} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>New Password</label><input style={inputBase} type="password" placeholder="Min 6 characters" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} onFocus={fB} onBlur={bB} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Confirm New Password</label><input style={inputBase} type="password" placeholder="Re-enter" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} onFocus={fB} onBlur={bB} /></div>
            {pwError && <div style={{ marginBottom: 14, padding: "9px 12px", background: "rgba(255,90,90,0.08)", border: `1px solid rgba(255,90,90,0.2)`, borderRadius: 6, color: C.err, fontSize: 13 }}>{pwError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setChangePw(false); setPwError(""); }} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text2, cursor: "pointer", fontSize: 13, fontFamily: F.sans }}>Cancel</button>
              <button onClick={handleChangePassword} style={{ padding: "9px 18px", background: C.green, border: "none", borderRadius: 8, color: "#111", cursor: "pointer", fontSize: 13, fontFamily: F.sans, fontWeight: 700 }}>Update Password</button>
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ marginBottom: 14, padding: "9px 12px", background: "rgba(255,90,90,0.08)", border: `1px solid rgba(255,90,90,0.2)`, borderRadius: 6, color: C.err, fontSize: 13 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onBack} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text2, cursor: "pointer", fontSize: 13, fontFamily: F.sans }}>Cancel</button>
          <button onClick={save} style={{ padding: "10px 20px", background: C.green, border: "none", borderRadius: 8, color: "#111", cursor: "pointer", fontSize: 13, fontFamily: F.sans, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
            {saved && <CheckIcon />} {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Sign Out */}
      <div style={{ background: C.bg1, borderRadius: 12, padding: 22, border: `1px solid ${C.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, marginBottom: 2 }}>Sign Out</div>
            <div style={{ fontSize: 12, color: C.text3 }}>Sign out of your account on this device</div>
          </div>
          <button onClick={onLogout}
            style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text2, cursor: "pointer", fontSize: 13, fontFamily: F.sans, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.err; e.currentTarget.style.color = C.err; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Delete Account */}
      <div style={{ background: C.bg1, borderRadius: 12, padding: 22, border: `1px solid rgba(255,90,90,0.2)`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.err, marginBottom: 2 }}>Delete Account</div>
            <div style={{ fontSize: 12, color: C.text3 }}>Permanently delete your account and all data</div>
          </div>
          <button onClick={() => { if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) onDeleteAccount?.(); }}
            style={{ padding: "9px 18px", background: "rgba(255,90,90,0.08)", border: `1px solid rgba(255,90,90,0.2)`, borderRadius: 8, color: C.err, cursor: "pointer", fontSize: 13, fontFamily: F.sans, fontWeight: 600 }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,90,90,0.15)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,90,90,0.08)"}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
