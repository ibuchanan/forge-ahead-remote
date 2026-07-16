import { describe, expect, it, vi } from "vitest";

vi.mock("../src/a2a", () => {
  throw new Error("the context subpath must not depend on the a2a subpath");
});

describe("src/context.ts import boundary", () => {
  it("does not depend on the a2a subpath", async () => {
    await expect(import("../src/context")).resolves.toBeTruthy();
  });
});
