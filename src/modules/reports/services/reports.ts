import { prisma } from "@/lib/prisma";

// FR-019: vagas em aberto (slots sem allocation em ocorrencias ativas futuras), por proximidade.
// ministryIds opcional escopa o relatorio (lider ve so os seus); admin passa undefined (global).
export async function openSlots(from = new Date(), ministryIds?: string[]) {
  const slots = await prisma.slot.findMany({
    where: {
      allocation: null,
      occurrence: {
        status: "ACTIVE",
        date: { gte: from },
        ...(ministryIds ? { schedule: { ministryId: { in: ministryIds } } } : {}),
      },
    },
    include: {
      role: true,
      occurrence: { include: { schedule: { include: { ministry: true } } } },
    },
    orderBy: { occurrence: { date: "asc" } },
    take: 200,
  });
  return slots.map((s) => ({
    slotId: s.id,
    date: s.occurrence.date,
    ministry: s.occurrence.schedule.ministry.name,
    role: s.role.name,
  }));
}

// FR-020: ranking de carga por pessoa num periodo.
export async function loadByPerson(from: Date, to: Date, ministryIds?: string[]) {
  const grouped = await prisma.allocation.groupBy({
    by: ["userId"],
    where: {
      slot: {
        occurrence: {
          date: { gte: from, lte: to },
          status: "ACTIVE",
          ...(ministryIds ? { schedule: { ministryId: { in: ministryIds } } } : {}),
        },
      },
    },
    _count: { _all: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  return grouped
    .map((g) => ({ userId: g.userId, name: nameOf.get(g.userId) ?? "?", count: g._count._all }))
    .sort((a, b) => b.count - a.count);
}

// FR-021: voluntarios por ministerio.
export async function volunteersByMinistry(ministryIds?: string[]) {
  const grouped = await prisma.membership.groupBy({
    by: ["ministryId"],
    where: {
      role: "VOLUNTEER",
      status: "ACTIVE",
      ...(ministryIds ? { ministryId: { in: ministryIds } } : {}),
    },
    _count: { _all: true },
  });
  const ministries = await prisma.ministry.findMany({
    where: ministryIds ? { id: { in: ministryIds } } : undefined,
    select: { id: true, name: true },
  });
  const nameOf = new Map(ministries.map((m) => [m.id, m.name]));
  // inclui ministerios com 0 voluntarios
  const countOf = new Map(grouped.map((g) => [g.ministryId, g._count._all]));
  return ministries
    .map((m) => ({ ministryId: m.id, name: nameOf.get(m.id)!, count: countOf.get(m.id) ?? 0 }))
    .sort((a, b) => a.count - b.count);
}
