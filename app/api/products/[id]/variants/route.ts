import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { productVariants } from "@/drizzle/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) return NextResponse.json({ variants: [] });
  const db = getDb();
  const variants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.active, true)))
    .orderBy(productVariants.sortOrder);
  return NextResponse.json({ variants });
}
