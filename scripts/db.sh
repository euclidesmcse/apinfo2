#!/usr/bin/env bash
set -euo pipefail
DB_NAME=w2talent-db
PG_USER=w2talent
PG_PASS=w2talent
PG_DB=w2talent
PG_PORT=5437
IMAGE=pgvector/pgvector:pg16
DATABASE_URL="postgresql://${PG_USER}:${PG_PASS}@localhost:${PG_PORT}/${PG_DB}"

cmd="${1:-help}"
case "$cmd" in
  up)
    if docker ps --format '{{.Names}}' | grep -q "^${DB_NAME}$"; then echo "✓ $DB_NAME já está rodando (porta $PG_PORT)"; exit 0; fi
    if docker ps -a --format '{{.Names}}' | grep -q "^${DB_NAME}$"; then docker start "$DB_NAME" >/dev/null && echo "✓ $DB_NAME iniciado"; else docker run -d --name "$DB_NAME" --restart unless-stopped -e POSTGRES_USER="$PG_USER" -e POSTGRES_PASSWORD="$PG_PASS" -e POSTGRES_DB="$PG_DB" -p "${PG_PORT}:5432" "$IMAGE" >/dev/null && echo "✓ $DB_NAME criado em $PG_PORT"; fi
    for i in 1 2 3 4 5 6; do docker exec "$DB_NAME" pg_isready -U "$PG_USER" >/dev/null 2>&1 && break; sleep 2; done
    docker exec "$DB_NAME" psql -U "$PG_USER" -d "$PG_DB" -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null && echo "✓ extension vector ok"
    echo "DATABASE_URL=$DATABASE_URL"
    ;;
  down) docker stop "$DB_NAME" >/dev/null 2>&1 && echo "✓ $DB_NAME parado" || echo "já parado" ;;
  restart) "$0" down; sleep 2; "$0" up ;;
  reset)
    echo "⚠  Vai apagar o banco $PG_DB (DROP + migrate + seed). Ctrl+C para cancelar (5s)..."; sleep 5
    docker exec "$DB_NAME" psql -U "$PG_USER" -d "$PG_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
    DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy >/dev/null 2>&1 || DATABASE_URL="$DATABASE_URL" npx prisma migrate dev --name init-w2talent >/dev/null 2>&1
    DATABASE_URL="$DATABASE_URL" npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-w2talent.ts
    echo "✓ reset + seed ok (10 vagas, 5 candidatos)"
    ;;
  psql) docker exec -it "$DB_NAME" psql -U "$PG_USER" -d "$PG_DB" "${@:2}" ;;
  status)
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20
    echo "---"
    docker exec "$DB_NAME" psql -U "$PG_USER" -d "$PG_DB" -c "SELECT 'CompanyProfile' as tabela, count(*) FROM \"CompanyProfile\" UNION ALL SELECT 'Vacancy', count(*) FROM \"Vacancy\" UNION ALL SELECT 'CandidateProfile', count(*) FROM \"CandidateProfile\" UNION ALL SELECT 'Application', count(*) FROM \"Application\";" 2>&1 | tail -15
    echo "DATABASE_URL=$DATABASE_URL"
    ;;
  logs) docker logs -f "$DB_NAME" ;;
  *) echo "Uso: $0 {up|down|restart|reset|psql|status|logs}"; exit 1 ;;
esac
