import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getOwnAccount, updateOwnAccount, updateStudentProfile, getBatches, getPhysicalInstitutes } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function ProfilePage() {
  const { user, login } = useAuth();
  const isStudent = user?.role === "STUDENT";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [batches, setBatches] = useState([]);
  const [institutes, setInstitutes] = useState([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    nic: "",
    gender: "MALE",
    medium: "SINHALA",
    whatsappNumber: "",
    profileUrl: "",
    school: "",
    guardianName: "",
    guardianMobile: "",
    guardianType: "FATHER",
    dob: "2000-01-01",
    enrollDate: "",
    batchId: "",
    instituteId: "",
    // Home Address
    homeAddressLine1: "",
    homeAddressLine2: "",
    homeCityId: 1,
    // Delivery Address
    deliveryAddressLine1: "",
    deliveryAddressLine2: "",
    deliveryCityId: 1,
  });

  useEffect(() => {
    fetchProfile();
    if (isStudent) {
      getBatches()
        .then((res) => setBatches(res.data?.data || []))
        .catch(() => {});
      getPhysicalInstitutes()
        .then((res) => {
          const list = res.data?.data || res.data || [];
          setInstitutes(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    }
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await getOwnAccount();
      const data = res.data?.data || {};

      setFormData({
        firstName: data.firstName || data.fname || "",
        lastName: data.lastName || data.lname || "",
        mobile: data.mobile || "",
        email: data.email || "",
        nic: data.nic || "",
        gender: data.gender || "MALE",
        medium: data.medium || "SINHALA",
        whatsappNumber: data.whatsappNumber || data.whatsapp_number || "",
        profileUrl: data.profileUrl || data.url || "",
        school: data.school || "",
        guardianName: data.guardianName || data.guardian_name || "",
        guardianMobile: data.guardianMobile || data.guardian_mobile || "",
        guardianType: data.guardianType || data.guardian_type || "FATHER",
        dob: data.dob || "2000-01-01",
        enrollDate: data.enrolledDate || data.enrollDate || data.enrolled_date || new Date().toISOString().split("T")[0],
        batchId: data.batchId || data.batch_id || "",
        instituteId: data.instituteId || data.institute_id || "",
        homeAddressLine1: data.homeAddress?.line1 || data.homeAddressLine1 || "",
        homeAddressLine2: data.homeAddress?.line2 || data.homeAddressLine2 || "",
        homeCityId: data.homeAddress?.cityId || data.homeCityId || 1,
        deliveryAddressLine1: data.deliveryAddress?.line1 || data.deliveryAddressLine1 || "",
        deliveryAddressLine2: data.deliveryAddress?.line2 || data.deliveryAddressLine2 || "",
        deliveryCityId: data.deliveryAddress?.cityId || data.deliveryCityId || 1,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopyHomeToDelivery = () => {
    setFormData((prev) => ({
      ...prev,
      deliveryAddressLine1: prev.homeAddressLine1,
      deliveryAddressLine2: prev.homeAddressLine2,
      deliveryCityId: prev.homeCityId,
    }));
    toast.success("Home address copied to Delivery address!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isStudent) {
        const payload = {
          id: user?.id,
          firstName: formData.firstName || "",
          lastName: formData.lastName || "",
          gender: formData.gender || "MALE",
          whatsappNumber: formData.whatsappNumber || "",
          profileUrl: formData.profileUrl || "",
          homeAddressLine1: formData.homeAddressLine1 || "",
          homeAddressLine2: formData.homeAddressLine2 || "",
          homeCityId: parseInt(formData.homeCityId, 10) || 1,
          deliveryAddressLine1: formData.deliveryAddressLine1 || "",
          deliveryAddressLine2: formData.deliveryAddressLine2 || "",
          deliveryCityId: parseInt(formData.deliveryCityId, 10) || 1,
          school: formData.school || "",
          guardianName: formData.guardianName || "",
          guardianMobile: formData.guardianMobile || "",
          guardianType: formData.guardianType || "FATHER",
          medium: formData.medium || "SINHALA",
          dob: formData.dob || "2000-01-01",
          enrollDate: formData.enrollDate || new Date().toISOString().split("T")[0],
          batchId: formData.batchId || "",
          instituteId: formData.instituteId ? formData.instituteId : null,
        };
        await updateStudentProfile(payload);
      } else {
        await updateOwnAccount({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        });
      }

      // Update local storage name if changed
      login({
        ...user,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: "center", padding: "60px 0" }}>
        <div className="spinner" style={{ margin: "0 auto" }} />
        <p style={{ marginTop: 15, color: "var(--text-muted)" }}>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: 25 }}>
        <div>
          <h1 className="page-title">My Account Profile</h1>
          <p className="page-subtitle">View and update your personal information and addresses.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Details Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 15, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
            Personal Details
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input
                type="text"
                value={formData.mobile}
                className="form-control"
                disabled
                title="Mobile number cannot be changed here"
              />
              <small style={{ color: "var(--text-muted)", fontSize: 11 }}>Registered mobile number (read-only)</small>
            </div>
            <div className="form-group">
              <label className="form-label">NIC</label>
              <input
                type="text"
                value={formData.nic}
                className="form-control"
                disabled
                title="NIC cannot be changed here"
              />
              <small style={{ color: "var(--text-muted)", fontSize: 11 }}>National Identity Card (read-only)</small>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
                disabled={isStudent}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="form-control"
                disabled={!isStudent}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>
        </div>

        {/* Academic Details (Only for Students) */}
        {isStudent && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 15, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              Academic & Communication Details
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
              <div className="form-group">
                <label className="form-label">WhatsApp Number</label>
                <input
                  type="text"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleChange}
                  placeholder="07xxxxxxxx"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Medium</label>
                <select name="medium" value={formData.medium} onChange={handleChange} className="form-control">
                  <option value="SINHALA">Sinhala</option>
                  <option value="ENGLISH">English</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Academic Batch</label>
                <select name="batchId" value={formData.batchId} onChange={handleChange} className="form-control">
                  <option value="">Select Batch...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Physical Institute</label>
                <select name="instituteId" value={formData.instituteId} onChange={handleChange} className="form-control">
                  <option value="">No Physical Institute (Online Only)</option>
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">School</label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  placeholder="Current School"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Guardian Name</label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  placeholder="Parent / Guardian Name"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Guardian Mobile</label>
                <input
                  type="text"
                  name="guardianMobile"
                  value={formData.guardianMobile}
                  onChange={handleChange}
                  placeholder="07xxxxxxxx"
                  className="form-control"
                />
              </div>
            </div>
          </div>
        )}

        {/* Address Details (Only for Students) */}
        {isStudent && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                Home & Delivery Addresses
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyHomeToDelivery}
              >
                Copy Home Address to Delivery
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Home Address */}
              <div style={{ background: "rgba(0,0,0,0.02)", padding: 15, borderRadius: 8, border: "1px solid var(--border)" }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Home Address</h4>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Address Line 1</label>
                  <input
                    type="text"
                    name="homeAddressLine1"
                    value={formData.homeAddressLine1}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="House No, Street name"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Address Line 2</label>
                  <input
                    type="text"
                    name="homeAddressLine2"
                    value={formData.homeAddressLine2}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Apartment, suite, unit (optional)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City ID</label>
                  <input
                    type="number"
                    name="homeCityId"
                    value={formData.homeCityId}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="City ID number"
                  />
                </div>
              </div>

              {/* Delivery Address */}
              <div style={{ background: "rgba(0,0,0,0.02)", padding: 15, borderRadius: 8, border: "1px solid var(--border)" }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Delivery Address (For Tutes)</h4>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Address Line 1</label>
                  <input
                    type="text"
                    name="deliveryAddressLine1"
                    value={formData.deliveryAddressLine1}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Delivery House No, Street"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Address Line 2</label>
                  <input
                    type="text"
                    name="deliveryAddressLine2"
                    value={formData.deliveryAddressLine2}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Apartment, unit (optional)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City ID</label>
                  <input
                    type="number"
                    name="deliveryCityId"
                    value={formData.deliveryCityId}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="City ID number"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving Changes..." : "Save Profile Details"}
          </button>
        </div>
      </form>
    </div>
  );
}
