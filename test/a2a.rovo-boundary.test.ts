import { describe, expect, it, vi } from "vitest";

vi.mock("../src/rovo", () => {
  throw new Error("the a2a subpath must not depend on the rovo subpath");
});

describe("src/a2a.ts import boundary", () => {
  it("does not depend on the rovo subpath", async () => {
    await expect(import("../src/a2a")).resolves.toBeTruthy();
  });
});
