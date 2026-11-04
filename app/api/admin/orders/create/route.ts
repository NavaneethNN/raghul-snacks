import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { customers, orders, orderItems } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { createShiprocketShipment, isShiprocketConfigured } from "@/lib/shiprocket";
import { normalizeIndianPhone, isValidIndianPhone } from "@/lib/phone";

const orderItemInputSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be at least 0"),
  weight: z.string().optional().nullable(),
  approxWeight: z.string().optional().nullable(),
  productId: z.number().optional().nullable(),
  variantId: z.number().optional().nullable(),
});

const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required"),
  phone: z
    .string()
    .trim()
    .transform(normalizeIndianPhone)
    .refine(isValidIndianPhone, "Valid 10-digit mobile number required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().min(5, "Delivery address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  pincode: z.string().trim().regex(/^\d{6}$/, "6-digit PIN code required"),
  orderSource: z.enum(["whatsapp", "instagram", "offline", "phone"]).default("whatsapp"),
  paymentMethod: z.string().trim().default("upi"),
  paymentStatus: z.enum(["paid", "pending"]).default("paid"),
  items: z.array(orderItemInputSchema).optional().default([]),
  orderAmount: z.number().min(0, "Order amount must be 0 or greater"),
  finalWeightKg: z.number().positive("Weight must be greater than 0"),
  length: z.number().positive().default(22),
  breadth: z.number().positive().default(16),
  height: z.number().positive().default(10),
  boxName: z.string().optional().default("Standard Parcel"),
  courierId: z.number().optional().nullable(),
  courierName: z.string().optional().nullable(),
  shippingCharge: z.number().default(0),
  bookCourierNow: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = createOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid order details" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const db = getDb();

    // 1. Find or create customer
    const cleanPhone = data.phone;
    let [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.phone, cleanPhone))
      .limit(1);

    if (!customer) {
      const [newCust] = await db
        .insert(customers)
        .values({
          name: data.customerName,
          phone: cleanPhone,
          email: data.email || null,
        })
        .returning({ id: customers.id });
      customer = newCust;
    }

    // 2. Generate unique order number
    const prefix = data.orderSource === "whatsapp" ? "RS-WA" : data.orderSource === "instagram" ? "RS-IG" : "RS-OFF";
    const orderNumber = `${prefix}-${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const shippingExtra = data.shippingCharge > 0 ? 5 : 0;
    const shippingActual = Math.max(0, Math.round((data.shippingCharge - shippingExtra) * 100) / 100);
    const grandTotal = Math.round((data.orderAmount + data.shippingCharge) * 100) / 100;

    // 3. Insert order record
    const [insertedOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId: customer.id,
        customerName: data.customerName,
        phone: cleanPhone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        total: String(grandTotal),
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        orderStatus: data.bookCourierNow ? "dispatched" : "placed",
        orderSource: data.orderSource,
        billedWeight: String(data.finalWeightKg),
        packageLength: String(data.length),
        packageBreadth: String(data.breadth),
        packageHeight: String(data.height),
        packageBoxName: data.boxName,
        shippingActual: String(shippingActual),
        shippingExtra: String(shippingExtra),
      })
      .returning();

    // 4. Insert order items
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        await db.insert(orderItems).values({
          orderId: insertedOrder.id,
          productId: item.productId || null,
          variantId: item.variantId || null,
          name: item.name,
          quantity: item.quantity,
          price: String(item.price),
          weight: item.weight || null,
          approxWeight: item.approxWeight || item.weight || null,
        });
      }
    } else {
      await db.insert(orderItems).values({
        orderId: insertedOrder.id,
        name: "Assorted Fresh Snacks & Sweets",
        quantity: 1,
        price: String(data.orderAmount),
        weight: `${data.finalWeightKg} kg`,
        approxWeight: `${data.finalWeightKg} kg`,
      });
    }

    let awbCode: string | null = null;
    let shipmentId: string | null = null;
    let labelUrl: string | null = null;

    // 5. Optionally book courier immediately
    if (data.bookCourierNow && isShiprocketConfigured()) {
      try {
        const lines = (data.items && data.items.length > 0)
          ? data.items.map((item) => ({
              product: { name: item.name, slug: "snack" },
              quantity: item.quantity,
              lineTotal: Math.round(item.price * item.quantity * 100) / 100,
            }))
          : [
              {
                product: { name: "Assorted Fresh Snacks", slug: "snacks" },
                quantity: 1,
                lineTotal: data.orderAmount,
              },
            ];

        const srResult = await createShiprocketShipment({
          orderNumber,
          customerName: data.customerName,
          phone: cleanPhone,
          email: data.email || null,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          subtotal: data.orderAmount,
          shipping: shippingActual,
          weight: data.finalWeightKg,
          length: data.length,
          breadth: data.breadth,
          height: data.height,
          courierId: data.courierId ?? null,
          courierName: data.courierName ?? null,
          lines,
        });

        if (srResult) {
          shipmentId = srResult.shipment_id ? String(srResult.shipment_id) : null;
          awbCode = srResult.awb_code ?? null;

          await db
            .update(orders)
            .set({
              shiprocketOrderId: srResult.order_id ? String(srResult.order_id) : null,
              shipmentId,
              awbCode,
              shippingStatus: "created",
              orderStatus: "dispatched",
            })
            .where(eq(orders.id, insertedOrder.id));

          labelUrl = `/api/admin/orders/${insertedOrder.id}/label`;
        }
      } catch (srErr) {
        console.error("[admin/orders/create] Immediate Shiprocket booking failed:", srErr);
        // Order is still safely saved as placed
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        ...insertedOrder,
        awbCode,
        shipmentId,
        orderStatus: awbCode ? "dispatched" : "placed",
      },
      orderNumber,
      orderId: insertedOrder.id,
      customerName: data.customerName,
      phone: cleanPhone,
      total: grandTotal,
      subtotal: data.orderAmount,
      shippingCharge: data.shippingCharge,
      awbCode,
      labelUrl,
      invoiceUrl: `/api/orders/${orderNumber}/invoice`,
    });
  } catch (error) {
    console.error("[admin/orders/create] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 }
    );
  }
}

