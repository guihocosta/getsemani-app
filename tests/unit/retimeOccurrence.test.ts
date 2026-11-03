import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    occurrence: {
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    schedule: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    scheduleRole: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});
vi.mock("@/modules/identity/services/authz", () => ({ requireLeaderOf: vi.fn() }));
vi.mock("@/modules/notifications/services/notify", () => ({ notifyUser: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";
import { retimeOccurrence } from "@/modules/scheduling/services/retimeOccurrences";
import { updateSchedule } from "@/modules/scheduling/services/updateSchedule";
import { HorarioOcupado } from "@/modules/scheduling/domain/retime";

const NOW = new Date("2026-10-15T18:00:00Z");
const SCHEDULE = { id: "s1", ministryId: "m1", title: "Culto Louvor", startTime: "18:00" };

// Linha como o Prisma devolve no select do servico.
function row(id: string, iso: string, userIds: (string | null)[] = [], over: Record<string, unknown> = {}) {
  return {
    id,
    date: new Date(iso),
    status: "ACTIVE",
    published: true,
    _count: { songs: 0 },
    slots: userIds.map((userId) => ({ allocation: { userId } })),
    ...over,
  };
}

function setup(rows: ReturnType<typeof row>[], chosenId = rows[0].id) {
  vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue({
    id: chosenId,
    scheduleId: "s1",
    schedule: SCHEDULE,
  } as never);
  vi.mocked(prisma.occurrence.findMany).mockResolvedValue(rows as never);
}

const writes = () => [
  prisma.occurrence.update,
  prisma.occurrence.deleteMany,
  prisma.schedule.update,
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: unknown) => unknown) => fn(prisma)) as never);
  vi.mocked(prisma.occurrence.update).mockResolvedValue({} as never);
  vi.mocked(requireLeaderOf).mockResolvedValue(undefined as never);
  vi.mocked(notifyUser).mockResolvedValue("sent");
});

describe("retimeOccurrence", () => {
  it("so esta data grava a data", async () => {
    setup([row("o25", "2026-10-25T21:00:00Z"), row("o01", "2026-11-01T21:00:00Z")]);
    const res = await retimeOccurrence({ occurrenceId: "o25", scope: "SINGLE", time: "18:30" }, NOW);
    expect(res).toEqual({ moved: 1 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.occurrence.update).toHaveBeenCalledTimes(1);
    expect(prisma.occurrence.update).toHaveBeenCalledWith({
      where: { id: "o25" },
      data: { date: new Date("2026-10-25T21:30:00Z") },
    });
    expect(prisma.schedule.update).not.toHaveBeenCalled();
  });

  it("proximas grava o modelo", async () => {
    setup([
      row("o25", "2026-10-25T21:00:00Z", ["u1"]),
      row("dup", "2026-11-01T21:30:00Z"),
      row("o01", "2026-11-01T21:00:00Z"),
    ]);
    const order: string[] = [];
    vi.mocked(prisma.occurrence.deleteMany).mockImplementation((async () => order.push("delete")) as never);
    vi.mocked(prisma.occurrence.update).mockImplementation((async () => order.push("update")) as never);

    await retimeOccurrence({ occurrenceId: "o25", scope: "FROM_HERE", time: "18:30" }, NOW);
    expect(prisma.schedule.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { startTime: "18:30" } });
    expect(prisma.occurrence.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["dup"] } } });
    expect(order).toEqual(["delete", "update", "update"]);
  });

  it("conflito nao grava", async () => {
    setup([row("o25", "2026-10-25T21:00:00Z"), row("dup", "2026-10-25T21:30:00Z", ["u9"])]);
    const err = await retimeOccurrence({ occurrenceId: "o25", scope: "SINGLE", time: "18:30" }, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(HorarioOcupado);
    expect((err as HorarioOcupado).instant).toEqual(new Date("2026-10-25T21:30:00Z"));
    for (const w of writes()) expect(w).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("corrida vira horario ocupado", async () => {
    setup([row("o25", "2026-10-25T21:00:00Z"), row("o01", "2026-11-01T21:00:00Z")]);
    vi.mocked(prisma.occurrence.update)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    // a outra mudanca tomou 01/11 18:30, o segundo instante do lote
    vi.mocked(prisma.occurrence.findFirst).mockResolvedValue({ date: new Date("2026-11-01T21:30:00Z") } as never);
    const err = await retimeOccurrence({ occurrenceId: "o25", scope: "FROM_HERE", time: "18:30" }, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(HorarioOcupado);
    expect((err as HorarioOcupado).instant).toEqual(new Date("2026-11-01T21:30:00Z"));
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("sem permissao", async () => {
    setup([row("o25", "2026-10-25T21:00:00Z")]);
    vi.mocked(requireLeaderOf).mockRejectedValue(new Error("FORBIDDEN"));
    await expect(
      retimeOccurrence({ occurrenceId: "o25", scope: "SINGLE", time: "18:30" }, NOW),
    ).rejects.toThrow("FORBIDDEN");
    expect(requireLeaderOf).toHaveBeenCalledWith("m1");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    for (const w of writes()) expect(w).not.toHaveBeenCalled();
  });

  it("aviso por pessoa", async () => {
    setup([
      row("o25", "2026-10-25T21:00:00Z", ["u1", "u2", null]),
      row("o01", "2026-11-01T21:00:00Z", ["u1"]),
    ]);
    await retimeOccurrence({ occurrenceId: "o25", scope: "FROM_HERE", time: "18:30" }, NOW);
    expect(notifyUser).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(notifyUser).mock.calls.map(([p]) => p);
    for (const p of calls) {
      expect(p).toMatchObject({ type: "ASSIGNMENT", title: "Horário alterado", url: "/" });
      expect(p.dedupeKey).toMatch(/^retime:[0-9a-f-]{36}:u\d$/);
    }
    expect(calls.map((p) => p.userId)).toEqual(["u1", "u2"]);
    expect(calls[0].body).toBe("Culto Louvor: 25/10 e 01/11 agora às 18:30.");
    const lotes = new Set(calls.map((p) => p.dedupeKey.split(":")[1]));
    expect(lotes.size).toBe(1);
  });

  it("falha do aviso nao desfaz", async () => {
    setup([row("o25", "2026-10-25T21:00:00Z", ["u1"])]);
    vi.mocked(notifyUser).mockRejectedValue(new Error("push caiu"));
    const res = await retimeOccurrence({ occurrenceId: "o25", scope: "SINGLE", time: "18:30" }, NOW);
    expect(res).toEqual({ moved: 1 });
    expect(prisma.occurrence.update).toHaveBeenCalledTimes(1);
  });
});

describe("updateSchedule", () => {
  const input = (startTime: string) => ({
    scheduleId: "00000000-0000-4000-8000-000000000001",
    title: "Culto Louvor",
    startTime,
    recurrenceRule: "FREQ=WEEKLY;BYDAY=SU",
    recurrenceUntil: null,
    rotationCycle: null,
    roleIds: ["00000000-0000-4000-8000-000000000002"],
  });

  it("editar escala move as datas", async () => {
    vi.mocked(prisma.schedule.findUniqueOrThrow).mockResolvedValue(SCHEDULE as never);
    vi.mocked(prisma.schedule.update).mockResolvedValue(SCHEDULE as never);
    const de = new Date("2026-10-18T21:00:00Z").getTime();
    const rows = Array.from({ length: 13 }, (_, i) =>
      row(`o${i}`, new Date(de + i * 7 * 86_400_000).toISOString()),
    );
    // hoje 10:00, antes de agora (15:00): o carregador traz o dia todo, mas ela ja passou
    const hojeCedo = row("hoje", "2026-10-15T13:00:00Z");
    vi.mocked(prisma.occurrence.findMany).mockResolvedValue([hojeCedo, ...rows] as never);

    await updateSchedule(input("18:30"), NOW);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.occurrence.update).toHaveBeenCalledTimes(13);
    expect(prisma.occurrence.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: "hoje" } }));
    expect(prisma.occurrence.update).toHaveBeenCalledWith({
      where: { id: "o0" },
      data: { date: new Date("2026-10-18T21:30:00Z") },
    });

    vi.mocked(prisma.occurrence.update).mockClear();
    await updateSchedule(input("18:00"), NOW);
    expect(prisma.occurrence.update).not.toHaveBeenCalled();
  });
});
