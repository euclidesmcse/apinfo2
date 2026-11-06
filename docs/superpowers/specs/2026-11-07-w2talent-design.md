# W2Talent — Design Doc

**Data:** 2026-11-07
**Autor:** Euclides + Muse Spark (brainstorming superpowers)
**Status:** ✅ APROVADO — pós-builder-check (2026-11-07), pronto para planning
**Origem:** https://apinfo.com (inspiração) → marca própria **W2Talent (w2talent.com)** — projeto novo, sem vínculo/migração

---

## 1. Intent e o Porquê

**O que é:** Nova plataforma **W2Talent (w2talent.com)** inspirada no APinfo (apinfo.com) — conector simples, limpo e inteligente entre dois polos — **Candidatos <-> Empresas** — eliminando a burocracia que faz os dois lados abandonarem. **Não é fork/migração do apinfo.com.** Cliente era usuário do APinfo, sem acesso operacional/base legada. Brand novo, cold start do zero.

**Por que agora:** O APinfo atual funciona, mas parou no tempo (ColdFusion `.cfm`, listas textuais, fluxos via Outlook). Candidato clica em 30 vagas e precisa abrir Outlook 30x, copiar subject/corpo, anexar PDF 30x. RH preenche vaga por vaga sem indicadores, sem retorno, convivendo com CVs desatualizados e vagas fantasmas. LinkedIn virou rede social, Gupy virou ATS pesado de 7 etapas. Há espaço para um **anti-Gupy**: tão simples quanto o APinfo original, mas com IA invisível fazendo o trabalho chato.

**Tese central:** Inteligência no meio, simplicidade nas pontas. O usuário digita "Analista Cloud" em linguagem natural e recebe lista limpa, padronizada, ranqueada e acionável em 1 clique — sem Outlook, sem copiar e-mail.

---

## 2. Goals, Non-Goals, Anti-Goals

### Goals (o que precisa acontecer para dizer "deu certo" em 3-6 meses)
- G1. Reduzir candidatura de N cliques Outlook para **1 clique por vaga ou N vagas em lote**.
- G2. RH digita busca natural ("Analista Cloud remoto CLT 12k") e recebe **lista limpa em <1s**, paginada, com cards/linhas padronizadas e score de match explicado.
- G3. **Zero vagas fantasmas e zero CVs podres:** expiração automática (CV e vaga) + nudges.
- G4. **Métricas mínimas para RH:** views, candidaturas, taxa de resposta, tempo médio — sem virar BI complexo.
- G5. Funcionar **perfeito em mobile, tablet e desktop**, qualquer browser moderno.
- G6. Base canônica: todo CV e vaga no **mesmo formato**, extraído/normalizado por IA.

### Non-Goals (fica para depois, propositalmente fora do MVP)
- NG1. ATS completo com pipeline Kanban, testes técnicos, entrevistas por vídeo.
- NG2. Rede social / feed / posts / likes.
- NG3. Monetização sofisticada no MVP (assinaturas enterprise, créditos).
- NG4. Tradução humana completa para 10 idiomas (só arquitetura i18n + PT-BR/EN).

### Anti-Goals (se acontecer, falhamos mesmo que tecnicamente funcione)
- AG1. Virar Gupy 2.0: formulário de 40 campos, 7 etapas, complexidade para "parecer enterprise".
- AG2. Exigir que usuário aprenda a usar: se precisa manual, falhou.
- AG3. Expor telefone/e-mail direto sem consentimento (spam, LGPD).
- AG4. Listas despadronizadas, cada CV de um jeito, cada vaga sem faixa/regime.
- AG5. Vaga de 90 dias sem resposta ainda em destaque.

---

## 3. Constraints

- C1. **Simplicidade brutal:** toda ação principal em 1 clique ou seleção em lote. Regra de ouro: "outlook nunca abre".
- C2. **LGPD granular:** consentimentos separados e versionados: (a) tratamento/busca, (b) contato via proxy, (c) nudges/notificações, (d) reescrita por IA/coach, com texto consentido logado e base legal. Um checkbox único não basta.
- C3. **Celular obrigatório como ID mínimo** (ideia 4 do cliente). Outros canais opt-in. OTP WhatsApp/SMS.
- C4. **Responsivo desde o dia 1** (ideia 6). Tabela desktop / cards mobile, mesmo dado.
- C5. **Multilíngue por arquitetura** (ideia 5): i18n nativo, PT-BR + EN no lançamento, busca semântica já multilíngue.
- C6. **IA como coadjuvante invisível + n8n como automação visível.**
- C7. **Performance:** busca <1s p95, paginação server-side, imagens otimizadas.
- C8. **Cold start do zero:** sem migração de base legada. Seeding via vagas primeiro.

---

## 4. Approaches Considerados

### Approach A — Anti-Gupy / Reforma Cirúrgica (RECOMENDADO como Fase 1)
Mantém alma simples do W2Talent, mata as duas burocracias com 1 clique. CV canônico por IA, candidatura 1-clique (sem Outlook), busca semântica + lista limpa + contato em lote via n8n, painel mínimo. **Prós:** valida tese em 6-8 semanas, menor risco, diferenciação máxima. **Contras:** sem ranking super refinado no dia 1.

### Approach B — Matching Vivo + Painel Inteligente (Fase 2)
Tudo de A + matching ativo diário ("5 perfis novos para sua vaga"), score explicado, dashboard funil/taxa resposta, IA sugerindo subject/corpo. **Prós:** ecossistema que trabalha sozinho, retenção. **Contras:** 2-3x tempo, precisa volume de dados.

### Approach C — Conversacional / Auto-piloto (Fase 3)
Site vira vitrine, ação principal via WhatsApp/Telegram: RH pede "2 devs Node 12k" e recebe lista no zap. **Prós:** fricção zero absoluta. **Contras:** perde SEO/histórico, dependência WhatsApp, menor controle.

**Escolha aprovada:** **A → B → C em fases**. Ver §5.3.

---

## 5. Design — Visão Geral

### 5.1 Personas & ICP Estratégico

**Decisão estratégica (cliente delegou, resposta 3):**

- **Fase 1 — ICP = Consultorias/PMEs de TI sem ATS** (até ~300 funcionários, RH que odeia Gupy por preço/burocracia). Proposta = **substituto do Gupy**: "poste em 2 minutos, busque em 1 clique, sem Kanban". Canal: comunidades TI BR, SEO long-tail "vaga analista cloud CLT".
- **Fase 2 — Expande para Enterprise com ATS** como **feeder**: "source de CVs limpos que injeta via webhook/n8n no Gupy/Lever/Kenoby". Isso vira integração P1 da Fase 2, não MVP.

- **Candidata Ana (Dev Cloud Pl):** quer ver vagas limpas, candidatar em lote, saber se RH viu, receber feedback "o que falta para Sr".
- **RH Carlos (Tech Recruiter PME):** quer digitar "Analista Cloud Sr remoto" e já ter 20 CVs ranqueados, contatar 10 em lote sem copiar e-mail, ver métricas.

### 5.2 Princípios de UX (ideia 3 do cliente = padrão do sistema)
- **Tabela desktop / Cards mobile, mesmo contrato.** Lista = `[ ] checkbox | resumo (foto/iniciais, cargo, top 3 skills, cidade/remoto, regime, faixa/pretensão, atualização) | [lupa]` → lupa abre modal (desktop) / bottom sheet (mobile) com detalhe completo + ação. Fechar (X/ESC/overlay) **preserva busca, paginação, seleção e scroll**.
- **Seleção persistente cross-page** com barra sticky global `Candidatar (3)` / `Contatar (5)` + drawer "3 selecionados — limpar". Limite: **10 por lote, 30/dia** por usuário (anti-spam). Candidatura duplicada na mesma vaga bloqueada com aviso.
- **Swipe como camada opcional mobile Fase 2:** direita = salvar/interesse, esquerda = dispensar, sempre com fallback checkbox + alternativa teclado (WCAG 2.5.1).
- **WCAG 2.1 AA:** `<table>` semântica, `aria-label` em cards, focus trap no modal com retorno de foco para lupa que abriu, contraste AA, navegação teclado completa.

### 5.3 Fases (ideias 1-9 distribuídas — aprovado cliente)

#### Fase 1 — MVP Anti-burocracia (6-8 semanas) — valida tese
Inclui: **1 (180d), 2 (14d), 3, 4 (B), 6, 8, 9-simples**

- **1. Higiene CV (cliente aprovou ajuste):** **180 dias** sem atualização → arquiva (some da busca, recupera em 1 clique). Nudges n8n idempotentes: D150 aviso1, D165 aviso2, D175 aviso3 (e-mail + WhatsApp/Telegram se opt-in), D180 arquiva. Purge definitivo (LGPD hard-delete: Postgres + pgvector + logs) após **30 dias arquivado**. Mensagens idempotentes (dedupe por `userId+marco`).
- **2. Higiene vagas (14d):** vaga padrão **14 dias**, aviso D12, renova +14 com 1 clique, senão expira/arquiva. Sem vaga fantasma. Idempotente.
- **3. Lista limpa + modal:** §5.2. Colunas fixas: checkbox, identidade, cargo, skills (+2), local/remoto, regime, faixa (ou "—" se não informada), há quanto tempo. Lupa sempre visível.
- **4. Comunicação — decisão B:** celular obrigatório (OTP) + e-mail obrigatório. Até aceite, **contato via proxy** `id@via.w2talent.com` (e tel proxy se fornecido). **Liberação do contato direto = implícita ao responder no proxy** (resposta conta como consentimento, logado), não exige clique bilateral "Liberar". Pré-resposta, lista mostra e-mail/tel mascarados com cadeado + tooltip LGPD.
- **6. Responsivo:** mobile-first, breakpoints 360/768/1024/1280, últimos 2 anos Chrome/Firefox/Safari/Edge + Safari iOS + Chrome Android. Barra de ação sticky não cobre último card nem some atrás do teclado virtual.
- **8. Canônico aprimorado:** ingestão PDF/DOCX/LinkedIn → IA extrai para schema fixo (§5.4) com **taxonomia fechada ~500 skills + sinônimos** (ex: AWS=Amazon Web Services, .NET). Validação **pelo próprio candidato** em 1 tela preview editável antes de publicar. Mesmo padrão para vaga. Form em branco para quem não tem PDF.
- **9-simples:** 1-clique e seleção em lote já entregam "tão fácil quanto Tinder" sem swipe.

**Respostas cliente incorporadas:** 1=novo projeto (sem migração), 2=vagas primeiro (seeding), 3=PME sem ATS como ICP Fase 1, 4=B (libera ao responder), 5=aprova 14d/180d, 6=aprova 10/lote, 30/dia, 1 template com preview.

#### Fase 2 — Ecossistema Vivo
- **5. Multilíngue ativo:** liga ES, auto-detecção idioma CV, tradução on-the-fly no modal (não duplica embedding), busca cross-língua com `multilingual-e5`.
- **7. Coach IA:** campo obrigatório `objetivoCrescimento` (texto livre + sugestões). IA cruza CV vs objetivo → gap 3-5 bullets acionáveis. Não bloqueia candidatura.
- **Ranking explicado:** `94% match — 3 anos AWS, remoto, inglês avançado; falta: Kubernetes`. Pesos: skills 40%, nível 20%, regime/local 20%, recência 10%, completude 10%. Vaga patrocinada **nunca fura score** — se houver boost pago, é label separada "Patrocinada" sem alterar ranking meritocrático.
- **Alertas n8n:** vaga nova → top 20 matches; CV novo → RHs com busca salva; 5 dias sem resposta → nudge. Respeita janela 24h WABA (fora dela, fallback e-mail + template aprovado).
- **Dashboard RH:** views, candidaturas, taxa resposta, tempo médio, distribuição skill. North Star Fase 2: **liquidez = 30% buscas geram contato, 50% contatos geram resposta em 7 dias** (não CTR).
- **Swipe mobile + integração ATS feeder** (webhook/n8n export para Gupy/Lever).

#### Fase 3 — Auto-piloto Conversacional
- WhatsApp/Telegram como **alternativa** (opt-in): RH "preciso 2 Clouds 12k" → lista no chat. Custo WABA e templates aprovados pré-requisito.

### 5.4 Schema Canônico (Fase 1)

**CompanyProfile (novo — exigido builder check)**
- `id, nome, cnpj?, logoUrl, site, validacao{status, data}, vagasAtivasCount, plano{free, pro}`

**CandidateProfile (CV)**
- `id, userId, nome, fotoUrl, titulo, resumo3linhas (IA), localidade, modo{remoto,hibrido,presencial}, regimePreferido[], pretensaoFaixa{de,ate,moeda}?, disponibilidade, objetivoCrescimento* (obrigatório), stack[{skillId (taxonomia), nivel, anos}], experiencias[{cargo, empresa, periodo, bullets}], formacao[], idiomas[], links[], contato{celular*, email*, whatsappOpt, telegramOpt, telefoneOpt}, consentimentos{tratamentoBuscaV, contatoProxyV, nudgesV, iaReescritaV, textosOriginais[]}, status{ativo, arquivado, purgado}, updatedAt, expiresAt, idiomaOriginal`

**Vacancy (Vaga)**
- `id, companyId, titulo, stack[{skillId}], nivel, regime, localidade, faixaSalarial{de,ate,moeda}?, descricaoBullets, beneficios[], tipoContrato, expiresAt (14d), renovacoes, views, candidaturasCount, status{ativa, arquivada}`

**Application / Contact (ponte)**
- `id, vacancyId?, candidateId, companyId, origem{candidaturaLote, contatoLote, swipe}, proxyThreadId, status{enviado, visualizado, respondido, arquivado}, limiteLote{n,loteId}, createdAt`

**Outros:** `otp_codes{userId, codigo, expiraEm (5min), tentativas, bloqueio}`, `consent_logs{userId, versao, texto, baseLegal, timestamp}`

### 5.5 Fluxos Críticos

**Candidato lote:** Busca → tabela/cards → checkbox 3 → lupa confere → fecha (seleção intacta) → `Candidatar (3)` → confirmação revisável (lista 3 com status por item) → envia via proxy com CV canônico → `Minhas candidaturas: enviado > visualizado > respondido`. Falha parcial (1 vaga expirou) → confirma 2/3 + erro explicado por item, sem rollback total.

**RH lote:** Busca "Analista Cloud Sr remoto" → ranqueia → seleciona 5 → lupa CV → `Contatar (5)` → **1 template editável** (IA sugere subject/corpo) + preview por candidato (expande se quiser personalizar 1) → dispara 5 threads proxy separadas → painel "5 enviados, 2 visualizados". Limite 10/lote, 30/dia.

**Nudges n8n:** Cron diário idempotente varre `expiresAt` → D150/165/175 e D12 → arquiva D180/D14 → remove do índice (filtro `status=ativo`) → purge D+30.

### 5.6 IA + n8n
- **IA:** extração para canônico (com taxonomia), embeddings `multilingual-e5`, score + explicação, coach, sugestão templates, detecção vaga fria.
- **n8n:** ingestão → extração → indexação → notificação → expiração → proxy e-mail (SES/Resend `via.*`) / WhatsApp. Retry + log + idempotência.

### 5.7 i18n e Acessibilidade
- `next-intl`, fallback PT-BR, formatação locale, embeddings multilíngues.
- WCAG 2.1 AA: contraste, foco, teclado, aria, swipe com alternativa botão.

### 5.8 Tech Sugerido
- Frontend: Next.js 15 + shadcn/ui + Tailwind, SSR para SEO, PWA leve.
- Backend: Next API ou NestJS, Postgres, Prisma, **pgvector** (Fase 1), evolui se volume >100k CVs.
- IA: OmniRoute (já em opencode.jsonc).
- Automação: n8n self-hosted queue mode.
- Auth: OTP celular 5min + e-mail, JWT, rate limit.
- Infra: Docker, CI.

### 5.9 Métricas de Sucesso
- Produto: candidatura mediana <30s (1 vaga), <60s (5 lote); busca p95 <800ms; CTR lupa >40%; conversão lote >25%.
- Marketplace (North Star): **liquidez 30% buscas→contato, 50% contatos→resposta em 7d**; NPS >40.
- Higiene: CVs arquivados <5% com recuperação <1 semana; vagas expiradas <2% renovadas.

---

## 6. Open Questions Residuais (builder decide, não bloqueiam Fase 1)
- Provedor OTP (Twilio vs Zenvia vs WAPI) e custo mensagem.
- pgvector vs dedicado em escala >100k (estimativa inicial 0 → cresce; Fase 1 pgvector basta).
- Domínio proxy `via.*` + SES/Resend retenção.

---

## 7. Decisões do Builder Check Incorporadas (para auditoria)

**Tech:** LGPD granular (4 consentimentos versionados), proxy liberação implícita B, taxonomia 500 skills, validação pelo candidato (não fila humana), idiomaOriginal + tradução on-the-fly, OTP 5min com fallback SMS, CompanyProfile, purge D+30, idempotência + janela 24h WABA.

**UX:** cross-page persistente com drawer, lote 10/30 com confirmação parcial, 1 template + preview por candidato, modal/desktop vs bottom sheet/mobile com preservação scroll, contrato tabela fixo, feedback `enviado>visualizado>respondido` in-app + push opt-in, empty states com sugestão IA, sticky bar mobile-safe.

**Growth:** cold start do zero, ICP Fase1=PME sem ATS / Fase2=Enterprise feeder, seeding vagas primeiro (2k vagas curadas antes de escalar CVs), posicionamento "anti-Gupy substituto" Fase1, moat = simplicidade + comunidade TI BR + dados de matching (não só preço), monetização Fase1 = freemium 3 contatos/vagas grátis depois paywall sem quebrar ranking meritocrático, SEO greenfield (sem 301 legado).

---

## 8. Próximos Passos (HARD GATE superpowers)

1. ✅ Builder check 3x concluído e incorporado.
2. ⏳ **Aprovação congelada** — este doc é fonte da verdade.
3. → Invocar `superpowers:writing-plans` para quebrar Fase 1 em plano executável.

---

**Aprovação:** Euclides aprovou distribuição fases + 6 respostas (2026-11-07). Pronto para planning.
