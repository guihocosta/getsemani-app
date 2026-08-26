import { describe, it, expect } from "vitest";
import { patchOccurrenceSlot, type Item } from "@app/(app)/escalas/occurrenceCache";

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    occurrenceId: "occ-1",
    scheduleId: "sched-1",
    ministryId: "min-1",
    dayKey: "2026-07-27",
    title: "Culto",
    when: "27/07 10:00",
    slots: [
      {
        slotId: "slot-1",
        roleId: "role-vocal",
        role: "Vocal",
        allocatedUserId: null,
        allocatedName: null,
        allocationId: null,
        allocatedStatus: null,
        checkedIn: false,
        isGuest: false,
        active: true,
      },
      {
        slotId: "slot-2",
        roleId: "role-bateria",
        role: "Bateria",
        allocatedUserId: null,
        allocatedName: null,
        allocationId: null,
        allocatedStatus: null,
        checkedIn: false,
        isGuest: false,
        active: true,
      },
    ],
    ...overrides,
  };
}

const PATCH = {
  allocatedUserId: "u1",
  allocatedName: "Ana",
  allocationId: "alloc-1",
  allocatedStatus: "PENDING" as const,
  checkedIn: false,
  isGuest: false,
};

const GUEST_PATCH = {
  allocatedUserId: null,
  allocatedName: "Fulano (visitante)",
  allocationId: "alloc-2",
  allocatedStatus: "PENDING" as const,
  checkedIn: false,
  isGuest: true,
};

describe("patchOccurrenceSlot", () => {
  it("atualiza so a vaga certa dentro da ocorrencia certa", () => {
    const items = [makeItem()];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-1", PATCH);
    expect(result[0].slots[0]).toMatchObject(PATCH);
    expect(result[0].slots[1].allocatedUserId).toBeNull();
  });

  it("nao mexe em ocorrencias diferentes (mesma referencia)", () => {
    const outraOcorrencia = makeItem({ occurrenceId: "occ-2" });
    const items = [makeItem(), outraOcorrencia];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-1", PATCH);
    expect(result[1]).toBe(outraOcorrencia);
  });

  it("nao muta a lista original", () => {
    const items = [makeItem()];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-1", PATCH);
    expect(result).not.toBe(items);
    expect(items[0].slots[0].allocatedUserId).toBeNull();
  });

  it("ignora slotId inexistente sem quebrar", () => {
    const items = [makeItem()];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-inexistente", PATCH);
    expect(result[0].slots.every((s) => s.allocatedUserId === null)).toBe(true);
  });

  it("aceita patch de guest sem userId", () => {
    const items = [makeItem()];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-1", GUEST_PATCH);
    expect(result[0].slots[0]).toMatchObject(GUEST_PATCH);
  });
});
