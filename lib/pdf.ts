// Minimal valid, paginated PDF; contacts are omitted from the proxied CV.
export function canonicalPdf(candidate: Record<string, any>): Buffer {
  const raw = [candidate.nome, candidate.titulo, candidate.resumo3linhas, candidate.objetivoCrescimento,
    ...(candidate.stack ?? []).map((s: any) => s.skillId),
    ...["experiencias", "formacao", "idiomas"].flatMap(key => (candidate[key] ?? []).map((item: any) =>
      typeof item === "string" ? item : Object.values(item).filter(v => typeof v === "string").join(" - ")))].filter(Boolean).join("\n");
  const lines = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e\n]/g, "?")
    .split("\n").flatMap(line => line.match(/.{1,85}/g) ?? [""]);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));
  if (!pages.length) pages.push(["Curriculo"]);
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const kids: string[] = [];
  for (const page of pages) {
    const pageId = objects.length + 1, contentId = pageId + 1;
    kids.push(pageId + " 0 R");
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents " + contentId + " 0 R >>");
    const commands = "BT /F1 11 Tf 50 790 Td 15 TL\n" + page.map(line =>
      "(" + line.replace(/([\\()])/g, "\\$1") + ") Tj T*").join("\n") + "\nET";
    objects.push("<< /Length " + Buffer.byteLength(commands) + " >>\nstream\n" + commands + "\nendstream");
  }
  objects[1] = "<< /Type /Pages /Count " + kids.length + " /Kids [" + kids.join(" ") + "] >>";
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xref = Buffer.byteLength(pdf);
  pdf += "xref\n0 " + offsets.length + "\n0000000000 65535 f \n" +
    offsets.slice(1).map(n => String(n).padStart(10, "0") + " 00000 n \n").join("");
  pdf += "trailer\n<< /Size " + offsets.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  return Buffer.from(pdf);
}
