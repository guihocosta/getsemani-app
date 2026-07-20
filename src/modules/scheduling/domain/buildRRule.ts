const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

// Monta uma RRULE simples a partir de escolhas de UI (frequencia + dia base + termino).
// weekday: 0-6 (getUTCDay do startDate), usado so para WEEKLY/BIWEEKLY.
export function buildRRule(params: { freq: Frequency; weekday: number; count?: number | null }): string {
  const { freq, weekday, count } = params;
  const byday = WEEKDAY_CODES[weekday];

  const parts: string[] = [];
  if (freq === "MONTHLY") {
    parts.push("FREQ=MONTHLY");
  } else {
    parts.push("FREQ=WEEKLY", `BYDAY=${byday}`);
    if (freq === "BIWEEKLY") parts.push("INTERVAL=2");
  }
  if (count && count > 0) parts.push(`COUNT=${count}`);

  return parts.join(";");
}
