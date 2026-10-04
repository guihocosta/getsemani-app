import { startOfDay } from "@/lib/time";

export type AttendanceRow = { userId: string; name: string; checkedIn: boolean };

export type AttendanceSummary = {
  total: number;
  presentes: number;
  faltas: number;
  taxa: number | null; // % inteiro de presenca; null sem escalas no periodo
  ranking: { userId: string; name: string; escalado: number; faltas: number }[];
};

// Janela meio-aberta [from, to): os 30 dias ja encerrados antes de hoje (APP_TZ).
// Hoje fica de fora porque o check-in ainda pode acontecer.
export function attendanceWindow(now: Date): { from: Date; to: Date } {
  const to = startOfDay(now);
  return { from: startOfDay(new Date(to.getTime() - 30 * 864e5)), to };
}

// Falta = escalado sem check-in. Ranking so com quem faltou ao menos uma vez.
export function summarizeAttendance(rows: AttendanceRow[]): AttendanceSummary {
  const porPessoa = new Map<string, { userId: string; name: string; escalado: number; faltas: number }>();
  for (const r of rows) {
    const p = porPessoa.get(r.userId) ?? { userId: r.userId, name: r.name, escalado: 0, faltas: 0 };
    p.escalado += 1;
    if (!r.checkedIn) p.faltas += 1;
    porPessoa.set(r.userId, p);
  }

  const total = rows.length;
  const presentes = rows.filter((r) => r.checkedIn).length;
  return {
    total,
    presentes,
    faltas: total - presentes,
    taxa: total === 0 ? null : Math.round((presentes / total) * 100),
    ranking: [...porPessoa.values()]
      .filter((p) => p.faltas > 0)
      .sort((a, b) => b.faltas - a.faltas || a.name.localeCompare(b.name, "pt-BR")),
  };
}

// O que o bloco "Presenca" mostra: ou uma mensagem de vazio, ou ate `limit` pessoas.
export function attendanceView(
  summary: AttendanceSummary,
  limit = 5,
): { mensagem: string | null; itens: { userId: string; name: string; label: string }[] } {
  if (summary.total === 0) return { mensagem: "Sem escalas concluídas no período.", itens: [] };
  if (summary.faltas === 0) return { mensagem: "Nenhuma falta no período.", itens: [] };
  return {
    mensagem: null,
    itens: summary.ranking.slice(0, limit).map((p) => ({
      userId: p.userId,
      name: p.name,
      label: `${p.faltas} ${p.faltas === 1 ? "falta" : "faltas"} de ${p.escalado}`,
    })),
  };
}
