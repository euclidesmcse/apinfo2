import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Seed disponível somente por script administrativo local." }, { status: 405, headers: { Allow: "GET" } });
}
export async function GET() {
  return NextResponse.json({ demo: process.env.DEMO_MODE === "true" }, { headers: { "Cache-Control": "no-store" } });
}
