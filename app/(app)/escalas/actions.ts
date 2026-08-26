"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AllocationStatus } from "@prisma/client";
import { createSchedule } from "@/modules/scheduling/services/createSchedule";
import { updateSchedule } from "@/modules/scheduling/services/updateSchedule";
import { allocateVolunteer, reassignAllocation } from "@/modules/scheduling/services/allocateVolunteer";
import { allocateGuest, reassignToGuest } from "@/modules/scheduling/services/allocateGuest";
import { linkGuestAllocation } from "@/modules/scheduling/services/linkGuestAllocation";
import { linkAllGuestAllocations } from "@/modules/scheduling/services/linkAllGuestAllocations";
import { setSlotActive } from "@/modules/scheduling/services/setSlotActive";
import { buildCandidateList, type AllocationCandidate } from "@/modules/scheduling/services/candidateList";
import { deleteScheduleOccurrence } from "@/modules/scheduling/services/deleteSchedule";
import { materializeOccurrences } from "@/modules/scheduling/services/materializeOccurrences";
import { requireUser, requireLeaderOf, getSessionUser } from "@/modules/identity/services/authz";
import { visibleMinistryIds, listMonthOccurrences, ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { prisma } from "@/lib/prisma";
import { loadByPerson } from "@/modules/reports/services/reports";
import { usersUnavailableAt } from "@/modules/availability/services/checkConflict";
import { isRedirectError, handleActionError, type ActionCode } from "@/lib/actionError";
import { getAvailableRoles } from "@/modules/scheduling/services/getAvailableRoles";
import { addExtraSlot } from "@/modules/scheduling/services/addExtraSlot";
import { capableUserIdsForRole } from "@/modules/ministries/services/userSkills";

export type ScheduleFormState = { ok: boolean; error?: string };

function friendlyError(e: unknown): string {
  const msg = (e as Error)?.message ?? "";
  if (msg.includes("roleIds")) return "Escolha pelo menos uma função.";
  if (msg === "FORBIDDEN") return "Você não tem permissão para essa ação.";
  return "Não deu para salvar. Confira os campos e tente de novo.";
}

export async function createScheduleAction(
  _prev: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  try {
    const recurrenceUntil = formData.get("recurrenceUntil");
    const roleIds = formData.getAll("roleIds").map(String);
    if (roleIds.length === 0) return { ok: false, error: "Escolha pelo menos uma função." };

    const schedule = await createSchedule({
      ministryId: String(formData.get("ministryId")),
      title: String(formData.get("title")),
      recurrenceRule: String(formData.get("recurrenceRule")),
      startDate: String(formData.get("startDate")),
      startTime: String(formData.get("startTime")),
      recurrenceUntil: recurrenceUntil ? String(recurrenceUntil) : null,
      roleIds,
    });
    await materializeOccurrences(new Date(), schedule.id);
    revalidatePath("/escalas");
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: friendlyError(e) };
  }
  redirect("/escalas");
}

export async function updateScheduleAction(
  _prev: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  try {
    const recurrenceUntil = formData.get("recurrenceUntil");
    const roleIds = formData.getAll("roleIds").map(String);
    if (roleIds.length === 0) return { ok: false, error: "Escolha pelo menos uma função." };

    const scheduleId = String(formData.get("scheduleId"));
    await updateSchedule({
      scheduleId,
      title: String(formData.get("title")),
      startTime: String(formData.get("startTime")),
      recurrenceRule: String(formData.get("recurrenceRule")),
      recurrenceUntil: recurrenceUntil ? String(recurrenceUntil) : null,
      roleIds,
    });
    await materializeOccurrences(new Date(), scheduleId);
    revalidatePath("/escalas");
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: friendlyError(e) };
  }
  redirect("/escalas");
}

export async function allocateAction(
  slotId: string,
  userId: string,
  override = false,
): Promise<
  | { ok: true; allocation: { id: string; status: AllocationStatus } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await allocateVolunteer({ slotId, userId, override });
    revalidatePath("/escalas");
    return { ok: true, allocation: { id: allocation.id, status: allocation.status } };
  } catch (e) {
    return handleActionError("escalas.allocate", e, { slotId, userId });
  }
}

export async function reassignAllocationAction(
  slotId: string,
  userId: string,
  override = false,
): Promise<
  | { ok: true; allocation: { id: string; status: AllocationStatus } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await reassignAllocation({ slotId, userId, override });
    revalidatePath("/escalas");
    revalidatePath("/");
    return { ok: true, allocation: { id: allocation.id, status: allocation.status } };
  } catch (e) {
    return handleActionError("escalas.reassign", e, { slotId, userId });
  }
}

export async function allocateGuestAction(
  slotId: string,
  guestName: string,
): Promise<
  | { ok: true; allocation: { id: string; status: AllocationStatus } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await allocateGuest({ slotId, guestName });
    revalidatePath("/escalas");
    return { ok: true, allocation: { id: allocation.id, status: allocation.status } };
  } catch (e) {
    return handleActionError("escalas.allocateGuest", e, { slotId });
  }
}

export async function reassignGuestAction(
  slotId: string,
  guestName: string,
): Promise<
  | { ok: true; allocation: { id: string; status: AllocationStatus } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await reassignToGuest({ slotId, guestName });
    revalidatePath("/escalas");
    revalidatePath("/admin/convidados");
    return { ok: true, allocation: { id: allocation.id, status: allocation.status } };
  } catch (e) {
    return handleActionError("escalas.reassignGuest", e, { slotId });
  }
}

export async function setSlotActiveAction(
  slotId: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await setSlotActive({ slotId, active });
    revalidatePath("/escalas");
    return { ok: true };
  } catch (e) {
    return handleActionError("escalas.setSlotActive", e, { slotId, active });
  }
}

export async function linkGuestAction(
  allocationId: string,
  userId: string,
  override = false,
): Promise<
  | { ok: true; allocation: { id: string; status: AllocationStatus } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await linkGuestAllocation({ allocationId, userId, override });
    revalidatePath("/escalas");
    revalidatePath("/admin/convidados");
    revalidatePath("/");
    return { ok: true, allocation: { id: allocation.id, status: allocation.status } };
  } catch (e) {
    return handleActionError("escalas.linkGuest", e, { allocationId, userId });
  }
}

export async function linkAllGuestAction(
  guestName: string,
  userId: string,
  override?: boolean
): Promise<
  | { ok: true; count: number }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const user = await getSessionUser();
    if (!user) throw new Error("FORBIDDEN");

    const ministryIds = await ledMinistryIds(user.id, user.isAdmin);
    const result = await linkAllGuestAllocations({
      guestName,
      userId,
      ministryIds,
      override,
    });

    revalidatePath("/admin/convidados");
    revalidatePath("/escalas");

    return { ok: true, count: result.count };
  } catch (e) {
    return handleActionError("escalas.linkAllGuest", e, { guestName, userId });
  }
}

export async function deleteOccurrenceAction(occurrenceId: string, scope: "SINGLE" | "FROM_HERE") {
  await deleteScheduleOccurrence({ occurrenceId, scope });
  revalidatePath("/escalas");
}

// Troca de mes no calendario sem navegacao de pagina inteira (ver EscalaCalendar).
export async function loadMonthAction(year: number, month: number) {
  const user = await requireUser();
  const ministryIds = await visibleMinistryIds(user.id, user.isAdmin);
  if (ministryIds.length === 0) return [];
  return listMonthOccurrences(ministryIds, year, month);
}

export type { AllocationCandidate };

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
export async function getOccurrenceCandidatesAction(
  occurrenceId: string,
): Promise<
  | {
      ok: true;
      candidates: AllocationCandidate[];
      capableUserIdsByRole: Record<string, string[]>;
      guestNames: string[];
    }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const occurrence = await prisma.occurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
      include: { schedule: true, slots: true },
    });
    await requireLeaderOf(occurrence.schedule.ministryId);

    const ministryId = occurrence.schedule.ministryId;
    const memberships = await prisma.membership.findMany({
      where: { ministryId, status: "ACTIVE" },
      include: { user: true },
    });
    const userIds = [...new Set(memberships.map((m) => m.userId))];
    const roleIds = [...new Set(occurrence.slots.map((s) => s.roleId))];

    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [load, unavailable, guestAllocs, capableSets] = await Promise.all([
      loadByPerson(from, new Date(), [ministryId]),
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
      roleIds.map((roleId, i) => [roleId, [...capableSets[i]]]),
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

    return { ok: true, candidates, capableUserIdsByRole, guestNames };
  } catch (e) {
    return handleActionError("escalas.candidates", e, { occurrenceId });
  }
}

export async function getAvailableRolesAction(occurrenceId: string): Promise<
  | { ok: true; roles: { id: string; name: string }[] }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const occurrence = await prisma.occurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
      include: { schedule: true },
    });
    await requireLeaderOf(occurrence.schedule.ministryId);

    const roles = await getAvailableRoles(occurrenceId);
    return { ok: true, roles };
  } catch (e) {
    return handleActionError("escalas.getAvailableRoles", e, { occurrenceId });
  }
}

export async function addExtraSlotAction(occurrenceId: string, roleId: string): Promise<
  | { ok: true }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const occurrence = await prisma.occurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
      include: { schedule: true },
    });
    await requireLeaderOf(occurrence.schedule.ministryId);

    await addExtraSlot(occurrenceId, roleId);
    revalidatePath("/escalas");
    return { ok: true };
  } catch (e) {
    return handleActionError("escalas.addExtraSlot", e, { occurrenceId, roleId });
  }
}
