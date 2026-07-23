import { prisma } from "@/lib/prisma";
import { formatInTimeZone } from "date-fns-tz";

const APP_TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

type UnavailabilityRow = {
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
};

// Predicado puro: verdadeiro se alguma das linhas de indisponibilidade cobre o
// instante da ocorrencia. Extraido pra ser a unica fonte de verdade da regra
// (mes inteiro / dia inteiro / faixa horaria), reusada tanto na checagem de
// uma pessoa quanto na checagem em lote de varias.
export function conflictsWith(rows: UnavailabilityRow[], occurrenceDate: Date): boolean {
  const localDay = formatInTimeZone(occurrenceDate, APP_TZ, "yyyy-MM-dd");
  const localTime = formatInTimeZone(occurrenceDate, APP_TZ, "HH:mm");

  for (const r of rows) {
    // mes inteiro
    if (!r.date) return true;
    // r.date e coluna @db.Date (dia de calendario, meia-noite UTC) -> formatar em UTC,
    // nao no fuso local, senao o dia escorrega para tras.
    const rDay = formatInTimeZone(r.date, "UTC", "yyyy-MM-dd");
    if (rDay !== localDay) continue;
    // dia inteiro
    if (!r.startTime || !r.endTime) return true;
    // faixa horaria
    if (localTime >= r.startTime && localTime <= r.endTime) return true;
  }
  return false;
}

// Verdadeiro se o usuario marcou indisponibilidade que cobre o instante da ocorrencia.
export async function hasUnavailabilityConflict(
  userId: string,
  occurrenceDate: Date,
): Promise<boolean> {
  const year = Number(formatInTimeZone(occurrenceDate, APP_TZ, "yyyy"));
  const month = Number(formatInTimeZone(occurrenceDate, APP_TZ, "M"));

  const rows = await prisma.unavailability.findMany({
    where: { userId, year, month },
  });

  return conflictsWith(rows, occurrenceDate);
}

// Verdadeiro-por-usuario em lote: quais desses userIds tem indisponibilidade
// que cobre o instante da ocorrencia. Usado pra mostrar a tag antes de alocar,
// em vez de descobrir so depois de escolher.
export async function usersUnavailableAt(userIds: string[], occurrenceDate: Date): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const year = Number(formatInTimeZone(occurrenceDate, APP_TZ, "yyyy"));
  const month = Number(formatInTimeZone(occurrenceDate, APP_TZ, "M"));

  const rows = await prisma.unavailability.findMany({
    where: { userId: { in: userIds }, year, month },
  });

  const byUser = new Map<string, UnavailabilityRow[]>();
  for (const r of rows) {
    const list = byUser.get(r.userId) ?? [];
    list.push(r);
    byUser.set(r.userId, list);
  }

  const result = new Set<string>();
  for (const userId of userIds) {
    if (conflictsWith(byUser.get(userId) ?? [], occurrenceDate)) result.add(userId);
  }
  return result;
}
