"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import { useRouter } from "next/navigation";
import { parseWeightToKg, calculatePackagingBufferKg } from "@/lib/catalog";
import { getCourierTrackingUrl } from "@/lib/shipping-utils";
import styles from "./admin-orders.module.css";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  weight?: string | null;
  approxWeight?: string | null;
  productId?: number | null;
  variantId?: number | null;
};

type AdminOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  total: number;
  shippingActual?: number;
  shippingExtra?: number;
  paymentStatus: string;
  paymentMethod: string | null;
  orderStatus: string;
  shippingStatus: string;
  shipmentId: string | null;
  awbCode: string | null;
  billedWeight?: number | null;
  packageLength?: number | null;
  packageBreadth?: number | null;
  packageHeight?: number | null;
  packageBoxName?: string | null;
  orderSource?: string | null;
  createdAt: string;
  items: OrderItem[];
};

type Status = "all" | "placed" | "packed" | "dispatched" | "delivered" | "cancelled";
const statuses: Status[] = ["all", "placed", "packed", "dispatched", "delivered", "cancelled"];

const allowedTransitions: Record<string, string[]> = {
  placed:     ["packed", "cancelled"],
  packed:     ["placed", "dispatched", "cancelled"],
  dispatched: ["packed", "placed", "delivered", "cancelled"],
  delivered:  [],
  cancelled:  ["placed"], // allow admin to revert accidental cancellation
  shipped:    ["delivered"],
  preparing:  ["dispatched", "cancelled"],
};

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const fmtWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0, minimumFractionDigits: 0 });
const paymentLabels: Record<string, string> = {
  upi: "UPI", card: "Credit / Debit Card", netbanking: "Net Banking",
  wallet: "Wallet", emi: "EMI", online: "Online Payment", cod: "Cash on Delivery",
};
const statusLabels: Record<string, string> = {
  placed: "Order Placed", packed: "Packed", dispatched: "Dispatched",
  delivered: "Delivered", cancelled: "Cancelled",
};

function computeOrderWeightKg(items: OrderItem[]): number {
  if (!items || items.length === 0) return 0.5;
  const sumKg = items.reduce((sum, item) => {
    const raw = item.approxWeight || item.weight;
    const w = raw ? parseWeightToKg(raw) : 0.25;
    return sum + w * item.quantity;
  }, 0);
  const bufferKg = calculatePackagingBufferKg(sumKg);
  return Math.round((sumKg + bufferKg) * 100) / 100; // dynamic packaging parcel buffer
}

type LiveCourier = {
  id: number;
  name: string;
  rate: number;
  etd: string | null;
  rating?: number | string | null;
  isCheapest: boolean;
  isFastest: boolean;
  minWeight?: number;
  chargeWeight?: number;
  billWeight?: string;
};

function inferStateFromPincode(pincode: string): string | null {
  const prefix = parseInt(pincode.slice(0, 2), 10);
  if (prefix >= 60 && prefix <= 64) return "Tamil Nadu";
  if (prefix >= 67 && prefix <= 69) return "Kerala";
  if (prefix >= 56 && prefix <= 59) return "Karnataka";
  if (prefix >= 50 && prefix <= 53) return "Andhra Pradesh";
  if (prefix >= 40 && prefix <= 44) return "Maharashtra";
  if (prefix >= 36 && prefix <= 39) return "Gujarat";
  if (prefix >= 30 && prefix <= 34) return "Rajasthan";
  if (prefix >= 20 && prefix <= 28) return "Uttar Pradesh";
  if (prefix >= 14 && prefix <= 16) return "Punjab";
  if (prefix >= 12 && prefix <= 13) return "Haryana";
  if (prefix === 11) return "Delhi";
  if (prefix >= 70 && prefix <= 74) return "West Bengal";
  if (prefix >= 75 && prefix <= 77) return "Odisha";
  if (prefix >= 80 && prefix <= 85) return "Bihar";
  if (prefix >= 45 && prefix <= 49) return "Madhya Pradesh";
  return null;
}

export type CreateOrderItem = {
  id: string;
  name: string;
  quantity: number | string;
  totalPrice: number | string;
  weight?: string;
  productId?: number | null;
  variantId?: number | null;
};

export function AdminOrders({
  orders,
}: {
  orders: AdminOrder[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, { ok: boolean; msg: string }>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status>("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Book Courier Modal state
  const [bookingOrder, setBookingOrder] = useState<AdminOrder | null>(null);
  const [bookingWeight, setBookingWeight] = useState("");
  const [bookingLength, setBookingLength] = useState("15");
  const [bookingBreadth, setBookingBreadth] = useState("15");
  const [bookingHeight, setBookingHeight] = useState("10");
  const [selectedBoxName, setSelectedBoxName] = useState("");
  const [bookingProvider, setBookingProvider] = useState<"shiprocket" | "manual">("shiprocket");
  const [bookingCourierName, setBookingCourierName] = useState("");
  const [bookingAwbCode, setBookingAwbCode] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [availableBoxes, setAvailableBoxes] = useState<
    Array<{ id: number; name: string; length: number; breadth: number; height: number; boxWeightKg: number; maxCapacityKg: number }>
  >([]);

  // Live courier rates state inside modal
  const [liveCouriers, setLiveCouriers] = useState<LiveCourier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [selectedCourierName, setSelectedCourierName] = useState<string>("");
  const [fetchingRates, setFetchingRates] = useState(false);
  const [fetchRatesError, setFetchRatesError] = useState("");

  // Shiprocket wallet balance state
  const [wallet, setWallet] = useState<{ configured: boolean; balance: number; currency: string; error?: string } | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const fetchWallet = useCallback(() => {
    setWalletLoading(true);
    fetch("/api/admin/shipping/wallet")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setWallet(d))
      .catch(() => {})
      .finally(() => setWalletLoading(false));
  }, []);

  useEffect(() => {
    fetchWallet();
    fetch("/api/admin/packaging")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableBoxes(data.filter((b: any) => b.active));
        }
      })
      .catch(() => {});
  }, [fetchWallet]);

  // New Manual / Offline / WhatsApp Order modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSource, setCreateSource] = useState<"whatsapp" | "instagram" | "offline">("whatsapp");
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createCity, setCreateCity] = useState("");
  const [createState, setCreateState] = useState("");
  const [createPincode, setCreatePincode] = useState("");

  // Product items list (Name, Quantity or Weight, Total Price)
  const [createItems, setCreateItems] = useState<CreateOrderItem[]>([
    { id: "item-1", name: "", quantity: 1, totalPrice: "" },
  ]);
  const [createSnackWeight, setCreateSnackWeight] = useState("");

  // Calculate packaging box buffer based on the overall snack weight entered by admin
  const packagingBufferKg = useMemo(() => {
    const sw = parseFloat(createSnackWeight);
    if (isNaN(sw) || sw <= 0) return 0;
    return calculatePackagingBufferKg(sw);
  }, [createSnackWeight]);

  // Final total parcel weight (overall snacks weight + carton packaging buffer)
  const finalTotalWeightKg = useMemo(() => {
    const sw = parseFloat(createSnackWeight);
    if (isNaN(sw) || sw <= 0) return 0;
    return Math.round((sw + packagingBufferKg) * 100) / 100;
  }, [createSnackWeight, packagingBufferKg]);

  const [createPaymentMethod, setCreatePaymentMethod] = useState("upi");
  const [createPaymentStatus, setCreatePaymentStatus] = useState<"paid" | "pending">("paid");
  const [createBookCourierNow, setCreateBookCourierNow] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createRates, setCreateRates] = useState<LiveCourier[]>([]);
  const [createRatesLoading, setCreateRatesLoading] = useState(false);
  const [createSelectedCourierId, setCreateSelectedCourierId] = useState<number | null>(null);
  const [createSelectedCourierName, setCreateSelectedCourierName] = useState<string>("");
  const [createShippingCharge, setCreateShippingCharge] = useState<number>(0);
  const [createdResult, setCreatedResult] = useState<{
    orderNumber: string;
    orderId: number;
    customerName: string;
    phone: string;
    total: number;
    subtotal: number;
    shippingCharge: number;
    awbCode?: string | null;
    invoiceUrl: string;
    labelUrl?: string | null;
  } | null>(null);

  // Auto-calculate snacks subtotal directly from each item's total price
  const itemsSubtotal = useMemo(() => {
    return createItems.reduce((acc, it) => {
      const p = Math.max(0, Number(it.totalPrice) || 0);
      return acc + p;
    }, 0);
  }, [createItems]);

  function handleAddItem() {
    setCreateItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "",
        quantity: 1,
        totalPrice: "",
      },
    ]);
  }

  function handleRemoveItem(index: number) {
    if (createItems.length <= 1) return;
    setCreateItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpdateItem(index: number, field: keyof CreateOrderItem, value: any) {
    setCreateItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function resetCreateForm() {
    setCreateSource("whatsapp");
    setCreateName("");
    setCreatePhone("");
    setCreateEmail("");
    setCreateAddress("");
    setCreateCity("");
    setCreateState("");
    setCreatePincode("");
    setCreateItems([{ id: "item-1", name: "", quantity: 1, totalPrice: "" }]);
    setCreateSnackWeight("");
    setCreateShippingCharge(0);
    setCreateRates([]);
    setCreateBookCourierNow(true);
    setCreatedResult(null);
    setCreateError("");
  }

  // Auto-fetch courier rates when PIN code or Total Package Weight changes
  useEffect(() => {
    if (!/^\d{6}$/.test(createPincode.trim())) {
      setCreateRates([]);
      setCreateShippingCharge(0);
      return;
    }
    if (finalTotalWeightKg <= 0) {
      setCreateRates([]);
      setCreateShippingCharge(0);
      return;
    }

    const timer = setTimeout(async () => {
      setCreateRatesLoading(true);
      const w = finalTotalWeightKg;
      const length = w <= 0.4 ? 20 : w <= 1.5 ? 22 : w <= 3.0 ? 28 : 35;
      const breadth = w <= 0.4 ? 15 : w <= 1.5 ? 16 : w <= 3.0 ? 22 : 28;
      const height = w <= 0.4 ? 5 : w <= 1.5 ? 10 : w <= 3.0 ? 14 : 20;

      try {
        const res = await fetch("/api/admin/shipping/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pincode: createPincode.trim(),
            weight: w,
            length,
            breadth,
            height,
            isFinalWeight: true,
          }),
        });
        const data = await res.json();
        if (data.couriers && Array.isArray(data.couriers) && data.couriers.length > 0) {
          setCreateRates(data.couriers);
          const cheapest = data.couriers.find((c: LiveCourier) => c.isCheapest) || data.couriers[0];
          setCreateSelectedCourierId(cheapest.id);
          setCreateSelectedCourierName(cheapest.name);
          setCreateShippingCharge(cheapest.rate + 5);
        } else {
          setCreateRates([]);
          setCreateShippingCharge(0);
        }
      } catch {
        setCreateRates([]);
      } finally {
        setCreateRatesLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [createPincode, finalTotalWeightKg]);

  function handleCreatePincodeChange(pincode: string) {
    const clean = pincode.replace(/\D/g, "").slice(0, 6);
    setCreatePincode(clean);
    if (clean.length === 6 && !createState) {
      const detected = inferStateFromPincode(clean);
      if (detected) setCreateState(detected);
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");

    if (!createName.trim()) {
      setCreateError("Customer name is required.");
      return;
    }
    const cleanPhone = createPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setCreateError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!createAddress.trim()) {
      setCreateError("Please enter the delivery address.");
      return;
    }
    if (!/^\d{6}$/.test(createPincode.trim())) {
      setCreateError("Please enter a valid 6-digit PIN code.");
      return;
    }

    const validItems = createItems.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      setCreateError("Please enter at least one snack item with product name, quantity, and total price.");
      return;
    }

    const sw = parseFloat(createSnackWeight);
    if (isNaN(sw) || sw <= 0) {
      setCreateError("Please enter the overall order weight in kg.");
      return;
    }

    const finalW = finalTotalWeightKg > 0 ? finalTotalWeightKg : sw;

    setCreateSubmitting(true);
    try {
      const length = finalW <= 0.4 ? 20 : finalW <= 1.5 ? 22 : finalW <= 3.0 ? 28 : 35;
      const breadth = finalW <= 0.4 ? 15 : finalW <= 1.5 ? 16 : finalW <= 3.0 ? 22 : 28;
      const height = finalW <= 0.4 ? 5 : finalW <= 1.5 ? 10 : finalW <= 3.0 ? 14 : 20;
      const boxName = finalW <= 0.35 ? "Pouch / Small Mailer" : finalW <= 1.2 ? "Small Carton Box" : finalW <= 2.5 ? "Medium Carton Box" : "Master Carton Box";

      const res = await fetch("/api/admin/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: createName.trim(),
          phone: cleanPhone,
          email: createEmail.trim() || undefined,
          address: createAddress.trim(),
          city: createCity.trim() || "City",
          state: createState.trim() || "Tamil Nadu",
          pincode: createPincode.trim(),
          orderSource: createSource,
          paymentMethod: createPaymentMethod,
          paymentStatus: createPaymentStatus,
          items: validItems.map((it) => {
            const rawQty = String(it.quantity || "1").trim();
            const isWeightOnly = /^\d+(?:\.\d+)?\s*(?:g|gm|gms|gram|grams|kg|kilogram|kgs)\b/i.test(rawQty);
            const numMatch = rawQty.match(/^(\d+)/);

            let qty = 1;
            let weightStr: string | null = null;

            if (isWeightOnly) {
              qty = 1;
              weightStr = rawQty;
            } else if (numMatch) {
              qty = Math.max(1, parseInt(numMatch[1], 10));
              const weightMatch = rawQty.match(/\b\d+(?:\.\d+)?\s*(?:g|gm|gms|gram|grams|kg|kilogram|kgs)\b/i);
              if (weightMatch) weightStr = weightMatch[0];
            }

            if (!weightStr) {
              const nameWeight = it.name.match(/\b\d+(?:\.\d+)?\s*(?:g|gm|gms|gram|grams|kg|kilogram|kgs)\b/i);
              if (nameWeight) weightStr = nameWeight[0];
            }

            const tot = Math.max(0, Number(it.totalPrice) || 0);
            const unitPrice = Math.round((tot / qty) * 100) / 100;
            return {
              name: it.name.trim(),
              quantity: qty,
              price: unitPrice,
              weight: weightStr,
              approxWeight: weightStr,
              productId: null,
              variantId: null,
            };
          }),
          orderAmount: itemsSubtotal,
          finalWeightKg: finalW,
          length,
          breadth,
          height,
          boxName,
          courierId: createSelectedCourierId,
          courierName: createSelectedCourierName,
          shippingCharge: createShippingCharge,
          bookCourierNow: createBookCourierNow,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      const createdOrderNumber = data.orderNumber || data.order?.orderNumber || "RS";
      const createdOrderId = data.orderId || data.order?.id;
      showToast(`Order ${createdOrderNumber} created successfully!`);
      setCreatedResult({
        orderNumber: createdOrderNumber,
        orderId: createdOrderId,
        customerName: data.customerName || createName.trim(),
        phone: data.phone || cleanPhone,
        total: data.total || itemsSubtotal + createShippingCharge,
        subtotal: data.subtotal || itemsSubtotal,
        shippingCharge: data.shippingCharge ?? createShippingCharge,
        awbCode: data.awbCode || null,
        invoiceUrl: data.invoiceUrl || `/api/orders/${createdOrderNumber}/invoice`,
        labelUrl: data.labelUrl || (data.awbCode ? `/api/admin/orders/${createdOrderId}/label` : null),
      });
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create order.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function loadLiveCourierRates(pincode: string, weightKg: number, l: number, b: number, h: number) {
    if (!pincode || weightKg <= 0) return;
    setFetchingRates(true);
    setFetchRatesError("");
    try {
      const res = await fetch("/api/admin/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincode,
          weight: weightKg,
          length: l,
          breadth: b,
          height: h,
          isFinalWeight: true,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.couriers) && data.couriers.length > 0) {
        setLiveCouriers(data.couriers);
        const cheapest = data.couriers.find((c: LiveCourier) => c.isCheapest) || data.couriers[0];
        setSelectedCourierId(cheapest.id);
        setSelectedCourierName(cheapest.name);
      } else {
        setLiveCouriers([]);
        if (data.error) setFetchRatesError(data.error);
      }
    } catch {
      setFetchRatesError("Could not connect to courier rating service.");
    } finally {
      setFetchingRates(false);
    }
  }

  function openBookingModal(order: AdminOrder) {
    const defaultWeight = order.billedWeight ?? computeOrderWeightKg(order.items);
    const l = order.packageLength ? order.packageLength.toString() : "20";
    const b = order.packageBreadth ? order.packageBreadth.toString() : "15";
    const h = order.packageHeight ? order.packageHeight.toString() : "10";
    setBookingOrder(order);
    setBookingWeight(defaultWeight.toString());
    setBookingLength(l);
    setBookingBreadth(b);
    setBookingHeight(h);
    setSelectedBoxName(order.packageBoxName || "");
    setBookingProvider("shiprocket");
    setBookingCourierName(order.shipmentId || "");
    setBookingAwbCode(order.awbCode || "");
    setBookingError("");
    setLiveCouriers([]);
    setSelectedCourierId(null);
    setSelectedCourierName("");

    // Automatically check live courier rates for destination PIN
    loadLiveCourierRates(
      order.pincode,
      defaultWeight,
      parseFloat(l) || 20,
      parseFloat(b) || 15,
      parseFloat(h) || 10
    );
  }

  function handleSelectBoxPreset(boxId: number) {
    const found = availableBoxes.find((b) => b.id === boxId);
    if (!found) return;
    setBookingLength(found.length.toString());
    setBookingBreadth(found.breadth.toString());
    setBookingHeight(found.height.toString());
    setSelectedBoxName(found.name);
    if (bookingOrder) {
      const netSnackKg = bookingOrder.items.reduce((sum, item) => {
        const raw = item.approxWeight || item.weight;
        const w = raw ? parseWeightToKg(raw) : 0.25;
        return sum + w * item.quantity;
      }, 0);
      const newTotal = Math.max(0.15, Math.round((netSnackKg + found.boxWeightKg) * 1000) / 1000);
      setBookingWeight(newTotal.toString());
      loadLiveCourierRates(bookingOrder.pincode, newTotal, found.length, found.breadth, found.height);
    }
  }

  async function handleBookCourier(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingOrder) return;
    const w = parseFloat(bookingWeight);
    if (isNaN(w) || w <= 0) {
      setBookingError("Please enter a valid weight in kg (e.g. 0.65)");
      return;
    }

    if (bookingProvider === "shiprocket") {
      const selectedCourier = liveCouriers.find((c) => c.id === selectedCourierId);
      const courierRate = selectedCourier?.rate ?? 0;
      if (wallet && wallet.configured && courierRate > 0 && wallet.balance < courierRate) {
        setBookingError(
          `Insufficient Shiprocket wallet balance (₹${wallet.balance.toFixed(2)}). This courier requires ₹${courierRate.toFixed(2)}. Please recharge your wallet before booking, or switch to Manual Booking.`
        );
        return;
      }
    }

    setBookingLoading(true);
    setBookingError("");
    try {
      const res = await fetch(`/api/admin/orders/${bookingOrder.id}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: w,
          length: parseFloat(bookingLength) || 15,
          breadth: parseFloat(bookingBreadth) || 15,
          height: parseFloat(bookingHeight) || 10,
          boxName: selectedBoxName || undefined,
          provider: bookingProvider,
          courierId: bookingProvider === "shiprocket" ? selectedCourierId ?? undefined : undefined,
          courierName: bookingProvider === "shiprocket" ? selectedCourierName || undefined : bookingCourierName.trim() || undefined,
          awbCode: bookingProvider === "manual" ? bookingAwbCode.trim() || undefined : undefined,
        }),
      });
      const data = await res.json() as { success?: boolean; awbCode?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Courier booking failed");

      setFeedback((prev) => ({
        ...prev,
        [bookingOrder.id]: {
          ok: true,
          msg: data.awbCode
            ? `Courier Booked! AWB: ${data.awbCode}`
            : "Shipment registered. Awaiting courier AWB.",
        },
      }));
      setBookingOrder(null);
      router.refresh();
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to book courier");
    } finally {
      setBookingLoading(false);
    }
  }

  async function handleCancelCourierBooking(order: AdminOrder) {
    const confirmMsg = order.awbCode
      ? `Are you sure you want to cancel courier booking for order #${order.orderNumber} (AWB: ${order.awbCode})?\n\nThis will void the AWB on Shiprocket, refund courier charges back to your Shiprocket wallet, and return the order to 'Packed' state so you can re-book.`
      : `Are you sure you want to cancel courier booking for order #${order.orderNumber}?`;
    if (!window.confirm(confirmMsg)) return;

    setBusy(order.id);
    setFeedback((prev) => ({ ...prev, [order.id]: { ok: true, msg: "Cancelling courier booking..." } }));
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to cancel shipment");

      setFeedback((prev) => ({
        ...prev,
        [order.id]: { ok: true, msg: data.message || "Courier booking cancelled. Order reset to Packed." },
      }));
      router.refresh();
      fetchWallet();
    } catch (err) {
      setFeedback((prev) => ({
        ...prev,
        [order.id]: { ok: false, msg: err instanceof Error ? err.message : "Cancellation failed" },
      }));
    } finally {
      setBusy(null);
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (filter === "all" || o.orderStatus === filter) &&
          [o.orderNumber, o.customerName, o.phone, o.city, o.pincode, o.email ?? "", o.packageBoxName ?? "", o.awbCode ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase())
      ),
    [filter, orders, query]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) counts[o.orderStatus] = (counts[o.orderStatus] ?? 0) + 1;
    return counts;
  }, [orders]);

  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const pending = statusCounts["placed"] ?? 0;
  const packedCount = statusCounts["packed"] ?? 0;
  const dispatched = statusCounts["dispatched"] ?? 0;

  // Financial breakdown
  const totalRevenue = paid.reduce((s, o) => s + o.total, 0);
  const actualCourierTotal = paid.reduce((s, o) => s + (Number(o.shippingActual) || 0), 0);
  const platformExtraTotal = paid.reduce((s, o) => {
    const act = Number(o.shippingActual) || 0;
    const fee = act > 0 ? (o.shippingExtra !== undefined && o.shippingExtra !== null ? Number(o.shippingExtra) : 5) : (Number(o.shippingExtra) || 0);
    return s + fee;
  }, 0);
  const productRevenue = Math.max(0, totalRevenue - actualCourierTotal - platformExtraTotal);

  async function setStatus(id: number, orderStatus: string) {
    setBusy(id);
    setFeedback((prev) => ({ ...prev, [id]: { ok: true, msg: "" } }));
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus }),
      });
      const result = await res.json() as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Unable to update order.");
      setFeedback((prev) => ({ ...prev, [id]: { ok: true, msg: "Updated" } }));
      router.refresh();
    } catch (err) {
      setFeedback((prev) => ({ ...prev, [id]: { ok: false, msg: err instanceof Error ? err.message : "Error" } }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <p className={styles.eyebrow}>Operations &amp; Dispatch</p>
          <h1>Orders &amp; Dispatch</h1>
          <p>Manage fulfillment, warehouse packaging, and courier bookings</p>
        </div>
        <div className={styles.headerActions}>
          {/* Shiprocket Wallet Indicator & Quick Top-Up */}
          <div className={styles.walletBar}>
            <div className={styles.walletPill}>
              <span className={styles.walletIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
              </span>
              <div className={styles.walletMeta}>
                <small>Shiprocket Wallet</small>
                <strong>
                  {walletLoading ? (
                    "Checking…"
                  ) : wallet?.configured ? (
                    <span style={{ color: wallet.balance < 100 ? "#dc2626" : "#15803d" }}>
                      ₹{wallet.balance.toFixed(2)}
                      {wallet.balance < 100 && (
                        <span style={{ fontSize: 10, marginLeft: 5, background: "#fee2e2", color: "#991b1b", padding: "1px 5px", borderRadius: 4 }}>
                          Low
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={{ color: "#858c97" }}>Not Active</span>
                  )}
                </strong>
              </div>
              <button
                type="button"
                onClick={fetchWallet}
                title="Refresh wallet balance"
                className={styles.walletRefresh}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            </div>
            <a
              href="https://app.shiprocket.in/billing/recharge"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.rechargeBtn}
              title="Recharge Shiprocket wallet (Opens Shiprocket in a new tab)"
            >
              <span>+ Recharge</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          <div className={styles.headerBtnGroup}>
            {/* New Order Button for WhatsApp/Instagram/Offline */}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={styles.createOrderBtn}
              title="Create an order received through WhatsApp, Instagram, or Offline"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Order</span>
              <span className={styles.channelBtnTag}>(WhatsApp / Insta)</span>
            </button>

            <div className={styles.headerBell}>
              <AdminHeaderActions />
            </div>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <section className={styles.metrics}>
        <div>
          <span>Product Sales</span>
          <strong>{fmtWhole.format(productRevenue)}</strong>
          <small>Net snacks value</small>
        </div>
        <div>
          <span>Courier Paid</span>
          <strong>{fmtWhole.format(actualCourierTotal)}</strong>
          <small>Actual courier costs</small>
        </div>
        <div>
          <span>Ready to Ship</span>
          <strong>{packedCount}</strong>
          <small>{pending} pending prep</small>
        </div>
        <div>
          <span>Dispatched</span>
          <strong>{dispatched}</strong>
          <small>In transit across India</small>
        </div>
      </section>

      {/* Orders Section */}
      <section className={styles.workspace}>
        {/* Search and Filters */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarSearch}>
              <span className={styles.searchIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search order #, customer, phone, PIN, box, or AWB…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterDropdownWrap}>
              <select
                className={styles.filterDropdown}
                value={filter}
                onChange={(e) => setFilter(e.target.value as Status)}
                aria-label="Filter orders by status"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)} ({s === "all" ? orders.length : (statusCounts[s] ?? 0)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.filters}>
            {statuses.map((s) => (
              <button
                key={s}
                className={filter === s ? styles.activeFilter : ""}
                onClick={() => setFilter(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}{" "}
                <span>({s === "all" ? orders.length : (statusCounts[s] ?? 0)})</span>
              </button>
            ))}
          </div>
        </div>
        {!orders.length ? (
          <div className={styles.empty}>
            <h2>No paid orders yet.</h2>
            <p>Completed orders will appear here automatically.</p>
          </div>
        ) : !filtered.length ? (
          <div className={styles.empty}>
            <h2>No matching orders.</h2>
            <p>Try another status or search term.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((order) => {
              const isOpen = expanded.has(order.id);
              const fb = feedback[order.id];
              const isTerminal = order.orderStatus === "delivered";
              const actualCourier = Number(order.shippingActual) || 0;
              const platformFee = actualCourier > 0 ? (order.shippingExtra !== undefined && order.shippingExtra !== null ? Number(order.shippingExtra) : 5) : (Number(order.shippingExtra) || 0);
              const snackSubtotal = Math.max(0, order.total - actualCourier - platformFee);
              const isShiprocket = Boolean(
                order.shipmentId &&
                (/^\d+$/.test(order.shipmentId) || order.shipmentId.toLowerCase().includes("shiprocket"))
              );

              return (
                <article key={order.id} className={`${styles.order} ${isOpen ? styles.orderOpen : ""}`}>
                  {/* Collapsed summary row */}
                  <button
                    className={styles.orderSummary}
                    onClick={() => toggleExpand(order.id)}
                    aria-expanded={isOpen}
                  >
                    <div className={styles.summaryTopRow}>
                      <div className={styles.summaryLeft}>
                        <span className={styles.orderNumber}>{order.orderNumber}</span>
                        {order.orderSource && order.orderSource !== "website" && (
                          <span
                            className={`${styles.sourceBadge} ${
                              order.orderSource === "whatsapp"
                                ? styles.sourceWhatsapp
                                : order.orderSource === "instagram"
                                ? styles.sourceInstagram
                                : styles.sourceOffline
                            }`}
                          >
                            {order.orderSource}
                          </span>
                        )}
                      </div>

                      <div className={styles.summaryRight}>
                        <strong className={styles.total}>{fmt.format(order.total)}</strong>
                        <svg
                          className={`${styles.chevron} ${isOpen ? styles.chevronUp : ""}`}
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </div>

                    <div className={styles.summaryBottomRow}>
                      <div className={styles.customerSummaryName}>
                        <span className={styles.customerName}>{order.customerName}</span>
                        <span className={styles.customerMeta}>
                          · {order.city || "Direct"} · {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </span>
                      </div>

                      <div className={styles.summaryBadges}>
                        <span className={`${styles.badge} ${styles[order.orderStatus] ?? ""}`}>
                          {order.orderStatus}
                        </span>
                        <span className={styles.paid}>{order.paymentStatus}</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail panel */}
                  {isOpen && (
                    <div className={styles.orderDetail}>
                      {/* Financial Revenue Breakdown Card */}
                      <div className={styles.revenueBreakdownGrid}>
                        <div>
                          <span>Snacks Subtotal</span>
                          <strong>{fmt.format(snackSubtotal)}</strong>
                        </div>
                        <div>
                          <span>Courier (Actual)</span>
                          <strong>{fmt.format(actualCourier)}</strong>
                        </div>
                        <div>
                          <span>Platform Fee</span>
                          <strong>{fmt.format(platformFee)}</strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--terracotta)", fontWeight: 700 }}>Total Collected</span>
                          <strong style={{ color: "var(--terracotta)" }}>{fmt.format(order.total)}</strong>
                        </div>
                      </div>

                      {/* Items */}
                      <div className={styles.orderItems}>
                        <div className={styles.orderItemsHeader}>
                          <span>Order Items ({order.items?.length ?? 0})</span>
                          <div className={styles.orderItemActions}>
                            <a
                              href={`/api/orders/${order.orderNumber}/invoice`}
                              download={`Invoice-${order.orderNumber}.pdf`}
                              className={styles.invoiceBtn}
                              title="Download tax invoice PDF"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              Download Invoice
                            </a>
                            {order.awbCode && isShiprocket && (
                              <a
                                href={`/api/admin/orders/${order.id}/label`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.labelBtn}
                                title="Print thermal parcel shipping label (Required for Shiprocket pickup)"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <rect x="2" y="3" width="20" height="18" rx="2" />
                                  <line x1="8" y1="7" x2="16" y2="7" />
                                  <line x1="8" y1="11" x2="16" y2="11" />
                                  <line x1="8" y1="15" x2="12" y2="15" />
                                </svg>
                                Print Label
                              </a>
                            )}
                            {order.phone && (
                              <a
                                href={`https://wa.me/91${order.phone.replace(/^\+91/, "").replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Hello ${order.customerName}! Thank you for your order with Raghul Delights (${order.orderNumber}). Total: ₹${order.total}.${
                                    order.awbCode
                                      ? `\nYour parcel has been dispatched! Track here: https://raghuldelights.in/track?order=${order.orderNumber}`
                                      : `\nWe are preparing your fresh snacks parcel.`
                                  }`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.whatsappShareBtn}
                                title="Share order and tracking details with customer on WhatsApp"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92z" />
                                </svg>
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                        <ul className={styles.orderItemsList}>
                          {order.items?.length > 0
                            ? order.items.map((item) => {
                                const hasVariant = Boolean(
                                  item.weight &&
                                  item.weight.trim() !== "" &&
                                  item.weight !== "-" &&
                                  item.weight !== "—"
                                );
                                return (
                                  <li key={item.id} className={styles.orderItemRow}>
                                    <div className={styles.orderItemMain}>
                                      <strong className={styles.orderItemName}>{item.name}</strong>
                                      {hasVariant && (
                                        <span className={styles.itemVariantBadge} title="Product Variant">
                                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.variantTagIcon}>
                                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                                            <line x1="7" y1="7" x2="7.01" y2="7"/>
                                          </svg>
                                          <span className={styles.variantLabel}>Variant:</span>
                                          <strong>{item.weight}</strong>
                                        </span>
                                      )}
                                    </div>
                                    <div className={styles.orderItemMeta}>
                                      <span className={styles.orderItemQtyPrice}>
                                        <strong>{item.quantity}</strong> × {fmt.format(item.price)}
                                      </span>
                                      <span className={styles.orderItemLineTotal}>
                                        {fmt.format(item.quantity * item.price)}
                                      </span>
                                    </div>
                                  </li>
                                );
                              })
                            : <li><em>No items found</em></li>}
                        </ul>
                      </div>

                      {/* Details grid */}
                      <div className={styles.details}>
                        <div>
                          <span>Customer</span>
                          <strong>{order.customerName}</strong>
                          <a href={`tel:${order.phone}`}>{order.phone}</a>
                        </div>
                        <div>
                          <span>Delivery address</span>
                          <strong>{order.address}</strong>
                          <p>{order.city}, {order.state} · {order.pincode}</p>
                        </div>
                        <div>
                          <span>Shipment &amp; Courier</span>
                          <strong>{order.awbCode && order.awbCode.trim() !== "" ? order.awbCode : "AWB pending"}</strong>
                          <p>
                            {order.shipmentId
                              ? /^\d+$/.test(order.shipmentId)
                                ? `Shiprocket ID: ${order.shipmentId}`
                                : `Partner: ${order.shipmentId}`
                              : "Awaiting booking"}
                          </p>
                        </div>
                        <div>
                          <span>Packaging &amp; Weight</span>
                          <strong>{order.billedWeight ? `${order.billedWeight} kg billed` : "Auto-calculated"}</strong>
                          <p>{order.packageBoxName ? `${order.packageBoxName} (${order.packageLength ?? 20}×${order.packageBreadth ?? 15}×${order.packageHeight ?? 10} cm)` : "Standard Box"}</p>
                        </div>
                        <div>
                          <span>Payment mode</span>
                          <strong>{paymentLabels[order.paymentMethod ?? "online"] ?? (order.paymentMethod ?? "Online Payment")}</strong>
                        </div>
                      </div>

                      {/* Courier Booking & Dispatch Bar */}
                      {order.orderStatus === "packed" && (
                        order.shippingStatus === "created" && order.awbCode ? (
                          <div className={styles.courierBookedBar}>
                            <div className={styles.courierBookedText}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <span>Courier Booked: <strong>{order.awbCode}</strong> {order.shipmentId ? `(${order.shipmentId})` : ""}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              {isShiprocket && (
                                <a
                                  href={`/api/admin/orders/${order.id}/label`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.courierTrackBtn}
                                  style={{ background: "#166534", color: "#fff" }}
                                  title="Print thermal parcel shipping label (Required for Shiprocket pickup)"
                                >
                                  Print Label
                                </a>
                              )}
                              <a
                                href={getCourierTrackingUrl(order.shipmentId, order.awbCode)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.courierTrackBtn}
                              >
                                Track Shipment →
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCancelCourierBooking(order)}
                                disabled={busy === order.id}
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: "#b91c1c",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                                title="Cancel courier booking, refund Shiprocket wallet, and reset order to packed"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="15" y1="9" x2="9" y2="15" />
                                  <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                Cancel Booking
                              </button>
                            </div>
                          </div>
                        ) : order.shipmentId ? (
                          <div style={{
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: 8,
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 10,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <div>
                                <strong style={{ fontSize: 13, color: "#92400e" }}>Shipment Created on Shiprocket (ID: {order.shipmentId})</strong>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#78350f" }}>
                                  In Shiprocket queue (Status: NEW). Recharge wallet or click Ship Now on Shiprocket to assign AWB.
                                </p>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <a
                                href="https://app.shiprocket.in/seller/orders/new"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.bookCourierBtn}
                                style={{ padding: "6px 12px", fontSize: 12, textDecoration: "none" }}
                              >
                                Open Shiprocket →
                              </a>
                              <button
                                type="button"
                                className={styles.bookCourierBtn}
                                style={{ padding: "6px 12px", fontSize: 12, background: "#fff", color: "var(--ink)", border: "1px solid var(--line)" }}
                                onClick={() => openBookingModal(order)}
                              >
                                Re-book / Manual
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelCourierBooking(order)}
                                disabled={busy === order.id}
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: "#b91c1c",
                                  cursor: "pointer",
                                }}
                                title="Reset courier booking"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.bookCourierBar}>
                            <div className={styles.bookCourierInfo}>
                              <p className={styles.bookCourierTitle}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <rect x="1" y="3" width="15" height="13"/>
                                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                                  <circle cx="5.5" cy="18.5" r="2.5"/>
                                  <circle cx="18.5" cy="18.5" r="2.5"/>
                                </svg>
                                Order Packed — Courier Booking Ready
                              </p>
                              <p className={styles.bookCourierSubtitle}>
                                Compare live courier rates, select optimal partner, and generate shipping label.
                              </p>
                            </div>
                            <button
                              type="button"
                              className={styles.bookCourierBtn}
                              onClick={() => openBookingModal(order)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                              </svg>
                              Book Courier
                            </button>
                          </div>
                        )
                      )}

                      {/* If already dispatched and has tracking */}
                      {order.orderStatus === "dispatched" && (
                        order.awbCode ? (
                          <div className={styles.courierBookedBar} style={{ marginTop: 12 }}>
                            <div className={styles.courierBookedText}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <span>Dispatched via <strong>{order.shipmentId || "Courier"}</strong> · AWB: <strong>{order.awbCode}</strong></span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              {isShiprocket && (
                                <a
                                  href={`/api/admin/orders/${order.id}/label`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.courierTrackBtn}
                                  style={{ background: "#166534", color: "#fff", display: "inline-flex", alignItems: "center", gap: 4 }}
                                  title="Print thermal parcel shipping label (Required for Shiprocket pickup)"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <rect x="2" y="3" width="20" height="18" rx="2" />
                                    <line x1="8" y1="7" x2="16" y2="7" />
                                    <line x1="8" y1="11" x2="16" y2="11" />
                                    <line x1="8" y1="15" x2="12" y2="15" />
                                  </svg>
                                  Print Label
                                </a>
                              )}
                              <a
                                href={getCourierTrackingUrl(order.shipmentId, order.awbCode)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.courierTrackBtn}
                              >
                                Track Package →
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCancelCourierBooking(order)}
                                disabled={busy === order.id}
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: "#b91c1c",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                                title="Cancel courier booking, refund Shiprocket wallet, and reset order to packed"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="15" y1="9" x2="9" y2="15" />
                                  <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                Cancel Booking
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: 8,
                            padding: "10px 14px",
                            marginTop: 12,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <span style={{ fontSize: 13, color: "#92400e" }}>
                                Marked dispatched, but <strong>AWB tracking code is missing</strong> {order.shipmentId ? `(Shipment ID: ${order.shipmentId})` : ""}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <button
                                type="button"
                                className={styles.bookCourierBtn}
                                style={{ padding: "6px 12px", fontSize: 12 }}
                                onClick={() => openBookingModal(order)}
                              >
                                Assign AWB / Re-book
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelCourierBooking(order)}
                                disabled={busy === order.id}
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: "#b91c1c",
                                  cursor: "pointer",
                                }}
                                title="Reset order back to Packed"
                              >
                                Reset to Packed
                              </button>
                            </div>
                          </div>
                        )
                      )}

                      {/* Fulfilment footer */}
                      <div className={styles.orderFooter}>
                        <label>
                          Fulfilment status
                          {isTerminal ? (
                            <span className={styles.terminalStatus}>
                              {order.orderStatus === "delivered" ? "Delivered" : "Cancelled"}
                            </span>
                          ) : (
                            <select
                              value={order.orderStatus}
                              disabled={busy === order.id}
                              onChange={(e) => setStatus(order.id, e.target.value)}
                            >
                              <option value={order.orderStatus}>{statusLabels[order.orderStatus] ?? order.orderStatus}</option>
                              {allowedTransitions[order.orderStatus]?.map((s) => (
                                <option key={s} value={s}>{statusLabels[s] ?? s}</option>
                              ))}
                            </select>
                          )}
                        </label>
                        {busy === order.id && <span className={styles.savingSpinner}>Saving…</span>}
                        {fb?.msg && (
                          <span className={fb.ok ? styles.feedbackOk : styles.feedbackError}>{fb.msg}</span>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Book Courier Modal */}
      {bookingOrder && (() => {
        const selectedCourier = liveCouriers.find((c) => c.id === selectedCourierId) || liveCouriers[0];
        const selectedCourierRate = selectedCourier?.rate ?? 0;
        const isBalanceInsufficientForCourier = Boolean(
          bookingProvider === "shiprocket" &&
          wallet?.configured &&
          selectedCourierRate > 0 &&
          (wallet.balance ?? 0) < selectedCourierRate
        );

        return (
        <div className={styles.modalOverlay} onClick={() => setBookingOrder(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Book Courier</h2>
                <p>Order {bookingOrder.orderNumber} · Packed &amp; Ready</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setBookingOrder(null)}
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className={styles.modalOrderSummary}>
              <strong>Ship to:</strong> {bookingOrder.customerName} ({bookingOrder.phone})<br />
              {bookingOrder.address}, {bookingOrder.city}, {bookingOrder.state} – {bookingOrder.pincode}
            </div>

            <form onSubmit={handleBookCourier}>
              {availableBoxes.length > 0 && (
                <div className={styles.modalFieldGroup}>
                  <label>Packaging Box Preset</label>
                  <select
                    className={styles.modalInput}
                    onChange={(e) => {
                      const id = parseInt(e.target.value, 10);
                      if (id) handleSelectBoxPreset(id);
                    }}
                    defaultValue=""
                  >
                    <option value="">{bookingOrder.packageBoxName ? `Optimal: ${bookingOrder.packageBoxName}` : "Choose packaging box..."}</option>
                    {availableBoxes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.length} &times; {b.breadth} &times; {b.height} cm, tare {Math.round(b.boxWeightKg * 1000)}g)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.modalFieldGroup}>
                <label>Measured Scale Weight (KG)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  required
                  className={styles.modalInput}
                  value={bookingWeight}
                  onChange={(e) => setBookingWeight(e.target.value)}
                  placeholder="e.g. 0.65"
                  autoFocus
                />
                <p className={styles.modalHelpText}>
                  {bookingOrder.billedWeight
                    ? `Pre-filled with exact billed weight (${bookingOrder.billedWeight} kg) charged at checkout. Adjust if your kitchen scale differs.`
                    : "Pre-filled with calculated snack weight + box tare weight. Enter the exact weight shown on your scale."}
                </p>
              </div>

              <div className={styles.modalFieldGroup}>
                <label>Package Dimensions (CM)</label>
                <div className={styles.modalDimensionsRow}>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className={styles.modalInput}
                    value={bookingLength}
                    onChange={(e) => setBookingLength(e.target.value)}
                    placeholder="L (15)"
                    title="Length (cm)"
                  />
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className={styles.modalInput}
                    value={bookingBreadth}
                    onChange={(e) => setBookingBreadth(e.target.value)}
                    placeholder="B (15)"
                    title="Breadth (cm)"
                  />
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className={styles.modalInput}
                    value={bookingHeight}
                    onChange={(e) => setBookingHeight(e.target.value)}
                    placeholder="H (10)"
                    title="Height (cm)"
                  />
                </div>
              </div>

              <div className={styles.modalFieldGroup}>
                <label>Dispatch Mode</label>
                <select
                  className={styles.modalInput}
                  value={bookingProvider}
                  onChange={(e) => setBookingProvider(e.target.value as "shiprocket" | "manual")}
                >
                  <option value="shiprocket">Shiprocket API (Automated AWB &amp; Pickup)</option>
                  <option value="manual">Manual Booking / Local Courier (DTDC, ST, India Post)</option>
                </select>
              </div>

              {/* Shiprocket Live Courier Selection */}
              {bookingProvider === "shiprocket" && (
                <div className={styles.modalFieldGroup}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ margin: 0 }}>Available Courier Partners</label>
                    <button
                      type="button"
                      onClick={() => {
                        loadLiveCourierRates(
                          bookingOrder.pincode,
                          parseFloat(bookingWeight) || 0.5,
                          parseFloat(bookingLength) || 20,
                          parseFloat(bookingBreadth) || 15,
                          parseFloat(bookingHeight) || 10
                        );
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--terracotta)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {fetchingRates ? "Checking rates…" : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 4v6h-6" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                          Refresh Rates
                        </span>
                      )}
                    </button>
                  </div>

                  {fetchingRates ? (
                    <div style={{ padding: "14px", background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, color: "#6b7280", textAlign: "center" }}>
                      Fetching live courier rates for PIN {bookingOrder.pincode}…
                    </div>
                  ) : liveCouriers.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                      {liveCouriers.map((c) => {
                        const isSelected = selectedCourierId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCourierId(c.id);
                              setSelectedCourierName(c.name);
                            }}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "9px 12px",
                              border: isSelected ? "2px solid var(--terracotta)" : "1px solid var(--line)",
                              background: isSelected ? "rgba(196,79,49,0.05)" : "#fff",
                              borderRadius: 8,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <strong style={{ fontSize: 13, color: "var(--ink)" }}>{c.name}</strong>
                                {c.isCheapest && (
                                  <span style={{ fontSize: 10, background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                    CHEAPEST
                                  </span>
                                )}
                                {c.isFastest && (
                                  <span style={{ fontSize: 10, background: "#dbeafe", color: "#1e40af", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                    FASTEST
                                  </span>
                                )}
                                {c.billWeight && (
                                  <span style={{ fontSize: 10.5, background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                    {c.billWeight}
                                  </span>
                                )}
                              </div>
                              {c.etd && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Est. Delivery: {c.etd}</div>}
                            </div>
                            <strong style={{ fontSize: 14, color: isSelected ? "var(--terracotta)" : "var(--ink)" }}>
                              {fmt.format(c.rate)}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: "10px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#6b7280" }}>
                      {fetchRatesError || "Shiprocket will automatically allocate the most cost-effective active courier during booking."}
                    </div>
                  )}

                  {/* Real-time Shiprocket Wallet notice inside modal */}
                  {wallet && wallet.configured && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: isBalanceInsufficientForCourier
                          ? "#fef2f2"
                          : wallet.balance < 100
                          ? "#fffbeb"
                          : "#f0fdf4",
                        border: `1px solid ${
                          isBalanceInsufficientForCourier
                            ? "#fecaca"
                            : wallet.balance < 100
                            ? "#fde68a"
                            : "#bbf7d0"
                        }`,
                        borderRadius: 8,
                        fontSize: 12,
                        marginTop: 10,
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            color: isBalanceInsufficientForCourier
                              ? "#991b1b"
                              : wallet.balance < 100
                              ? "#92400e"
                              : "#166534",
                            fontWeight: 600,
                          }}
                        >
                          Shiprocket Wallet: <strong>₹{wallet.balance.toFixed(2)}</strong>
                        </span>
                        {isBalanceInsufficientForCourier ? (
                          <p style={{ margin: "3px 0 0", color: "#dc2626", fontWeight: 600, fontSize: 11.5 }}>
                            Cannot book: Wallet balance (₹{wallet.balance.toFixed(2)}) is less than courier fee (₹{selectedCourierRate.toFixed(2)}). Please recharge or switch to Manual Booking.
                          </p>
                        ) : wallet.balance < 100 ? (
                          <p style={{ margin: "3px 0 0", color: "#b45309", fontSize: 11.5 }}>
                            Warning: Low wallet balance (below ₹100). Please recharge soon.
                          </p>
                        ) : null}
                      </div>
                      <a
                        href="https://app.shiprocket.in/billing/recharge"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: isBalanceInsufficientForCourier ? "#fff" : "var(--terracotta)",
                          background: isBalanceInsufficientForCourier ? "#dc2626" : "rgba(201, 95, 59, 0.1)",
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 11.5,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>Recharge Wallet</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Dispatch Quick Presets */}
              {bookingProvider === "manual" && (
                <>
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: 6, marginBottom: 14, fontSize: 12.5, color: "#166534", lineHeight: 1.45 }}>
                    <strong>Manual Counter Booking:</strong> Hand over your parcel at the courier branch (ST Courier, DTDC, India Post, etc.) and enter the AWB / Tracking number from their physical booking receipt below. The order will be marked <em>Dispatched</em> with live tracking for the customer.
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label>Courier Service Name</label>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                      {["DTDC Express", "ST Courier", "India Post Speed Post", "Professional Courier"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBookingCourierName(preset)}
                          style={{
                            background: bookingCourierName === preset ? "var(--terracotta)" : "var(--cream)",
                            color: bookingCourierName === preset ? "#fff" : "var(--ink)",
                            border: "1px solid var(--line)",
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={bookingCourierName}
                      onChange={(e) => setBookingCourierName(e.target.value)}
                      placeholder="e.g. DTDC Express, ST Courier, India Post"
                      required
                    />
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label>Tracking / AWB Number</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={bookingAwbCode}
                      onChange={(e) => setBookingAwbCode(e.target.value)}
                      placeholder="e.g. D12345678 or ST987654"
                      required
                    />
                  </div>
                </>
              )}

              {bookingError && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>
                  {bookingError}
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setBookingOrder(null)}
                  disabled={bookingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalSubmitBtn}
                  disabled={bookingLoading || isBalanceInsufficientForCourier}
                  style={isBalanceInsufficientForCourier ? { background: "#9ca3af", cursor: "not-allowed", opacity: 0.75 } : undefined}
                  title={isBalanceInsufficientForCourier ? `Cannot book: Courier costs ₹${selectedCourierRate.toFixed(2)} but wallet balance is ₹${wallet?.balance.toFixed(2)}` : undefined}
                >
                  {bookingLoading
                    ? "Saving…"
                    : isBalanceInsufficientForCourier
                    ? "Insufficient Balance to Book"
                    : bookingProvider === "manual"
                    ? "Save Tracking & Mark Dispatched"
                    : "Confirm & Book Courier"}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* ── Create Order Modal (WhatsApp / Instagram / Offline) ── */}
      {showCreateModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (!createSubmitting) {
              setShowCreateModal(false);
              resetCreateForm();
            }
          }}
        >
          <div
            className={`${styles.modalCard} ${styles.createOrderModalCard}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 660, maxHeight: "90vh", overflowY: "auto", overflowX: "hidden" }}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 18, color: "var(--ink)" }}>
                  {createdResult ? "Order Confirmation" : "Create Order"}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                  {createdResult
                    ? "Order saved & courier booked. Print invoice or share details with customer."
                    : "Record an order received via WhatsApp, Instagram, or Offline and book courier"}
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => {
                  if (!createSubmitting) {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }
                }}
              >
                ✕
              </button>
            </div>

            {createdResult ? (
              <div style={{ textAlign: "center", padding: "16px 8px 8px" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#dcfce7",
                    color: "#15803d",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 20, color: "var(--ink)" }}>
                  Order Created Successfully!
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#6b7280" }}>
                  Order <strong style={{ color: "var(--ink)", fontFamily: "monospace" }}>#{createdResult.orderNumber}</strong> has been registered.
                </p>

                <div
                  style={{
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    textAlign: "left",
                    marginBottom: 18,
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#6b7280" }}>Customer:</span>
                    <strong style={{ color: "var(--ink)" }}>{createdResult.customerName} ({createdResult.phone})</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#6b7280" }}>Snacks Subtotal:</span>
                    <span>₹{createdResult.subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#6b7280" }}>Courier Shipping:</span>
                    <span>{createdResult.shippingCharge > 0 ? `₹${createdResult.shippingCharge.toFixed(2)}` : "Free"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px dashed var(--line)" }}>
                    <strong style={{ color: "var(--ink)" }}>Total Amount:</strong>
                    <strong style={{ color: "var(--terracotta)", fontSize: 15 }}>₹{createdResult.total.toFixed(2)}</strong>
                  </div>
                  {createdResult.awbCode && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 8,
                        padding: "6px 10px",
                        background: "#f0fdf4",
                        borderRadius: 6,
                        color: "#166534",
                        fontSize: 12.5,
                      }}
                    >
                      <span>Shiprocket AWB:</span>
                      <strong>{createdResult.awbCode}</strong>
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                      href={createdResult.invoiceUrl}
                      download={`Invoice-${createdResult.orderNumber}.pdf`}
                      style={{
                        flex: 1,
                        minWidth: 160,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        background: "#fff",
                        border: "1.5px solid var(--line)",
                        color: "var(--ink)",
                        padding: "10px 14px",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        textDecoration: "none",
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download Tax Invoice
                    </a>
                    {createdResult.labelUrl ? (
                      <a
                        href={createdResult.labelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          minWidth: 160,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          background: "var(--terracotta)",
                          color: "#fff",
                          padding: "10px 14px",
                          borderRadius: 8,
                          fontWeight: 600,
                          fontSize: 13,
                          textDecoration: "none",
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Print Shipping Label
                      </a>
                    ) : (
                      <div
                        style={{
                          flex: 1,
                          minWidth: 160,
                          padding: "10px",
                          fontSize: 12,
                          color: "#6b7280",
                          background: "#f3f4f6",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Courier pending dispatch
                      </div>
                    )}
                  </div>

                  <a
                    href={`https://wa.me/91${createdResult.phone}?text=${encodeURIComponent(
                      `Vanakkam ${createdResult.customerName}! Your Raghul Sweet & Snacks order #${createdResult.orderNumber} has been received (Total: ₹${createdResult.total.toFixed(2)}). Track delivery: https://raghulsnacks.com/orders/track?order=${createdResult.orderNumber}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      background: "#25d366",
                      color: "#fff",
                      padding: "10px 16px",
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 13,
                      textDecoration: "none",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.146-.525-1.745-.722-2.87-2.493-2.957-2.608-.087-.116-.708-.941-.708-1.793 0-.852.449-1.27.608-1.444.159-.175.348-.218.463-.218.116 0 .232 0 .333.006.107.006.249-.041.389.296.145.348.492 1.203.535 1.29.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.353.101.174.449.741.964 1.2 1.01.9 1.488 1.054 1.7 1.144.212.09.336.075.462-.07.127-.145.545-.634.69-.851.145-.217.29-.181.492-.108.203.072 1.289.608 1.512.72.223.112.372.167.426.26.055.093.055.539-.089.944z" />
                    </svg>
                    Send Order Details &amp; Tracking Link on WhatsApp
                  </a>
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => resetCreateForm()}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--terracotta)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    + Create Another Order
                  </button>
                  <span style={{ color: "#d1d5db" }}>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4b5563",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Done / View in Table
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateOrder} className={styles.modalForm}>
                {/* Order Channel Selection */}
                <div className={styles.modalFieldGroup}>
                  <label>Order Channel / Source</label>
                  <div className={styles.channelPillGroup}>
                    {(["whatsapp", "instagram", "offline"] as const).map((source) => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => setCreateSource(source)}
                        className={`${styles.channelPill} ${createSource === source ? styles.channelPillActive : ""}`}
                      >
                        {source === "whatsapp" ? "WhatsApp" : source === "instagram" ? "Instagram" : "Offline / Store"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Contact */}
                <div className={styles.modalFieldRow}>
                  <div className={styles.modalFieldGroup}>
                    <label>Customer Name *</label>
                    <input
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                    />
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label>Mobile Number (WhatsApp) *</label>
                    <input
                      required
                      type="tel"
                      placeholder="10-digit mobile (e.g. 9876543210)"
                      value={createPhone}
                      onChange={(e) => setCreatePhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.modalFieldGroup}>
                  <label>Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="customer@gmail.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                  />
                </div>

                {/* Delivery Address */}
                <div className={styles.modalFieldGroup}>
                  <label>Delivery Address *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Door/flat no, building name, street, area, landmark"
                    value={createAddress}
                    onChange={(e) => setCreateAddress(e.target.value)}
                  />
                </div>

                <div className={styles.modalFieldRow}>
                  <div className={styles.modalFieldGroup}>
                    <label>PIN Code (6 Digits) *</label>
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      placeholder="e.g. 600001"
                      value={createPincode}
                      onChange={(e) => handleCreatePincodeChange(e.target.value)}
                    />
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label>City / District *</label>
                    <input
                      required
                      placeholder="e.g. Chennai"
                      value={createCity}
                      onChange={(e) => setCreateCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.modalFieldGroup}>
                  <label>State *</label>
                  <input
                    required
                    placeholder="e.g. Tamil Nadu"
                    value={createState}
                    onChange={(e) => setCreateState(e.target.value)}
                  />
                </div>

                {/* ── Section 2: Snacks & Items (Itemized) ── */}
                <div className={styles.createItemsSection}>
                  <div className={styles.createItemsHeader}>
                    <div className={styles.createItemsTitle}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                      <span>Ordered Snacks &amp; Sweets ({createItems.length})</span>
                    </div>
                    <span className={styles.createItemsSubtotalBadge}>
                      Subtotal: ₹{itemsSubtotal.toFixed(2)}
                    </span>
                  </div>

                  {createItems.map((item, idx) => {
                    const itemTotal = Math.max(0, Number(item.totalPrice) || 0);

                    return (
                      <div key={item.id} className={styles.createItemCard}>
                        {/* Item Card Header */}
                        <div className={styles.createItemCardHeader}>
                          <div className={styles.createItemBadge}>
                            <span className={styles.createItemIndex}>#{idx + 1}</span>
                            <span className={styles.createItemBadgeText}>Snack Item</span>
                          </div>
                          <div className={styles.createItemHeaderActions}>
                            <span className={styles.createItemRowTotalTag}>
                              Total: ₹{itemTotal.toFixed(2)}
                            </span>
                            {createItems.length > 1 && (
                              <button
                                type="button"
                                className={styles.createItemRemoveBtn}
                                onClick={() => handleRemoveItem(idx)}
                                title="Remove this snack item"
                                aria-label={`Remove snack #${idx + 1}`}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Product Name Input */}
                        <div className={styles.createItemFieldGroup}>
                          <label>Product Name *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Kai Murukku 250g, Ribbon Pakoda, Mixture..."
                            value={item.name}
                            onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                          />
                        </div>

                        {/* Quantity / Weight & Product Total Price */}
                        <div className={styles.createItemMetricsRow}>
                          <div className={styles.createItemFieldGroup}>
                            <label>Qty / Weight *</label>
                            <input
                              required
                              type="text"
                              placeholder="e.g. 2, 250g, 500g, 1 kg"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                            />
                          </div>

                          <div className={styles.createItemFieldGroup}>
                            <label>Product Total Price (₹) *</label>
                            <input
                              required
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={item.totalPrice}
                              onChange={(e) => handleUpdateItem(idx, "totalPrice", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className={styles.addItemRowBtn}
                    onClick={handleAddItem}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add Another Snack / Sweet</span>
                  </button>
                </div>

                {/* ── Section 3: Overall Order Weight & Packaging Buffer ── */}
                <div className={styles.packageWeightCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <label style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Overall Order Weight (kg) *
                    </label>
                    {finalTotalWeightKg > 0 && (
                      <span style={{ fontSize: 11, color: "#166534", background: "#dcfce7", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>
                        Total Shipping Weight: {finalTotalWeightKg} kg
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", width: 140 }}>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0.05"
                        placeholder="e.g. 1.0"
                        value={createSnackWeight}
                        onChange={(e) => setCreateSnackWeight(e.target.value)}
                        style={{ width: "100%", paddingRight: 32, fontSize: 15, fontWeight: 700 }}
                      />
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#64748b", fontWeight: 700, pointerEvents: "none" }}>
                        kg
                      </span>
                    </div>
                    {finalTotalWeightKg > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                        <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                          +{packagingBufferKg} kg carton box buffer
                        </span>
                        <span style={{ color: "#475569" }}>
                          ({createSnackWeight} kg snacks + {packagingBufferKg} kg carton = <strong>{finalTotalWeightKg} kg</strong> parcel)
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#64748b", flex: "1 1 200px" }}>
                        Enter the overall weight of all items combined. Carton box buffer and courier charges will be auto-calculated.
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Section 4: Live Courier Rates ── */}
                {createPincode.length === 6 && finalTotalWeightKg > 0 && (
                  <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Live Shiprocket Delivery Rates ({finalTotalWeightKg} kg parcel to {createPincode})
                      </span>
                      {createRatesLoading && <small style={{ color: "var(--terracotta)", fontWeight: 600 }}>Fetching rates…</small>}
                    </div>

                    {createRates.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                        {createRates.map((c) => {
                          const isSelected = createSelectedCourierId === c.id;
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setCreateSelectedCourierId(c.id);
                                setCreateSelectedCourierName(c.name);
                                setCreateShippingCharge(c.rate + 5);
                              }}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "8px 12px",
                                border: isSelected ? "2px solid var(--terracotta)" : "1px solid var(--line)",
                                background: isSelected ? "#fff8f5" : "#fff",
                                borderRadius: 6,
                                cursor: "pointer",
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <strong style={{ fontSize: 13, color: "var(--ink)" }}>{c.name}</strong>
                                  {c.isCheapest && (
                                    <span style={{ fontSize: 10, background: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                                      CHEAPEST
                                    </span>
                                  )}
                                  {c.billWeight && (
                                    <span style={{ fontSize: 10.5, background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                      {c.billWeight}
                                    </span>
                                  )}
                                </div>
                                {c.etd && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Est: {c.etd}</div>}
                              </div>
                              <div style={{ textAlign: "right", marginLeft: "auto" }}>
                                <strong style={{ fontSize: 13.5, color: isSelected ? "var(--terracotta)" : "var(--ink)", display: "block" }}>
                                  ₹{(c.rate + 5).toFixed(2)}
                                </strong>
                                <small style={{ fontSize: 10.5, color: "#64748b" }}>₹{c.rate.toFixed(2)} + ₹5 fee</small>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {createRatesLoading ? "Calculating delivery rate…" : "Enter 6-digit PIN and parcel weight to view live courier charges."}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Section 5: Payment Details ── */}
                <div className={styles.modalFieldRow} style={{ marginTop: 12 }}>
                  <div className={styles.modalFieldGroup}>
                    <label>Payment Method</label>
                    <select
                      value={createPaymentMethod}
                      onChange={(e) => setCreatePaymentMethod(e.target.value)}
                    >
                      <option value="gpay">GPay / Google Pay</option>
                      <option value="phonepe">PhonePe</option>
                      <option value="upi">UPI / QR Code</option>
                      <option value="cash">Cash / In-Person</option>
                      <option value="bank_transfer">Direct Bank Transfer</option>
                    </select>
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label>Payment Status</label>
                    <select
                      value={createPaymentStatus}
                      onChange={(e) => setCreatePaymentStatus(e.target.value as "paid" | "pending")}
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Payment Pending</option>
                    </select>
                  </div>
                </div>

                {/* ── Section 6: Order Summary ── */}
                <div style={{ marginTop: 14, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 5, flexWrap: "wrap", gap: 4 }}>
                    <span style={{ color: "#64748b" }}>Snacks Subtotal ({createItems.length} items):</span>
                    <strong style={{ color: "var(--ink)" }}>₹{itemsSubtotal.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                    <span style={{ color: "#64748b" }}>Delivery / Shipping:</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span>₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={createShippingCharge}
                        onChange={(e) => setCreateShippingCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: 85, padding: "3px 8px", fontSize: 13, fontWeight: 700, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                        title="Editable: Set to 0 if offering free shipping or discount"
                      />
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: 4 }}>
                    <strong style={{ fontSize: 13.5, color: "var(--ink)" }}>Total Amount to Collect:</strong>
                    <strong style={{ fontSize: 17, color: "var(--terracotta)" }}>
                      ₹{(itemsSubtotal + (parseFloat(String(createShippingCharge)) || 0)).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Book Courier Now Checkbox */}
                <div style={{ marginTop: 10, padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                    <input
                      type="checkbox"
                      checked={createBookCourierNow}
                      onChange={(e) => setCreateBookCourierNow(e.target.checked)}
                      style={{ accentColor: "var(--terracotta)", width: 16, height: 16 }}
                    />
                    <span>Book Shiprocket Courier Immediately (Get AWB &amp; Shipping Label)</span>
                  </label>
                  <small style={{ display: "block", color: "#64748b", fontSize: 11.5, marginTop: 4, marginLeft: 24 }}>
                    If unchecked, order will be saved as &ldquo;Placed&rdquo; so you can book the courier later.
                  </small>
                </div>

                {createError && (
                  <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginTop: 10 }}>
                    {createError}
                  </div>
                )}

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalCancelBtn}
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    disabled={createSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.modalSubmitBtn}
                    disabled={createSubmitting}
                  >
                    {createSubmitting ? "Creating order…" : "Create & Save Order"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: toast.ok ? "#166534" : "#991b1b",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontSize: 13.5,
            fontWeight: 600,
            zIndex: 9999,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
