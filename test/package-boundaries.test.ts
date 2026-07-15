import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
);

describe("package export map", () => {
  it("does not expose a public ./verify subpath", () => {
    expect(Object.keys(packageJson.exports)).not.toContain("./verify");
  });

  it("does not expose a logging subpath", () => {
    expect(Object.keys(packageJson.exports)).not.toContain("./logging");
  });
});

const FORBIDDEN_RUNTIME_DEPENDENCIES = [
  "express",
  "fastify",
  "hono",
  "@forge/api",
  "@forge/kvs",
  "@forge-ahead/atlassian-api-types",
  "@forge-ahead/logging",
];

describe("package runtime dependencies", () => {
  it("does not depend on web frameworks, Forge packages, or logging", () => {
    const dependencyNames = Object.keys(packageJson.dependencies ?? {});

    for (const forbidden of FORBIDDEN_RUNTIME_DEPENDENCIES) {
      expect(dependencyNames).not.toContain(forbidden);
    }
  });
});
