import { describe, it, expect } from "vitest";
import { reminderStageFor, reminderCopy } from "@/modules/notifications/domain/reminders";

// Datas em UTC escolhidas pra cair claramente num dia local (America/Sao_Paulo, UTC-3).
const HOJE_MEIO_DIA = new Date("2026-08-06T15:00:00Z"); // 06/08 12:00 BRT

describe("reminderStageFor", () => {
  it("evento amanha (mesmo horario local) -> vespera", () => {
    const occ = new Date("2026-08-07T22:00:00Z"); // 07/08 19:00 BRT
    expect(reminderStageFor({ now: HOJE_MEIO_DIA, occurrenceDate: occ })).toBe("vespera");
  });

  it("evento hoje mais tarde -> hoje", () => {
    const occ = new Date("2026-08-06T22:00:00Z"); // 06/08 19:00 BRT
    expect(reminderStageFor({ now: HOJE_MEIO_DIA, occurrenceDate: occ })).toBe("hoje");
  });

  it("evento ja passou -> null", () => {
    const occ = new Date("2026-08-06T10:00:00Z"); // 06/08 07:00 BRT, antes do now
    expect(reminderStageFor({ now: HOJE_MEIO_DIA, occurrenceDate: occ })).toBeNull();
  });

  it("evento daqui a 3 dias -> null", () => {
    const occ = new Date("2026-08-09T22:00:00Z");
    expect(reminderStageFor({ now: HOJE_MEIO_DIA, occurrenceDate: occ })).toBeNull();
  });

  it("virada de dia: evento 21:00 BRT (ja e dia seguinte em UTC) conta como hoje se now ainda e hoje local", () => {
    const now = new Date("2026-08-06T23:00:00Z"); // 06/08 20:00 BRT
    const occ = new Date("2026-08-07T00:30:00Z"); // 06/08 21:30 BRT (mesmo dia local)
    expect(reminderStageFor({ now, occurrenceDate: occ })).toBe("hoje");
  });

  it("evento no exato instante de now -> null (ja aconteceu)", () => {
    expect(reminderStageFor({ now: HOJE_MEIO_DIA, occurrenceDate: HOJE_MEIO_DIA })).toBeNull();
  });
});

describe("reminderCopy", () => {
  const base = { ministry: "Louvor", role: "Vocal", date: "dom, 06 de ago · 19:00" };

  it("normal, vespera", () => {
    const r = reminderCopy({ stage: "vespera", hasSwapOpen: false, isPending: false, ...base });
    expect(r.title).toBe("Amanhã: Louvor");
    expect(r.body).toBe("Vocal · dom, 06 de ago · 19:00");
  });

  it("normal, hoje", () => {
    const r = reminderCopy({ stage: "hoje", hasSwapOpen: false, isPending: false, ...base });
    expect(r.title).toBe("Hoje: Louvor");
  });

  it("pendente, vespera", () => {
    const r = reminderCopy({ stage: "vespera", hasSwapOpen: false, isPending: true, ...base });
    expect(r.title).toBe("Confirme sua escala: Louvor");
  });

  it("pendente, hoje", () => {
    const r = reminderCopy({ stage: "hoje", hasSwapOpen: false, isPending: true, ...base });
    expect(r.title).toBe("Confirme sua escala de hoje: Louvor");
  });

  it("swap aberto tem precedencia sobre pendente, vespera", () => {
    const r = reminderCopy({ stage: "vespera", hasSwapOpen: true, isPending: true, ...base });
    expect(r.title).toBe("Amanhã: Louvor — troca ainda em aberto");
    expect(r.body).toBe("Ninguém assumiu. Vocal · dom, 06 de ago · 19:00");
  });

  it("swap aberto, hoje", () => {
    const r = reminderCopy({ stage: "hoje", hasSwapOpen: true, isPending: false, ...base });
    expect(r.title).toBe("Hoje: Louvor — troca ainda em aberto");
  });
});
