import { describe, it, expect } from "vitest";
import { slotAttendanceMark, canMarkAttendance } from "@/modules/scheduling/domain/attendance";

const HOJE = "2026-10-02";
const ONTEM = "2026-10-01";
const AMANHA = "2026-10-03";

const base = {
  todayKey: HOJE,
  isGuest: false,
  checkedIn: false,
  canManage: true,
};

describe("canMarkAttendance", () => {
  it("permite hoje e dia passado, com conta", () => {
    expect(canMarkAttendance({ todayKey: HOJE, dayKey: HOJE, isGuest: false })).toBe(true);
    expect(canMarkAttendance({ todayKey: HOJE, dayKey: ONTEM, isGuest: false })).toBe(true);
  });

  it("bloqueia futuro e convidado", () => {
    expect(canMarkAttendance({ todayKey: HOJE, dayKey: AMANHA, isGuest: false })).toBe(false);
    expect(canMarkAttendance({ todayKey: HOJE, dayKey: ONTEM, isGuest: true })).toBe(false);
  });
});

describe("slotAttendanceMark", () => {
  it("falta em dia passado sem check-in, para quem gerencia", () => {
    expect(slotAttendanceMark({ ...base, dayKey: ONTEM })).toBe("FALTA");
  });

  it("presente com check-in hoje e em dia passado, gerente ou nao", () => {
    for (const dayKey of [HOJE, ONTEM]) {
      for (const canManage of [true, false]) {
        expect(slotAttendanceMark({ ...base, dayKey, checkedIn: true, canManage })).toBe("PRESENTE");
      }
    }
  });

  it("sem marca para convidado, futuro e hoje sem check-in", () => {
    expect(slotAttendanceMark({ ...base, dayKey: ONTEM, isGuest: true })).toBeNull();
    expect(slotAttendanceMark({ ...base, dayKey: AMANHA })).toBeNull();
    expect(slotAttendanceMark({ ...base, dayKey: HOJE })).toBeNull();
  });

  it("nao gerente nao ve falta", () => {
    expect(slotAttendanceMark({ ...base, dayKey: ONTEM, canManage: false })).toBeNull();
  });
});
