import { describe, it, expect } from "vitest";
import { groupGuestAllocations } from "@/modules/scheduling/services/listGuestAllocations";

describe("groupGuestAllocations", () => {
  it("agrupa alocações com mesmo guestName e ordena por data", () => {
    const rawAllocations = [
      {
        allocationId: "alloc-1",
        slotId: "slot-1",
        occurrenceId: "occ-1",
        guestName: "Maria Silva",
        role: "Som",
        ministryName: "Mídia",
        when: "08/08/2026 19:00",
        date: new Date("2026-08-08T19:00:00Z"),
      },
      {
        allocationId: "alloc-2",
        slotId: "slot-2",
        occurrenceId: "occ-2",
        guestName: "maria silva ",
        role: "Projeção",
        ministryName: "Mídia",
        when: "01/08/2026 19:00",
        date: new Date("2026-08-01T19:00:00Z"),
      },
      {
        allocationId: "alloc-3",
        slotId: "slot-3",
        occurrenceId: "occ-3",
        guestName: "João Santos",
        role: "Violão",
        ministryName: "Louvor",
        when: "02/08/2026 10:00",
        date: new Date("2026-08-02T10:00:00Z"),
      },
    ];

    const result = groupGuestAllocations(rawAllocations);

    expect(result).toHaveLength(2);
    // Maria Silva deve ter 2 alocações, a primeira em 01/08
    const maria = result.find((g) => g.guestName.toLowerCase().includes("maria"));
    expect(maria).toBeDefined();
    expect(maria?.totalAllocations).toBe(2);
    expect(maria?.allocations[0].allocationId).toBe("alloc-2");
    expect(maria?.allocations[1].allocationId).toBe("alloc-1");
  });
});
