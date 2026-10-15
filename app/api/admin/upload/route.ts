import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { uploadImageToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as { base64: string; filename: string };
    const { base64, filename } = body;

    if (!base64 || !filename) {
      return NextResponse.json({ error: "base64 and filename are required" }, { status: 400 });
    }

    // Generate a unique key using timestamp + sanitized filename
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const key = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const url = await uploadImageToR2(base64, key);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
