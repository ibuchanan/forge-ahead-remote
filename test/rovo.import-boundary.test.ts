import { describe, expect, it, vi } from "vitest";

vi.mock("jose", () => {
  throw new Error("the rovo subpath must not import jose");
});
vi.mock("@forge-ahead/errors", () => {
  throw new Error("the rovo subpath must not import @forge-ahead/errors");
});
vi.mock("../src/context", () => {
  throw new Error(
    "the rovo subpath must not import Forge Remote context types",
  );
});
vi.mock("../src/verify", () => {
  throw new Error("the rovo subpath must not import src/verify.ts");
});
vi.mock("../src/invocation", () => {
  throw new Error("the rovo subpath must not import the invocation subpath");
});
vi.mock("express", () => {
  throw new Error("the rovo subpath must not import a framework package");
});
vi.mock("fastify", () => {
  throw new Error("the rovo subpath must not import a framework package");
});
vi.mock("hono", () => {
  throw new Error("the rovo subpath must not import a framework package");
});
vi.mock("@forge/api", () => {
  throw new Error("the rovo subpath must not import a Forge package");
});
vi.mock("@forge-ahead/logging", () => {
  throw new Error("the rovo subpath must not import a logging package");
});

describe("@forge-ahead/remote/rovo import boundary", () => {
  it("loads without pulling in Forge Remote Context, storage-adjacent, or framework packages", async () => {
    await expect(import("../src/rovo")).resolves.toBeTruthy();
  });
});
