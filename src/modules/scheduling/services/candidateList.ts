export type AllocationCandidate = {
  userId: string;
  name: string;
  count30d: number;
  unavailable: boolean;
};

type MembershipForCandidate = {
  userId: string;
  role: "LEADER" | "VOLUNTEER";
  user: { name: string };
};

// Monta a lista de candidatos pra uma vaga: qualquer membro ativo do
// ministerio (LEADER ou VOLUNTEER — quem serve tambem pode ser alocado),
// deduplicado por userId (uma pessoa pode ter as duas memberships), ordenado
// por menor carga nos ultimos 30 dias primeiro.
export function buildCandidateList(params: {
  memberships: MembershipForCandidate[];
  countByUser: Map<string, number>;
  unavailableUserIds: Set<string>;
}): AllocationCandidate[] {
  const byUserId = new Map<string, AllocationCandidate>();
  for (const m of params.memberships) {
    if (byUserId.has(m.userId)) continue;
    byUserId.set(m.userId, {
      userId: m.userId,
      name: m.user.name,
      count30d: params.countByUser.get(m.userId) ?? 0,
      unavailable: params.unavailableUserIds.has(m.userId),
    });
  }
  return [...byUserId.values()].sort((a, b) => a.count30d - b.count30d);
}
