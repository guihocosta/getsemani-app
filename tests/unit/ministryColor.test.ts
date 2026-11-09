import { describe, it, expect } from "vitest";
import { ministryColor } from "@/modules/ministries/domain/color";

describe("ministryColor", () => {
  it.each([
    ["#e0605a", "#e0605a"],
    ["#E0605A", "#E0605A"],
    [null, "#2a78cd"],
    ["", "#2a78cd"],
    ["red", "#2a78cd"],
    ["#12345", "#2a78cd"],
    ["#123456;x", "#2a78cd"],
  ])("cor do ministerio: %s -> %s", (salva, esperada) => {
    expect(ministryColor(salva)).toBe(esperada);
  });
});
