import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { settings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const allSettings = await db.select().from(settings);
    
    // Convert to key-value object
    const settingsObj: Record<string, string> = {};
    allSettings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value, description } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }
    
    const db = getDb();
    
    // Check if setting exists
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    
    if (existing.length > 0) {
      // Update existing setting
      await db.update(settings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(settings.key, key));
    } else {
      // Create new setting
      await db.insert(settings).values({ key, value, description });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
