import { NextResponse } from "next/server";
import { z } from "zod";
import { priceOrder } from "@/lib/order-pricing";
import { getShiprocketQuote } from "@/lib/shiprocket";

const payloadSchema = z.object({ pincode: z.string().regex(/^\d{6}$/), items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(20) })).min(1).max(20) });

const isManual = process.env.DELIVERY_MODE === "manual";

export async function POST(request: Request) {
  const payload = payloadSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: "Enter a valid PIN code to calculate delivery." }, { status: 400 });
  try {
    const { subtotal, weight } = await priceOrder(payload.data.items);

    // Manual delivery mode — skip Shiprocket, return ₹0 shipping
    if (isManual) {
      return NextResponse.json({ charge: 0, courierId: null, courierName: "Manual delivery", estimatedDeliveryDays: "3–7 business days", subtotal, total: subtotal });
    }

    const quote = await getShiprocketQuote(payload.data.pincode, weight, subtotal);
    if (!quote) return NextResponse.json({ error: "Shiprocket delivery configuration is incomplete." }, { status: 503 });
    return NextResponse.json({ ...quote, subtotal, total: subtotal + quote.charge });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate delivery charges.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
