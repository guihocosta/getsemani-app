import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const APP_TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Janela meio-aberta [from, to) de um mes de calendario em APP_TZ: from e o
// dia 1 as 00:00, to e o dia 1 as 00:00 do mes seguinte (exclusivo).
export function monthWindow(year: number, month: number): { from: Date; to: Date } {
  const from = fromZonedTime(`${year}-${pad(month)}-01T00:00:00`, APP_TZ);
  const [nextYear, nextMonth] = month === 12 ? [year + 1, 1] : [year, month + 1];
  const to = fromZonedTime(`${nextYear}-${pad(nextMonth)}-01T00:00:00`, APP_TZ);
  return { from, to };
}

// Valida `raw` no formato "YYYY-MM" com mes entre 01 e 12; caso contrario
// (ausente, malformado, ou mes fora do intervalo) retorna `fallback`.
export function parseMonthParam(
  raw: string | undefined,
  fallback: { year: number; month: number }
): { year: number; month: number } {
  const match = raw?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return fallback;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return fallback;
  return { year: Number(match[1]), month };
}

export function fmtDate(d: Date): string {
  return formatInTimeZone(d, APP_TZ, "EEE, dd 'de' MMM", { locale: ptBR });
}

export function fmtTime(d: Date): string {
  return formatInTimeZone(d, APP_TZ, "HH:mm", { locale: ptBR });
}

export function fmtDateTime(d: Date): string {
  return `${fmtDate(d)} · ${fmtTime(d)}`;
}

export function dateKey(d: Date): string {
  return formatInTimeZone(d, APP_TZ, "yyyy-MM-dd");
}

export function monthKey(d: Date): string {
  return formatInTimeZone(d, APP_TZ, "yyyy-MM");
}

export function monthLabel(d: Date): string {
  const label = formatInTimeZone(d, APP_TZ, "MMMM 'de' yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function startOfDay(d: Date): Date {
  const localDateStr = dateKey(d);
  return fromZonedTime(`${localDateStr}T00:00:00`, APP_TZ);
}
