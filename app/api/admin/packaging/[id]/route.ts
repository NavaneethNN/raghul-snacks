import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { packagingBoxes } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  length: z.number().positive().optional(),
  breadth: z.number().positive().optional(),
  height: z.number().positive().optional(),
  boxWeightKg: z.number().positive().optional(),
  maxCapacityKg: z.number().positive().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// PATCH - Update packaging box
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid box ID" }, { status: 400 });

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid box parameters";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parsed.data;
    const updateValues: Record<string, unknown> = {};
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.length !== undefined) updateValues.length = data.length.toFixed(2);
    if (data.breadth !== undefined) updateValues.breadth = data.breadth.toFixed(2);
    if (data.height !== undefined) updateValues.height = data.height.toFixed(2);
    if (data.boxWeightKg !== undefined) updateValues.boxWeightKg = data.boxWeightKg.toFixed(3);
    if (data.maxCapacityKg !== undefined) updateValues.maxCapacityKg = data.maxCapacityKg.toFixed(3);
    if (data.active !== undefined) updateValues.active = data.active;
    if (data.sortOrder !== undefined) updateValues.sortOrder = data.sortOrder;

    if (Object.keys(updateValues).length === 0) {
      return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
    }

    const db = getDb();
    const [updated] = await db
      .update(packagingBoxes)
      .set(updateValues)
      .where(eq(packagingBoxes.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Packaging box not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      length: parseFloat(updated.length),
      breadth: parseFloat(updated.breadth),
      height: parseFloat(updated.height),
      boxWeightKg: parseFloat(updated.boxWeightKg),
      maxCapacityKg: parseFloat(updated.maxCapacityKg),
      active: updated.active,
      sortOrder: updated.sortOrder,
    });
  } catch (error) {
    console.error("Error updating packaging box:", error);
    return NextResponse.json({ error: "Failed to update packaging box" }, { status: 500 });
  }
}

// DELETE - Delete packaging box
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid box ID" }, { status: 400 });

    const db = getDb();
    const [deleted] = await db
      .delete(packagingBoxes)
      .where(eq(packagingBoxes.id, id))
      .returning({ id: packagingBoxes.id });

    if (!deleted) {
      return NextResponse.json({ error: "Packaging box not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: deleted.id });
  } catch (error) {
    console.error("Error deleting packaging box:", error);
    return NextResponse.json({ error: "Failed to delete packaging box" }, { status: 500 });
  }
}
