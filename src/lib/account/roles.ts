export type AccountRole = "teacher" | "student";

export function isAccountRole(value: unknown): value is AccountRole {
  return value === "teacher" || value === "student";
}

export function accountRoleLabel(role: AccountRole): string {
  return role === "teacher" ? "Professor" : "Aluno";
}

export function parseClassroomRoles(data: unknown): Record<string, AccountRole> {
  const entries: [string, AccountRole][] = [];
  if (Array.isArray(data)) {
    for (const row of data) {
      if (row && typeof row.user_id === "string" && isAccountRole(row.role)) {
        entries.push([row.user_id, row.role]);
      }
    }
  }
  return Object.fromEntries(entries);
}
