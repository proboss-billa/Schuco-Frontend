"use client";
import { useState } from "react";
import { C, F, inputBase, lbl, btnG, fB, bB } from "@/lib/design";
import { api } from "@/lib/api";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import { SchucoFull, EyeIcon, EyeOffIcon } from "@/components/Icons";

export default function AuthScreen({ onLogin }) {
  const [view, setView] = useState("login");
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: "", pw: "", first: "", last: "", cc: "+49", phone: "", pw2: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const handleLogin = async () => {
    setError("");
    // Validate required login fields
    if (!form.email.trim() || !form.pw) {
      setTouched(prev => ({ ...prev, email: true, pw: true }));
      if (!form.email.trim() && !form.pw) { setError("Email and password are required"); return; }
      if (!form.email.trim()) { setError("Email is required"); return; }
      setError("Password is required"); return;
    }
    setLoading(true);
    try {
      const data = await api.login(form.email, form.pw);
      onLogin(data.access_token, data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError(""); setLoading(true);
    if (!form.first.trim()) { setError("First name is required"); setLoading(false); return; }
    if (!form.last.trim()) { setError("Last name is required"); setLoading(false); return; }
    if (!form.email.trim()) { setError("Email is required"); setLoading(false); return; }
    if (!form.phone.trim()) { setError("Phone number is required"); setLoading(false); return; }
    if (form.pw.length < 8) { setError("Password must be at least 8 characters"); setLoading(false); return; }
    if (form.pw !== form.pw2) { setError("Passwords do not match"); setLoading(false); return; }
    try {
      const name = [form.first.trim(), form.last.trim()].join(" ");
      const phone = `${form.cc}${form.phone.trim()}`;
      const data = await api.signup(form.email, form.pw, name, phone);
      onLogin(data.access_token, data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const markTouched = (k) => () => setTouched(prev => ({ ...prev, [k]: true }));
  const reqLabel = (text) => <label style={lbl}>{text} <span style={{ color: C.err }}>*</span></label>;
  const fieldErr = (k, msg) => touched[k] && !form[k].trim() ? <div style={{ fontSize: 11, color: C.err, marginTop: 3 }}>{msg}</div> : null;
  const pwErr = touched.pw && form.pw.length > 0 && form.pw.length < 8 ? <div style={{ fontSize: 11, color: C.err, marginTop: 3 }}>Minimum 8 characters</div> : touched.pw && !form.pw ? <div style={{ fontSize: 11, color: C.err, marginTop: 3 }}>Required</div> : null;
  const pw2Err = touched.pw2 && !form.pw2 ? <div style={{ fontSize: 11, color: C.err, marginTop: 3 }}>Required</div> : touched.pw2 && form.pw2 && form.pw !== form.pw2 ? <div style={{ fontSize: 11, color: C.err, marginTop: 3 }}>Passwords do not match</div> : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 30% 20%, ${C.bg2} 0%, ${C.bg} 50%, ${C.navyDeep} 100%)`, fontFamily: F.sans, padding: 20 }}>
      <div style={{ position: "fixed", inset: 0, opacity: 0.02, backgroundImage: `linear-gradient(${C.green} 1px, transparent 1px), linear-gradient(90deg, ${C.green} 1px, transparent 1px)`, backgroundSize: "50px 50px", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1, animation: "fadeUp 0.5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* TenderIQ logo + name */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 0 }}>
            <img src="/teiq.png" alt="TenderIQ" style={{ height: 36, width: "auto", objectFit: "contain" }} />
            <span style={{ fontSize: 26, fontWeight: 700, color: C.text1, letterSpacing: "-0.03em" }}>TenderIQ</span>
          </div>
          {/* Schüco × Sooru */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: -30 }}>
            <img src="/schu.png" alt="Schüco" style={{ height: 125, width: "auto", objectFit: "contain" }} />
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.7)", fontWeight: 300, lineHeight: 1 }}>×</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/suru.png" alt="Sooru" style={{ height: 25, width: "auto", objectFit: "contain" }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: C.text1, letterSpacing: "-0.01em" }}>Sooru.AI</span>
            </div>
          </div>
        </div>

        <div style={{ background: C.bg1, borderRadius: 16, padding: "30px 28px", border: `1px solid ${C.border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>

          {/* ── LOGIN ── */}
          {view === "login" && <>
            <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 600, color: C.text1 }}>Welcome back</h2>
            <p style={{ margin: "0 0 26px", fontSize: 13, color: C.text2 }}>Sign in to continue analyzing tenders</p>
            <div style={{ marginBottom: 16 }}>
              {reqLabel("Email")}
              <input style={{ ...inputBase, borderColor: touched.email && !form.email.trim() ? C.err : undefined }} type="email" placeholder="you@company.com" value={form.email} onChange={f("email")} onFocus={fB} onBlur={(e) => { bB(e); markTouched("email")(); }} />
              {fieldErr("email", "Required")}
            </div>
            <div style={{ marginBottom: 8 }}>
              {reqLabel("Password")}
              <div style={{ position: "relative" }}>
                <input style={{ ...inputBase, paddingRight: 40, borderColor: touched.pw && !form.pw ? C.err : undefined }} type={showPw ? "text" : "password"} placeholder="Enter password" autoComplete="new-password" value={form.pw} onChange={f("pw")} onFocus={fB} onBlur={(e) => { bB(e); markTouched("pw")(); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()} />
                <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 4 }}>
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {touched.pw && !form.pw && <div style={{ fontSize: 11, color: C.err, marginTop: 3 }}>Required</div>}
            </div>
            <div style={{ marginBottom: 22 }} />
            {error && <div style={{ marginBottom: 14, padding: "9px 12px", background: "rgba(255,90,90,0.08)", border: `1px solid rgba(255,90,90,0.2)`, borderRadius: 6, color: C.err, fontSize: 13 }}>{error}</div>}
            <button style={{ ...btnG, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}
              onMouseEnter={e => { if (!loading) e.target.style.background = C.accentHover; }}
              onMouseLeave={e => e.target.style.background = C.green}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 13, color: C.text2 }}>
              Don't have an account?{" "}
              <button onClick={() => { setError(""); setView("register"); }} style={{ background: "none", border: "none", color: C.green, cursor: "pointer", fontFamily: F.sans, fontWeight: 700, fontSize: 13 }}>Sign up</button>
            </p>
          </>}

          {/* ── REGISTER ── */}
          {view === "register" && <>
            <h2 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 600, color: C.text1 }}>Create account</h2>
            <p style={{ margin: "0 0 22px", fontSize: 13, color: C.text2 }}>Start analyzing tender documents with AI</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>{reqLabel("First Name")}<input style={{ ...inputBase, borderColor: touched.first && !form.first.trim() ? C.err : undefined }} placeholder="John" value={form.first} onChange={f("first")} onFocus={fB} onBlur={(e) => { bB(e); markTouched("first")(); }} />{fieldErr("first", "Required")}</div>
              <div>{reqLabel("Last Name")}<input style={{ ...inputBase, borderColor: touched.last && !form.last.trim() ? C.err : undefined }} placeholder="Doe" value={form.last} onChange={f("last")} onFocus={fB} onBlur={(e) => { bB(e); markTouched("last")(); }} />{fieldErr("last", "Required")}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              {reqLabel("Email")}
              <input style={{ ...inputBase, borderColor: touched.email && !form.email.trim() ? C.err : undefined }} type="email" placeholder="you@schueco.com" value={form.email} onChange={f("email")} onFocus={fB} onBlur={(e) => { bB(e); markTouched("email")(); }} />
              {fieldErr("email", "Required")}
              <p style={{ margin: "6px 0 0", fontSize: 11, color: C.text3, lineHeight: 1.4 }}>
                Only @schueco.in, @schueco.com, and @sooru.ai email addresses are allowed.
                <br />For more, contact <span style={{ color: C.text2 }}>mike@sooru.ai</span> or <span style={{ color: C.text2 }}>brijesh@sooru.ai</span> for assistance.
              </p>
            </div>
            <div style={{ marginBottom: 14 }}>
              {reqLabel("Phone Number")}
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
                <select style={{ ...inputBase, cursor: "pointer", padding: "11px 8px" }} value={form.cc} onChange={f("cc")}>
                  {COUNTRY_CODES.map((c, i) => (
                    <option key={i} value={c.code}>{c.code} {c.country}</option>
                  ))}
                </select>
                <input style={{ ...inputBase, borderColor: touched.phone && !form.phone.trim() ? C.err : undefined }} type="tel"
                  placeholder={COUNTRY_CODES.find(c => c.code === form.cc)?.placeholder || "000 000 0000"}
                  value={form.phone} onChange={f("phone")} onFocus={fB} onBlur={(e) => { bB(e); markTouched("phone")(); }} />
              </div>
              {fieldErr("phone", "Required")}
            </div>
            <div style={{ marginBottom: 14 }}>
              {reqLabel("Password")}
              <div style={{ position: "relative" }}>
                <input style={{ ...inputBase, paddingRight: 40, borderColor: touched.pw && (!form.pw || form.pw.length < 8) ? C.err : undefined }} type={showPw ? "text" : "password"} placeholder="Min 8 characters" value={form.pw} onChange={f("pw")} onFocus={fB} onBlur={(e) => { bB(e); markTouched("pw")(); }} />
                <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 4 }}>
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {pwErr}
            </div>
            <div style={{ marginBottom: 22 }}>
              {reqLabel("Confirm Password")}
              <input style={{ ...inputBase, borderColor: touched.pw2 && (!form.pw2 || form.pw !== form.pw2) ? C.err : undefined }} type="password" placeholder="Re-enter password" value={form.pw2} onChange={f("pw2")} onFocus={fB} onBlur={(e) => { bB(e); markTouched("pw2")(); }} />
              {pw2Err}
            </div>
            {error && <div style={{ marginBottom: 14, padding: "9px 12px", background: "rgba(255,90,90,0.08)", border: `1px solid rgba(255,90,90,0.2)`, borderRadius: 6, color: C.err, fontSize: 13 }}>{error}</div>}
            <button style={{ ...btnG, opacity: loading ? 0.7 : 1 }} onClick={handleSignup} disabled={loading}
              onMouseEnter={e => { if (!loading) e.target.style.background = C.accentHover; }}
              onMouseLeave={e => e.target.style.background = C.green}>
              {loading ? "Creating…" : "Create Account"}
            </button>
            <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 13, color: C.text2 }}>
              Already have an account?{" "}
              <button onClick={() => { setError(""); setView("login"); }} style={{ background: "none", border: "none", color: C.green, cursor: "pointer", fontFamily: F.sans, fontWeight: 700, fontSize: 13 }}>Sign in</button>
            </p>
          </>}
        </div>
      </div>
    </div>
  );
}
