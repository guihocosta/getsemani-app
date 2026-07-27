import { describe, it, expect } from "vitest";
import { shouldRefreshSession } from "@/lib/session";

// Middleware evitava chamar supabase.auth.getUser() (rede) em toda request.
// Esta funcao decide quando vale a pena pagar esse round-trip: so quando o
// JWT esta perto de expirar (ou ja expirou, ou nao da pra saber).
describe("shouldRefreshSession", () => {
  it("sem expiresAt -> true (path seguro, forca revalidacao)", () => {
    expect(shouldRefreshSession(undefined, 1_000, 300)).toBe(true);
    expect(shouldRefreshSession(null, 1_000, 300)).toBe(true);
  });

  it("ja expirado -> true", () => {
    expect(shouldRefreshSession(900, 1_000, 300)).toBe(true);
  });

  it("dentro do buffer (expira em 60s, buffer 300s) -> true", () => {
    expect(shouldRefreshSession(1_060, 1_000, 300)).toBe(true);
  });

  it("exatamente no limite do buffer -> true", () => {
    expect(shouldRefreshSession(1_300, 1_000, 300)).toBe(true);
  });

  it("fora do buffer (expira em 1h, buffer 300s) -> false", () => {
    expect(shouldRefreshSession(1_000 + 3_600, 1_000, 300)).toBe(false);
  });

  it("expiresAt invalido (NaN) -> true", () => {
    expect(shouldRefreshSession(NaN, 1_000, 300)).toBe(true);
  });
});
