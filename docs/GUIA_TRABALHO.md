# Guia de Trabalho — W2Talent (Fonte da verdade: GitHub)

> **Regra de ouro:** Nada fica só local. Toda etapa termina com `git push origin main`. O ponto centralizador é **https://github.com/euclidesmcse/w2talent** — outras pessoas colaboram por lá.

## 1) Continuar de outro notebook via SSH (caso do Euclides)

Cenário: amanhã você vai usar **outro notebook na rede 192.168.1.*** e vai conectar via **SSH no servidor 192.168.1.254** (onde está o projeto e o `w2talent-db`).

### Passo a passo (copiar e colar)

No notebook novo, abra o terminal:

```bash
# 1) Conectar no servidor (substitua euclides se seu usuário for outro)
ssh euclides@192.168.1.254

# 2) Ir para o projeto
cd ~/projetos/w2talent

# 3) Sempre começar com pull — pega o que está no GitHub (prioridade)
git pull origin main

# 4) Subir o banco local (se for testar com Postgres real)
./scripts/db.sh up
./scripts/db.sh status   # deve mostrar Vacancy 10 / CandidateProfile 5

# 5) Instalar deps se for a primeira vez neste notebook (via SSH já está no servidor, mas se faltar algo)
npm ci
npx prisma generate

# 6) Rodar o app local (opcional, para testar antes do push)
DATABASE_URL="postgresql://w2talent:w2talent@localhost:5437/w2talent" npm run dev
# abre http://localhost:3000  — mas você testa staging em https://w2talent.euclidespns.workers.dev

# 7) Trabalhar normalmente — fazer commit e SEMPRE push
git status
git add -A
git commit -m "feat: minha alteração"
git push origin main
# cada push dispara: GitHub Actions (CI) + Cloudflare Pages (deploy workers.dev)
```

### Retomar o OpenCode no servidor

O OpenCode roda **no servidor**, não no notebook. Após o `ssh`:

```bash
cd ~/projetos/w2talent

# ver sessões anteriores (se quiser retomar)
~/.local/bin/opencode session list 2>&1 | head -20

# iniciar/reabrir OpenCode no projeto
~/.local/bin/opencode
# ou
npx opencode
```

Dica: use `tmux` ou `screen` para não perder a sessão se fechar o notebook:

```bash
tmux new -s w2talent
# dentro do tmux, rode opencode / npm run dev
# desanexar: Ctrl+b, d
# re-anexar depois: tmux attach -t w2talent
```

### VS Code (alternativa visual)

1. No notebook, instale a extensão **Remote - SSH**
2. `Ctrl+Shift+P` → `Remote-SSH: Connect to Host` → `euclides@192.168.1.254`
3. `File` → `Open Folder` → `/home/euclides/projetos/w2talent`
4. Terminal integrado já é o do servidor — use os mesmos comandos acima

### Troubleshooting

| Problema | O que fazer |
|----------|-------------|
| `ssh: Connection refused` | `ping 192.168.1.254` — se não responde, servidor desligado ou firewall bloqueando porta 22 |
| `git pull` com conflito | `git stash` → `git pull` → `git stash pop` e resolver |
| `DATABASE_URL` não conecta | `./scripts/db.sh status` — se `w2talent-db` não estiver `Up`, rode `./scripts/db.sh up` |
| `npm ci` pede `DATABASE_URL` | `DATABASE_URL="postgresql://w2talent:w2talent@localhost:5437/w2talent" npm ci` ou `npx prisma generate` com a env |
| Esqueci de dar push | `git log --oneline -3` vs `git log origin/main --oneline -3` — se divergir, faça `git push` imediatamente |

## 2) Fluxo padrão (sempre via GitHub)

1. `git pull origin main` (começa atualizado)
2. Cria branch se for feature maior: `git checkout -b feat/minha-feature`
3. Código + `npm test -- --runInBand` + `npm run build` locais (ou deixa o CI fazer)
4. `git add -A && git commit -m "..." && git push origin <branch>`
5. Abre PR no GitHub (`gh pr create`) — merge só após CI verde
6. Para hotfix direto no `main` (como fizemos no staging): `git push origin main` dispara deploy em https://w2talent.euclidespns.workers.dev

## 3) O que fica só até a produção

Ver `docs/INFRA_TEMPORARIA.md` — container `w2talent-db` em `5437` é temporário, será removido quando migrar para Postgres com pgvector em produção (Neon/Supabase).

## 4) Links

- Repo: https://github.com/euclidesmcse/w2talent
- Staging (onde fica até publicar): https://w2talent.euclidespns.workers.dev
- Domínio final (ainda não publicado): https://w2talent.com
- Actions (CI): https://github.com/euclidesmcse/w2talent/actions
