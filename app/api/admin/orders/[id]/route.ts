import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { orders } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

const statusSchema = z.object({ orderStatus: z.enum(["placed", "packed", "shipped", "delivered", "cancelled"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = statusSchema.safeParse(await request.json());
    const { id } = await params;
    if (!body.success || !/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid order update." }, { status: 400 });
    await getDb().update(orders).set({ orderStatus: body.data.orderStatus }).where(eq(orders.id, Number(id)));
    return NextResponse.json({ updated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
