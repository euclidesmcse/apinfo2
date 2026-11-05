import { NextRequest, NextResponse } from "next/server";
import { extractToCanonical } from "./cv-extract";

/**
 * Helper compartilhado para POST /api/candidates e /api/candidates/ingest.
 * Evita duplicação de ~120 linhas entre as duas rotas (I1).
 * Aceita JSON {linkedinText|text|raw, consent:{iaReescritaV}} ou FormData {file, linkedinText}
 * Parse binário PDF/DOCX via pdf-parse/mammoth dynamic import com fallback utf-8.
 */
export async function handleIngestPOST(req: NextRequest) {
  try {
    let rawText = "";
    let consent: any = undefined;
    let fileName: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const linkedinText = form.get("linkedinText") as string | null;
      const consentRaw = form.get("consent") as string | null;
      const iaReescritaRaw = form.get("iaReescritaV") as string | null;

      if (consentRaw) {
        try {
          consent = JSON.parse(consentRaw);
        } catch {
          consent = { iaReescritaV: consentRaw === "true" };
        }
      } else if (iaReescritaRaw != null) {
        consent = { iaReescritaV: iaReescritaRaw === "true" || iaReescritaRaw === "1" };
      } else {
        consent = undefined;
      }
      if (linkedinText) rawText = String(linkedinText);
      if (file) {
        fileName = (file as any).name ?? "upload";
        const buf = Buffer.from(await file.arrayBuffer());
        let extracted = "";
        try {
          const lowerName = (fileName ?? "upload").toLowerCase();
          if (lowerName.endsWith(".pdf")) {
            // @ts-ignore — optional dep, types may be missing until installed
            const pdfParse = await import("pdf-parse").then((m: any) => m.default ?? m).catch(() => null);
            if (pdfParse) {
              const data = await pdfParse(buf);
              extracted = data.text ?? "";
            } else {
              // eslint-disable-next-line no-console
              console.warn("[cv-ingest] pdf-parse não instalado, fallback utf-8 — instale com: npm i pdf-parse");
              extracted = buf.toString("utf-8");
            }
          } else if (lowerName.endsWith(".docx")) {
            // @ts-ignore — optional dep, types may be missing until installed
            const mammoth = await import("mammoth").then((m: any) => m).catch(() => null);
            if (mammoth) {
              const result = await mammoth.extractRawText({ buffer: buf });
              extracted = result.value ?? "";
            } else {
              // eslint-disable-next-line no-console
              console.warn("[cv-ingest] mammoth não instalado, fallback utf-8 — instale com: npm i mammoth");
              extracted = buf.toString("utf-8");
            }
          } else {
            extracted = buf.toString("utf-8");
          }
        } catch {
          extracted = buf.toString("utf-8");
        }
        if (!rawText) rawText = extracted;
        else rawText = `${rawText}\n${extracted}`;
      }
      if (!consent) {
        const v = form.get("iaReescritaV");
        if (v != null) consent = { iaReescritaV: String(v) === "true" };
      }
    } else {
      const body = await req.json().catch(() => ({} as any));
      rawText = body.linkedinText ?? body.text ?? body.raw ?? body.rawText ?? "";
      if (body.fileBase64 && !rawText) {
        try {
          rawText = Buffer.from(body.fileBase64, "base64").toString("utf-8");
        } catch {}
      }
      consent = body.consent ?? body.consentimentos ?? undefined;
      if (!consent && body.iaReescritaV !== undefined) {
        consent = { iaReescritaV: body.iaReescritaV };
      }
      if (!consent && body.iaReescrita !== undefined) {
        consent = { iaReescritaV: body.iaReescrita };
      }
    }

    if (!consent || consent.iaReescritaV !== true) {
      return NextResponse.json({ error: "consentimento iaReescritaV obrigatório para extração por IA (LGPD)" }, { status: 400 });
    }

    const result = await extractToCanonical(rawText, { consent });

    return NextResponse.json(
      {
        ...result,
        warning: result.warning ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? 500;
    return NextResponse.json({ error: e.message ?? "erro interno ingest" }, { status });
  }
}
