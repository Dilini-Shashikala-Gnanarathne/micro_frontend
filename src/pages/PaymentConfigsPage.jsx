import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  getPaymentAmountConfigs,
  createPaymentAmountConfig,
  updatePaymentAmountConfig,
  deletePaymentAmountConfig,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getRejectReasons,
  createRejectReason,
  updateRejectReason,
  deleteRejectReason,
} from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function PaymentConfigsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [activeTab, setActiveTab] = useState("amounts"); // amounts | bankAccounts | rejectReasons

  // 1. Payment Amount Configs State
  const [amountConfigs, setAmountConfigs] = useState([]);
  const [loadingAmounts, setLoadingAmounts] = useState(false);
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [editingAmount, setEditingAmount] = useState(null);
  const [amountForm, setAmountForm] = useState({ type: "TUTE_REQUEST", amount: 0 });

  // 2. Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountNo: "",
    holderName: "",
    branch: "",
    isActive: 1,
  });

  // 3. Reject Reasons State
  const [rejectReasons, setRejectReasons] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [editingReason, setEditingReason] = useState(null);
  const [reasonForm, setReasonForm] = useState({ reason: "", isActive: 1 });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTab === "amounts") fetchAmountConfigs();
    if (activeTab === "bankAccounts") fetchBankAccounts();
    if (activeTab === "rejectReasons") fetchRejectReasons();
  }, [activeTab]);

  // Amount configs
  const fetchAmountConfigs = async () => {
    setLoadingAmounts(true);
    try {
      const res = await getPaymentAmountConfigs();
      setAmountConfigs(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load payment amount configs.");
    } finally {
      setLoadingAmounts(false);
    }
  };

  const handleAmountSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAmount) {
        await updatePaymentAmountConfig(editingAmount.id, { amount: parseFloat(amountForm.amount) });
        toast.success("Payment amount config updated!");
      } else {
        await createPaymentAmountConfig({
          type: amountForm.type,
          amount: parseFloat(amountForm.amount),
        });
        toast.success("Payment amount config created!");
      }
      setAmountModalOpen(false);
      fetchAmountConfigs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save payment amount config.");
    } finally {
      setSaving(false);
    }
  };

  const handleAmountDelete = async (cfg) => {
    if (!window.confirm(`Delete configuration for ${cfg.type}?`)) return;
    try {
      await deletePaymentAmountConfig(cfg.id);
      toast.success("Configuration deleted!");
      fetchAmountConfigs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete config.");
    }
  };

  // Bank Accounts
  const fetchBankAccounts = async () => {
    setLoadingBanks(true);
    try {
      const res = await getBankAccounts({ limit: 100 });
      setBankAccounts(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load bank accounts.");
    } finally {
      setLoadingBanks(false);
    }
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBank) {
        await updateBankAccount(editingBank.id, {
          bankName: bankForm.bankName,
          accountNo: bankForm.accountNo,
          holderName: bankForm.holderName,
          branch: bankForm.branch,
          isActive: parseInt(bankForm.isActive),
        });
        toast.success("Bank account updated!");
      } else {
        await createBankAccount({
          bankName: bankForm.bankName,
          accountNo: bankForm.accountNo,
          holderName: bankForm.holderName,
          branch: bankForm.branch,
          isActive: parseInt(bankForm.isActive),
        });
        toast.success("Bank account created!");
      }
      setBankModalOpen(false);
      fetchBankAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save bank account.");
    } finally {
      setSaving(false);
    }
  };

  const handleBankDelete = async (bank) => {
    if (!window.confirm(`Delete bank account ${bank.accountNo} (${bank.bankName})?`)) return;
    try {
      await deleteBankAccount(bank.id);
      toast.success("Bank account deleted!");
      fetchBankAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete bank account.");
    }
  };

  // Reject Reasons
  const fetchRejectReasons = async () => {
    setLoadingReasons(true);
    try {
      const res = await getRejectReasons({ limit: 100 });
      setRejectReasons(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load rejection reasons.");
    } finally {
      setLoadingReasons(false);
    }
  };

  const handleReasonSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingReason) {
        await updateRejectReason(editingReason.id, {
          reason: reasonForm.reason,
          isActive: parseInt(reasonForm.isActive),
        });
        toast.success("Reject reason updated!");
      } else {
        await createRejectReason({
          reason: reasonForm.reason,
          isActive: parseInt(reasonForm.isActive),
        });
        toast.success("Reject reason created!");
      }
      setReasonModalOpen(false);
      fetchRejectReasons();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save reject reason.");
    } finally {
      setSaving(false);
    }
  };

  const handleReasonDelete = async (reason) => {
    if (!window.confirm(`Delete reject reason "${reason.reason}"?`)) return;
    try {
      await deleteRejectReason(reason.id);
      toast.success("Reject reason deleted!");
      fetchRejectReasons();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete reject reason.");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Payment & System Configurations</h1>
        <p className="page-subtitle">Manage system fee configs, institute bank accounts, and rejection reasons.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        <button
          className={`btn ${activeTab === "amounts" ? "btn-primary" : "btn-secondary"}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab("amounts")}
        >
          Fee Configurations
        </button>
        <button
          className={`btn ${activeTab === "bankAccounts" ? "btn-primary" : "btn-secondary"}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab("bankAccounts")}
        >
          Institute Bank Accounts
        </button>
        <button
          className={`btn ${activeTab === "rejectReasons" ? "btn-primary" : "btn-secondary"}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab("rejectReasons")}
        >
          Slip Rejection Reasons
        </button>
      </div>

      {/* TAB 1: Fee Amounts */}
      {activeTab === "amounts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 15 }}>
            {isSuperAdmin && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingAmount(null);
                  setAmountForm({ type: "TUTE_REQUEST", amount: 0 });
                  setAmountModalOpen(true);
                }}
              >
                + Add Fee Config
              </button>
            )}
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Config Type</th>
                  <th>Amount (LKR)</th>
                  <th>Last Updated</th>
                  {isSuperAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loadingAmounts ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: 30 }}><div className="spinner" /></td></tr>
                ) : amountConfigs.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>No fee configurations found.</td></tr>
                ) : (
                  amountConfigs.map((cfg) => (
                    <tr key={cfg.id}>
                      <td><strong>{cfg.type}</strong></td>
                      <td style={{ fontWeight: 600, color: "var(--primary)" }}>Rs. {parseFloat(cfg.amount || 0).toLocaleString()}</td>
                      <td>{cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleDateString() : "—"}</td>
                      {isSuperAdmin && (
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: 6 }}
                            onClick={() => {
                              setEditingAmount(cfg);
                              setAmountForm({ type: cfg.type, amount: cfg.amount });
                              setAmountModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleAmountDelete(cfg)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Bank Accounts */}
      {activeTab === "bankAccounts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 15 }}>
            {isSuperAdmin && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingBank(null);
                  setBankForm({ bankName: "", accountNo: "", holderName: "", branch: "", isActive: 1 });
                  setBankModalOpen(true);
                }}
              >
                + Add Bank Account
              </button>
            )}
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Bank Name</th>
                  <th>Account Number</th>
                  <th>Account Holder</th>
                  <th>Branch</th>
                  <th>Status</th>
                  {isSuperAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loadingBanks ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 30 }}><div className="spinner" /></td></tr>
                ) : bankAccounts.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>No bank accounts found.</td></tr>
                ) : (
                  bankAccounts.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.bankName}</strong></td>
                      <td><code>{b.accountNo}</code></td>
                      <td>{b.holderName}</td>
                      <td>{b.branch || "—"}</td>
                      <td>
                        <span className={`badge ${b.isActive ? "badge-success" : "badge-secondary"}`}>
                          {b.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: 6 }}
                            onClick={() => {
                              setEditingBank(b);
                              setBankForm({
                                bankName: b.bankName,
                                accountNo: b.accountNo,
                                holderName: b.holderName,
                                branch: b.branch || "",
                                isActive: b.isActive ? 1 : 0,
                              });
                              setBankModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleBankDelete(b)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Reject Reasons */}
      {activeTab === "rejectReasons" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 15 }}>
            {isSuperAdmin && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingReason(null);
                  setReasonForm({ reason: "", isActive: 1 });
                  setReasonModalOpen(true);
                }}
              >
                + Add Rejection Reason
              </button>
            )}
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Reason Text</th>
                  <th>Status</th>
                  {isSuperAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loadingReasons ? (
                  <tr><td colSpan={3} style={{ textAlign: "center", padding: 30 }}><div className="spinner" /></td></tr>
                ) : rejectReasons.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>No rejection reasons found.</td></tr>
                ) : (
                  rejectReasons.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.reason}</strong></td>
                      <td>
                        <span className={`badge ${r.isActive ? "badge-success" : "badge-secondary"}`}>
                          {r.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: 6 }}
                            onClick={() => {
                              setEditingReason(r);
                              setReasonForm({ reason: r.reason, isActive: r.isActive ? 1 : 0 });
                              setReasonModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleReasonDelete(r)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Amount Modal */}
      {amountModalOpen && (
        <div className="modal-backdrop" onClick={() => setAmountModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingAmount ? "Edit Fee Config" : "Add Fee Config"}</h3>
              <button className="modal-close" onClick={() => setAmountModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAmountSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Config Type</label>
                  <select
                    className="form-control"
                    value={amountForm.type}
                    disabled={!!editingAmount}
                    onChange={(e) => setAmountForm({ ...amountForm, type: e.target.value })}
                  >
                    <option value="TUTE_REQUEST">TUTE_REQUEST</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={amountForm.amount}
                    onChange={(e) => setAmountForm({ ...amountForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAmountModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingAmount ? "Update Config" : "Create Config"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Modal */}
      {bankModalOpen && (
        <div className="modal-backdrop" onClick={() => setBankModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingBank ? "Edit Bank Account" : "Add Bank Account"}</h3>
              <button className="modal-close" onClick={() => setBankModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleBankSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Bank Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Bank of Ceylon"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 1234567890"
                    value={bankForm.accountNo}
                    onChange={(e) => setBankForm({ ...bankForm, accountNo: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Holder Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Amila Karunarathne"
                    value={bankForm.holderName}
                    onChange={(e) => setBankForm({ ...bankForm, holderName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Colombo Fort"
                    value={bankForm.branch}
                    onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={bankForm.isActive}
                    onChange={(e) => setBankForm({ ...bankForm, isActive: parseInt(e.target.value) })}
                  >
                    <option value={1}>ACTIVE</option>
                    <option value={0}>INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setBankModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingBank ? "Update Account" : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {reasonModalOpen && (
        <div className="modal-backdrop" onClick={() => setReasonModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingReason ? "Edit Reason" : "Add Rejection Reason"}</h3>
              <button className="modal-close" onClick={() => setReasonModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleReasonSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Reason Description *</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="e.g. Invalid bank slip image or unreadable reference"
                    value={reasonForm.reason}
                    onChange={(e) => setReasonForm({ ...reasonForm, reason: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={reasonForm.isActive}
                    onChange={(e) => setReasonForm({ ...reasonForm, isActive: parseInt(e.target.value) })}
                  >
                    <option value={1}>ACTIVE</option>
                    <option value={0}>INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setReasonModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingReason ? "Update Reason" : "Create Reason"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
