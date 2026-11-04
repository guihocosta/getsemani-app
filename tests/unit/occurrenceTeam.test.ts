import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { occurrence: { findUnique: vi.fn() } },
}));
vi.mock("@/modules/identity/services/authz", () => ({
  requireUser: vi.fn(),
  isLeaderOf: vi.fn(),
}));
vi.mock("@/modules/identity/services/memberships", () => ({ visibleMinistryIds: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireUser, isLeaderOf } from "@/modules/identity/services/authz";
import { visibleMinistryIds } from "@/modules/identity/services/memberships";
import { getOccurrenceTeam } from "@/modules/scheduling/services/getOccurrenceTeam";

const ID = "3f6b1c2e-8d4a-4e7b-9c1d-2a5e6f7a8b9c";
const EU = "u-eu";

type Pessoa = { id: string; name: string; email?: string; phone?: string; birthDate?: Date };

function slot(id: string, role: string, opts: { active?: boolean; user?: Pessoa; guest?: string; status?: string } = {}) {
  const allocation = opts.user
    ? { userId: opts.user.id, guestName: null, status: opts.status ?? "CONFIRMED", user: opts.user }
    : opts.guest
      ? { userId: null, guestName: opts.guest, status: opts.status ?? "CONFIRMED", user: null }
      : null;
  return { id, active: opts.active ?? true, role: { name: role }, allocation };
}

function occurrence(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    date: new Date("2026-10-18T21:00:00Z"),
    status: "ACTIVE",
    published: true,
    schedule: { title: "Culto Louvor", ministryId: "m1", ministry: { name: "Louvor", color: null, repertoireEnabled: true } },
    slots: [],
    ...over,
  };
}

// Membro de m1 so quando `membro`; admin ve tudo. O argumento isAdmin decide.
function veComo(membro: boolean) {
  vi.mocked(visibleMinistryIds).mockImplementation(async (_userId: string, isAdmin: boolean) =>
    isAdmin ? ["m1", "m2"] : membro ? ["m1"] : ["m2"],
  );
}

beforeEach(() => {
  vi.mocked(requireUser).mockReset().mockResolvedValue({ id: EU, isAdmin: false } as never);
  vi.mocked(isLeaderOf).mockReset().mockResolvedValue(false);
  vi.mocked(prisma.occurrence.findUnique).mockReset().mockResolvedValue(occurrence() as never);
  veComo(true);
});

describe("getOccurrenceTeam", () => {
  it("vagas da data: so ativas, em ordem de funcao, com convidado, pendente e voce", async () => {
    vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(
      occurrence({
        slots: [
          slot("s-vocal", "Vocal", { user: { id: "u3", name: "Rafael Souza Lima" } }),
          slot("s-bat", "Bateria", { user: { id: EU, name: "Lia Lider" }, status: "PENDING" }),
          slot("s-som", "Som", { active: false, user: { id: "u9", name: "Fora" } }),
          slot("s-tec", "Teclado"),
          slot("s-acordeon", "Acordeom", { guest: "Zé Visitante" }),
          slot("s-vio", "Violão", { user: { id: "u2", name: "Ana Beatriz Moreira" } }),
        ],
      }) as never,
    );

    const t = await getOccurrenceTeam(ID);

    expect(t.slots).toEqual([
      { slotId: "s-acordeon", role: "Acordeom", name: "Zé Visitante", isGuest: true, status: "CONFIRMED", isMe: false },
      { slotId: "s-bat", role: "Bateria", name: "Lia Lider", isGuest: false, status: "PENDING", isMe: true },
      { slotId: "s-tec", role: "Teclado", name: null, isGuest: false, status: null, isMe: false },
      { slotId: "s-vio", role: "Violão", name: "Ana Beatriz Moreira", isGuest: false, status: "CONFIRMED", isMe: false },
      { slotId: "s-vocal", role: "Vocal", name: "Rafael Souza Lima", isGuest: false, status: "CONFIRMED", isMe: false },
    ]);
    expect(t.ministry).toBe("Louvor");
    expect(t.title).toBe("Culto Louvor");
    expect(t.repertoireEnabled).toBe(true);
    expect(t.ministryColor).toBe("#2a78cd");
  });

  describe("acesso a data", () => {
    it("id que nao e uuid: NOT_FOUND sem consultar", async () => {
      await expect(getOccurrenceTeam("abc")).rejects.toThrow("NOT_FOUND");
      expect(prisma.occurrence.findUnique).not.toHaveBeenCalled();
    });

    it("uuid inexistente: NOT_FOUND", async () => {
      vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(null);
      await expect(getOccurrenceTeam(ID)).rejects.toThrow("NOT_FOUND");
    });

    it("data cancelada: NOT_FOUND", async () => {
      vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(occurrence({ status: "CANCELLED" }) as never);
      await expect(getOccurrenceTeam(ID)).rejects.toThrow("NOT_FOUND");
    });

    it("nao membro: FORBIDDEN", async () => {
      veComo(false);
      await expect(getOccurrenceTeam(ID)).rejects.toThrow("FORBIDDEN");
      expect(visibleMinistryIds).toHaveBeenCalledWith(EU, false);
    });

    it("rascunho para voluntario: FORBIDDEN", async () => {
      vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(occurrence({ published: false }) as never);
      await expect(getOccurrenceTeam(ID)).rejects.toThrow("FORBIDDEN");
      expect(isLeaderOf).toHaveBeenCalledWith(EU, "m1");
    });

    it("rascunho para lider do ministerio: aceita", async () => {
      vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(occurrence({ published: false }) as never);
      vi.mocked(isLeaderOf).mockImplementation(async (userId, ministryId) => userId === EU && ministryId === "m1");
      await expect(getOccurrenceTeam(ID)).resolves.toMatchObject({ occurrenceId: ID });
    });

    it("admin sem vinculo, data publicada: aceita", async () => {
      veComo(false);
      vi.mocked(requireUser).mockResolvedValue({ id: EU, isAdmin: true } as never);
      await expect(getOccurrenceTeam(ID)).resolves.toMatchObject({ occurrenceId: ID });
      expect(visibleMinistryIds).toHaveBeenCalledWith(EU, true);
    });
  });

  it("so o nome: a consulta pede do usuario so name e o resultado nao tem dado pessoal", async () => {
    vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(
      occurrence({
        slots: [
          slot("s1", "Vocal", {
            user: { id: "u3", name: "Rafael", email: "r@x.com", phone: "11999", birthDate: new Date("1990-01-01") },
          }),
        ],
      }) as never,
    );

    const t = await getOccurrenceTeam(ID);

    const args = vi.mocked(prisma.occurrence.findUnique).mock.calls[0][0] as {
      select: { slots: { select: { allocation: { select: { user: unknown } } } } };
    };
    expect(args.select.slots.select.allocation.select.user).toEqual({ select: { name: true } });
    const texto = JSON.stringify(t);
    for (const vazado of ["r@x.com", "11999", "1990", "email", "phone", "birthDate"]) {
      expect(texto).not.toContain(vazado);
    }
  });
});
