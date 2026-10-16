import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { settings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const allSettings = await db.select().from(settings);
    const settingsObj: Record<string, string> = {};
    allSettings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    // Never expose sensitive keys to the client
    delete settingsObj["adminPassword"];
    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Require admin session for writing settings
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, value, description } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    // Block writing sensitive keys via API
    if (key === "adminPassword") {
      return NextResponse.json({ error: "Use the Security page to change the admin password." }, { status: 403 });
    }
    
    const db = getDb();
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    
    if (existing.length > 0) {
      await db.update(settings).set({ value, description, updatedAt: new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value, description });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
