import { describe, it, expect, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/logError", () => ({ logError: vi.fn(() => "REF123") }));
vi.mock("@/modules/scheduling/services/setAttendance", () => ({ setAttendance: vi.fn() }));

import { setAttendanceAction } from "@app/(app)/escalas/actions";
import { setAttendance } from "@/modules/scheduling/services/setAttendance";

describe("setAttendanceAction", () => {
  it("devolve status e presenca", async () => {
    vi.mocked(setAttendance).mockResolvedValue({ status: "CONFIRMED", checkedInAt: new Date() } as never);

    expect(await setAttendanceAction("a1", true)).toEqual({
      ok: true,
      allocation: { status: "CONFIRMED", checkedIn: true },
    });
  });
});
