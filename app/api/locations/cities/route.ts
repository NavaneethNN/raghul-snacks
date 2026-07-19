import { NextResponse } from "next/server";

export const revalidate = 86400;

export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("state")?.trim();
  if (!state) return NextResponse.json({ error: "Select a state first." }, { status: 400 });
  try {
    const response = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: "India", state }), next: { revalidate: 86400 } });
    const result = await response.json() as { error?: boolean; data?: string[]; msg?: string };
    const cities = result.data?.filter(Boolean).sort((left, right) => left.localeCompare(right));
    if (!response.ok || !cities?.length) throw new Error(result.msg || "Unable to load cities for this state.");
    return NextResponse.json({ cities });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load cities.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
