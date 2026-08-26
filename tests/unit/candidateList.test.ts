import { describe, it, expect } from "vitest";
import { buildCandidateList } from "@/modules/scheduling/services/candidateList";

describe("buildCandidateList", () => {
  it("inclui membro LEADER (nao so VOLUNTEER)", () => {
    const list = buildCandidateList({
      memberships: [{ userId: "u1", role: "LEADER", user: { name: "Ana" } }],
      countByUser: new Map(),
      unavailableUserIds: new Set(),
      capableUserIds: new Set(),
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
      capableUserIds: new Set(),
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
      capableUserIds: new Set(),
    });
    expect(list.map((c) => c.userId)).toEqual(["u2", "u1"]);
  });

  it("marca unavailable pra quem esta no set de indisponiveis", () => {
    const list = buildCandidateList({
      memberships: [{ userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } }],
      countByUser: new Map(),
      unavailableUserIds: new Set(["u1"]),
      capableUserIds: new Set(),
    });
    expect(list[0].unavailable).toBe(true);
  });

  it("count30d default 0 quando nao esta no mapa", () => {
    const list = buildCandidateList({
      memberships: [{ userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } }],
      countByUser: new Map(),
      unavailableUserIds: new Set(),
      capableUserIds: new Set(),
    });
    expect(list[0].count30d).toBe(0);
  });

  it("capacitado com carga alta vem antes de nao capacitado com carga baixa (CAPA-05.1)", () => {
    const list = buildCandidateList({
      memberships: [
        { userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } },
        { userId: "u2", role: "VOLUNTEER", user: { name: "Bia" } },
      ],
      countByUser: new Map([["u1", 10], ["u2", 0]]),
      unavailableUserIds: new Set(),
      capableUserIds: new Set(["u1"]),
    });
    expect(list.map((c) => c.userId)).toEqual(["u1", "u2"]);
    expect(list[0].capable).toBe(true);
    expect(list[1].capable).toBe(false);
  });

  it("mantem a ordem por carga 30d dentro de cada grupo de capacitacao (CAPA-05.4)", () => {
    const list = buildCandidateList({
      memberships: [
        { userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } },
        { userId: "u2", role: "VOLUNTEER", user: { name: "Bia" } },
        { userId: "u3", role: "VOLUNTEER", user: { name: "Caio" } },
        { userId: "u4", role: "VOLUNTEER", user: { name: "Duda" } },
      ],
      countByUser: new Map([["u1", 5], ["u2", 2], ["u3", 8], ["u4", 1]]),
      unavailableUserIds: new Set(),
      capableUserIds: new Set(["u1", "u2"]),
    });
    expect(list.map((c) => c.userId)).toEqual(["u2", "u1", "u4", "u3"]);
  });

  it("Set de capableUserIds vazio preserva exatamente a ordenacao por carga de antes", () => {
    const list = buildCandidateList({
      memberships: [
        { userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } },
        { userId: "u2", role: "VOLUNTEER", user: { name: "Bia" } },
      ],
      countByUser: new Map([["u1", 5], ["u2", 1]]),
      unavailableUserIds: new Set(),
      capableUserIds: new Set(),
    });
    expect(list.map((c) => c.userId)).toEqual(["u2", "u1"]);
    expect(list.every((c) => c.capable === false)).toBe(true);
  });
});
