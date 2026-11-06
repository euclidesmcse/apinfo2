# W2Talent — Instruções para Agentes (OpenCode / Muse / Codex)

> **Leia este arquivo assim que abrir este projeto.** Ele é a fonte rápida do contexto — economiza 10 perguntas.

## O que é

**W2Talent (w2talent.com)** — Conector simples **Candidatos ↔ Empresas** inspirado no apinfo.com.
- Tese: lista limpa + 1-clique em lote (10/lote, 30/dia) sem Outlook, via proxy `via.w2talent.com`.
- Staging: https://w2talent.euclidespns.workers.dev (onde fica até publicar)
- Domínio final: https://w2talent.com (ainda não publicado, não adicionar custom domain sem ordem explícita)
- Repo: https://github.com/euclidesmcse/w2talent (fonte da verdade — sempre `git push origin main`)

## Stack

Next.js 15 + Tailwind 3.4 + Prisma + Postgres `pgvector:pg16` (vector 1024 + tsvector) + next-intl PT-BR/EN + PWA. Tests: `npm test -- --runInBand` (11 suítes, 129 pass). Deploy: Cloudflare Pages/Workers via OpenNext (`npx opennextjs-cloudflare`). 10 vagas demo + 5 candidatos demo via `lib/demo-data.ts` (fallback estático sem DB).

## Onde parou (atualizar a cada etapa)

- **2026-11-06 — Fase 1 MVP concluída:** 10 tasks (tasks 1-10) + final review + fix wave. Tags `v0.1.0-fase1-mvp` e `v0.1.1-w2talent-rebrand` e `f612963`.
- **2026-11-06 — Rebrand:** `apinfo2` → `w2talent`, repo renomeado, `via.w2talent.com`.
- **2026-11-06 — Staging live:** Cloudflare Pages `w2talent` no ar em `workers.dev`, auto-deploy em `git push origin main`.
- **2026-11-06 — DB local:** `w2talent-db` (Docker `pgvector:pg16` porta 5437) migrado + seed 10 vagas/5 candidatos. Gerenciado por `scripts/db.sh` (ver `docs/INFRA_TEMPORARIA.md` — remover ao final).
- **2026-11-06 — Visual:** Landing nova (taste-skill split-stage) + headers olive/sage em `/vagas` e `/candidatos`. Tela branca sem CSS corrigida (a097ba0). Página `/` 404 corrigida (f6f2071).
- Próximo: Fase 1.1 polish ou Fase 2 (Fase 2/3 no spec).

## Fontes da verdade (ler nesta ordem)

1. `docs/superpowers/specs/2026-11-07-w2talent-design.md` — design aprovado (intent, fases, schema canônico, fluxos)
2. `docs/superpowers/plans/2026-11-07-w2talent-fase1-mvp.md` — plano 10 tasks (file structure, interfaces, review focus)
3. `.superpowers/sdd/2026-11-07-w2talent-fase1-mvp/progress.md` — ledger (task 1..10 complete, deferred minors, rulings)
4. `docs/INFRA_TEMPORARIA.md` — o que é temporário (w2talent-db) e como remover
5. `docs/GUIA_TRABALHO.md` — como continuar de outro notebook via SSH 192.168.1.254

## Regras operacionais (obrigatórias)

- **SEMPRE** `git push origin main` após cada etapa — GitHub é a fonte, nunca só local.
- **Nunca** publicar `w2talent.com` sem ordem explícita do Euclides. Staging é `workers.dev`.
- **Não** migrar `w2talent-db` para K8s sem pedido. Manter em Docker local até produção.
- **Sempre** ler este `AGENTS.md` + `progress.md` ao abrir o projeto em nova sessão.

## Comandos rápidos

```bash
cd ~/projetos/w2talent
git pull origin main
./scripts/db.sh status   # ou up
DATABASE_URL="postgresql://w2talent:w2talent@localhost:5437/w2talent" npm run dev
npm test -- --runInBand
npm run build
```
