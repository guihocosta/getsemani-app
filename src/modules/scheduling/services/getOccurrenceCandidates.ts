import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { activeMembersWithName } from "@/modules/identity/services/memberships";
import { loadByPerson } from "@/modules/reports/services/reports";
import { usersUnavailableAt } from "@/modules/availability/services/checkConflict";
import { capableUserIdsForRole } from "@/modules/ministries/services/userSkills";
import { buildCandidateList, type AllocationCandidate } from "../domain/candidateList";

const LOAD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Candidatos pra uma ocorrencia: qualquer membro ativo do ministerio (lider ou
// voluntario — quem lidera tambem pode ser alocado), com carga nos ultimos 30
// dias no MESMO ministerio e se esta indisponivel na data da ocorrencia — pra
// alocar com informacao em vez de as cegas. Uma busca so por ocorrencia (nao
// por vaga): todas as vagas da mesma ocorrencia compartilham ministerio + data,
// entao a lista base e identica — evita repetir 5 queries a cada seletor
// aberto, o que deixava a tela lenta com varias vagas na mesma ocorrencia.
// Capacitacao e a excecao: e por funcao, entao vem a parte em
// capableUserIdsByRole (1 query por roleId distinto da ocorrencia, nao por
// vaga) — o client reordena com markCapable ao trocar de vaga ativa, sem nova
// requisicao (ver Addendum em .specs/features/capacitacoes/design.md).
export async function getOccurrenceCandidates(occurrenceId: string, now = new Date()): Promise<{
  candidates: AllocationCandidate[];
  capableUserIdsByRole: Record<string, string[] | null>;
  guestNames: string[];
}> {
  const occurrence = await prisma.occurrence.findUniqueOrThrow({
    where: { id: occurrenceId },
    include: { schedule: true, slots: true },
  });
  const ministryId = occurrence.schedule.ministryId;
  await requireLeaderOf(ministryId);

  const memberships = await activeMembersWithName(ministryId);
  const userIds = [...new Set(memberships.map((m) => m.userId))];
  const roleIds = [...new Set(occurrence.slots.map((s) => s.roleId))];

  const [load, unavailable, guestAllocs, capableSets] = await Promise.all([
    loadByPerson(new Date(now.getTime() - LOAD_WINDOW_MS), now, [ministryId]),
    usersUnavailableAt(userIds, occurrence.date),
    prisma.allocation.findMany({
      where: { userId: null, guestName: { not: null }, slot: { occurrence: { schedule: { ministryId } } } },
      select: { guestName: true },
      distinct: ["guestName"],
    }),
    Promise.all(roleIds.map((roleId) => capableUserIdsForRole(roleId))),
  ]);
  const countByUser = new Map(load.map((l) => [l.userId, l.count]));
  const capableUserIdsByRole = Object.fromEntries(
    roleIds.map((roleId, i) => [roleId, capableSets[i] ? [...capableSets[i]] : null]),
  );

  // capableUserIds vazio aqui: a base e por ocorrencia (varias funcoes); a
  // capacitacao real por funcao e aplicada no client via markCapable.
  const candidates = buildCandidateList({
    memberships,
    countByUser,
    unavailableUserIds: unavailable,
    capableUserIds: new Set<string>(),
  });
  const guestNames = guestAllocs.map((g) => g.guestName!).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return { candidates, capableUserIdsByRole, guestNames };
}
