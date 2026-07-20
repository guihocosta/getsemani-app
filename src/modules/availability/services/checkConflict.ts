import { prisma } from "@/lib/prisma";
import { formatInTimeZone } from "date-fns-tz";

const APP_TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

// Verdadeiro se o usuario marcou indisponibilidade que cobre o instante da ocorrencia.
export async function hasUnavailabilityConflict(
  userId: string,
  occurrenceDate: Date,
): Promise<boolean> {
  const year = Number(formatInTimeZone(occurrenceDate, APP_TZ, "yyyy"));
  const month = Number(formatInTimeZone(occurrenceDate, APP_TZ, "M"));
  const localDay = formatInTimeZone(occurrenceDate, APP_TZ, "yyyy-MM-dd");
  const localTime = formatInTimeZone(occurrenceDate, APP_TZ, "HH:mm");

  const rows = await prisma.unavailability.findMany({
    where: { userId, year, month },
  });

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
