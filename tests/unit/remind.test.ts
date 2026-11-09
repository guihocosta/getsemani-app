import { describe, it, expect } from "vitest";
import type { AllocationStatus } from "@prisma/client";
import {
  remindableAllocations,
  canRemindOccurrence,
  remindSummary,
  remindConfirmTitle,
  remindOutcomeLabel,
  isRecentReminder,
  manualReminderKey,
} from "@/modules/scheduling/domain/remind";

const AGORA = new Date("2026-10-15T15:00:00.000Z");
const MIN = 60 * 1000;

describe("remindableAllocations", () => {
  it("so pendentes com conta", () => {
    type Vaga = { active: boolean; allocation: { id: string; userId: string | null; status: AllocationStatus } | null };
    const slots: Vaga[] = [
      { active: true, allocation: { id: "ana", userId: "u-ana", status: "PENDING" } },
      { active: true, allocation: { id: "bia", userId: "u-bia", status: "CONFIRMED" } },
      { active: true, allocation: { id: "ze", userId: null, status: "PENDING" } },
      { active: false, allocation: { id: "davi", userId: "u-davi", status: "PENDING" } },
      { active: true, allocation: null },
    ];
    expect(remindableAllocations(slots).map((a) => a.id)).toEqual(["ana"]);
  });
});

describe("canRemindOccurrence", () => {
  const base = { published: true, status: "ACTIVE" as const };
  it("data lembravel", () => {
    expect(canRemindOccurrence({ ...base, date: new Date(AGORA.getTime() + 1) }, AGORA)).toBe(true);
    expect(canRemindOccurrence({ ...base, published: false, date: new Date(AGORA.getTime() + 1) }, AGORA)).toBe(false);
    expect(
      canRemindOccurrence({ ...base, status: "CANCELLED" as const, date: new Date(AGORA.getTime() + 1) }, AGORA),
    ).toBe(false);
    expect(canRemindOccurrence({ ...base, date: new Date(AGORA.getTime()) }, AGORA)).toBe(false);
    expect(canRemindOccurrence({ ...base, date: new Date(AGORA.getTime() - 1) }, AGORA)).toBe(false);
  });
});

describe("textos", () => {
  it("texto do resumo", () => {
    expect(remindSummary({ enviados: 1, recentes: 0, semDispositivo: 0 })).toBe("Lembrete enviado para 1 pessoa");
    expect(remindSummary({ enviados: 2, recentes: 1, semDispositivo: 3 })).toBe(
      "Lembrete enviado para 2 pessoas · 1 já lembrada na última hora · 3 sem notificações ativadas",
    );
    expect(remindSummary({ enviados: 0, recentes: 2, semDispositivo: 0 })).toBe("2 já lembradas na última hora");
    expect(remindSummary({ enviados: 0, recentes: 0, semDispositivo: 1 })).toBe("1 sem notificações ativadas");
  });

  it("titulo da confirmacao", () => {
    expect(remindConfirmTitle(3)).toBe("Lembrar 3 pessoas que não confirmaram?");
    expect(remindConfirmTitle(1)).toBe("Lembrar 1 pessoa que não confirmou?");
  });

  it("desfecho individual", () => {
    expect(remindOutcomeLabel({ enviados: 1, recentes: 0, semDispositivo: 0 })).toBe("Lembrete enviado");
    expect(remindOutcomeLabel({ enviados: 0, recentes: 1, semDispositivo: 0 })).toBe("Já lembrado na última hora");
    expect(remindOutcomeLabel({ enviados: 0, recentes: 0, semDispositivo: 1 })).toBe("Sem notificações ativadas");
  });
});

describe("limite", () => {
  it("janela de uma hora", () => {
    expect(isRecentReminder(new Date(AGORA.getTime() - 59 * MIN), AGORA)).toBe(true);
    expect(isRecentReminder(new Date(AGORA.getTime() - 60 * MIN), AGORA)).toBe(false);
    expect(isRecentReminder(null, AGORA)).toBe(false);
  });

  it("chave da janela", () => {
    const dez = new Date("2026-10-15T10:00:00.000Z");
    const quase = new Date("2026-10-15T10:59:59.999Z");
    const onze = new Date("2026-10-15T11:00:00.000Z");
    expect(manualReminderKey("a1", dez)).toBe(`lembrete-manual:a1:${Math.floor(dez.getTime() / 3600000)}`);
    expect(manualReminderKey("a1", quase)).toBe(manualReminderKey("a1", dez));
    expect(manualReminderKey("a1", onze)).not.toBe(manualReminderKey("a1", dez));
  });
});
