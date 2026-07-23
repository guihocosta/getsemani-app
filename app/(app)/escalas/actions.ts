"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSchedule } from "@/modules/scheduling/services/createSchedule";
import { updateSchedule } from "@/modules/scheduling/services/updateSchedule";
import { allocateVolunteer } from "@/modules/scheduling/services/allocateVolunteer";
import { deleteScheduleOccurrence } from "@/modules/scheduling/services/deleteSchedule";
import { materializeOccurrences } from "@/modules/scheduling/services/materializeOccurrences";
import { requireUser, requireLeaderOf } from "@/modules/identity/services/authz";
import { visibleMinistryIds, listMonthOccurrences } from "@/modules/scheduling/services/listMonthOccurrences";
import { prisma } from "@/lib/prisma";
import { loadByPerson } from "@/modules/reports/services/reports";
import { usersUnavailableAt } from "@/modules/availability/services/checkConflict";

export type ScheduleFormState = { ok: boolean; error?: string };

// redirect() funciona lancando uma excecao especial — precisamos deixa-la passar,
// so tratamos como erro de fato o que nao for esse sinal do Next.
function isRedirectError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

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

export async function allocateAction(slotId: string, userId: string, override = false) {
  try {
    await allocateVolunteer({ slotId, userId, override });
    revalidatePath("/escalas");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
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

export type AllocationCandidate = {
  userId: string;
  name: string;
  count30d: number;
  unavailable: boolean;
};

// Candidatos pra uma vaga: carga nos ultimos 30 dias no MESMO ministerio e se
// esta indisponivel na data da ocorrencia — pra alocar com informacao em vez
// de as cegas. Calculado sob demanda (so quando o seletor abre), pra nao
// pesar o payload mensal do calendario.
export async function getAllocationCandidatesAction(slotId: string): Promise<AllocationCandidate[]> {
  const slot = await prisma.slot.findUniqueOrThrow({
    where: { id: slotId },
    include: { occurrence: { include: { schedule: true } } },
  });
  await requireLeaderOf(slot.occurrence.schedule.ministryId);

  const ministryId = slot.occurrence.schedule.ministryId;
  const memberships = await prisma.membership.findMany({
    where: { ministryId, role: "VOLUNTEER", status: "ACTIVE" },
    include: { user: true },
  });
  const userIds = memberships.map((m) => m.userId);

  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [load, unavailable] = await Promise.all([
    loadByPerson(from, new Date(), [ministryId]),
    usersUnavailableAt(userIds, slot.occurrence.date),
  ]);
  const countOf = new Map(load.map((l) => [l.userId, l.count]));

  return memberships
    .map((m) => ({
      userId: m.userId,
      name: m.user.name,
      count30d: countOf.get(m.userId) ?? 0,
      unavailable: unavailable.has(m.userId),
    }))
    .sort((a, b) => a.count30d - b.count30d);
}
