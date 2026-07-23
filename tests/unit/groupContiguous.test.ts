import { describe, it, expect } from "vitest";
import { groupContiguous } from "@/modules/availability/services/unavailability";

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

describe("groupContiguous", () => {
  it("agrupa dias consecutivos com mesmo horario num periodo so", () => {
    const rows = [
      { id: "1", date: day("2026-07-05"), startTime: null, endTime: null },
      { id: "2", date: day("2026-07-06"), startTime: null, endTime: null },
      { id: "3", date: day("2026-07-07"), startTime: null, endTime: null },
    ];
    const groups = groupContiguous(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].ids).toEqual(["1", "2", "3"]);
    expect(groups[0].startDate).toEqual(day("2026-07-05"));
    expect(groups[0].endDate).toEqual(day("2026-07-07"));
  });

  it("nao agrupa dias com gap", () => {
    const rows = [
      { id: "1", date: day("2026-07-05"), startTime: null, endTime: null },
      { id: "2", date: day("2026-07-10"), startTime: null, endTime: null },
    ];
    const groups = groupContiguous(rows);
    expect(groups).toHaveLength(2);
  });

  it("nao agrupa dias consecutivos com horarios diferentes", () => {
    const rows = [
      { id: "1", date: day("2026-07-05"), startTime: "08:00", endTime: "10:00" },
      { id: "2", date: day("2026-07-06"), startTime: "14:00", endTime: "16:00" },
    ];
    const groups = groupContiguous(rows);
    expect(groups).toHaveLength(2);
  });

  it("mes inteiro (date null) nunca agrupa com outra linha", () => {
    const rows = [
      { id: "1", date: null, startTime: null, endTime: null },
      { id: "2", date: null, startTime: null, endTime: null },
    ];
    const groups = groupContiguous(rows);
    expect(groups).toHaveLength(2);
  });
});
