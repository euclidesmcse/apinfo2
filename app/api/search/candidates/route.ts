import { NextRequest, NextResponse } from "next/server";
import { searchCandidates } from "@/lib/search";
import { errorResponse, requireCompany } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    if (process.env.DEMO_MODE !== "true") await requireCompany(req);
    const p = req.nextUrl.searchParams;
    const result = await searchCandidates({
      q: p.get("q") ?? "", page: Number(p.get("page") ?? 1), pageSize: Number(p.get("pageSize") ?? 20),
      regime: p.get("regime") ?? undefined, modo: p.get("modo") ?? undefined,
      localidade: p.get("localidade") ?? undefined, nivel: p.get("nivel") ?? undefined,
      faixaDe: p.has("faixaDe") ? Number(p.get("faixaDe")) : null,
      faixaAte: p.has("faixaAte") ? Number(p.get("faixaAte")) : null,
    });
    return NextResponse.json({ ...result, mode: "text", demo: process.env.DEMO_MODE === "true" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
