import { prisma } from "@/lib/prisma";

// FR-019: vagas em aberto (slots sem allocation em ocorrencias ativas futuras), por proximidade.
export async function openSlots(from = new Date()) {
  const slots = await prisma.slot.findMany({
    where: {
      allocation: null,
      occurrence: { status: "ACTIVE", date: { gte: from } },
    },
    include: {
      role: true,
      occurrence: { include: { schedule: { include: { ministry: true } } } },
    },
  });
  return slots
    .map((s) => ({
      slotId: s.id,
      date: s.occurrence.date,
      ministry: s.occurrence.schedule.ministry.name,
      role: s.role.name,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// FR-020: ranking de carga por pessoa num periodo.
export async function loadByPerson(from: Date, to: Date) {
  const grouped = await prisma.allocation.groupBy({
    by: ["userId"],
    where: { slot: { occurrence: { date: { gte: from, lte: to }, status: "ACTIVE" } } },
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
export async function volunteersByMinistry() {
  const grouped = await prisma.membership.groupBy({
    by: ["ministryId"],
    where: { role: "VOLUNTEER", status: "ACTIVE" },
    _count: { _all: true },
  });
  const ministries = await prisma.ministry.findMany({ select: { id: true, name: true } });
  const nameOf = new Map(ministries.map((m) => [m.id, m.name]));
  // inclui ministerios com 0 voluntarios
  const countOf = new Map(grouped.map((g) => [g.ministryId, g._count._all]));
  return ministries
    .map((m) => ({ ministryId: m.id, name: nameOf.get(m.id)!, count: countOf.get(m.id) ?? 0 }))
    .sort((a, b) => a.count - b.count);
}
