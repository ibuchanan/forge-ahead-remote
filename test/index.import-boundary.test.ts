import { describe, expect, it, vi } from "vitest";

vi.mock("../src/a2a", () => {
  throw new Error(
    "root Remote Authentication must not depend on the a2a subpath",
  );
});
vi.mock("zod", () => {
  throw new Error("root Remote Authentication must not depend on zod");
});

describe("src/index.ts import boundary", () => {
  it("does not depend on the a2a subpath or zod", async () => {
    await expect(import("../src/index")).resolves.toBeTruthy();
  });
});
