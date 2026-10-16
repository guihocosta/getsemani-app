export type AttendanceMark = "PRESENTE" | "FALTA";

// Lider so marca presenca de quem tem conta e de dia que ja comecou (hoje ou antes).
export function canMarkAttendance(p: { dayKey: string; todayKey: string; isGuest: boolean }): boolean {
  return !p.isGuest && p.dayKey <= p.todayKey;
}

// Marca de presenca de uma vaga no calendario. dayKey/todayKey em yyyy-MM-dd (APP_TZ).
// Falta so existe depois que o dia acabou (hoje ainda da tempo de fazer check-in)
// e so aparece para quem gerencia o ministerio. Chamada so para vaga com pessoa.
export function slotAttendanceMark(p: {
  dayKey: string;
  todayKey: string;
  isGuest: boolean;
  checkedIn: boolean;
  canManage: boolean;
}): AttendanceMark | null {
  if (p.isGuest || p.dayKey > p.todayKey) return null;
  if (p.checkedIn) return "PRESENTE";
  return p.dayKey < p.todayKey && p.canManage ? "FALTA" : null;
}
