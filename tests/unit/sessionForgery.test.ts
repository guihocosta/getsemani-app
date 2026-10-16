import { describe, it, expect, vi, beforeEach } from "vitest";

const auth = {
  getClaims: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(async () => ({ auth })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("@/modules/identity/services/ensureProfile", () => ({
  ensureProfile: vi.fn(async (u: { id: string }) => ({ id: u.id, reparado: true })),
}));

import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/modules/identity/services/ensureProfile";
import { getSessionUser } from "@/modules/identity/services/authz";

// Bug: getSessionUser confiava em getSession().user, que vem do cookie sem
// verificar a assinatura do JWT — cookie forjado com o UUID de outra pessoa
// virava aquela pessoa. A identidade agora vem de getClaims() (verificado).
describe("getSessionUser — identidade verificada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // getSession devolveria o usuario forjado; nao pode ser consultado.
    auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-forjado" } } },
      error: null,
    });
  });

  it("JWT com assinatura invalida -> null, sem tocar no banco", async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: new Error("invalid JWT signature") });

    expect(await getSessionUser()).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it("JWT que nem decodifica (getClaims lanca) -> null, nao erro 500", async () => {
    auth.getClaims.mockRejectedValue(new Error("Invalid UTF-8 sequence"));

    expect(await getSessionUser()).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("sem sessao -> null", async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: null });
    expect(await getSessionUser()).toBeNull();
  });

  it("claims validas -> perfil pelo sub verificado", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1" } as never);

    expect(await getSessionUser()).toEqual({ id: "u1" });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("claims validas sem perfil -> repara com o usuario do Auth", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    expect(await getSessionUser()).toEqual({ id: "u1", reparado: true });
  });

  it("reparo nao aceita usuario do Auth diferente do sub", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    auth.getUser.mockResolvedValue({ data: { user: { id: "outro" } }, error: null });

    expect(await getSessionUser()).toBeNull();
    expect(ensureProfile).not.toHaveBeenCalled();
  });
});
