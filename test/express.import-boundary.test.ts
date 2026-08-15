import { describe, expect, it } from "vitest";

describe("@forge-ahead/remote/express import boundary", () => {
  it("loads the express subpath", async () => {
    await expect(import("../src/express")).resolves.toBeTruthy();
  });
});
