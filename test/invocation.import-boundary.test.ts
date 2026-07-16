import { describe, expect, it, vi } from "vitest";

vi.mock("jose", () => {
  throw new Error("the invocation subpath must not import jose");
});
vi.mock("../src/verify", () => {
  throw new Error("the invocation subpath must not import src/verify.ts");
});
vi.mock("zod", () => {
  throw new Error("the invocation subpath must not import zod");
});

describe("@forge-ahead/remote/invocation import boundary", () => {
  it("loads without pulling in jose, src/verify.ts, or zod", async () => {
    await expect(import("../src/invocation")).resolves.toBeTruthy();
  });
});
