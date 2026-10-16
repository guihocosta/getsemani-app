import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/safeNext";

// Bug: o callback de auth fazia redirect pra `${origin}${next}` sem validar —
// next="@evil.com" levava o usuario recem-logado pra outro host.
describe("safeNext", () => {
  it.each([
    ["/escalas", "/escalas"],
    ["/repertorio/abc?x=1", "/repertorio/abc?x=1"],
    ["/", "/"],
  ])("caminho relativo %s passa", (input, out) => {
    expect(safeNext(input)).toBe(out);
  });

  it.each([null, undefined, "", "@evil.com", ".evil.com", "evil.com", "https://evil.com", "//evil.com", "/\\evil.com"])(
    "%s cai pra /",
    (input) => {
      expect(safeNext(input)).toBe("/");
    },
  );

  it("nenhuma saida muda o host quando concatenada ao origin", () => {
    for (const input of ["@evil.com", ".evil.com", "//evil.com", "/\\evil.com", "/ok"]) {
      expect(new URL(`https://app.example${safeNext(input)}`).host).toBe("app.example");
    }
  });
});
