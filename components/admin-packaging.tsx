"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeaderActions } from "./admin-header-actions";
import { ConfirmDialog } from "./admin-confirm-dialog";
import type { PackagingBox } from "@/lib/packaging";
import styles from "./admin-packaging.module.css";

interface AdminPackagingProps {
  initialBoxes: PackagingBox[];
}

type SimulationResult = {
  success: boolean;
  shiprocketConfigured: boolean;
  packaging: {
    boxId: number;
    boxName: string;
    length: number;
    breadth: number;
    height: number;
    tareWeightKg: number;
    snackWeightKg: number;
    totalWeightKg: number;
    volumetricWeightKg: number;
  };
  couriers: Array<{
    id: number;
    name: string;
    rate: number;
    etd: string | null;
    isCheapest: boolean;
    isFastest: boolean;
  }>;
};

export function AdminPackaging({ initialBoxes }: AdminPackagingProps) {
  const router = useRouter();
  const [boxes, setBoxes] = useState<PackagingBox[]>(initialBoxes);
  const [showModal, setShowModal] = useState(false);
  const [editingBox, setEditingBox] = useState<PackagingBox | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Form inputs
  const [name, setName] = useState("");
  const [length, setLength] = useState("20");
  const [breadth, setBreadth] = useState("15");
  const [height, setHeight] = useState("10");
  const [boxWeightKg, setBoxWeightKg] = useState("0.120");
  const [maxCapacityKg, setMaxCapacityKg] = useState("1.200");
  const [sortOrder, setSortOrder] = useState("1");
  const [active, setActive] = useState(true);

  // Optional test simulator (collapsed by default to keep UI clean)
  const [showSimulator, setShowSimulator] = useState(false);
  const [simWeight, setSimWeight] = useState("0.60");
  const [simPincode, setSimPincode] = useState("600001");
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleOpenAdd() {
    setEditingBox(null);
    setName("");
    setLength("20");
    setBreadth("15");
    setHeight("10");
    setBoxWeightKg("0.120");
    setMaxCapacityKg("1.200");
    setSortOrder(String(boxes.length + 1));
    setActive(true);
    setError("");
    setShowModal(true);
  }

  function handleOpenEdit(box: PackagingBox) {
    setEditingBox(box);
    setName(box.name);
    setLength(box.length.toString());
    setBreadth(box.breadth.toString());
    setHeight(box.height.toString());
    setBoxWeightKg(box.boxWeightKg.toString());
    setMaxCapacityKg(box.maxCapacityKg.toString());
    setSortOrder(box.sortOrder.toString());
    setActive(box.active);
    setError("");
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingBox(null);
    setError("");
  }

  const lNum = parseFloat(length) || 0;
  const bNum = parseFloat(breadth) || 0;
  const hNum = parseFloat(height) || 0;
  const volumetricKg =
    lNum > 0 && bNum > 0 && hNum > 0
      ? Math.round(((lNum * bNum * hNum) / 5000) * 1000) / 1000
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const l = parseFloat(length);
    const b = parseFloat(breadth);
    const h = parseFloat(height);
    const bw = parseFloat(boxWeightKg);
    const mc = parseFloat(maxCapacityKg);
    const so = parseInt(sortOrder, 10) || 0;

    if (!name.trim()) {
      setError("Please enter a box name.");
      return;
    }
    if (isNaN(l) || l <= 0 || isNaN(b) || b <= 0 || isNaN(h) || h <= 0) {
      setError("Please enter positive dimensions in cm.");
      return;
    }
    if (isNaN(bw) || bw <= 0) {
      setError("Please enter a valid tare weight in kg (e.g. 0.12 for 120g).");
      return;
    }
    if (isNaN(mc) || mc <= 0) {
      setError("Please enter a valid max capacity in kg.");
      return;
    }

    setLoading(true);
    try {
      if (editingBox) {
        const res = await fetch(`/api/admin/packaging/${editingBox.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            length: l,
            breadth: b,
            height: h,
            boxWeightKg: bw,
            maxCapacityKg: mc,
            sortOrder: so,
            active,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update packaging box.");

        setBoxes((prev) =>
          prev.map((item) => (item.id === editingBox.id ? data.box : item))
        );
        showToast("Packaging box updated.");
      } else {
        const res = await fetch("/api/admin/packaging", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            length: l,
            breadth: b,
            height: h,
            boxWeightKg: bw,
            maxCapacityKg: mc,
            sortOrder: so,
            active,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create packaging box.");

        setBoxes((prev) => [...prev, data.box]);
        showToast("New packaging box added.");
      }
      handleCloseModal();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(box: PackagingBox) {
    try {
      const res = await fetch(`/api/admin/packaging/${box.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !box.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");
      setBoxes((prev) =>
        prev.map((item) => (item.id === box.id ? { ...item, active: !box.active } : item))
      );
      showToast(`${box.name} is now ${!box.active ? "Active" : "Disabled"}.`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to toggle status.", false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/admin/packaging/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete box.");
      setBoxes((prev) => prev.filter((item) => item.id !== id));
      showToast("Packaging box removed.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete box.", false);
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleRunSimulator(e: React.FormEvent) {
    e.preventDefault();
    setSimError("");
    setSimResult(null);

    const w = parseFloat(simWeight);
    if (isNaN(w) || w <= 0) {
      setSimError("Please enter a snack weight in kg (e.g. 0.60).");
      return;
    }
    if (!/^\d{6}$/.test(simPincode.trim())) {
      setSimError("Please enter a valid 6-digit Indian PIN code.");
      return;
    }

    setSimLoading(true);
    try {
      const res = await fetch("/api/admin/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincode: simPincode.trim(),
          weight: w,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulation failed.");
      setSimResult(data);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : "Simulation request failed.");
    } finally {
      setSimLoading(false);
    }
  }

  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: toast.ok ? "#166534" : "#991b1b",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Packaging &amp; Fulfillment</p>
          <h1>Packaging Boxes</h1>
          <p>Boxes are matched automatically at checkout based on customer order weight</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleOpenAdd}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Box
          </button>
          <div className={styles.headerBell}><AdminHeaderActions /></div>
        </div>
      </header>

      {/* Main Workspace */}
      <section className={styles.workspace}>
        {/* Subtle Toolbar */}
        <div className={styles.toolbar}>
          <span>
            {boxes.length} container{boxes.length !== 1 ? "s" : ""} configured
          </span>
          <span style={{ fontSize: 12, color: "#858c97" }}>
            Sorted by order priority
          </span>
        </div>

        {boxes.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No packaging boxes added</h3>
            <p>Click &ldquo;Add Box&rdquo; to set up your first shipping container.</p>
            <button className={styles.primaryButton} onClick={handleOpenAdd} type="button">
              Add Box
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table: Only 4 essential, clean columns */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Box Container</th>
                    <th>Max Snack Capacity</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boxes.map((box) => (
                    <tr key={box.id}>
                      {/* Box Name + subtle dimensions/tare */}
                      <td>
                        <span className={styles.boxTitle}>{box.name}</span>
                        <div className={styles.boxSubline}>
                          <span className={styles.dimTag}>
                            {box.length} &times; {box.breadth} &times; {box.height} cm
                          </span>
                          <span>· Tare {Math.round(box.boxWeightKg * 1000)}g</span>
                        </div>
                      </td>

                      {/* Max Capacity */}
                      <td>
                        <span className={styles.capacityPill}>
                          Up to {box.maxCapacityKg} kg
                        </span>
                      </td>

                      {/* Active Toggle */}
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(box)}
                          className={`${styles.statusBtn} ${box.active ? styles.statusActive : styles.statusDisabled}`}
                          title={`Click to ${box.active ? "disable" : "enable"}`}
                        >
                          <span
                            className={styles.statusDot}
                            style={{ background: box.active ? "#16a34a" : "#9ca3af" }}
                          />
                          {box.active ? "Active" : "Disabled"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => handleOpenEdit(box)}
                            title="Edit"
                            aria-label={`Edit ${box.name}`}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => setConfirmDeleteId(box.id)}
                            title="Delete"
                            aria-label={`Delete ${box.name}`}
                            style={{ color: "#dc2626" }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact List (<640px) */}
            <div className={styles.mobileList}>
              {boxes.map((box) => (
                <div key={box.id} className={styles.mobileRow}>
                  <div className={styles.mobileRowLeft}>
                    <strong style={{ fontSize: 14, color: "var(--ink)" }}>{box.name}</strong>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {box.length}&times;{box.breadth}&times;{box.height} cm · Max {box.maxCapacityKg} kg
                    </div>
                  </div>
                  <div className={styles.mobileRowRight}>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(box)}
                      className={`${styles.statusBtn} ${box.active ? styles.statusActive : styles.statusDisabled}`}
                    >
                      <span
                        className={styles.statusDot}
                        style={{ background: box.active ? "#16a34a" : "#9ca3af" }}
                      />
                      {box.active ? "Active" : "Off"}
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => handleOpenEdit(box)}
                      aria-label="Edit"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      style={{ color: "#dc2626" }}
                      onClick={() => setConfirmDeleteId(box.id)}
                      aria-label="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Collapsible Test Tool (kept clean and collapsed by default) */}
        <button
          type="button"
          className={styles.simulatorToggle}
          onClick={() => setShowSimulator(!showSimulator)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            Test Box Allocation &amp; Live Rates
          </span>
          <span style={{ fontSize: 12, color: "#6b7280", display: "inline-flex", alignItems: "center", gap: 4 }}>
            {showSimulator ? "Close Test Tool" : "Open Test Tool"}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ transform: showSimulator ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </button>

        {showSimulator && (
          <div className={styles.simulatorBody}>
            <form onSubmit={handleRunSimulator} className={styles.simulatorForm}>
              <div className={styles.simulatorGroup}>
                <label>Test Snack Weight (KG)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  value={simWeight}
                  onChange={(e) => setSimWeight(e.target.value)}
                  placeholder="e.g. 0.60"
                />
              </div>
              <div className={styles.simulatorGroup}>
                <label>Destination PIN Code</label>
                <input
                  type="text"
                  pattern="[0-9]{6}"
                  value={simPincode}
                  onChange={(e) => setSimPincode(e.target.value)}
                  placeholder="e.g. 600001"
                />
              </div>
              <button
                type="submit"
                disabled={simLoading}
                className={styles.primaryButton}
                style={{ padding: "9px 16px" }}
              >
                {simLoading ? "Testing…" : "Test Allocation →"}
              </button>
            </form>

            {simError && (
              <div style={{ marginTop: 10, background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
                {simError}
              </div>
            )}

            {simResult && (
              <div style={{ marginTop: 14 }}>
                <div className={styles.simulatorCards}>
                  <div className={`${styles.simulatorCard} ${styles.simulatorCardMatched}`}>
                    <span style={{ display: "block", fontSize: 10.5, textTransform: "uppercase", color: "#166534", fontWeight: 700 }}>
                      Matched Box
                    </span>
                    <strong style={{ fontSize: 14, color: "#14532d" }}>
                      {simResult.packaging.boxName}
                    </strong>
                    <div style={{ fontSize: 11.5, color: "#15803d", marginTop: 2 }}>
                      {simResult.packaging.length} &times; {simResult.packaging.breadth} &times; {simResult.packaging.height} cm
                    </div>
                  </div>

                  <div className={styles.simulatorCard}>
                    <span style={{ display: "block", fontSize: 10.5, textTransform: "uppercase", color: "#6b7280", fontWeight: 700 }}>
                      Total Billed Weight
                    </span>
                    <strong style={{ fontSize: 14, color: "var(--ink)" }}>
                      {simResult.packaging.totalWeightKg} kg
                    </strong>
                    <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 2 }}>
                      Snacks: {simResult.packaging.snackWeightKg} kg + Tare: {simResult.packaging.tareWeightKg} kg
                    </div>
                  </div>

                  <div className={styles.simulatorCard}>
                    <span style={{ display: "block", fontSize: 10.5, textTransform: "uppercase", color: "#6b7280", fontWeight: 700 }}>
                      Volumetric Weight
                    </span>
                    <strong style={{ fontSize: 14, color: "var(--ink)" }}>
                      {simResult.packaging.volumetricWeightKg} kg
                    </strong>
                  </div>
                </div>

                {simResult.couriers && simResult.couriers.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b7280", fontWeight: 700 }}>
                      Available Courier Rates ({simResult.couriers.length} options)
                    </span>
                    <div className={styles.courierGrid}>
                      {simResult.couriers.map((c) => (
                        <div key={c.id} className={styles.courierItem}>
                          <div>
                            <strong style={{ fontSize: 12.5, color: "var(--ink)" }}>{c.name}</strong>
                            {c.etd && <div style={{ fontSize: 11, color: "#6b7280" }}>{c.etd}</div>}
                          </div>
                          <strong style={{ fontSize: 13, color: "var(--terracotta)" }}>
                            {fmt.format(c.rate)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editingBox ? "Edit Box" : "Add Packaging Box"}</h2>
                <p>Configure outer dimensions and maximum snack capacity</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleCloseModal}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {error && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                  {error}
                </div>
              )}

              {/* Box Name */}
              <div className={styles.field}>
                <label>Box Name / Label *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Snack Box"
                  autoFocus
                />
              </div>

              {/* Outer Dimensions */}
              <div className={styles.field}>
                <label>Box Outer Dimensions (CM) *</label>
                <div className={styles.dimensionsRow}>
                  <div>
                    <span style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 2 }}>Length</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 2 }}>Breadth</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={breadth}
                      onChange={(e) => setBreadth(e.target.value)}
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 2 }}>Height</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: "#6b7280", marginTop: 4 }}>
                  Volumetric Weight: <strong>{volumetricKg} kg</strong> (formula: L &times; B &times; H / 5000)
                </span>
              </div>

              {/* Box Tare Weight and Max Capacity */}
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Tare Weight (KG) *</label>
                  <input
                    type="number"
                    step="0.005"
                    min="0.005"
                    required
                    value={boxWeightKg}
                    onChange={(e) => setBoxWeightKg(e.target.value)}
                    placeholder="0.120"
                  />
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    e.g. 0.12 = 120g
                  </span>
                </div>
                <div className={styles.field}>
                  <label>Max Snack Load (KG) *</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    required
                    value={maxCapacityKg}
                    onChange={(e) => setMaxCapacityKg(e.target.value)}
                    placeholder="1.200"
                  />
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    Max snack capacity
                  </span>
                </div>
              </div>

              {/* Display Sort Order & Active */}
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Sort Order</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className={styles.field} style={{ justifyContent: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 16 }}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      style={{ width: 17, height: 17, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Active</span>
                  </label>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={loading}
                >
                  {loading ? "Saving…" : editingBox ? "Update Box" : "Create Box"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId !== null && (
        <ConfirmDialog
          message="Are you sure you want to delete this packaging box? Orders already placed will retain their historical record."
          confirmLabel="Delete Box"
          danger
          onConfirm={() => {
            if (confirmDeleteId !== null) handleDelete(confirmDeleteId);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
