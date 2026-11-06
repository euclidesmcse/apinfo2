import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;1,6..96,500&family=Jost:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --bg: #a6b3bc;
              --surface: #e8ecef;
              --paper: #eef1f3;
              --ink: #1c1c1c;
              --muted: #38424a;
              --accent: #2c3620;
              --accent-ink: #e3e2da;
              --field-2: #b7c8be;
              --field-3: #d6c4b8;
            }
            .display { font-family: "Bodoni Moda", serif; font-weight: 500; letter-spacing: -0.02em; line-height: 0.95; }
            .text-jost { font-family: "Jost", sans-serif; letter-spacing: 0.01em; line-height: 1.6; }
            .split { min-height: 100vh; display: grid; grid-template-columns: 48% 52%; }
            @media (max-width: 900px) { .split { grid-template-columns: 1fr; } .fixed-half { position: relative !important; height: 60svh !important; } }
            .fixed-half { position: sticky; top: 0; height: 100svh; overflow: hidden; background: var(--bg); }
            .reading { background: var(--paper); padding: 48px 56px; }
            @media (max-width: 900px) { .reading { padding: 28px 20px; } }
            .stripe { display: flex; height: 56px; gap: 0; }
            .stripe span { flex: 1; background: var(--ink); }
            .stripe span:nth-child(even) { background: var(--paper); border: 1px solid var(--ink); border-top: 0; border-bottom: 0; }
            .card { background: var(--paper); border: 1px solid rgba(28,28,28,0.12); border-radius: 16px; overflow: hidden; }
            .btn-ink { background: var(--ink); color: #fff; border-radius: 999px; padding: 14px 22px; font-size: 15px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; }
            .btn-ink:hover { background: #000; }
            .ghost { border: 1px solid var(--ink); border-radius: 999px; padding: 14px 22px; font-size: 15px; font-weight: 500; color: var(--ink); }
            .ghost:hover { background: var(--ink); color: #fff; }
            .module { display: grid; grid-template-columns: 360px 1fr; gap: 20px; align-items: start; max-width: 640px; }
            @media (max-width: 900px) { .module { grid-template-columns: 1fr; } }
            .panel { background: #fff; border: 1px solid rgba(28,28,28,0.08); border-radius: 8px; min-height: 140px; padding: 14px; overflow: hidden; }
            .slider-track { height: 8px; background: rgba(28,28,28,0.12); border-radius: 999px; position: relative; }
            .slider-fill { height: 8px; background: var(--ink); border-radius: 999px; }
            .thumb { width: 32px; height: 32px; background: var(--accent); border-radius: 4px; position: absolute; top: 50%; transform: translate(-50%, -50%); }
          `,
        }}
      />
      <div className="split">
        {/* FIXED HALF — photograph / product fragment */}
        <div className="fixed-half">
          <img
            src="https://picsum.photos/id/813/1600/1200"
            alt="Lago calmo ao amanhecer — horizonte suave, luz difusa"
            width={1600}
            height={1200}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(28,28,28,0.08), transparent 40%, rgba(28,28,28,0.18))",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 28,
              left: 28,
              right: 28,
              background: "rgba(238,241,243,0.92)",
              backdropFilter: "blur(6px)",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "Jost, sans-serif",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--muted)" }}>Staging • w2talent.euclidespns.workers.dev</span>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>Sem Outlook • 1 clique</span>
          </div>
        </div>

        {/* SCROLLING COLUMN */}
        <div className="reading text-jost" style={{ color: "var(--ink)" }}>
          {/* HERO CARD */}
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="stripe" aria-hidden>
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
            <div style={{ padding: "28px 28px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "Jost, sans-serif", fontSize: 11, letterSpacing: 0.14 + "em", textTransform: "uppercase", color: "var(--muted)" }}>
                via.w2talent.com • LGPD granular • PT-BR / EN
              </div>
              <div className="display" style={{ fontSize: 42, marginTop: 10 }}>
                W<sup style={{ fontSize: "0.6em" }}>2</sup>Talent
              </div>
              <h1 className="display" style={{ fontSize: "clamp(36px, 3.4vw, 52px)", marginTop: 14, fontWeight: 500 }}>
                Candidatos e empresas,
                <br />
                sem fricção.
              </h1>
              <p style={{ margin: "14px auto 0", maxWidth: 36 + "ch", fontSize: 17, color: "var(--muted)", lineHeight: 1.55 }}>
                A lista limpa que o apinfo.com prometeu, agora com busca semântica e candidatura em lote.
                Um clique, dez vagas. Sem Outlook.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
                <Link href="/vagas" className="btn-ink">
                  Ver vagas <span aria-hidden>→</span>
                </Link>
                <Link href="/candidatos" className="ghost">
                  Buscar candidatos
                </Link>
              </div>
              <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 18, fontSize: 13, color: "var(--muted)" }}>
                <Link href="/vagas?q=Analista%20Cloud" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                  Analista Cloud
                </Link>
                <Link href="/vagas?q=AWS%20remoto" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                  AWS remoto
                </Link>
                <Link href="/candidatos?q=Cloud" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                  Ver talentos
                </Link>
              </div>
            </div>
          </div>

          {/* PROOF LINE */}
          <p style={{ marginTop: 28, fontSize: 13, color: "var(--muted)", maxWidth: 560 }}>
            10 vagas demo + 5 candidatos demo carregados. Staging sem banco — ideal para testar a tese.
          </p>

          {/* FEATURES — Small proof beside text */}
          <div style={{ marginTop: 64 }}>
            <h2 className="display" style={{ fontSize: 26 }}>A lista que acaba com o Outlook.</h2>
            <p style={{ marginTop: 8, color: "var(--muted)", maxWidth: 46 + "ch" }}>
              Cada linha tem o mesmo vocabulário. A IA extrai o CV para o canônico, a busca entende sinônimo, você só escolhe e dispara.
            </p>

            <div style={{ marginTop: 36, display: "grid", gap: 28 }}>
              {[
                {
                  k: "Lista limpa",
                  d: "Tabela no desktop, cards no mobile. Mesmo dado. ☐ checkbox + 🔍 lupa abre o detalhe sem perder seleção. Faixa, regime, remoto e Top 3 skills no mesmo lugar.",
                  ui: (
                    <div className="panel" style={{ fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
                        <span style={{ width: 14, height: 14, border: "1px solid #999", display: "inline-block" }} /> Analista Cloud Pleno — AWS
                        <span style={{ marginLeft: "auto" }}>🔍</span>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                        <span style={{ background: "#111", color: "#fff", borderRadius: 999, padding: "2px 8px" }}>aws</span>
                        <span style={{ background: "#eee", borderRadius: 999, padding: "2px 8px" }}>terraform</span>
                        <span style={{ color: "#888" }}>+ remoto • CLT • R$ 9–13k • hoje • 🔒</span>
                      </div>
                    </div>
                  ),
                },
                {
                  k: "1-clique em lote",
                  d: "Selecione até 10, clique em Candidatar. Cada vaga vira um thread id@via.w2talent.com com o CV canônico anexado. 30/dia. 207 parcial se uma expirar.",
                  ui: (
                    <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 500 }}>Candidatar (3)</span>
                      <span style={{ background: "var(--ink)", color: "#fff", borderRadius: 999, padding: "6px 14px", fontSize: 12 }}>Candidatar (3) →</span>
                    </div>
                  ),
                },
                {
                  k: "Proxy LGPD",
                  d: "Antes da resposta, todo contato é mascarado. Ao responder no proxy, o contato direto é liberado implicitamente — decisão B do spec, sem clique bilateral.",
                  ui: (
                    <div className="panel" style={{ fontFamily: "monospace", fontSize: 11 }}>
                      <div>thr_9f3a…@via.w2talent.com</div>
                      <div style={{ color: "#888" }}>ra***@demo.w2talent.com 🔒 → ana@demo.w2talent.com (após respondido)</div>
                      <div style={{ marginTop: 6, height: 6, background: "var(--accent)", width: "40%", borderRadius: 999 }} />
                    </div>
                  ),
                },
                {
                  k: "Higiene automática",
                  d: "CV expira em 180 dias com 3 nudges (D150/165/175). Vaga dura 14 dias, renova com 1 clique. Sem vaga fantasma, sem CV de 2019.",
                  ui: (
                    <div className="panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                      <div style={{ background: "#f6f6f6", borderRadius: 8, padding: 8 }}>D150 → aviso 1<br />D165 → aviso 2<br />D175 → último aviso</div>
                      <div style={{ background: "var(--field-2)", borderRadius: 8, padding: 8 }}>D180 → arquiva<br />+30d → purge LGPD<br />D14 → vaga arquiva</div>
                    </div>
                  ),
                },
              ].map((m) => (
                <div key={m.k} className="module">
                  <div>{m.ui}</div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.2 }}>{m.k}</h3>
                    <p style={{ marginTop: 6, fontSize: 15, color: "var(--muted)" }}>{m.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HOW IT WORKS — Drag through stages */}
          <div style={{ marginTop: 72, background: "#fff", borderRadius: 12, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>Como funciona</div>
                <div className="display" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", marginTop: 6 }}>
                  Buscar. Escolher.
                  <br />
                  Disparar.
                </div>
                <p style={{ marginTop: 10, color: "var(--muted)" }}>Quatro gestos. Todo o resto a plataforma faz.</p>
              </div>
              <div className="panel" style={{ background: "var(--paper)" }} data-ui>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Etapa 02 — Selecionar</div>
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  {[1, 2, 3].map((i) => (
                    <span key={i} style={{ width: 28, height: 28, borderRadius: 6, background: i === 2 ? "var(--ink)" : "#fff", border: "1px solid #ddd", display: "grid", placeItems: "center", color: i === 2 ? "#fff" : "#999" }}>
                      ✓
                    </span>
                  ))}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>3 selecionados</span>
                </div>
                <div style={{ marginTop: 12 }} className="slider-track">
                  <div className="slider-fill" style={{ width: "50%" }} />
                  <div className="thumb" style={{ left: "50%" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>Buscar</span>
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>Selecionar</span>
                  <span>Lupa</span>
                  <span>Disparar</span>
                </div>
              </div>
            </div>
          </div>

          {/* STATS — Photograph with figure tiles */}
          <div style={{ marginTop: 48 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>Números da tese</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 0, marginTop: 12, overflow: "hidden", borderRadius: 12 }}>
              <img src="https://picsum.photos/id/926/1200/900" alt="Figura na névoa — horizonte quieto" width={1200} height={900} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
              <div style={{ display: "grid", gridTemplateRows: "1fr 1fr" }}>
                <div style={{ background: "var(--field-2)", padding: 28 }}>
                  <div className="display" style={{ fontSize: "clamp(44px, 5vw, 72px)" }}>10</div>
                  <div style={{ fontSize: 14, color: "var(--muted)" }}>
                    vagas por lote.
                    <br />
                    Uma seleção, um disparo.
                  </div>
                </div>
                <div style={{ background: "var(--field-3)", padding: 28 }}>
                  <div className="display" style={{ fontSize: "clamp(44px, 5vw, 72px)" }}>30</div>
                  <div style={{ fontSize: 14, color: "var(--muted)" }}>
                    candidaturas por dia.
                    <br />
                    Sem spam, sem Outlook.
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid rgba(0,0,0,0.06)" }}>
                <div className="display" style={{ fontSize: 32 }}>180d / 14d</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Higiene CV e vaga. 3 nudges antes de arquivar.</div>
              </div>
              <div style={{ background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 12, padding: 18 }}>
                <div className="display" style={{ fontSize: 32 }}>500</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>skills normalizadas. Sinônimo vira id canônico.</div>
              </div>
            </div>
          </div>

          {/* FAQ — Answers as reading text */}
          <div style={{ marginTop: 64 }}>
            <h2 className="display" style={{ fontSize: 26 }}>Perguntas que já respondemos.</h2>
            <div style={{ marginTop: 16, columns: 2, columnGap: 32, fontSize: 15 }} className="faq">
              <p style={{ breakInside: "avoid", marginBottom: 14 }}>
                <strong>Precisa pagar para ver telefone?</strong> Não. O contato fica mascarado até a resposta no proxy; ao responder, libera o direto. Decisão B, sem paywall na lista.
              </p>
              <p style={{ breakInside: "avoid", marginBottom: 14 }}>
                <strong>O que é o CV canônico?</strong> Você sobe PDF, a IA extrai para o mesmo vocabulário de 500 skills e você confirma em uma tela antes de publicar.
              </p>
              <p style={{ breakInside: "avoid", marginBottom: 14 }}>
                <strong>E se a vaga expirar no meio do lote?</strong> 207 parcial: o que deu certo envia, o que expirou volta com 410 vaga expirada, sem rollback do lote.
              </p>
              <p style={{ breakInside: "avoid", marginBottom: 14 }}>
                <strong>Funciona no celular?</strong> Sim. Tabela no desktop, cards no mobile. A barra Candidatar fica fixa e não some atrás do teclado.
              </p>
              <p style={{ breakInside: "avoid", marginBottom: 14 }}>
                <strong>Por que “inspirado no apinfo.com”?</strong> O apinfo é o ponto de encontro desde 1997. Mantemos a simplicidade e corrigimos a fricção.
              </p>
              <p style={{ breakInside: "avoid", marginBottom: 14 }}>
                <strong>w2talent.com já está no ar?</strong> Ainda não. Staging em workers.dev até o conteúdo e a LGPD granular ficarem redondos. Quando publicar, é um CNAME.
              </p>
            </div>
          </div>

          {/* CTA — plain sentence */}
          <div style={{ marginTop: 80, paddingTop: 40, borderTop: "1px solid rgba(28,28,28,0.1)" }}>
            <p style={{ fontSize: 18, maxWidth: 34 + "ch" }}>Teste a lista agora. Se a fricção sumir, a tese está certa.</p>
            <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/vagas?q=Analista%20Cloud" className="btn-ink">
                Abrir vagas demo
              </Link>
              <Link href="/candidatos?q=Cloud" className="ghost">
                Ver candidatos demo
              </Link>
            </div>
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
              10 vagas + 5 candidatos demo já carregados. Sem banco, sem login — só para sentir a lista limpa e o lote.
            </p>
          </div>

          <footer style={{ marginTop: 60, padding: "24px 0", borderTop: "1px solid rgba(28,28,28,0.08)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>
            <span>W<sup>2</sup>TALENT • w2talent.com • via.w2talent.com</span>
            <span>© 2026 • Cold start do zero</span>
          </footer>
        </div>
      </div>
    </>
  );
}
