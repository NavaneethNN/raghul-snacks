import { NextResponse } from "next/server";
import { z } from "zod";
import { priceOrder } from "@/lib/order-pricing";
import { getShiprocketQuote } from "@/lib/shiprocket";

const payloadSchema = z.object({ pincode: z.string().regex(/^\d{6}$/), items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(20) })).min(1).max(20) });

export async function POST(request: Request) {
  const payload = payloadSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: "Enter a valid PIN code to calculate delivery." }, { status: 400 });
  try {
    const { subtotal, weight } = await priceOrder(payload.data.items);
    
    // Get free shipping threshold from settings
    let freeShippingThreshold = 499;
    try {
      const settingsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/settings`, { cache: 'no-store' });
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        freeShippingThreshold = parseInt(settings.freeShippingThreshold) || 499;
      }
    } catch (error) {
      console.error("Error fetching shipping settings:", error);
    }
    
    // If subtotal exceeds threshold, free shipping
    if (subtotal >= freeShippingThreshold) {
      return NextResponse.json({ charge: 0, courierId: 0, courierName: "Free Shipping", estimatedDeliveryDays: null, subtotal, total: subtotal });
    }
    
    const quote = await getShiprocketQuote(payload.data.pincode, weight, subtotal);
    if (!quote) return NextResponse.json({ error: "Shiprocket delivery configuration is incomplete." }, { status: 503 });
    return NextResponse.json({ ...quote, subtotal, total: subtotal + quote.charge });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate delivery charges.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
