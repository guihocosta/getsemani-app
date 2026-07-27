import { describe, it, expect } from "vitest";
import { buildCandidateList } from "@/modules/scheduling/services/candidateList";

describe("buildCandidateList", () => {
  it("inclui membro LEADER (nao so VOLUNTEER)", () => {
    const list = buildCandidateList({
      memberships: [{ userId: "u1", role: "LEADER", user: { name: "Ana" } }],
      countByUser: new Map(),
      unavailableUserIds: new Set(),
    });
    expect(list.map((c) => c.userId)).toEqual(["u1"]);
  });

  it("deduplica quem tem membership LEADER e VOLUNTEER no mesmo ministerio", () => {
    const list = buildCandidateList({
      memberships: [
        { userId: "u1", role: "LEADER", user: { name: "Ana" } },
        { userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } },
      ],
      countByUser: new Map(),
      unavailableUserIds: new Set(),
    });
    expect(list).toHaveLength(1);
  });

  it("ordena por carga dos ultimos 30 dias, menor primeiro", () => {
    const list = buildCandidateList({
      memberships: [
        { userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } },
        { userId: "u2", role: "VOLUNTEER", user: { name: "Bia" } },
      ],
      countByUser: new Map([["u1", 5], ["u2", 1]]),
      unavailableUserIds: new Set(),
    });
    expect(list.map((c) => c.userId)).toEqual(["u2", "u1"]);
  });

  it("marca unavailable pra quem esta no set de indisponiveis", () => {
    const list = buildCandidateList({
      memberships: [{ userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } }],
      countByUser: new Map(),
      unavailableUserIds: new Set(["u1"]),
    });
    expect(list[0].unavailable).toBe(true);
  });

  it("count30d default 0 quando nao esta no mapa", () => {
    const list = buildCandidateList({
      memberships: [{ userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } }],
      countByUser: new Map(),
      unavailableUserIds: new Set(),
    });
    expect(list[0].count30d).toBe(0);
  });
});
