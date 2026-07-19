import { NextResponse } from "next/server";

export const revalidate = 86400;

export async function GET() {
  try {
    const response = await fetch("https://countriesnow.space/api/v0.1/countries/states/q?country=India", { next: { revalidate: 86400 } });
    const result = await response.json() as { error?: boolean; data?: { states?: { name?: string }[] }; msg?: string };
    const states = result.data?.states?.map((state) => state.name).filter((state): state is string => Boolean(state)).sort((left, right) => left.localeCompare(right));
    if (!response.ok || !states?.length) throw new Error(result.msg || "Unable to load states.");
    return NextResponse.json({ states });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load states.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
