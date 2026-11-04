import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { customerAccounts, customerAddresses, orders } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";
import { normalizeIndianPhone, isValidIndianPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const addressSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .transform(normalizeIndianPhone)
    .refine(isValidIndianPhone, "Please enter a valid 10-digit mobile number"),
  address: z.string().trim().min(6, "Address must be at least 6 characters"),
  city: z.string().trim().min(2, "City / District is required"),
  state: z.string().trim().min(2, "State is required"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Please enter a valid 6-digit PIN code"),
  isDefault: z.boolean().optional().default(false),
});

// GET /api/account/addresses
// Returns all saved addresses for the logged-in customer.
export async function GET() {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ addresses: [] });

  const db = getDb();
  let list = await db
    .select()
    .from(customerAddresses)
    .where(eq(customerAddresses.accountId, session.id))
    .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.createdAt));

  // If no saved addresses exist yet, check if customer has previous orders to auto-seed their first address
  if (list.length === 0) {
    const [lastOrder] = await db
      .select({
        customerName: orders.customerName,
        phone: orders.phone,
        address: orders.address,
        city: orders.city,
        state: orders.state,
        pincode: orders.pincode,
      })
      .from(orders)
      .where(eq(orders.accountId, session.id))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    if (lastOrder && lastOrder.address && lastOrder.pincode) {
      const [inserted] = await db
        .insert(customerAddresses)
        .values({
          accountId: session.id,
          name: lastOrder.customerName || session.name || "Customer",
          phone: normalizeIndianPhone(lastOrder.phone) || "",
          address: lastOrder.address,
          city: lastOrder.city,
          state: lastOrder.state,
          pincode: lastOrder.pincode,
          isDefault: true,
        })
        .returning();
      if (inserted) {
        list = [inserted];
      }
    }
  }

  return NextResponse.json({ addresses: list });
}

// POST /api/account/addresses
// Adds a new saved address for the logged-in customer.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  try {
    const raw = await request.json();
    const parsed = addressSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid address data.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const db = getDb();

    // Check existing addresses
    const existing = await db
      .select({ id: customerAddresses.id })
      .from(customerAddresses)
      .where(eq(customerAddresses.accountId, session.id));

    // If this is the first address, or if explicitly requested as default
    const shouldBeDefault = existing.length === 0 || parsed.data.isDefault;

    if (shouldBeDefault && existing.length > 0) {
      // Clear previous default
      await db
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.accountId, session.id));
    }

    const [created] = await db
      .insert(customerAddresses)
      .values({
        accountId: session.id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        pincode: parsed.data.pincode,
        isDefault: shouldBeDefault,
      })
      .returning();

    return NextResponse.json({ address: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save address." },
      { status: 500 }
    );
  }
}
