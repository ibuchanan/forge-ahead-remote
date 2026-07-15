import { describe, expect, it, vi } from "vitest";

vi.mock("jose", () => {
  throw new Error("the jwt subpath must not import jose");
});
vi.mock("@forge-ahead/errors", () => {
  throw new Error("the jwt subpath must not import @forge-ahead/errors");
});
vi.mock("../src/context", () => {
  throw new Error("the jwt subpath must not import Forge Remote context types");
});

describe("@forge-ahead/remote/jwt import boundary", () => {
  it("loads without pulling in jose, @forge-ahead/errors, or context types", async () => {
    await expect(import("../src/jwt")).resolves.toBeTruthy();
  });
});
