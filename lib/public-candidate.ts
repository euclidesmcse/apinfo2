// Explicit allowlist: never serialize a database row to a public response.
export function publicCandidate(row: Record<string, any>) {
  const result: Record<string, any> = { id: row.id ?? row.userId };
  for (const key of ["nome", "titulo", "localidade", "modo", "regimePreferido", "pretensaoDe", "pretensaoAte",
    "pretensaoMoeda", "disponibilidade", "stack", "status", "createdAt", "updatedAt"]) {
    if (row[key] !== undefined) result[key] = row[key];
  }
  return result;
}
