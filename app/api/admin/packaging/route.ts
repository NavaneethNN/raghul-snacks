import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { asc } from "drizzle-orm";
import { packagingBoxes } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const packagingBoxSchema = z.object({
  name: z.string().trim().min(1, "Box name is required"),
  length: z.number().positive("Length must be > 0"),
  breadth: z.number().positive("Breadth must be > 0"),
  height: z.number().positive("Height must be > 0"),
  boxWeightKg: z.number().positive("Box weight must be > 0"),
  maxCapacityKg: z.number().positive("Max capacity must be > 0"),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

// GET - List all packaging boxes
export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(packagingBoxes)
      .orderBy(asc(packagingBoxes.sortOrder), asc(packagingBoxes.maxCapacityKg));

    const result = rows.map((r) => ({
      id: r.id,
      name: r.name,
      length: parseFloat(r.length),
      breadth: parseFloat(r.breadth),
      height: parseFloat(r.height),
      boxWeightKg: parseFloat(r.boxWeightKg),
      maxCapacityKg: parseFloat(r.maxCapacityKg),
      active: r.active,
      sortOrder: r.sortOrder,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching packaging boxes:", error);
    return NextResponse.json({ error: "Failed to fetch packaging boxes" }, { status: 500 });
  }
}

// POST - Create a new packaging box
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = packagingBoxSchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid box parameters";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, length, breadth, height, boxWeightKg, maxCapacityKg, active, sortOrder } = parsed.data;

    const db = getDb();
    const [newBox] = await db
      .insert(packagingBoxes)
      .values({
        name,
        length: length.toFixed(2),
        breadth: breadth.toFixed(2),
        height: height.toFixed(2),
        boxWeightKg: boxWeightKg.toFixed(3),
        maxCapacityKg: maxCapacityKg.toFixed(3),
        active,
        sortOrder,
      })
      .returning();

    return NextResponse.json(newBox, { status: 201 });
  } catch (error) {
    console.error("Error creating packaging box:", error);
    return NextResponse.json({ error: "Failed to create packaging box" }, { status: 500 });
  }
}
