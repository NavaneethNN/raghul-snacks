import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getShiprocketWalletBalance } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const wallet = await getShiprocketWalletBalance();
    return NextResponse.json(wallet);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load wallet balance" },
      { status: 500 }
    );
  }
}
