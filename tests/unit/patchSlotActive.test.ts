import { describe, it, expect } from "vitest";
import { patchSlotActive, type Item } from "@app/(app)/escalas/occurrenceCache";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    occurrenceId: "occ-1",
    scheduleId: "sched-1",
    ministryId: "min-1",
    rotationCycle: null,
    dayKey: "2026-07-27",
    title: "Culto",
    when: "27/07 10:00",
    slots: [
      {
        slotId: "slot-1",
        roleId: "role-vocal",
        role: "Vocal",
        allocatedUserId: "u1",
        allocatedName: "Ana",
        allocationId: "alloc-1",
        allocatedStatus: "PENDING",
        checkedIn: false,
        isGuest: false,
        active: true,
      },
    ],
    ...overrides,
  };
}

describe("patchSlotActive", () => {
  it("desativa a vaga e limpa a alocacao", () => {
    const items = [makeItem()];
    const result = patchSlotActive(items, "occ-1", "slot-1", false);
    expect(result[0].slots[0]).toMatchObject({
      active: false,
      allocatedUserId: null,
      allocatedName: null,
      allocationId: null,
      allocatedStatus: null,
      checkedIn: false,
      isGuest: false,
    });
  });

  it("reativa a vaga sem restaurar a alocacao anterior", () => {
    const items = [makeItem({ slots: [{ ...makeItem().slots[0], active: false, allocatedUserId: null, allocatedName: null, allocationId: null, allocatedStatus: null, isGuest: false }] })];
    const result = patchSlotActive(items, "occ-1", "slot-1", true);
    expect(result[0].slots[0].active).toBe(true);
    expect(result[0].slots[0].allocatedUserId).toBeNull();
  });

  it("nao mexe em ocorrencias diferentes (mesma referencia)", () => {
    const outraOcorrencia = makeItem({ occurrenceId: "occ-2" });
    const items = [makeItem(), outraOcorrencia];
    const result = patchSlotActive(items, "occ-1", "slot-1", false);
    expect(result[1]).toBe(outraOcorrencia);
  });
});
