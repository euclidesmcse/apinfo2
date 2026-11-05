import { SKILLS } from "../lib/taxonomy";

// Seed de taxonomia: em Fase 1 é apenas validação / log.
// Skills são estáticas em lib/taxonomy.ts; seed futuramente pode popular tabela Skill se necessário.
// Este ficheiro existe para cumprir `prisma.seed` e validar 500 skills.
async function main() {
  console.log(`Taxonomy: ${SKILLS.length} skills carregadas`);
  if (SKILLS.length !== 500) {
    throw new Error(`Taxonomia deve ter 500 skills, encontrou ${SKILLS.length}`);
  }
  const ids = new Set(SKILLS.map((s) => s.id));
  if (ids.size !== 500) {
    throw new Error(`skillIds devem ser únicos: ${SKILLS.length} vs ${ids.size}`);
  }
  console.log("Taxonomy seed OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
