export type AllocationCandidate = {
  userId: string;
  name: string;
  count30d: number;
  unavailable: boolean;
  capable: boolean;
};

type MembershipForCandidate = {
  userId: string;
  role: "LEADER" | "VOLUNTEER";
  user: { name: string };
};

// Monta a lista de candidatos pra uma vaga: qualquer membro ativo do
// ministerio (LEADER ou VOLUNTEER — quem serve tambem pode ser alocado),
// deduplicado por userId (uma pessoa pode ter as duas memberships), ordenado
// por capacitado na funcao primeiro (CAPA-05.1), depois por menor carga nos
// ultimos 30 dias (CAPA-05.4). capableUserIds vazio preserva a ordenacao
// antiga (so por carga), ja que todos caem no mesmo grupo "nao capacitado".
export function buildCandidateList(params: {
  memberships: MembershipForCandidate[];
  countByUser: Map<string, number>;
  unavailableUserIds: Set<string>;
  capableUserIds: Set<string>;
}): AllocationCandidate[] {
  const byUserId = new Map<string, AllocationCandidate>();
  for (const m of params.memberships) {
    if (byUserId.has(m.userId)) continue;
    byUserId.set(m.userId, {
      userId: m.userId,
      name: m.user.name,
      count30d: params.countByUser.get(m.userId) ?? 0,
      unavailable: params.unavailableUserIds.has(m.userId),
      capable: params.capableUserIds.has(m.userId),
    });
  }
  return [...byUserId.values()].sort((a, b) => {
    if (a.capable !== b.capable) return a.capable ? -1 : 1;
    return a.count30d - b.count30d;
  });
}
