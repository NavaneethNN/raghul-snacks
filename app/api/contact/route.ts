import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { contactMessages } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  subject: z.string().trim().min(1, "Please select a subject."),
  message: z.string().trim().min(10, "Message must be at least 10 characters."),
});

export async function POST(request: NextRequest) {
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    const first = Object.values(body.error.flatten().fieldErrors)[0]?.[0] ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  try {
    await getDb().insert(contactMessages).values({
      name: body.data.name,
      email: body.data.email,
      phone: body.data.phone || null,
      subject: body.data.subject,
      message: body.data.message,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save message. Please try again." }, { status: 500 });
  }
}
