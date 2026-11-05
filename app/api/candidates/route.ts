import { NextRequest, NextResponse } from "next/server";
import { handleIngestPOST } from "@/lib/cv-ingest";
// ingest via handleIngestPOST -> extractToCanonical + iaReescritaV LGPD validation 400/403 (see lib/cv-ingest.ts)

export async function POST(req: NextRequest) {
  return handleIngestPOST(req);
}

export async function GET() {
  return NextResponse.json({ error: "use POST /api/candidates para ingest" }, { status: 405 });
}
