import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/notifications/services/notify", () => ({ notifyUser: vi.fn(async () => "sent") }));

import { notifyUser } from "@/modules/notifications/services/notify";
import { notifyIfPublished } from "@/modules/scheduling/services/notifyIfPublished";

const params = {
  userId: "u1",
  type: "ASSIGNMENT" as const,
  dedupeKey: "assign:al1",
  title: "Você foi escalado",
  body: "Som",
};

beforeEach(() => vi.mocked(notifyUser).mockClear());

describe("notifyIfPublished", () => {
  it("rascunho devolve skipped sem notificar", async () => {
    expect(await notifyIfPublished(false, params)).toBe("skipped");
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("publicada repassa os mesmos parametros", async () => {
    expect(await notifyIfPublished(true, params)).toBe("sent");
    expect(notifyUser).toHaveBeenCalledWith(params);
  });
});
