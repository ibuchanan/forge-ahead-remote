import { describe, expect, it, vi } from "vitest";

vi.mock("jose", () => {
  throw new Error("the context subpath must not import jose");
});
vi.mock("@forge-ahead/errors", () => {
  throw new Error("the context subpath must not import @forge-ahead/errors");
});
vi.mock("express", () => {
  throw new Error("the context subpath must not import a framework package");
});
vi.mock("fastify", () => {
  throw new Error("the context subpath must not import a framework package");
});
vi.mock("hono", () => {
  throw new Error("the context subpath must not import a framework package");
});
vi.mock("@forge/api", () => {
  throw new Error("the context subpath must not import a Forge package");
});
vi.mock("@forge-ahead/logging", () => {
  throw new Error("the context subpath must not import a logging package");
});

describe("@forge-ahead/remote/context import boundary", () => {
  it("loads without pulling in jose, errors, frameworks, Forge, or logging packages", async () => {
    await expect(import("../src/context")).resolves.toBeTruthy();
  });
});
