import { NextRequest, NextResponse } from "next/server";
import { extractToCanonical } from "./cv-extract";
import { requireAuth } from "./auth";
import { ApiError, assertOrigin, errorResponse, readBytes, readJson } from "./api";
export async function handleIngestPOST(req: NextRequest) {
  try {
    requireAuth(req);
    assertOrigin(req);
    let rawText = "";
    let consent: any;
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const bytes = await readBytes(req, 2 * 1024 * 1024);
      const copy = new Request(req.url, { method: "POST", headers: { "content-type": req.headers.get("content-type")! }, body: Buffer.from(bytes) });
      const form = await copy.formData();
      try { consent = JSON.parse(String(form.get("consent") ?? "{}")); }
      catch { throw new ApiError("Consentimento inválido", 400); }
      if (form.get("iaReescritaV") === "true") consent.iaReescritaV = true;
      if (consent.iaReescritaV !== true) throw new ApiError("Autorize a extração do currículo", 400);
      rawText = String(form.get("linkedinText") ?? "");
      const file = form.get("file");
      if (file && typeof file !== "string") {
        const buffer = Buffer.from(await file.arrayBuffer());
        const name = file.name.toLowerCase();
        try {
          if (name.endsWith(".pdf") && buffer.subarray(0, 5).toString() === "%PDF-") {
            const parse = require("pdf-parse/lib/pdf-parse.js");
            rawText += "\n" + (await parse(buffer, { max: 30 })).text;
          } else if (name.endsWith(".docx") && buffer.subarray(0, 2).toString() === "PK") {
            const mammoth = await import("mammoth");
            rawText += "\n" + (await mammoth.extractRawText({ buffer })).value;
          } else throw new ApiError("Envie um PDF ou DOCX válido", 415);
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new ApiError("Não foi possível ler o arquivo. Preencha o perfil manualmente.", 422);
        }
      }
    } else {
      const body = await readJson(req);
      rawText = body.linkedinText ?? body.text ?? body.rawText ?? "";
      consent = body.consent ?? { iaReescritaV: body.iaReescritaV === true };
    }
    if (typeof rawText !== "string" || rawText.length > 100000) throw new ApiError("Texto inválido ou muito longo", 400);
    const result = await extractToCanonical(rawText, { consent });
    return NextResponse.json({ ...result, extractionMode: "heuristic", warning: result.warning ?? "Revise os dados extraídos antes de publicar." },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
