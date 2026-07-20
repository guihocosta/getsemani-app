import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const APP_TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

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
