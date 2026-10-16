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
import { setAttendance } from "@/modules/scheduling/services/setAttendance";
import { setOccurrencePublished } from "@/modules/scheduling/services/publishOccurrence";
import { suggestAllocations } from "@/modules/scheduling/services/suggestAllocations";
import type { SuggestActionResult } from "@/modules/scheduling/domain/suggest";
import type { AllocationCandidate } from "@/modules/scheduling/domain/candidateList";
import { getOccurrenceCandidates } from "@/modules/scheduling/services/getOccurrenceCandidates";
import { deleteScheduleOccurrence } from "@/modules/scheduling/services/deleteSchedule";
import { materializeOccurrences } from "@/modules/scheduling/services/materializeOccurrences";
import { requireUser, requireLeaderOf, getSessionUser } from "@/modules/identity/services/authz";
import { listMonthOccurrences } from "@/modules/scheduling/services/listMonthOccurrences";
import { visibleMinistryIds, ledMinistryIds } from "@/modules/identity/services/memberships";
import { prisma } from "@/lib/prisma";
import { isRedirectError, handleActionError, MENSAGENS, type ActionCode } from "@/lib/actionError";
import { getAvailableRoles } from "@/modules/scheduling/services/getAvailableRoles";
import { addExtraSlot } from "@/modules/scheduling/services/addExtraSlot";
import { repeatSchedule, RepeatPartialFailure } from "@/modules/scheduling/services/repeatSchedule";
import { logError } from "@/lib/logError";
import type { RepeatActionResult } from "./repeatOutcome";

export type ScheduleFormState = { ok: boolean; error?: string };

function friendlyError(e: unknown): string {
  const msg = (e as Error)?.message ?? "";
  if (msg.includes("roleIds")) return "Escolha pelo menos uma função.";
  if (msg === "FORBIDDEN") return "Você não tem permissão para essa ação.";
  if (msg.includes("INVALID_ROTATION_CYCLE")) return "Ciclo de rodízio deve ser entre 1 e 12.";
  return "Não deu para salvar. Confira os campos e tente de novo.";
}

export async function createScheduleAction(
  _prev: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  try {
    const recurrenceUntil = formData.get("recurrenceUntil");
    const rotationCycle = formData.get("rotationCycle");
    const roleIds = formData.getAll("roleIds").map(String);
    if (roleIds.length === 0) return { ok: false, error: "Escolha pelo menos uma função." };

    const schedule = await createSchedule({
      ministryId: String(formData.get("ministryId")),
      title: String(formData.get("title")),
      recurrenceRule: String(formData.get("recurrenceRule")),
      startDate: String(formData.get("startDate")),
      startTime: String(formData.get("startTime")),
      recurrenceUntil: recurrenceUntil ? String(recurrenceUntil) : null,
      rotationCycle: rotationCycle ? Number(rotationCycle) : null,
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
    const rotationCycle = formData.get("rotationCycle");
    const roleIds = formData.getAll("roleIds").map(String);
    if (roleIds.length === 0) return { ok: false, error: "Escolha pelo menos uma função." };

    const scheduleId = String(formData.get("scheduleId"));
    await updateSchedule({
      scheduleId,
      title: String(formData.get("title")),
      startTime: String(formData.get("startTime")),
      recurrenceRule: String(formData.get("recurrenceRule")),
      recurrenceUntil: recurrenceUntil ? String(recurrenceUntil) : null,
      rotationCycle: rotationCycle ? Number(rotationCycle) : null,
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

export async function setAttendanceAction(
  allocationId: string,
  present: boolean,
): Promise<
  | { ok: true; allocation: { status: AllocationStatus; checkedIn: boolean } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await setAttendance({ allocationId, present });
    revalidatePath("/escalas");
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: true, allocation: { status: allocation.status, checkedIn: allocation.checkedInAt !== null } };
  } catch (e) {
    return handleActionError("escalas.setAttendance", e, { allocationId, present });
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
  const [ministryIds, manageableIds] = await Promise.all([
    visibleMinistryIds(user.id, user.isAdmin),
    ledMinistryIds(user.id, user.isAdmin),
  ]);
  if (ministryIds.length === 0) return [];
  return listMonthOccurrences(ministryIds, year, month, manageableIds);
}

// Lider alterna a data entre rascunho e publicada (publicar avisa os escalados).
export async function setOccurrencePublishedAction(
  occurrenceId: string,
  published: boolean,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await setOccurrencePublished({ occurrenceId, published });
    revalidatePath("/escalas");
    revalidatePath("/vagas");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return handleActionError("escalas.setPublished", e, { occurrenceId, published });
  }
}

export type { AllocationCandidate };

// Regra e consultas em getOccurrenceCandidates (scheduling/services).
export async function getOccurrenceCandidatesAction(
  occurrenceId: string,
): Promise<
  | {
      ok: true;
      candidates: AllocationCandidate[];
      capableUserIdsByRole: Record<string, string[] | null>;
      guestNames: string[];
    }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    return { ok: true, ...(await getOccurrenceCandidates(occurrenceId)) };
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

// Lider preenche as vagas abertas da data pela regra de sugestao (sem IA).
export async function suggestAllocationsAction(occurrenceId: string): Promise<SuggestActionResult> {
  try {
    const result = await suggestAllocations(occurrenceId);
    revalidatePath("/escalas");
    revalidatePath("/");
    return { ok: true, ...result };
  } catch (e) {
    const failure = handleActionError("escalas.suggest", e, { occurrenceId });
    // falha no meio pode ter gravado vagas: a tela recarrega mesmo com erro
    revalidatePath("/escalas");
    revalidatePath("/");
    return { ok: false, error: `${MENSAGENS[failure.code]} · cód. ${failure.ref}` };
  }
}

// Repete a escalacao do ciclo anterior nas proximas rotationCycle ocorrencias
// futuras da escala. Erro traduzido direto pra pt-BR (nao usa handleActionError
// porque NO_ROTATION_CYCLE nao e um ActionCode conhecido pela UI de vagas), mas
// com as mesmas garantias: relanca redirect e loga o inesperado com ref.
export async function repeatScheduleAction(scheduleId: string): Promise<RepeatActionResult> {
  try {
    const result = await repeatSchedule(scheduleId);
    revalidatePath("/escalas");
    return { ok: true, filled: result.filled, skipped: result.skipped };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = (e as Error)?.message ?? "";
    if (msg === "FORBIDDEN") return { ok: false, error: "Você não tem permissão para essa ação." };
    if (msg === "NO_ROTATION_CYCLE") {
      return { ok: false, error: "Defina o ciclo de rodízio ao editar a escala." };
    }
    const ref = logError("escalas.repeatSchedule", e, { scheduleId });
    if (e instanceof RepeatPartialFailure) {
      revalidatePath("/escalas");
      const vagas = e.filled === 1 ? "vaga preenchida" : "vagas preenchidas";
      return {
        ok: false,
        filled: e.filled,
        error: `${e.filled} ${vagas} antes da falha. Tente de novo para completar.`,
        ref,
      };
    }
    return { ok: false, error: "Não deu para repetir a escalação agora.", ref };
  }
}
