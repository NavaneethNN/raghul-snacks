import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { customerAddresses } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/).optional(),
  address: z.string().trim().min(6).optional(),
  city: z.string().trim().min(2).optional(),
  state: z.string().trim().min(2).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/).optional(),
  isDefault: z.boolean().optional(),
});

// DELETE /api/account/addresses/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const addressId = parseInt(id, 10);
  if (isNaN(addressId)) {
    return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
  }

  const db = getDb();
  // Find address
  const [addr] = await db
    .select()
    .from(customerAddresses)
    .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.accountId, session.id)))
    .limit(1);

  if (!addr) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  await db
    .delete(customerAddresses)
    .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.accountId, session.id)));

  // If deleted address was default, make another one default if any exists
  if (addr.isDefault) {
    const remaining = await db
      .select({ id: customerAddresses.id })
      .from(customerAddresses)
      .where(eq(customerAddresses.accountId, session.id))
      .limit(1);

    if (remaining.length > 0) {
      await db
        .update(customerAddresses)
        .set({ isDefault: true })
        .where(eq(customerAddresses.id, remaining[0].id));
    }
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/account/addresses/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const addressId = parseInt(id, 10);
  if (isNaN(addressId)) {
    return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
  }

  try {
    const raw = await request.json();
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const db = getDb();

    // Verify ownership
    const [existing] = await db
      .select()
      .from(customerAddresses)
      .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.accountId, session.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // If making default, remove default from all others
    if (parsed.data.isDefault) {
      await db
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.accountId, session.id));
    }

    const [updated] = await db
      .update(customerAddresses)
      .set({
        ...parsed.data,
      })
      .where(eq(customerAddresses.id, addressId))
      .returning();

    return NextResponse.json({ address: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update address." },
      { status: 500 }
    );
  }
}
