# W2Talent

Conector simples e inteligente **Candidatos <-> Empresas** inspirado no [apinfo.com](https://apinfo.com) — agora **W2Talent (w2talent.com)**.

- Busca semantica natural ("Analista Cloud remoto CLT 12k") com lista limpa
- Candidatura e contato em **1 clique em lote** (10/lote, 30/dia) — sem Outlook
- CV/Vaga canonicos via IA + taxonomia 500 skills
- Higiene automatica 180d (CV) / 14d (vaga) com nudges n8n
- Responsivo, multilingue PT-BR/EN, LGPD granular

> **AVISO MVP — stores in-memory:** `lib/proxy.ts` e `lib/auth.ts` usam `Map`/array em
> memória (vacancies, applications, OTP, rate limit). Para produção migrar para
> **Prisma (Postgres) + Redis** antes de escalar para múltiplas instâncias.

Spec: `docs/superpowers/specs/2026-11-07-w2talent-design.md`
Plan Fase 1: `docs/superpowers/plans/2026-11-07-w2talent-fase1-mvp.md`
