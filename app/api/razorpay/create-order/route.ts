import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Razorpay checkout has been replaced by Cashfree." }, { status: 410 });
}
