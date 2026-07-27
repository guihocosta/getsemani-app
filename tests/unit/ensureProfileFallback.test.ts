import { describe, it, expect } from "vitest";
import { profileFromAuthUser, shouldRetryWithFallbackEmail } from "@/modules/identity/services/ensureProfile";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function authUser(overrides: Partial<SupabaseUser> = {}): SupabaseUser {
  return {
    id: "user-1",
    email: "pessoa@example.com",
    user_metadata: {},
    ...overrides,
  } as SupabaseUser;
}

describe("profileFromAuthUser", () => {
  it("prefere full_name do metadata", () => {
    const p = profileFromAuthUser(authUser({ user_metadata: { full_name: "Maria Silva" } }));
    expect(p.name).toBe("Maria Silva");
  });

  it("usa name do metadata se full_name faltar", () => {
    const p = profileFromAuthUser(authUser({ user_metadata: { name: "Maria" } }));
    expect(p.name).toBe("Maria");
  });

  it("cai no prefixo do e-mail sem metadata", () => {
    const p = profileFromAuthUser(authUser({ email: "joao@example.com", user_metadata: {} }));
    expect(p.name).toBe("joao");
  });

  it("gera e-mail de fallback quando authUser nao tem e-mail", () => {
    const p = profileFromAuthUser(authUser({ id: "abc-123", email: undefined }));
    expect(p.email).toBe("abc-123@sem-email.local");
    expect(p.name).toBe("abc-123");
  });
});

describe("shouldRetryWithFallbackEmail", () => {
  it("true pra P2002 com email no target (array)", () => {
    expect(shouldRetryWithFallbackEmail({ code: "P2002", meta: { target: ["email"] } })).toBe(true);
  });

  it("true pra P2002 com email no target (string)", () => {
    expect(shouldRetryWithFallbackEmail({ code: "P2002", meta: { target: "User_email_key" } })).toBe(true);
  });

  it("false pra P2002 em outro campo", () => {
    expect(shouldRetryWithFallbackEmail({ code: "P2002", meta: { target: ["id"] } })).toBe(false);
  });

  it("false pra erro que nao e P2002", () => {
    expect(shouldRetryWithFallbackEmail({ code: "P2025" })).toBe(false);
    expect(shouldRetryWithFallbackEmail(new Error("boom"))).toBe(false);
  });
});
