import { describe, it, expect } from "vitest";
import { shouldShowInstallPopup, SNOOZE_MS } from "@/lib/installPopup";

const base = {
  standalone: false,
  done: false,
  snoozedAt: null as number | null,
  now: 1_800_000_000_000,
  canPrompt: true,
  os: "android" as const,
};

describe("shouldShowInstallPopup", () => {
  it("nao mostra quando o app ja esta instalado", () => {
    expect(shouldShowInstallPopup({ ...base, standalone: true })).toBe(false);
  });

  it("nao mostra quando o usuario marcou que ja instalou", () => {
    expect(shouldShowInstallPopup({ ...base, done: true })).toBe(false);
  });

  it("nao mostra dentro da janela de adiamento", () => {
    const snoozedAt = base.now - (SNOOZE_MS - 1000);
    expect(shouldShowInstallPopup({ ...base, snoozedAt })).toBe(false);
  });

  it("volta a mostrar depois do adiamento", () => {
    const snoozedAt = base.now - (SNOOZE_MS + 1000);
    expect(shouldShowInstallPopup({ ...base, snoozedAt })).toBe(true);
  });

  it("fora do iOS so mostra quando ha prompt nativo disponivel", () => {
    expect(shouldShowInstallPopup({ ...base, canPrompt: false })).toBe(false);
  });

  it("no iOS mostra mesmo sem prompt nativo (guia manual)", () => {
    expect(shouldShowInstallPopup({ ...base, os: "ios", canPrompt: false })).toBe(true);
  });
});
