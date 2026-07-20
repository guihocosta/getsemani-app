import { RRule } from "rrule";
import { fromZonedTime } from "date-fns-tz";

const APP_TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

export type RecurrenceInput = {
  recurrenceRule: string; // ex: "FREQ=WEEKLY;BYDAY=SU"
  startDate: Date; // data base (dia)
  startTime: string; // "HH:mm" no fuso local
  recurrenceUntil?: Date | null;
};

// Combina dia (yyyy-mm-dd em UTC) + hora local -> instante UTC concreto.
function atLocalTime(day: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const y = day.getUTCFullYear();
  const mo = String(day.getUTCMonth() + 1).padStart(2, "0");
  const d = String(day.getUTCDate()).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  // interpreta "yyyy-mm-dd HH:mm" como horario no fuso da igreja -> UTC
  return fromZonedTime(`${y}-${mo}-${d}T${hh}:${mm}:00`, APP_TZ);
}

// Datas concretas (UTC) das ocorrencias em [from, to], respeitando recurrenceUntil.
export function expandOccurrences(input: RecurrenceInput, from: Date, to: Date): Date[] {
  const rule = RRule.fromString(
    `DTSTART:${toRRuleUTC(atLocalTime(input.startDate, input.startTime))}\n` +
      `RRULE:${input.recurrenceRule}`,
  );

  const hardEnd = input.recurrenceUntil
    ? min(to, endOfDayLocal(input.recurrenceUntil, input.startTime))
    : to;

  if (hardEnd < from) return [];
  return rule.between(from, hardEnd, true);
}

function endOfDayLocal(day: Date, time: string): Date {
  // ate o horario da ocorrencia daquele dia inclusive
  return atLocalTime(day, time);
}

function toRRuleUTC(d: Date): string {
  return (
    d.getUTCFullYear().toString().padStart(4, "0") +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    "00Z"
  );
}

function min(a: Date, b: Date): Date {
  return a < b ? a : b;
}
