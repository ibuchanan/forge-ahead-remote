import { describe, expect, it, vi } from "vitest";

vi.mock("zod", () => {
  throw new Error("the invocation subpath must not depend on zod");
});

describe("src/invocation.ts import boundary", () => {
  it("does not depend on zod", async () => {
    await expect(import("../src/invocation")).resolves.toBeTruthy();
  });
});
