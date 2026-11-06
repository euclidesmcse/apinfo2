import { NextRequest, NextResponse } from "next/server";
import { runHygieneCron } from "@/lib/hygiene";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev fallback (tests)
  const auth = req.headers.get("authorization") ?? "";
  const xCron = req.headers.get("x-cron-secret") ?? "";
  const qSecret = req.nextUrl.searchParams.get("cron_secret") ?? "";
  // Bearer <secret> | plain secret | x-cron-secret | ?cron_secret=
  if (auth === `Bearer ${secret}`) return true;
  if (auth === secret) return true;
  if (xCron === secret) return true;
  if (qSecret === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const nowParam = req.nextUrl.searchParams.get("now");
  const now = nowParam ? new Date(nowParam) : new Date();
  const summary = await runHygieneCron(now);
  return NextResponse.json({ ok: true, ...summary }, { status: 200 });
}

// n8n pode usar POST também
export async function POST(req: NextRequest) {
  return GET(req);
}

export const dynamic = "force-dynamic";
