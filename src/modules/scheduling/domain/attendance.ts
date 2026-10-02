export type AttendanceMark = "PRESENTE" | "FALTA";

// Marca de presenca de uma vaga no calendario. dayKey/todayKey em yyyy-MM-dd (APP_TZ).
// Falta so existe depois que o dia acabou (hoje ainda da tempo de fazer check-in)
// e so aparece para quem gerencia o ministerio.
export function slotAttendanceMark(p: {
  dayKey: string;
  todayKey: string;
  hasAllocation: boolean;
  isGuest: boolean;
  checkedIn: boolean;
  canManage: boolean;
}): AttendanceMark | null {
  if (!p.hasAllocation || p.isGuest || p.dayKey > p.todayKey) return null;
  if (p.checkedIn) return "PRESENTE";
  return p.dayKey < p.todayKey && p.canManage ? "FALTA" : null;
}
