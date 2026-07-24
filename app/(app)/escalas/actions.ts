"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSchedule } from "@/modules/scheduling/services/createSchedule";
import { updateSchedule } from "@/modules/scheduling/services/updateSchedule";
import { allocateVolunteer, reassignAllocation } from "@/modules/scheduling/services/allocateVolunteer";
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

export type AllocateCode = "UNAVAILABILITY_BLOCKED" | "SLOT_TAKEN" | "UNKNOWN";

export async function allocateAction(
  slotId: string,
  userId: string,
  override = false,
): Promise<{ ok: true } | { ok: false; code: AllocateCode }> {
  try {
    await allocateVolunteer({ slotId, userId, override });
    revalidatePath("/escalas");
    return { ok: true };
  } catch (e) {
    const msg = (e as Error)?.message;
    const code: AllocateCode =
      msg === "UNAVAILABILITY_BLOCKED" || msg === "SLOT_TAKEN" ? msg : "UNKNOWN";
    return { ok: false, code };
  }
}

export async function reassignAllocationAction(
  slotId: string,
  userId: string,
  override = false,
): Promise<{ ok: true } | { ok: false; code: AllocateCode }> {
  try {
    await reassignAllocation({ slotId, userId, override });
    revalidatePath("/escalas");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const msg = (e as Error)?.message;
    const code: AllocateCode =
      msg === "UNAVAILABILITY_BLOCKED" || msg === "SLOT_TAKEN" ? msg : "UNKNOWN";
    return { ok: false, code };
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

// Candidatos pra uma ocorrencia: carga nos ultimos 30 dias no MESMO ministerio e
// se esta indisponivel na data da ocorrencia — pra alocar com informacao em vez
// de as cegas. Uma busca so por ocorrencia (nao por vaga): todas as vagas da
// mesma ocorrencia compartilham ministerio + data, entao a lista e identica —
// evita repetir 5 queries a cada seletor aberto, o que deixava a tela lenta
// com varias vagas na mesma ocorrencia.
export async function getOccurrenceCandidatesAction(
  occurrenceId: string,
): Promise<{ ok: true; candidates: AllocationCandidate[] } | { ok: false }> {
  try {
    const occurrence = await prisma.occurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
      include: { schedule: true },
    });
    await requireLeaderOf(occurrence.schedule.ministryId);

    const ministryId = occurrence.schedule.ministryId;
    const memberships = await prisma.membership.findMany({
      where: { ministryId, role: "VOLUNTEER", status: "ACTIVE" },
      include: { user: true },
    });
    const userIds = memberships.map((m) => m.userId);

    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [load, unavailable] = await Promise.all([
      loadByPerson(from, new Date(), [ministryId]),
      usersUnavailableAt(userIds, occurrence.date),
    ]);
    const countOf = new Map(load.map((l) => [l.userId, l.count]));

    const candidates = memberships
      .map((m) => ({
        userId: m.userId,
        name: m.user.name,
        count30d: countOf.get(m.userId) ?? 0,
        unavailable: unavailable.has(m.userId),
      }))
      .sort((a, b) => a.count30d - b.count30d);

    return { ok: true, candidates };
  } catch {
    return { ok: false };
  }
}
