import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: vi.fn(), findMany: vi.fn() } },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));

import { prisma } from "@/lib/prisma";
import {
  parseBirthDate,
  birthdaysOfMonth,
  isBirthdayToday,
  parseMonthNumber,
} from "@/modules/identity/domain/birthday";
import { updateProfile } from "@/modules/identity/services/updateProfile";
import { listBirthdays } from "@/modules/identity/services/birthdays";

const HOJE = "2026-10-02";
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

beforeEach(() => {
  vi.mocked(prisma.user.update).mockReset();
  vi.mocked(prisma.user.findMany).mockReset();
  // meio-dia em Sao Paulo de 2026-10-02
  vi.useFakeTimers({ now: new Date("2026-10-02T15:00:00Z") });
});
afterEach(() => vi.useRealTimers());

describe("parseBirthDate", () => {
  it("parseBirthDate rejeita dia inexistente, texto, antes de 1900 e futuro", () => {
    expect(() => parseBirthDate("1990-02-30", HOJE)).toThrow("INVALID_BIRTH_DATE");
    expect(() => parseBirthDate("abc", HOJE)).toThrow("INVALID_BIRTH_DATE");
    expect(() => parseBirthDate("1899-12-31", HOJE)).toThrow("INVALID_BIRTH_DATE");
    expect(() => parseBirthDate("2026-10-03", HOJE)).toThrow("INVALID_BIRTH_DATE");
  });

  it("parseBirthDate aceita as bordas 1900-01-01 e hoje", () => {
    expect(parseBirthDate("1900-01-01", HOJE).toISOString()).toBe("1900-01-01T00:00:00.000Z");
    expect(parseBirthDate(HOJE, HOJE).toISOString()).toBe("2026-10-02T00:00:00.000Z");
  });
});

describe("updateProfile", () => {
  it("updateProfile grava a data como dia de calendario em UTC", async () => {
    await updateProfile({ name: "Ana", birthDate: "1990-03-14" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Ana", phone: null, birthDate: new Date("1990-03-14T00:00:00.000Z") },
    });
  });

  it("vazio limpa e ausente nao altera a data", async () => {
    await updateProfile({ name: "Ana", birthDate: "" });
    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: "u1" },
      data: { name: "Ana", phone: null, birthDate: null },
    });

    await updateProfile({ name: "Ana" });
    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: "u1" },
      data: { name: "Ana", phone: null },
    });
  });

  it("data invalida nao grava", async () => {
    await expect(updateProfile({ name: "Ana", birthDate: "1990-02-30" })).rejects.toThrow("INVALID_BIRTH_DATE");
    await expect(updateProfile({ name: "Ana", birthDate: "2026-10-03" })).rejects.toThrow("INVALID_BIRTH_DATE");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("birthdaysOfMonth", () => {
  it("birthdaysOfMonth filtra o mes, ordena por dia e nome e nao expoe o ano", () => {
    const lista = birthdaysOfMonth(
      [
        { id: "b", name: "Bia", birthDate: d("1990-03-14") },
        { id: "a", name: "Ana", birthDate: d("2001-03-14") },
        { id: "c", name: "Caio", birthDate: d("1985-03-02") },
        { id: "x", name: "Duda", birthDate: d("1992-04-20") },
      ],
      3,
    );

    expect(lista).toEqual([
      { userId: "c", name: "Caio", day: 2 },
      { userId: "a", name: "Ana", day: 14 },
      { userId: "b", name: "Bia", day: 14 },
    ]);
  });
});

describe("listBirthdays", () => {
  it("listBirthdays consulta so quem tem data e e membro ativo dos ministerios", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "a", name: "Ana", birthDate: d("2001-03-14") },
    ] as never);

    const lista = await listBirthdays(3, ["m1"]);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          birthDate: { not: null },
          memberships: { some: { status: "ACTIVE", ministryId: { in: ["m1"] } } },
        },
      }),
    );
    expect(lista).toEqual([{ userId: "a", name: "Ana", day: 14 }]);
  });

  it("listBirthdays sem ministerios nao consulta", async () => {
    expect(await listBirthdays(3, [])).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe("parseMonthNumber", () => {
  it("parseMonthNumber aceita 1..12 e cai no fallback no resto", () => {
    expect(parseMonthNumber("3", 10)).toBe(3);
    expect(parseMonthNumber("12", 10)).toBe(12);
    for (const raw of [undefined, "0", "13", "3.5", "abc"]) {
      expect(parseMonthNumber(raw, 10)).toBe(10);
    }
  });
});

describe("isBirthdayToday", () => {
  it("isBirthdayToday so com mesmo dia e mes", () => {
    expect(isBirthdayToday(14, 3, "2026-03-14")).toBe(true);
    expect(isBirthdayToday(14, 3, "2026-03-15")).toBe(false);
    expect(isBirthdayToday(14, 4, "2026-03-14")).toBe(false);
  });
});
