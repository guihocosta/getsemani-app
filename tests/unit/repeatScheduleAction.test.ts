import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logError", () => ({ logError: vi.fn(() => "REF123") }));
vi.mock("@/modules/scheduling/services/repeatSchedule", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/scheduling/services/repeatSchedule")>()),
  repeatSchedule: vi.fn(),
}));

import { repeatScheduleAction } from "@app/(app)/escalas/actions";
import { repeatSchedule, RepeatPartialFailure } from "@/modules/scheduling/services/repeatSchedule";
import { logError } from "@/lib/logError";

beforeEach(() => {
  vi.mocked(logError).mockClear();
});

describe("repeatScheduleAction", () => {
  it("relanca redirect do Next (sessao expirada vai pro /login)", async () => {
    const redirectErr = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/login;307;",
    });
    vi.mocked(repeatSchedule).mockRejectedValueOnce(redirectErr);
    await expect(repeatScheduleAction("s1")).rejects.toBe(redirectErr);
    expect(logError).not.toHaveBeenCalled();
  });

  it("loga erro desconhecido e devolve ref", async () => {
    const boom = new Error("boom");
    vi.mocked(repeatSchedule).mockRejectedValueOnce(boom);
    const res = await repeatScheduleAction("s1");
    expect(logError).toHaveBeenCalledWith("escalas.repeatSchedule", boom, { scheduleId: "s1" });
    expect(res).toEqual({ ok: false, error: "Não deu para repetir a escalação agora.", ref: "REF123" });
  });

  it("loga erro desconhecido: FORBIDDEN e NO_ROTATION_CYCLE mantem mensagem propria", async () => {
    vi.mocked(repeatSchedule).mockRejectedValueOnce(new Error("FORBIDDEN"));
    expect(await repeatScheduleAction("s1")).toEqual({
      ok: false,
      error: "Você não tem permissão para essa ação.",
    });
    vi.mocked(repeatSchedule).mockRejectedValueOnce(new Error("NO_ROTATION_CYCLE"));
    expect(await repeatScheduleAction("s1")).toEqual({
      ok: false,
      error: "Defina o ciclo de rodízio ao editar a escala.",
    });
  });

  it("falha parcial com 3 preenchidas devolve filled e mensagem no plural", async () => {
    const err = new RepeatPartialFailure(3, new Error("db down"));
    vi.mocked(repeatSchedule).mockRejectedValueOnce(err);
    const res = await repeatScheduleAction("s1");
    expect(logError).toHaveBeenCalledWith("escalas.repeatSchedule", err, { scheduleId: "s1" });
    expect(res).toMatchObject({
      ok: false,
      filled: 3,
      error: "3 vagas preenchidas antes da falha. Tente de novo para completar.",
    });
  });

  it("falha parcial com 1 preenchida usa singular", async () => {
    vi.mocked(repeatSchedule).mockRejectedValueOnce(new RepeatPartialFailure(1, new Error("x")));
    const res = await repeatScheduleAction("s1");
    expect(res).toMatchObject({
      ok: false,
      filled: 1,
      error: "1 vaga preenchida antes da falha. Tente de novo para completar.",
    });
  });
});
