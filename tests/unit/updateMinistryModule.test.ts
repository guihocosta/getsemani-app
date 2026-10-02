import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { ministry: { update: vi.fn(), findMany: vi.fn(async () => []) } },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireAdmin: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { updateMinistry } from "@/modules/ministries/services/updateMinistry";
import { repertoireMinistries } from "@/modules/ministries/services/modules";

beforeEach(() => {
  vi.mocked(prisma.ministry.update).mockReset();
  vi.mocked(prisma.ministry.findMany).mockClear();
});

describe("updateMinistry", () => {
  it("repertoireEnabled informado e gravado", async () => {
    await updateMinistry({ ministryId: "m1", repertoireEnabled: true });
    expect(prisma.ministry.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { repertoireEnabled: true },
    });

    await updateMinistry({ ministryId: "m1", repertoireEnabled: false });
    expect(prisma.ministry.update).toHaveBeenLastCalledWith({
      where: { id: "m1" },
      data: { repertoireEnabled: false },
    });
  });

  it("repertoireEnabled ausente nao entra no update", async () => {
    await updateMinistry({ ministryId: "m1", name: "Louvor" });
    expect(prisma.ministry.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { name: "Louvor" } });
  });
});

describe("repertoireMinistries", () => {
  it("repertoireMinistries filtra os informados pelo flag ligado", async () => {
    await repertoireMinistries(["m1", "m2"]);
    expect(prisma.ministry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["m1", "m2"] }, repertoireEnabled: true } }),
    );
  });

  it("repertoireMinistries sem ministerios nao consulta", async () => {
    expect(await repertoireMinistries([])).toEqual([]);
    expect(prisma.ministry.findMany).not.toHaveBeenCalled();
  });
});
