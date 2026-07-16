import { describe, expect, it, vi } from "vitest";

vi.mock("../src/invocation", () => {
  throw new Error(
    "validateForgeRemoteRequest must not depend on the invocation subpath",
  );
});

describe("src/verify.ts import boundary", () => {
  it("does not depend on the invocation subpath", async () => {
    await expect(import("../src/verify")).resolves.toBeTruthy();
  });
});
