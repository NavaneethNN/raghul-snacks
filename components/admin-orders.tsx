"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminOrder = { id: number; orderNumber: string; customerName: string; phone: string; address: string; total: number; paymentStatus: string; orderStatus: string; createdAt: string };

export function AdminOrders({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  async function setStatus(id: number, orderStatus: string) {
    setBusy(id);
    await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderStatus }) });
    setBusy(null); router.refresh();
  }
  async function signOut() { await fetch("/api/admin/session", { method: "DELETE" }); router.replace("/admin/login"); router.refresh(); }
  if (!orders.length) return <div className="empty-state"><p>No paid orders have been received yet.</p><button className="button button-dark" onClick={signOut}>Sign out</button></div>;
  return <div className="admin-orders"><div className="admin-actions"><p>{orders.length} recent orders</p><button className="button button-light" onClick={signOut}>Sign out</button></div>{orders.map((order) => <article className="admin-order" key={order.id}><div><strong>{order.orderNumber}</strong><p>{order.customerName} · {order.phone}</p><p>{order.address}</p></div><div><strong>₹{order.total}</strong><p>{new Date(order.createdAt).toLocaleString("en-IN")}</p></div><label>Status<select value={order.orderStatus} disabled={busy === order.id} onChange={(event) => setStatus(order.id, event.target.value)}><option value="placed">Placed</option><option value="packed">Packed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label></article>)}</div>;
}
