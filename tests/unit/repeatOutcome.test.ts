import { describe, it, expect } from "vitest";
import { repeatOutcome } from "@app/(app)/escalas/repeatOutcome";

describe("repeatOutcome", () => {
  it("refresh true em sucesso, mesmo com 0 preenchidas", () => {
    expect(repeatOutcome({ ok: true, filled: 0, skipped: 2 }).refresh).toBe(true);
  });

  it("refresh true em erro com filled > 0 (falha parcial)", () => {
    const out = repeatOutcome({ ok: false, filled: 2, error: "2 vagas preenchidas antes da falha." });
    expect(out.refresh).toBe(true);
    expect(out.isError).toBe(true);
  });

  it("refresh false em erro sem filled", () => {
    expect(repeatOutcome({ ok: false, error: "Não deu para repetir a escalação agora." }).refresh).toBe(false);
  });
});
