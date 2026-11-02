import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { selectOptimalPackagingBox } from "@/lib/packaging";
import { getAvailableCouriers, isShiprocketConfigured } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

const ratesQuerySchema = z.object({
  pincode: z.string().trim().regex(/^\d{6}$/, "Must be a valid 6-digit Indian PIN code"),
  weight: z.number().positive("Weight must be positive"),
  length: z.number().positive().optional(),
  breadth: z.number().positive().optional(),
  height: z.number().positive().optional(),
  boxName: z.string().optional(),
  declaredValue: z.number().positive().optional().default(500),
  isFinalWeight: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = ratesQuerySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message || "Invalid rate query parameters" },
        { status: 400 }
      );
    }

    const { pincode, weight, declaredValue, isFinalWeight, boxName } = body.data;

    // 1. Determine optimal packaging box if dimensions are not explicitly provided
    const optimalBox = await selectOptimalPackagingBox(weight);

    const length = body.data.length ?? optimalBox.length;
    const breadth = body.data.breadth ?? optimalBox.breadth;
    const height = body.data.height ?? optimalBox.height;
    const selectedBoxName = boxName || optimalBox.boxName;

    // Volumetric weight: (L * B * H) / 5000 (Indian courier standard)
    const volumetricWeightKg = Math.round(((length * breadth * height) / 5000) * 1000) / 1000;

    // Physical weight:
    // If isFinalWeight is true (e.g. parcel weighed on scale by admin), use it directly.
    // If net snack weight, add packaging box tare.
    const physicalWeightKg = isFinalWeight
      ? Math.max(0.05, Math.round(weight * 1000) / 1000)
      : Math.max(0.1, Math.round((weight + (optimalBox.boxWeightKg || 0)) * 1000) / 1000);

    // Chargeable weight that couriers will bill on:
    const chargeableWeightKg = Math.max(physicalWeightKg, volumetricWeightKg);

    // 2. Fetch available couriers from Shiprocket if configured
    let couriers: Array<{
      id: number;
      name: string;
      rate: number;
      etd: string | null;
      rating?: number | string | null;
      isCheapest: boolean;
      isFastest: boolean;
      minWeight?: number;
      chargeWeight?: number;
      billWeight?: string;
    }> = [];

    const shiprocketActive = isShiprocketConfigured();

    if (shiprocketActive) {
      try {
        couriers = await getAvailableCouriers(pincode, physicalWeightKg, declaredValue, {
          length,
          breadth,
          height,
        });
      } catch (err) {
        console.warn("[shipping/rates] Shiprocket live rates check error:", err);
      }
    }

    const slabLabel =
      chargeableWeightKg <= 0.5
        ? "0.5 kg slab"
        : chargeableWeightKg <= 1.0
        ? "1.0 kg slab"
        : chargeableWeightKg <= 2.0
        ? "2.0 kg slab"
        : `${Math.ceil(chargeableWeightKg)} kg slab`;

    return NextResponse.json({
      success: true,
      shiprocketConfigured: shiprocketActive,
      packaging: {
        boxId: optimalBox.boxId,
        boxName: selectedBoxName,
        length,
        breadth,
        height,
        boxDimensions: `${length} × ${breadth} × ${height} cm`,
        tareWeightKg: isFinalWeight ? 0 : optimalBox.boxWeightKg,
        snackWeightKg: weight,
        physicalWeightKg,
        totalWeightKg: physicalWeightKg,
        volumetricWeightKg,
        chargeableWeightKg,
        appliedSlab: slabLabel,
      },
      couriers,
    });
  } catch (error) {
    console.error("[shipping/rates] Error calculating rates:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate courier rates." },
      { status: 500 }
    );
  }
}

