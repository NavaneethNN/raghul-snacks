import { NextResponse } from "next/server";
import { checkPincodeServiceability } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = searchParams.get("pincode");

    if (!pincode || !pincode.trim()) {
      return NextResponse.json(
        {
          serviceable: false,
          valid: false,
          message: "Please enter a 6-digit Indian PIN code.",
        },
        { status: 400 }
      );
    }

    const weight = parseFloat(searchParams.get("weight") || "0.5") || 0.5;
    const result = await checkPincodeServiceability(pincode.trim(), weight);

    return NextResponse.json(result, { status: result.valid ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check PIN code serviceability.";
    return NextResponse.json(
      {
        serviceable: false,
        valid: false,
        message,
      },
      { status: 500 }
    );
  }
}

