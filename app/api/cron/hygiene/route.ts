import { NextResponse } from "next/server";
import { runPersistentHygiene } from "@/lib/hygiene-db";
import { requireService, errorResponse } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    requireService(req, "CRON_SECRET");
    return NextResponse.json({ ok: true, ...await runPersistentHygiene() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
export const POST = GET;
