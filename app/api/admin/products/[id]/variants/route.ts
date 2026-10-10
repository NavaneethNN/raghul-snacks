import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { productVariants } from "@/drizzle/schema";
import { verifyAdminSession } from "@/lib/admin-auth";
import { cookies } from "next/headers";

async function guard() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!verifyAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

// GET /api/admin/products/[id]/variants
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await guard();
  if (unauth) return unauth;
  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  const db = getDb();
  const variants = await db.select().from(productVariants).where(eq(productVariants.productId, productId)).orderBy(productVariants.sortOrder);
  return NextResponse.json(variants);
}

// POST /api/admin/products/[id]/variants  — add a variant
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await guard();
  if (unauth) return unauth;
  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  const body = await req.json() as { weight: string; price: number; offerPrice?: number | null; sortOrder?: number };
  if (!body.weight?.trim() || !body.price || body.price <= 0) return NextResponse.json({ error: "Weight and valid price are required" }, { status: 400 });
  const db = getDb();
  const [variant] = await db.insert(productVariants).values({
    productId,
    weight: body.weight.trim(),
    price: String(body.price),
    offerPrice: body.offerPrice ? String(body.offerPrice) : null,
    sortOrder: body.sortOrder ?? 0,
    active: true,
  }).returning();
  return NextResponse.json(variant, { status: 201 });
}
