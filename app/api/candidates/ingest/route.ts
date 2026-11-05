import { NextRequest, NextResponse } from "next/server";
import { extractToCanonical } from "@/lib/cv-extract";

// POST /api/candidates — ingest (compat) e POST /api/candidates/ingest via re-export
// Aceita: JSON { linkedinText|text|raw, consent:{iaReescritaV}, objetivoCrescimento? } ou FormData {file, linkedinText}
export async function POST(req: NextRequest) {
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
        // tenta JSON no campo consent
        consent = undefined;
      }
      // também checa header/query? pega de linkedinText alternative
      if (linkedinText) rawText = String(linkedinText);
      if (file) {
        fileName = (file as any).name ?? "upload";
        const buf = Buffer.from(await file.arrayBuffer());
        // tenta parse PDF/DOCX se deps disponíveis, senão fallback para texto
        let extracted = "";
        try {
          if (fileName.toLowerCase().endsWith(".pdf")) {
            // dynamic import pdf-parse se instalado
            const pdfParse = await import("pdf-parse").then((m: any) => m.default ?? m).catch(() => null);
            if (pdfParse) {
              const data = await pdfParse(buf);
              extracted = data.text ?? "";
            } else {
              extracted = buf.toString("utf-8");
            }
          } else if (fileName.toLowerCase().endsWith(".docx")) {
            const mammoth = await import("mammoth").then((m: any) => m).catch(() => null);
            if (mammoth) {
              const result = await mammoth.extractRawText({ buffer: buf });
              extracted = result.value ?? "";
            } else {
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
      // fallback: se ainda sem consent, tenta ler iaReescritaV do form
      if (!consent) {
        const v = form.get("iaReescritaV");
        if (v != null) consent = { iaReescritaV: String(v) === "true" };
      }
    } else {
      const body = await req.json().catch(() => ({} as any));
      rawText = body.linkedinText ?? body.text ?? body.raw ?? body.rawText ?? "";
      // file em JSON não suportado — espera multipart; mas permite base64 stub
      if (body.fileBase64 && !rawText) {
        try {
          rawText = Buffer.from(body.fileBase64, "base64").toString("utf-8");
        } catch {}
      }
      consent = body.consent ?? body.consentimentos ?? undefined;
      // allow flat iaReescritaV
      if (!consent && body.iaReescritaV !== undefined) {
        consent = { iaReescritaV: body.iaReescritaV };
      }
      if (!consent && body.iaReescrita !== undefined) {
        consent = { iaReescritaV: body.iaReescrita };
      }
    }

    // LGPD: iaReescritaV obrigatório
    if (!consent || consent.iaReescritaV !== true) {
      // também aceita consent como boolean legado
      return NextResponse.json({ error: "consentimento iaReescritaV obrigatório para extração por IA (LGPD)" }, { status: 400 });
    }

    // ingest — rawText pode ser vazio (fallback escaneado)
    const result = await extractToCanonical(rawText, { consent });

    // ingest sempre 200, mesmo fallback (form em branco com aviso)
    return NextResponse.json(
      {
        draft: result.draft,
        fallback: result.fallback,
        warning: result.warning ?? null,
        // compat com spec: {draft}
        ...result,
      },
      { status: 200 }
    );
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? 500;
    return NextResponse.json({ error: e.message ?? "erro interno ingest" }, { status });
  }
}

// GET stub for listing (not needed by task but prevents 405)
export async function GET() {
  return NextResponse.json({ error: "use POST /api/candidates para ingest" }, { status: 405 });
}
