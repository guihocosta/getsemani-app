export class InvalidBirthDate extends Error {
  constructor() {
    super("INVALID_BIRTH_DATE");
  }
}

// "yyyy-MM-dd" -> dia de calendario (meia-noite UTC, como a coluna @db.Date).
// todayKey em yyyy-MM-dd (APP_TZ). Rejeita dia inexistente, futuro e antes de 1900.
export function parseBirthDate(raw: string, todayKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new InvalidBirthDate();
  const date = new Date(`${raw}T00:00:00.000Z`);
  // 30/02 vira NaN ou "rola" para marco: so vale se volta igual ao digitado
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) throw new InvalidBirthDate();
  if (raw < "1900-01-01" || raw > todayKey) throw new InvalidBirthDate();
  return date;
}

// Aniversariantes de um mes (1..12), por dia e depois nome. Devolve so o dia:
// o ano de nascimento nao sai do servidor.
export function birthdaysOfMonth(
  people: { id: string; name: string; birthDate: Date }[],
  month: number,
): { userId: string; name: string; day: number }[] {
  return people
    .filter((p) => p.birthDate.getUTCMonth() + 1 === month)
    .map((p) => ({ userId: p.id, name: p.name, day: p.birthDate.getUTCDate() }))
    .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, "pt-BR"));
}

export function isBirthdayToday(day: number, month: number, todayKey: string): boolean {
  return Number(todayKey.slice(5, 7)) === month && Number(todayKey.slice(8, 10)) === day;
}

// Mes vindo da URL: inteiro de 1 a 12, senao o fallback.
export function parseMonthNumber(raw: string | undefined, fallback: number): number {
  if (!raw || !/^\d{1,2}$/.test(raw)) return fallback;
  const month = Number(raw);
  return month >= 1 && month <= 12 ? month : fallback;
}
