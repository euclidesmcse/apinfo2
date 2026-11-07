import { canonicalPdf } from "../lib/pdf";
it("produces a parseable multipage PDF without direct contacts", async () => {
  const parse = require("pdf-parse/lib/pdf-parse.js");
  const pdf = canonicalPdf({ nome: "Ana", titulo: "Analista", objetivoCrescimento: "Crescer como analista",
    email: "private@example.test", celular: "+5511999999999", experiencias: Array.from({ length: 120 }, (_, i) => ({ cargo: "Experiencia " + i })) });
  const parsed = await parse(pdf);
  expect(parsed.numpages).toBeGreaterThan(1);
  expect(parsed.text).toContain("Ana");
  expect(parsed.text).toContain("Experiencia 119");
  expect(parsed.text).not.toContain("private@example.test");
  expect(parsed.text).not.toContain("5511999999999");
});
