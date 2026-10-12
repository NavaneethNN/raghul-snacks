import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getProductsWithVariants } from "@/lib/db-queries";

export const dynamic = "force-dynamic";

// GET - List all products (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");
    const featured = searchParams.get("featured");
    const bestseller = searchParams.get("bestseller");

    const db = getDb();
    let result = await getProductsWithVariants(db);

    // Filter by specific IDs if provided (?ids=1,2,3)
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = new Set(idsParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)));
      result = result.filter((p: any) => ids.has(p.id));
    }

    // Filter by category slug if provided
    if (categorySlug) {
      result = result.filter((p: any) => p.categorySlug === categorySlug);
    }

    // Filter by featured if provided
    if (featured === "true") {
      result = result.filter((p: any) => p.featured === true);
    }

    // Filter by bestseller if provided
    if (bestseller === "true") {
      result = result.filter((p: any) => p.bestseller === true);
    }

    // Limit result count if ?limit=N is provided
    const limitParam = searchParams.get("limit");
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        result = result.slice(0, limit);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
