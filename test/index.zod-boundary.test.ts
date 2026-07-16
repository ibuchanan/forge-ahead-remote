import { describe, expect, it, vi } from "vitest";

vi.mock("zod", () => {
  throw new Error("root Remote Authentication must not depend on zod");
});

describe("src/index.ts import boundary", () => {
  it("does not depend on zod", async () => {
    await expect(import("../src/index")).resolves.toBeTruthy();
  });
});
