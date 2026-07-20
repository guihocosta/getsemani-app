/**
 * Teste de integração local (Postgres real, sem Supabase).
 * Exercita invariantes de dominio auth-free + unicidade de vaga.
 * Rodar: npm run test:local  (com DB no ar + migrate aplicado)
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { materializeOccurrences } from "../src/modules/scheduling/services/materializeOccurrences";
import { openSlots, volunteersByMinistry } from "../src/modules/reports/services/reports";
import { hasUnavailabilityConflict } from "../src/modules/availability/services/checkConflict";

const prisma = new PrismaClient();
let ok = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  cond ? ok++ : fail++;
}

async function main() {
  // limpa
  await prisma.$executeRawUnsafe(
    `TRUNCATE "Notification","PushSubscription","SwapRequest","Allocation","Slot","Occurrence","ScheduleRole","Schedule","Unavailability","Membership","Role","Ministry","User" RESTART IDENTITY CASCADE;`,
  );

  // ministerio + funcoes + pessoas
  const min = await prisma.ministry.create({
    data: { name: "Louvor", roles: { create: [{ name: "Vocal" }, { name: "Violão" }] } },
    include: { roles: true },
  });
  const lider = await prisma.user.create({
    data: { id: randomUUID(), name: "Lider", email: "l@x.com" },
  });
  const ana = await prisma.user.create({ data: { id: randomUUID(), name: "Ana", email: "a@x.com" } });
  const bruno = await prisma.user.create({
    data: { id: randomUUID(), name: "Bruno", email: "b@x.com" },
  });
  await prisma.membership.createMany({
    data: [
      { userId: lider.id, ministryId: min.id, role: "LEADER" },
      { userId: ana.id, ministryId: min.id, role: "VOLUNTEER" },
      { userId: bruno.id, ministryId: min.id, role: "VOLUNTEER" },
    ],
  });

  // escala recorrente semanal (domingo) começando amanhã
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  await prisma.schedule.create({
    data: {
      ministryId: min.id,
      title: "Culto Domingo",
      recurrenceRule: "FREQ=WEEKLY;BYDAY=SU",
      startDate: start,
      startTime: "19:00",
      createdBy: lider.id,
      defaultRoles: { create: min.roles.map((r) => ({ roleId: r.id })) },
    },
  });

  // === materializacao ===
  const created1 = await materializeOccurrences();
  check(`materialização criou ocorrências (${created1} slots-grupo)`, created1 > 0);
  const created2 = await materializeOccurrences();
  check("materialização é idempotente (2ª rodada = 0)", created2 === 0);

  const slotsCount = await prisma.slot.count();
  check(`slots gerados = ocorrências × 2 funções (${slotsCount})`, slotsCount > 0 && slotsCount % 2 === 0);

  // === unicidade de vaga (FR-008) ===
  const slot = await prisma.slot.findFirstOrThrow();
  await prisma.allocation.create({ data: { slotId: slot.id, userId: ana.id, source: "SELF" } });
  let blocked = false;
  try {
    await prisma.allocation.create({ data: { slotId: slot.id, userId: bruno.id, source: "SELF" } });
  } catch (e) {
    blocked = (e as { code?: string }).code === "P2002";
  }
  check("2ª alocação no mesmo slot bloqueada (unique slotId)", blocked);

  // === relatorios ===
  const open = await openSlots();
  check(`openSlots retorna vagas livres (${open.length})`, open.length === slotsCount - 1);
  const byMin = await volunteersByMinistry();
  check("volunteersByMinistry conta 2 voluntários no Louvor", byMin.find((m) => m.name === "Louvor")?.count === 2);

  // === conflito de indisponibilidade ===
  const occ = await prisma.occurrence.findFirstOrThrow();
  await prisma.unavailability.create({
    data: {
      userId: ana.id,
      date: occ.date,
      year: occ.date.getUTCFullYear(),
      month: occ.date.getUTCMonth() + 1,
    },
  });
  const conflict = await hasUnavailabilityConflict(ana.id, occ.date);
  check("hasUnavailabilityConflict detecta dia marcado", conflict === true);
  const noConflict = await hasUnavailabilityConflict(bruno.id, occ.date);
  check("sem conflito para quem não marcou", noConflict === false);

  console.log(`\n${ok} ok, ${fail} falhas`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
