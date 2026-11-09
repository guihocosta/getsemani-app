import type { AllocationStatus, OccurrenceStatus } from "@prisma/client";

// Lembrete manual de confirmacao: o lider cobra quem ainda nao confirmou, por
// data ou por pessoa. Limite de 1 por alocacao a cada hora (janela movel pelo
// createdAt da ultima Notification com o prefixo); a chave da hora cheia so
// segura a corrida de dois cliques simultaneos pelo unique de dedupeKey.

export const REMINDER_COOLDOWN_MS = 60 * 60 * 1000;

export type RemindCounts = { enviados: number; recentes: number; semDispositivo: number };

export function manualReminderPrefix(allocationId: string): string {
  return `lembrete-manual:${allocationId}:`;
}

export function manualReminderKey(allocationId: string, now: Date): string {
  return `${manualReminderPrefix(allocationId)}${Math.floor(now.getTime() / REMINDER_COOLDOWN_MS)}`;
}

export function isRecentReminder(last: Date | null, now: Date): boolean {
  return last !== null && now.getTime() - last.getTime() < REMINDER_COOLDOWN_MS;
}

export function canRemindOccurrence(
  occ: { published: boolean; status: OccurrenceStatus; date: Date },
  now: Date,
): boolean {
  return occ.published && occ.status === "ACTIVE" && occ.date.getTime() > now.getTime();
}

type RemindableAllocation = { id: string; userId: string | null; status: AllocationStatus };

// Pendentes com conta em vaga ativa: convidado nao tem push, vaga desativada
// nao conta na escala.
export function remindableAllocations<A extends RemindableAllocation>(
  slots: { active: boolean; allocation: A | null }[],
): (A & { userId: string })[] {
  return slots.flatMap((s) =>
    s.active && s.allocation && s.allocation.userId !== null && s.allocation.status === "PENDING"
      ? [s.allocation as A & { userId: string }]
      : [],
  );
}

export type RemindSlotView = {
  active: boolean;
  allocationId: string | null;
  allocatedUserId: string | null;
  allocatedStatus: AllocationStatus | null;
};

// Mesma regra do servidor, sobre as vagas que a tela ja tem: ids das alocacoes
// que o menu da data e o modal da vaga oferecem para lembrar.
export function remindTargetsForDate(
  p: { published: boolean; startsAt: string; slots: RemindSlotView[] },
  now: Date,
): string[] {
  if (!canRemindOccurrence({ published: p.published, status: "ACTIVE", date: new Date(p.startsAt) }, now)) {
    return [];
  }
  return remindableAllocations(
    p.slots.map((s) => ({
      active: s.active,
      allocation:
        s.allocationId && s.allocatedStatus
          ? { id: s.allocationId, userId: s.allocatedUserId, status: s.allocatedStatus }
          : null,
    })),
  ).map((a) => a.id);
}

export function remindMenuLabel(n: number): string | undefined {
  return n > 0 ? `Lembrar pendentes (${n})` : undefined;
}

function pessoas(n: number): string {
  return n === 1 ? "1 pessoa" : `${n} pessoas`;
}

export function remindConfirmTitle(n: number): string {
  return n === 1 ? "Lembrar 1 pessoa que não confirmou?" : `Lembrar ${n} pessoas que não confirmaram?`;
}

export function remindSummary(c: RemindCounts): string {
  const partes: string[] = [];
  if (c.enviados > 0) partes.push(`Lembrete enviado para ${pessoas(c.enviados)}`);
  if (c.recentes > 0) {
    partes.push(`${c.recentes} já ${c.recentes === 1 ? "lembrada" : "lembradas"} na última hora`);
  }
  if (c.semDispositivo > 0) partes.push(`${c.semDispositivo} sem notificações ativadas`);
  return partes.join(" · ");
}

export function remindOutcomeLabel(c: RemindCounts): string {
  if (c.enviados > 0) return "Lembrete enviado";
  if (c.recentes > 0) return "Já lembrado na última hora";
  return "Sem notificações ativadas";
}
