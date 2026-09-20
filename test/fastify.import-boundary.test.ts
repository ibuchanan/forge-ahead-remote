import { describe, expect, it } from "vitest";

describe("@forge-ahead/remote/fastify import boundary", () => {
  it("loads the Fastify subpath", async () => {
    await expect(import("../src/fastify")).resolves.toBeTruthy();
  });
});
