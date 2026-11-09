import { describe, it, expect, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logError", () => ({ logError: vi.fn(() => "REF123") }));
vi.mock("@/modules/scheduling/services/remindPending", () => ({ remindPending: vi.fn() }));

import { remindPendingAction } from "@app/(app)/escalas/actions";
import { remindPending } from "@/modules/scheduling/services/remindPending";
import { MENSAGENS } from "@/lib/actionError";

describe("remindPendingAction", () => {
  it("traduz erros", async () => {
    vi.mocked(remindPending).mockResolvedValueOnce({ enviados: 1, recentes: 0, semDispositivo: 0, falhas: 0 });
    expect(await remindPendingAction("o1")).toEqual({ ok: true, enviados: 1, recentes: 0, semDispositivo: 0, falhas: 0 });

    vi.mocked(remindPending).mockRejectedValueOnce(new Error("NOT_REMINDABLE"));
    expect(await remindPendingAction("o1", "a1")).toEqual({ ok: false, code: "NOT_REMINDABLE", ref: "REF123" });

    vi.mocked(remindPending).mockRejectedValueOnce(new Error("FORBIDDEN"));
    expect(await remindPendingAction("o1")).toEqual({ ok: false, code: "FORBIDDEN", ref: "REF123" });

    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    vi.mocked(remindPending).mockRejectedValueOnce(redirect);
    await expect(remindPendingAction("o1")).rejects.toBe(redirect);

    expect(MENSAGENS.NOT_REMINDABLE).toBe("Essa escala não pode ser lembrada agora.");
  });
});
