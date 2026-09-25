export type RepeatActionResult =
  | { ok: true; filled: number; skipped: number }
  | { ok: false; error: string; filled?: number; ref?: string };

// Texto e efeito na tela depois de "Repetir escalação". Falha parcial ainda
// gravou vagas, entao a ocorrencia recarrega mesmo com erro.
export function repeatOutcome(res: RepeatActionResult): {
  message: string;
  isError: boolean;
  refresh: boolean;
} {
  if (!res.ok) {
    return { message: res.error, isError: true, refresh: (res.filled ?? 0) > 0 };
  }
  const vagas = res.filled === 1 ? "vaga preenchida" : "vagas preenchidas";
  const puladas = res.skipped === 1 ? "pulada" : "puladas";
  return { message: `${res.filled} ${vagas}, ${res.skipped} ${puladas}`, isError: false, refresh: true };
}
