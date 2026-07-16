import { describe, expect, it, vi } from "vitest";

vi.mock("jose", () => {
  throw new Error("the invocation subpath must not import jose");
});
vi.mock("../src/verify", () => {
  throw new Error("the invocation subpath must not import src/verify.ts");
});

describe("@forge-ahead/remote/invocation import boundary", () => {
  it("loads without pulling in jose or src/verify.ts", async () => {
    await expect(import("../src/invocation")).resolves.toBeTruthy();
  });
});
