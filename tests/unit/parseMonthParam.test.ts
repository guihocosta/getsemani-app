import { describe, it, expect } from "vitest";
import { parseMonthParam } from "@/lib/time";

describe("parseMonthParam", () => {
  const fallback = { year: 2026, month: 7 };

  it("aceita uma string YYYY-MM valida", () => {
    expect(parseMonthParam("2026-03", fallback)).toEqual({ year: 2026, month: 3 });
  });

  it("usa o fallback quando raw e undefined", () => {
    expect(parseMonthParam(undefined, fallback)).toEqual(fallback);
  });

  it("usa o fallback quando a string nao bate com o formato", () => {
    expect(parseMonthParam("garbage", fallback)).toEqual(fallback);
  });

  it("usa o fallback quando o mes esta fora do intervalo (regressao 5b1004a)", () => {
    expect(parseMonthParam("2026-13", fallback)).toEqual(fallback);
    expect(parseMonthParam("2026-00", fallback)).toEqual(fallback);
  });

  it("aceita os limites validos de mes, 01 e 12", () => {
    expect(parseMonthParam("2026-01", fallback)).toEqual({ year: 2026, month: 1 });
    expect(parseMonthParam("2026-12", fallback)).toEqual({ year: 2026, month: 12 });
  });
});
