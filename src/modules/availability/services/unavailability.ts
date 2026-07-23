import { z } from "zod";
import { prisma } from "@/lib/prisma";

const MAX_RANGE_DAYS = 60;

export class InvalidRange extends Error {
  constructor() {
    super("INVALID_RANGE");
  }
}

const AddInput = z.object({
  userId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  allDay: z.boolean().default(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
    days.push(new Date(t));
  }
  return days;
}

// Marca um periodo indisponivel (ferias, viagem) como uma linha por dia — nao
// precisa mudar o schema nem hasUnavailabilityConflict, que ja consulta por
// (userId, year, month) e checa dia a dia.
export async function addUnavailability(raw: unknown) {
  const d = AddInput.parse(raw);
  if (d.endDate < d.startDate) throw new InvalidRange();

  const days = eachDay(d.startDate, d.endDate);
  if (days.length > MAX_RANGE_DAYS) throw new InvalidRange();

  await prisma.unavailability.createMany({
    data: days.map((date) => ({
      userId: d.userId,
      date,
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      startTime: d.allDay ? null : d.startTime,
      endTime: d.allDay ? null : d.endTime,
    })),
  });
}

export async function removeUnavailability(ids: string[], userId: string) {
  await prisma.unavailability.deleteMany({ where: { id: { in: ids }, userId } });
}

export type UnavailabilityRow = {
  id: string;
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
};

export type UnavailabilityGroup = {
  ids: string[];
  startDate: Date | null; // null = mes inteiro
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
};

// Agrupa dias consecutivos com o mesmo horario num unico item pra exibicao e
// remocao (ex: ferias de 05/07 a 12/07 vira 1 linha, nao 8). Espera `rows`
// ordenadas por data ascendente.
export function groupContiguous(rows: UnavailabilityRow[]): UnavailabilityGroup[] {
  const groups: UnavailabilityGroup[] = [];
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const r of rows) {
    const last = groups[groups.length - 1];
    const contiguous =
      !!last?.endDate && !!r.date && r.date.getTime() - last.endDate.getTime() === ONE_DAY_MS;
    const sameTime = !!last && last.startTime === r.startTime && last.endTime === r.endTime;

    if (last && r.date && contiguous && sameTime) {
      last.ids.push(r.id);
      last.endDate = r.date;
    } else {
      groups.push({ ids: [r.id], startDate: r.date, endDate: r.date, startTime: r.startTime, endTime: r.endTime });
    }
  }
  return groups;
}

// Lista indisponibilidades de `from` em diante, agrupadas em periodos contiguos.
export async function listUnavailability(userId: string, from: Date) {
  const rows = await prisma.unavailability.findMany({
    where: { userId, OR: [{ date: { gte: from } }, { date: null }] },
    orderBy: { date: "asc" },
  });
  return groupContiguous(rows);
}
