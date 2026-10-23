import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerStudent, verifyRegisterOtp } from "../api";
import toast from "react-hot-toast";

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

export default function RegisterPage() {
  const navigate = useNavigate();

  // steps: "form" | "otp" | "success"
  const [step, setStep] = useState("form");
  const [txnId, setTxnId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    nic: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (!form.firstName.trim()) return "First name is required.";
    if (form.firstName.trim().length > 20) return "First name cannot exceed 20 characters.";
    if (!form.lastName.trim()) return "Last name is required.";
    if (form.lastName.trim().length > 20) return "Last name cannot exceed 20 characters.";

    const mobileRegex = /^07[01245678][0-9]{7}$/;
    if (!mobileRegex.test(form.mobile.trim())) {
      return "Please enter a valid Sri Lankan mobile number (e.g. 0771234567).";
    }

    const nicRegex = /^(([5-9]{1})([0-9]{1})([01235678]{1})([0-9]{6})([v|V|x|X]))|(([1,2]{1})([0,9]{1})([0-9]{2})([01235678]{1})([0-9]{7}))$/;
    if (!nicRegex.test(form.nic.trim())) {
      return "Please enter a valid NIC (e.g. 200012345678 or 981234567V).";
    }

    const passRegex = /^(?=.*[a-z])[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,20}$/;
    if (!passRegex.test(form.password)) {
      return "Password must be 8-20 characters and contain at least one lowercase letter.";
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobile: form.mobile.trim(),
        nic: form.nic.trim(),
        password: form.password,
      };

      const res = await registerStudent(payload);
      const resData = res.data;

      const receivedTxnId = resData.data?.txnId || resData.txnId;
      if (receivedTxnId) {
        setTxnId(receivedTxnId);
        setStep("otp");
        toast.success(resData.message || "OTP sent to your mobile number!");
      } else {
        toast.success("Registration initiated! Please verify your OTP.");
        setStep("otp");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Registration failed. Please check your details.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val, idx) => {
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`reg-otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpKey = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`reg-otp-${idx - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim().slice(0, 6);
    if (!pasteData) return;
    const digits = pasteData.split("");
    const next = [...otp];
    digits.forEach((d, i) => {
      if (i < 6) next[i] = d;
    });
    setOtp(next);
    const nextFocusIdx = Math.min(digits.length, 5);
    document.getElementById(`reg-otp-${nextFocusIdx}`)?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpStr = otp.join("");
    if (otpStr.length < 4) {
      setError("Please enter the complete OTP code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await verifyRegisterOtp(txnId, otpStr);
      toast.success(res.data?.message || "Registration verified successfully!");
      setStep("success");
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Invalid OTP. Please check and try again.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ padding: "30px 16px" }}>
      <div className="login-card" style={{ maxWidth: step === "form" ? "480px" : "420px" }}>
        <div className="login-logo">AK</div>
        
        {step === "form" && (
          <>
            <h1 className="login-title">Student Registration</h1>
            <p className="login-sub">Create your student account to enroll in courses and lessons.</p>

            {error && <div className="alert alert-danger" style={{ textAlign: "left" }}>{error}</div>}

            <form className="login-form" onSubmit={handleRegister}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input
                    className="form-control"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Amila"
                    maxLength={20}
                    required
                    id="reg-first-name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input
                    className="form-control"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Karunarathne"
                    maxLength={20}
                    required
                    id="reg-last-name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input
                  className="form-control"
                  name="mobile"
                  type="tel"
                  value={form.mobile}
                  onChange={handleChange}
                  placeholder="07XXXXXXXX (e.g. 0771234567)"
                  maxLength={10}
                  required
                  id="reg-mobile"
                />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  An OTP verification code will be sent to this mobile number.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">National ID Card (NIC) *</label>
                <input
                  className="form-control"
                  name="nic"
                  value={form.nic}
                  onChange={handleChange}
                  placeholder="e.g. 200012345678 or 981234567V"
                  maxLength={12}
                  required
                  id="reg-nic"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <div className="input-group">
                  <input
                    className="form-control"
                    type={showPass ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="8-20 characters, min 1 lowercase"
                    required
                    id="reg-password"
                  />
                  <span className="input-suffix" onClick={() => setShowPass((v) => !v)} style={{ cursor: "pointer" }}>
                    <EyeIcon show={showPass} />
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <div className="input-group">
                  <input
                    className="form-control"
                    type={showConfirmPass ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    required
                    id="reg-confirm-password"
                  />
                  <span className="input-suffix" onClick={() => setShowConfirmPass((v) => !v)} style={{ cursor: "pointer" }}>
                    <EyeIcon show={showConfirmPass} />
                  </span>
                </div>
              </div>

              <button
                className="btn btn-primary btn-block btn-lg"
                type="submit"
                disabled={loading}
                id="btn-register"
                style={{ marginTop: "12px" }}
              >
                {loading ? <span className="spinner" /> : "Register as Student"}
              </button>

              <div style={{ textAlign: "center", marginTop: "18px", fontSize: "13px", color: "var(--text-secondary)" }}>
                Already have an account?{" "}
                <Link to="/login" className="link-blue" style={{ fontWeight: 600 }}>
                  Sign in Now
                </Link>
              </div>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <h1 className="login-title">Verify Mobile Number</h1>
            <p className="login-sub">
              Enter the OTP code sent to <strong>{form.mobile}</strong> to activate your student account.
            </p>

            {error && <div className="alert alert-danger" style={{ textAlign: "left" }}>{error}</div>}

            <form className="login-form" onSubmit={handleVerifyOtp}>
              <div className="otp-input-group" onPaste={handleOtpPaste}>
                {otp.map((v, i) => (
                  <input
                    key={i}
                    id={`reg-otp-${i}`}
                    className="otp-digit"
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    onKeyDown={(e) => handleOtpKey(e, i)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                className="btn btn-primary btn-block btn-lg"
                type="submit"
                disabled={loading}
                id="btn-verify-student-otp"
              >
                {loading ? <span className="spinner" /> : "Verify & Activate Account"}
              </button>

              <p style={{ textAlign: "center", marginTop: "16px", fontSize: "12.5px", color: "var(--text-muted)" }}>
                Need to correct your info?{" "}
                <span
                  className="link-blue"
                  onClick={() => {
                    setStep("form");
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  Go back
                </span>
              </p>
            </form>
          </>
        )}

        {step === "success" && (
          <div style={{ padding: "10px 0" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#def7ec",
                color: "#0e9f6e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "28px",
              }}
            >
              ✓
            </div>
            <h1 className="login-title" style={{ color: "#0e9f6e" }}>Account Verified!</h1>
            <p className="login-sub" style={{ marginBottom: "24px" }}>
              Welcome, <strong>{form.firstName} {form.lastName}</strong>! Your student account has been registered and verified successfully.
            </p>

            <button
              className="btn btn-primary btn-block btn-lg"
              type="button"
              onClick={() => navigate("/login")}
              id="btn-proceed-login"
            >
              Sign in with your Account
            </button>
          </div>
        )}

        <div className="login-footer">© 2025 AK ComMath. All rights reserved.</div>
      </div>
    </div>
  );
}