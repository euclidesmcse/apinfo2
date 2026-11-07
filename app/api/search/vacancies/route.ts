import { NextRequest, NextResponse } from "next/server";
import { searchVacancies } from "@/lib/search";
import { errorResponse } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    
    const p = req.nextUrl.searchParams;
    const result = await searchVacancies({
      q: p.get("q") ?? "", page: Number(p.get("page") ?? 1), pageSize: Number(p.get("pageSize") ?? 20),
      regime: p.get("regime") ?? undefined, modo: p.get("modo") ?? undefined,
      localidade: p.get("localidade") ?? undefined, nivel: p.get("nivel") ?? undefined,
      faixaDe: p.has("faixaDe") ? Number(p.get("faixaDe")) : null,
      faixaAte: p.has("faixaAte") ? Number(p.get("faixaAte")) : null,
    });
    return NextResponse.json({ ...result, mode: "text", demo: process.env.DEMO_MODE === "true" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
