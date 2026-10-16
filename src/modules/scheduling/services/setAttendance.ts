import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { dateKey } from "@/lib/time";
import { canMarkAttendance, attendanceUpdate } from "../domain/attendance";

export class AttendanceNotAllowed extends Error {
  constructor() {
    super("ATTENDANCE_NOT_ALLOWED");
  }
}

// Lider marca ou desmarca presenca de uma vaga (hoje ou dia passado), sem depender
// do check-in do voluntario. Reusa checkedInAt como unica fonte de presenca; marcar
// presente em escala PENDING tambem confirma (ver attendanceUpdate).
export async function setAttendance(params: { allocationId: string; present: boolean }) {
  const alloc = await prisma.allocation.findUniqueOrThrow({
    where: { id: params.allocationId },
    include: { slot: { include: { occurrence: { include: { schedule: true } } } } },
  });
  await requireLeaderOf(alloc.slot.occurrence.schedule.ministryId);

  const ok = canMarkAttendance({
    dayKey: dateKey(alloc.slot.occurrence.date),
    todayKey: dateKey(new Date()),
    isGuest: alloc.userId === null,
  });
  if (!ok) throw new AttendanceNotAllowed();

  return prisma.allocation.update({
    where: { id: params.allocationId },
    data: attendanceUpdate(alloc, params.present, new Date()),
  });
}
