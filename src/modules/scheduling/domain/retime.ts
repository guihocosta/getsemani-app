import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { APP_TZ, dateKey } from "@/lib/time";

export type RetimeScope = "SINGLE" | "FROM_HERE";

// O que a regra precisa saber de cada ocorrencia da escala. userIds tem uma
// entrada por vaga ocupada (null = convidado sem conta).
export type RetimeOcc = {
  id: string;
  date: Date;
  status: "ACTIVE" | "CANCELLED";
  published: boolean;
  songs: number;
  userIds: (string | null)[];
};

export type RetimeMove = { id: string; to: Date };
export type RetimePlan = { moves: RetimeMove[]; deletes: string[]; startTime: string | null };

// Instante novo ja ocupado por outra data da escala com pessoa ou musica.
export class HorarioOcupado extends Error {
  constructor(public readonly instant: Date) {
    super("HORARIO_OCUPADO");
  }
}

export function parseTime(raw: string): string | null {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : null;
}

// Mesmo dia local da data, no horario novo. Nunca vira o dia seguinte em UTC.
export function retimeInstant(date: Date, time: string): Date {
  return fromZonedTime(`${dateKey(date)}T${time}:00`, APP_TZ);
}

function hasContent(o: RetimeOcc): boolean {
  return o.userIds.length > 0 || o.songs > 0;
}

// Move as datas alvo para o horario novo. Cada instante novo forma um grupo:
// quem chega nele (movers) e quem ja esta la (sitter). A duplicata vazia sai
// (AD-013); se sobra mais de uma com pessoa ou musica, recusa tudo.
export function planMoves(params: {
  occurrences: RetimeOcc[];
  targets: RetimeOcc[];
  time: string;
  keepId?: string;
}): RetimePlan | { conflito: Date } {
  const movers = params.targets
    .map((occ) => ({ occ, to: retimeInstant(occ.date, params.time) }))
    .filter((m) => m.to.getTime() !== m.occ.date.getTime());

  const groups = new Map<number, typeof movers>();
  for (const m of movers) {
    const key = m.to.getTime();
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  const moves: RetimeMove[] = [];
  const deletes: string[] = [];
  for (const [key, group] of [...groups].sort((a, b) => a[0] - b[0])) {
    const sitter = params.occurrences.find((o) => o.date.getTime() === key);
    const full = group.filter((m) => hasContent(m.occ));
    if ((sitter && hasContent(sitter)) || full.length > 1) return { conflito: new Date(key) };
    const keeper = full[0] ?? group.find((m) => m.occ.id === params.keepId) ?? group[0];
    moves.push({ id: keeper.occ.id, to: keeper.to });
    deletes.push(...group.filter((m) => m !== keeper).map((m) => m.occ.id));
    if (sitter) deletes.push(sitter.id);
  }
  return { moves, deletes, startTime: null };
}

// SINGLE: so a data escolhida, que nao pode ter passado. FROM_HERE: a escolhida
// e as seguintes, canceladas incluidas (senao a materializacao recriaria a data
// no horario novo); as que ja passaram ficam.
export function planRetime(params: {
  occurrences: RetimeOcc[];
  chosenId: string;
  scope: RetimeScope;
  time: string;
  scheduleTime: string;
  now: Date;
}): RetimePlan | { conflito: Date } | { error: "DATA_PASSADA" } {
  const chosen = params.occurrences.find((o) => o.id === params.chosenId);
  if (!chosen) throw new Error("OCCURRENCE_NOT_LOADED");

  if (params.scope === "SINGLE") {
    if (chosen.date < params.now) return { error: "DATA_PASSADA" };
    return planMoves({ occurrences: params.occurrences, targets: [chosen], time: params.time, keepId: chosen.id });
  }

  const targets = params.occurrences
    .filter((o) => o.date >= chosen.date && o.date >= params.now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const plan = planMoves({ occurrences: params.occurrences, targets, time: params.time, keepId: chosen.id });
  if ("conflito" in plan) return plan;
  return { ...plan, startTime: params.time !== params.scheduleTime ? params.time : null };
}

function dayMonth(d: Date): string {
  return formatInTimeZone(d, APP_TZ, "dd/MM");
}

export function horarioOcupadoText(instant: Date): string {
  return `Já existe outra data desta escala em ${dayMonth(instant)} às ${formatInTimeZone(instant, APP_TZ, "HH:mm")}.`;
}

function listDates(dates: string[]): string {
  if (dates.length === 1) return dates[0];
  if (dates.length <= 3) return `${dates.slice(0, -1).join(", ")} e ${dates[dates.length - 1]}`;
  const rest = dates.length - 3;
  return `${dates.slice(0, 3).join(", ")} e mais ${rest} ${rest === 1 ? "data" : "datas"}`;
}

// Um aviso por pessoa com todas as datas dela que mudaram. Rascunho e data
// cancelada nao avisam (AD-006); convidado sem conta nao tem para quem avisar.
export function retimeNotices(
  title: string,
  time: string,
  moved: (RetimeOcc & { to: Date })[],
): { userId: string; body: string }[] {
  const byUser = new Map<string, Date[]>();
  for (const o of [...moved].sort((a, b) => a.to.getTime() - b.to.getTime())) {
    if (!o.published || o.status !== "ACTIVE") continue;
    for (const userId of new Set(o.userIds)) {
      if (!userId) continue;
      byUser.set(userId, [...(byUser.get(userId) ?? []), o.to]);
    }
  }
  return [...byUser].map(([userId, dates]) => ({
    userId,
    body: `${title}: ${listDates(dates.map(dayMonth))} agora às ${time}.`,
  }));
}
