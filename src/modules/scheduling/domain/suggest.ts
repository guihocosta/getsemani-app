// Sugestao automatica: regra fixa (sem IA) para preencher as vagas abertas de
// uma data. Funcao pura - quem chama traz carga, faltas, indisponibilidade e
// capacitacao ja resolvidas.

export type SuggestCandidate = {
  userId: string;
  load: number; // escalas na janela em torno da data
  faltas: number;
  unavailable: boolean;
};

export type SuggestSlot = { slotId: string; roleId: string };

export type SuggestPlan = {
  picks: { slotId: string; userId: string }[];
  unfilled: string[]; // slotIds sem ninguem elegivel
};

// Menor carga, depois menos faltas, depois userId (desempate estavel).
function compare(a: SuggestCandidate, b: SuggestCandidate): number {
  return a.load - b.load || a.faltas - b.faltas || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
}

// capableByRole: Set = so esses sao elegiveis na funcao; null/ausente = ninguem
// declarou capacitacao, todos sao elegiveis (mesma regra de repeatSchedule).
// alreadyAllocated: quem ja esta na data antes da sugestao (uma pessoa, uma vaga).
export function planSuggestions(params: {
  slots: SuggestSlot[];
  candidates: SuggestCandidate[];
  capableByRole: Map<string, Set<string> | null>;
  alreadyAllocated: Set<string>;
}): SuggestPlan {
  const base = params.candidates.filter((c) => !c.unavailable && !params.alreadyAllocated.has(c.userId));

  const eligibleFor = (slot: SuggestSlot) => {
    const capable = params.capableByRole.get(slot.roleId) ?? null;
    return base.filter((c) => capable === null || capable.has(c.userId));
  };

  const used = new Set<string>();
  const picks: SuggestPlan["picks"] = [];
  const unfilled: string[] = [];
  let remaining = params.slots.map((slot) => ({ slot, eligible: eligibleFor(slot) }));

  // Vaga mais restrita primeiro, para nao gastar o unico capacitado de uma
  // funcao em outra. A contagem e refeita a cada escolha: quem acabou de ser
  // usado deixa de contar para as vagas que sobraram. Empate mantem a ordem recebida.
  while (remaining.length > 0) {
    const open = remaining.map((r) => ({ slot: r.slot, left: r.eligible.filter((c) => !used.has(c.userId)) }));
    let next = open[0];
    for (const o of open) if (o.left.length < next.left.length) next = o;
    remaining = remaining.filter((r) => r.slot !== next.slot);

    const best = [...next.left].sort(compare)[0];
    if (!best) {
      unfilled.push(next.slot.slotId);
      continue;
    }
    used.add(best.userId);
    picks.push({ slotId: next.slot.slotId, userId: best.userId });
  }

  return { picks, unfilled };
}

export type SuggestActionResult =
  | { ok: true; filled: number; unfilled: number }
  | { ok: false; error: string };

// Texto e efeito na tela depois de "Sugerir escalação".
export function suggestOutcome(res: SuggestActionResult): { message: string; isError: boolean; refresh: boolean } {
  // erro no meio pode ja ter gravado vagas, entao a tela recarrega tambem
  if (!res.ok) return { message: res.error, isError: true, refresh: true };
  if (res.filled === 0 && res.unfilled === 0) {
    return { message: "Nenhuma vaga aberta nesta data.", isError: false, refresh: false };
  }
  const vagas = res.filled === 1 ? "vaga preenchida" : "vagas preenchidas";
  return {
    message: `${res.filled} ${vagas}, ${res.unfilled} sem candidato`,
    isError: false,
    refresh: res.filled > 0,
  };
}

export function suggestConfirmText(published: boolean): string {
  const base = "Preenche as vagas abertas com quem está disponível, é capacitado e tem menos escalas no período.";
  return published
    ? `${base} Os escalados serão avisados agora.`
    : `${base} Como a data é rascunho, os escalados serão avisados só ao publicar.`;
}
