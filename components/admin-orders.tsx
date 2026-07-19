"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-orders.module.css";

type AdminOrder = { id: number; orderNumber: string; customerName: string; phone: string; email: string | null; address: string; city: string; state: string; pincode: string; total: number; paymentStatus: string; orderStatus: string; shippingStatus: string; shipmentId: string | null; awbCode: string | null; createdAt: string };

type Status = "all" | "placed" | "packed" | "shipped" | "delivered" | "cancelled";
const statuses: Status[] = ["all", "placed", "packed", "shipped", "delivered", "cancelled"];
const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function AdminOrders({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status>("all");
  const filtered = useMemo(() => orders.filter((order) => (filter === "all" || order.orderStatus === filter) && [order.orderNumber, order.customerName, order.phone, order.city, order.pincode].join(" ").toLowerCase().includes(query.trim().toLowerCase())), [filter, orders, query]);
  const paid = orders.filter((order) => order.paymentStatus === "paid");
  const pending = orders.filter((order) => order.orderStatus === "placed").length;
  const dispatched = orders.filter((order) => order.orderStatus === "shipped").length;
  const revenue = paid.reduce((sum, order) => sum + order.total, 0);

  async function setStatus(id: number, orderStatus: string) {
    setBusy(id); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderStatus }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update order.");
      setMessage("Order status updated."); router.refresh();
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to update order."); } finally { setBusy(null); }
  }

