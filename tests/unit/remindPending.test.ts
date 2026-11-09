import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    occurrence: { findUnique: vi.fn() },
    notification: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    pushSubscription: { findMany: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/push", () => ({ sendPush: vi.fn() }));
vi.mock("@/modules/identity/services/authz", () => ({ requireLeaderOf: vi.fn() }));
vi.mock("@/modules/notifications/services/notify", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/notifications/services/notify")>();
  return { ...real, notifyUser: vi.fn(), hasPushDevice: vi.fn(), lastNotificationAt: vi.fn() };
});

import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser, hasPushDevice, lastNotificationAt } from "@/modules/notifications/services/notify";
import { remindPending } from "@/modules/scheduling/services/remindPending";
import { manualReminderKey } from "@/modules/scheduling/domain/remind";
import { fmtDateTime } from "@/lib/time";

const AGORA = new Date("2026-10-15T15:00:00.000Z");
const DATA = new Date("2026-10-18T21:00:00.000Z");
const MIN = 60 * 1000;

type Aloc = { id: string; userId: string | null; status: "PENDING" | "CONFIRMED" };

function ocorrencia(
  alocs: (Aloc | null)[],
  over: { published?: boolean; status?: "ACTIVE" | "CANCELLED"; date?: Date } = {},
) {
  return {
    id: "o1",
    date: over.date ?? DATA,
    published: over.published ?? true,
    status: over.status ?? "ACTIVE",
    schedule: { ministryId: "m1", ministry: { name: "Louvor" } },
    slots: alocs.map((a, i) => ({
      id: `s${i}`,
      active: true,
      role: { name: ["Bateria", "Teclado", "Violão"][i] },
      allocation: a,
    })),
  };
}

const ANA: Aloc = { id: "a-ana", userId: "u-ana", status: "PENDING" };
const BIA: Aloc = { id: "a-bia", userId: "u-bia", status: "CONFIRMED" };
const CAIO: Aloc = { id: "a-caio", userId: "u-caio", status: "PENDING" };
const ZE: Aloc = { id: "a-ze", userId: null, status: "PENDING" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireLeaderOf).mockResolvedValue({} as never);
  vi.mocked(hasPushDevice).mockResolvedValue(true);
  vi.mocked(lastNotificationAt).mockResolvedValue(null);
  vi.mocked(notifyUser).mockResolvedValue("sent");
});

describe("remindPending", () => {
  it("lembra pendentes da data", async () => {
    vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(ocorrencia([ANA, BIA]) as never);

    const res = await remindPending({ occurrenceId: "o1" }, AGORA);

    expect(requireLeaderOf).toHaveBeenCalledWith("m1");
    expect(notifyUser).toHaveBeenCalledTimes(1);
    expect(notifyUser).toHaveBeenCalledWith({
      userId: "u-ana",
      type: "REMINDER",
      dedupeKey: manualReminderKey("a-ana", AGORA),
      title: "Confirme sua escala: Louvor",
      body: `Bateria · ${fmtDateTime(DATA)}`,
      url: "/",
      occurrenceId: "o1",
    });
    expect(res).toEqual({ enviados: 1, recentes: 0, semDispositivo: 0 });
  });

  it("lembra uma pessoa", async () => {
    vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(ocorrencia([ANA, CAIO]) as never);

    const res = await remindPending({ occurrenceId: "o1", allocationId: "a-caio" }, AGORA);

    expect(notifyUser).toHaveBeenCalledTimes(1);
    expect(vi.mocked(notifyUser).mock.calls[0][0].userId).toBe("u-caio");
    expect(res).toEqual({ enviados: 1, recentes: 0, semDispositivo: 0 });
  });

  it("ja lembrado na ultima hora", async () => {
    vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(ocorrencia([ANA]) as never);
    vi.mocked(lastNotificationAt).mockResolvedValue(new Date(AGORA.getTime() - 59 * MIN));

    const res = await remindPending({ occurrenceId: "o1" }, AGORA);

    expect(lastNotificationAt).toHaveBeenCalledWith("lembrete-manual:a-ana:");
    expect(notifyUser).not.toHaveBeenCalled();
    expect(res).toEqual({ enviados: 0, recentes: 1, semDispositivo: 0 });

    // So o lembrete do cron existe: a busca pelo prefixo manual nao acha nada.
    vi.mocked(lastNotificationAt).mockResolvedValue(null);
    const outra = await remindPending({ occurrenceId: "o1" }, AGORA);
    expect(notifyUser).toHaveBeenCalledTimes(1);
    expect(outra.enviados).toBe(1);
  });

  it("sem dispositivo", async () => {
    vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(ocorrencia([ANA]) as never);
    vi.mocked(hasPushDevice).mockResolvedValue(false);

    const res = await remindPending({ occurrenceId: "o1" }, AGORA);

    expect(hasPushDevice).toHaveBeenCalledWith("u-ana");
    expect(notifyUser).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(res).toEqual({ enviados: 0, recentes: 0, semDispositivo: 1 });
  });

  it("sem permissao", async () => {
    vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(ocorrencia([ANA]) as never);
    vi.mocked(requireLeaderOf).mockRejectedValue(new Error("FORBIDDEN"));

    await expect(remindPending({ occurrenceId: "o1" }, AGORA)).rejects.toThrow("FORBIDDEN");
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("nao lembravel", async () => {
    const casos: [ReturnType<typeof ocorrencia> | null, string | undefined][] = [
      [null, undefined],
      [ocorrencia([ANA], { published: false }), undefined],
      [ocorrencia([ANA], { status: "CANCELLED" }), undefined],
      [ocorrencia([ANA], { date: AGORA }), undefined],
      [ocorrencia([ANA]), "a-de-outra-data"],
      [ocorrencia([ANA, ZE]), "a-ze"],
      [ocorrencia([ANA, BIA]), "a-bia"],
    ];
    for (const [occ, allocationId] of casos) {
      vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(occ as never);
      await expect(remindPending({ occurrenceId: "o1", allocationId }, AGORA)).rejects.toThrow("NOT_REMINDABLE");
    }
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("lista vazia nao lembra", async () => {
    // Todos confirmaram depois que a tela carregou.
    vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(ocorrencia([BIA]) as never);
    await expect(remindPending({ occurrenceId: "o1" }, AGORA)).rejects.toThrow("NOT_REMINDABLE");
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("corrida envia uma vez", async () => {
    // Parte 1: notifyUser de verdade, duas chamadas com a mesma chave ao mesmo tempo.
    const real = await vi.importActual<typeof import("@/modules/notifications/services/notify")>(
      "@/modules/notifications/services/notify",
    );
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.notification.create)
      .mockResolvedValueOnce({ id: "n1" } as never)
      .mockRejectedValueOnce(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([
      { id: "p1", endpoint: "e", p256dh: "k", auth: "a" },
    ] as never);
    vi.mocked(sendPush).mockResolvedValue(true as never);
    const params = { userId: "u-ana", type: "REMINDER" as const, dedupeKey: "k", title: "t", body: "b" };
    await Promise.all([real.notifyUser(params), real.notifyUser(params)]);
    expect(sendPush).toHaveBeenCalledTimes(1);

    // Parte 2: o pedido que perde a corrida conta como recente, nunca como enviado.
    vi.mocked(prisma.occurrence.findUnique).mockResolvedValue(ocorrencia([ANA, CAIO]) as never);
    vi.mocked(notifyUser).mockResolvedValueOnce("duplicate").mockResolvedValueOnce("failed");
    const res = await remindPending({ occurrenceId: "o1" }, AGORA);
    expect(res).toEqual({ enviados: 0, recentes: 2, semDispositivo: 0 });
  });
});
