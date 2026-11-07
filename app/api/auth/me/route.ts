import { NextResponse } from "next/server";
import { requireAuth, JWT_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrigin, errorResponse } from "@/lib/api";
export async function GET(req: Request) {
  try {
    const { userId } = requireAuth(req);
    const [candidate, company] = await Promise.all([
      prisma.candidateProfile.findUnique({ where: { userId } }),
      prisma.companyProfile.findUnique({ where: { ownerUserId: userId } }),
    ]);
    return NextResponse.json({ userId, candidate, company }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(req: Request) {
  try {
    assertOrigin(req);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(JWT_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return errorResponse(error); }
}
