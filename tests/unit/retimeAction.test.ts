import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logError", () => ({ logError: vi.fn(() => "REF123") }));
vi.mock("@/modules/scheduling/services/retimeOccurrences", () => ({ retimeOccurrence: vi.fn() }));
vi.mock("@/modules/scheduling/services/updateSchedule", () => ({ updateSchedule: vi.fn() }));
vi.mock("@/modules/scheduling/services/materializeOccurrences", () => ({ materializeOccurrences: vi.fn() }));

import { retimeOccurrenceAction, updateScheduleAction } from "@app/(app)/escalas/actions";
import { retimeOccurrence } from "@/modules/scheduling/services/retimeOccurrences";
import { updateSchedule } from "@/modules/scheduling/services/updateSchedule";
import { HorarioOcupado } from "@/modules/scheduling/domain/retime";

const OCUPADO = new HorarioOcupado(new Date("2026-11-01T21:30:00Z"));

beforeEach(() => vi.clearAllMocks());

describe("retimeOccurrenceAction", () => {
  it("sucesso devolve moved", async () => {
    vi.mocked(retimeOccurrence).mockResolvedValueOnce({ moved: 2 });
    expect(await retimeOccurrenceAction("o1", "FROM_HERE", "18:30")).toEqual({ ok: true, moved: 2 });
    expect(retimeOccurrence).toHaveBeenCalledWith({ occurrenceId: "o1", scope: "FROM_HERE", time: "18:30" });
  });

  it("traduz cada erro conhecido", async () => {
    const casos: [unknown, string][] = [
      [new Error("FORBIDDEN"), "Você não tem permissão para essa ação."],
      [OCUPADO, "Já existe outra data desta escala em 01/11 às 18:30."],
      [new Error("DATA_PASSADA"), "Essa data já passou."],
      [new Error("HORARIO_INVALIDO"), "Informe um horário válido."],
    ];
    for (const [erro, texto] of casos) {
      vi.mocked(retimeOccurrence).mockRejectedValueOnce(erro);
      expect(await retimeOccurrenceAction("o1", "SINGLE", "18:30"), texto).toEqual({ ok: false, error: texto });
    }
  });

  it("relanca redirect do Next", async () => {
    const redirectErr = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    vi.mocked(retimeOccurrence).mockRejectedValueOnce(redirectErr);
    await expect(retimeOccurrenceAction("o1", "SINGLE", "18:30")).rejects.toBe(redirectErr);
  });
});

describe("updateScheduleAction", () => {
  it("editar escala ocupado", async () => {
    vi.mocked(updateSchedule).mockRejectedValueOnce(OCUPADO);
    const fd = new FormData();
    fd.set("scheduleId", "s1");
    fd.set("title", "Culto Louvor");
    fd.set("startTime", "18:30");
    fd.set("recurrenceRule", "FREQ=WEEKLY;BYDAY=SU");
    fd.append("roleIds", "r1");
    expect(await updateScheduleAction({ ok: false }, fd)).toEqual({
      ok: false,
      error: "Já existe outra data desta escala em 01/11 às 18:30.",
    });
  });
});
