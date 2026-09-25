import { describe, it, expect, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/modules/identity/services/authz", () => ({
  requireLeaderOf: vi.fn(),
  requireUser: vi.fn(),
  getSessionUser: vi.fn(),
}));

import { createScheduleAction } from "@app/(app)/escalas/actions";

function form(rotationCycle: string) {
  const fd = new FormData();
  fd.set("ministryId", "00000000-0000-4000-8000-000000000001");
  fd.set("title", "Culto");
  fd.set("recurrenceRule", "FREQ=WEEKLY;BYDAY=SU");
  fd.set("startDate", "2026-10-04");
  fd.set("startTime", "19:00");
  fd.set("rotationCycle", rotationCycle);
  fd.append("roleIds", "00000000-0000-4000-8000-000000000002");
  return fd;
}

describe("createScheduleAction rotationCycle", () => {
  it.each(["0", "13"])("ciclo %s mostra mensagem de faixa 1..12", async (value) => {
    const res = await createScheduleAction({ ok: false }, form(value));
    expect(res).toEqual({ ok: false, error: "Ciclo de rodízio deve ser entre 1 e 12." });
  });
});
