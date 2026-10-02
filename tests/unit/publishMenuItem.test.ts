import { describe, it, expect } from "vitest";
import { publishMenuItem } from "@/modules/scheduling/domain/publish";

describe("publishMenuItem", () => {
  it("publishMenuItem oferece a acao oposta ao estado atual", () => {
    expect(publishMenuItem(false)).toMatchObject({ label: "Publicar", target: true });
    expect(publishMenuItem(true)).toMatchObject({ label: "Tornar rascunho", target: false });
  });

  it("confirmacao so ao tornar rascunho", () => {
    expect(publishMenuItem(true).confirm).toBe("Voluntários deixam de ver esta data até você publicar de novo.");
    expect(publishMenuItem(false).confirm).toBeNull();
  });
});
