import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authLogin, authLoginVerifyOtp } from "../api";
import { useAuth } from "../contexts/AuthContext";

function EyeIcon({ show }) {
  return show ? (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" width="17" height="17">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" width="17" height="17">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState("credentials"); // credentials | otp
  const [txnId, setTxnId] = useState("");
  const [form, setForm] = useState({ username: "", password: "" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setError("Please enter username and password."); return; }
    setLoading(true); setError("");
    try {
      const res = await authLogin(form.username, form.password);
      const d = res.data;
      if (d.data?.flow === "otp" || d.message?.includes("OTP")) {
        setTxnId(d.data?.txnId || "");
        setStep("otp");
      } else {
        login(d.data);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleOtpChange = (val, idx) => {
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) document.getElementById(`otp-${idx+1}`)?.focus();
  };

  const handleOtpKey = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) document.getElementById(`otp-${idx-1}`)?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpStr = otp.join("");
    if (otpStr.length < 6) { setError("Please enter the 6-digit OTP."); return; }
    setLoading(true); setError("");
    try {
      const res = await authLoginVerifyOtp(txnId, otpStr);
      login(res.data.data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">AK</div>
        <h1 className="login-title">Welcome to AK ComMath</h1>
        <p className="login-sub">
          {step === "credentials"
            ? "Sign in with your credentials to access your workspace."
            : "Enter the 6-digit OTP sent to your registered mobile."}
        </p>

        {error && <div className="alert alert-danger" style={{textAlign:"left"}}>{error}</div>}

        {step === "credentials" ? (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Enter your User ID</label>
              <input
                className="form-control"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Your username or mobile"
                autoFocus
                id="login-username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Enter your password</label>
              <div className="input-group">
                <input
                  className="form-control"
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••••"
                  id="login-password"
                />
                <span className="input-suffix" onClick={() => setShowPass(v => !v)}>
                  <EyeIcon show={showPass} />
                </span>
              </div>
            </div>
            <div className="login-links">
              <span className="link-blue">Forgot password ?</span>
            </div>
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading} id="btn-signin">
              {loading ? <span className="spinner" /> : "Sign in Now"}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerifyOtp}>
            <div className="otp-input-group">
              {otp.map((v, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  className="otp-digit"
                  inputMode="numeric"
                  maxLength={1}
                  value={v}
                  onChange={e => handleOtpChange(e.target.value, i)}
                  onKeyDown={e => handleOtpKey(e, i)}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading} id="btn-verify-otp">
              {loading ? <span className="spinner" /> : "Verify OTP"}
            </button>
            <p style={{textAlign:"center",marginTop:"14px",fontSize:"12.5px",color:"var(--text-muted)"}}>
              Didnt receive OTP? <span className="link-blue" onClick={() => {setStep("credentials");setOtp(["","","","","",""]);setError("");}}>Go back</span>
            </p>
          </form>
        )}

        <div className="login-footer">© 2025 AK ComMath. All rights reserved.</div>
      </div>
    </div>
  );
}
