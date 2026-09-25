import { describe, it, expect } from "vitest";
import { rotationCycleSchema } from "@/modules/scheduling/domain/rotation";

describe("rotationCycleSchema", () => {
  it.each([1, 12, null, undefined])("aceita %s", (value) => {
    expect(rotationCycleSchema.safeParse(value).success).toBe(true);
  });

  it.each([0, 13, 1.5])("rejeita %s com INVALID_ROTATION_CYCLE", (value) => {
    const res = rotationCycleSchema.safeParse(value);
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].message).toBe("INVALID_ROTATION_CYCLE");
  });
});
