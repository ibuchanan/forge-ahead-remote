import { describe, expect, it, vi } from "vitest";

vi.mock("../src/a2a", () => {
  throw new Error(
    "root Remote Authentication must not depend on the a2a subpath",
  );
});

describe("src/index.ts import boundary", () => {
  it("does not depend on the a2a subpath", async () => {
    await expect(import("../src/index")).resolves.toBeTruthy();
  });
});
