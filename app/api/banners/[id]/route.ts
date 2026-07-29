import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { banners } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const bannerSchema = z.object({
  eyebrow: z.string().default(""),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  offerText: z.string().optional(),
  couponCode: z.string().optional(),
  buttonText: z.string().default("Shop Now"),
  validityText: z.string().optional(),
  image: z.string().optional(),
  href: z.string().default("/shop"),
  active: z.boolean().default(true),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = bannerSchema.partial().safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid banner data" }, { status: 400 });
    }
    
    const db = getDb();
    const [banner] = await db
      .update(banners)
      .set({ ...parsed.data, createdAt: new Date() })
      .where(eq(banners.id, parseInt(id)))
      .returning();
    
    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }
    
    return NextResponse.json(banner);
  } catch (error) {
    console.error("Error updating banner:", error);
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const [banner] = await db
      .delete(banners)
      .where(eq(banners.id, parseInt(id)))
      .returning();
    
    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}
