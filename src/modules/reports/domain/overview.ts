import { monthKey, monthWindow, startOfDay } from "@/lib/time";

export const OVERVIEW_PERIODS = [
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "mes", label: "Mês atual", days: null },
  { key: "90d", label: "90 dias", days: 90 },
] as const;

export type OverviewPeriodKey = (typeof OVERVIEW_PERIODS)[number]["key"];

const DAY_MS = 864e5;

// Janela meio-aberta [from, to). Periodos em dias terminam no fim de hoje e
// incluem hoje; "mes" e o mes de calendario corrente. Chave ausente ou
// desconhecida cai em 30 dias.
export function overviewPeriod(raw: string | undefined, now: Date): { key: OverviewPeriodKey; from: Date; to: Date } {
  const period = OVERVIEW_PERIODS.find((p) => p.key === raw) ?? OVERVIEW_PERIODS[1];
  if (period.days === null) {
    const [year, month] = monthKey(now).split("-").map(Number);
    return { key: period.key, ...monthWindow(year, month) };
  }
  const today = startOfDay(now);
  return {
    key: period.key,
    from: new Date(today.getTime() - (period.days - 1) * DAY_MS),
    to: new Date(today.getTime() + DAY_MS),
  };
}

export type OverviewAllocation = {
  userId: string | null; // null = convidado sem conta
  status: "PENDING" | "CONFIRMED";
  checkedIn: boolean;
  ended: boolean; // dia da ocorrencia ja acabou
};

export type OverviewInput = {
  occurrences: number;
  openSlots: number;
  activeMembers: number;
  allocations: OverviewAllocation[];
};

function pct(part: number, total: number): number | null {
  return total === 0 ? null : Math.round((part / total) * 100);
}

// Convidado sem conta entra em escalacoes, mas nao confirma nem faz check-in,
// entao fica fora de membros, confirmadas e faltas.
export function summarizeOverview(input: OverviewInput) {
  const comConta = input.allocations.filter((a) => a.userId !== null);
  const encerradas = comConta.filter((a) => a.ended);
  const membrosEscalados = new Set(comConta.map((a) => a.userId)).size;

  return {
    escalas: input.occurrences,
    escalacoes: input.allocations.length,
    vagasAbertas: input.openSlots,
    membrosEscalados,
    membrosAtivos: input.activeMembers,
    pctMembros: pct(membrosEscalados, input.activeMembers),
    pctConfirmadas: pct(comConta.filter((a) => a.status === "CONFIRMED").length, comConta.length),
    pctFaltas: pct(encerradas.filter((a) => !a.checkedIn).length, encerradas.length),
  };
}

export function fmtPct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}
