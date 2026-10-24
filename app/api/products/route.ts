import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getProductsWithVariants } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

// GET - List all products (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category") || undefined;
        const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    let ids: number[] | undefined;
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      ids = idsParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    }

    const db = getDb();
    const result = await getProductsWithVariants(db, {
      categorySlug,
            ids,
      limit: limit && limit > 0 ? limit : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
