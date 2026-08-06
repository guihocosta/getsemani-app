import { dateKey } from "@/lib/time";

export type ReminderStage = "vespera" | "hoje";

// Estagio do lembrete por dia-calendario (APP_TZ), nao por horas: cron
// diario e best-effort e pode atrasar dentro da hora, entao comparar dias
// garante o estagio certo mesmo com execucao tardia.
export function reminderStageFor(params: { now: Date; occurrenceDate: Date }): ReminderStage | null {
  if (params.occurrenceDate <= params.now) return null;

  const todayKey = dateKey(params.now);
  const tomorrowKey = dateKey(new Date(params.now.getTime() + 24 * 3600 * 1000));
  const occKey = dateKey(params.occurrenceDate);

  if (occKey === todayKey) return "hoje";
  if (occKey === tomorrowKey) return "vespera";
  return null;
}

export function reminderCopy(params: {
  stage: ReminderStage;
  hasSwapOpen: boolean;
  isPending: boolean;
  ministry: string;
  role: string;
  date: string; // ja formatado (fmtDateTime ou fmtTime)
}): { title: string; body: string } {
  const { stage, hasSwapOpen, isPending, ministry, role, date } = params;

  if (hasSwapOpen) {
    const title = stage === "hoje"
      ? `Hoje: ${ministry} — troca ainda em aberto`
      : `Amanhã: ${ministry} — troca ainda em aberto`;
    return { title, body: `Ninguém assumiu. ${role} · ${date}` };
  }

  if (isPending) {
    const title = stage === "hoje"
      ? `Confirme sua escala de hoje: ${ministry}`
      : `Confirme sua escala: ${ministry}`;
    return { title, body: `${role} · ${date}` };
  }

  const title = stage === "hoje" ? `Hoje: ${ministry}` : `Amanhã: ${ministry}`;
  return { title, body: `${role} · ${date}` };
}
