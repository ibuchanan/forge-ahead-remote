import { describe, expect, it, vi } from "vitest";

vi.mock("jose", () => {
  throw new Error("the a2a subpath must not import jose");
});
vi.mock("@forge-ahead/errors", () => {
  throw new Error("the a2a subpath must not import @forge-ahead/errors");
});
vi.mock("../src/context", () => {
  throw new Error("the a2a subpath must not import Forge Remote context types");
});
vi.mock("../src/verify", () => {
  throw new Error("the a2a subpath must not import src/verify.ts");
});
vi.mock("../src/invocation", () => {
  throw new Error("the a2a subpath must not import the invocation subpath");
});
vi.mock("../src/rovo", () => {
  throw new Error("the a2a subpath must not depend on the rovo subpath");
});

describe("@forge-ahead/remote/a2a import boundary", () => {
  it("loads without pulling in jose, errors, context, verify, invocation, or rovo", async () => {
    await expect(import("../src/a2a")).resolves.toBeTruthy();
  });
});
