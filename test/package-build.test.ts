import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
);

const EXPECTED_SUBPATHS = [
  ".",
  "./jwt",
  "./context",
  "./invocation",
  "./a2a",
  "./logging",
  "./rovo",
  "./express",
  "./package.json",
];

describe("package exports map", () => {
  it("exposes the expected subpaths", () => {
    expect(Object.keys(packageJson.exports).sort()).toEqual(
      EXPECTED_SUBPATHS.sort(),
    );
  });

  it("uses nested import/require shapes with types and default for each code subpath", () => {
    for (const subpath of EXPECTED_SUBPATHS.filter(
      (subpath) => subpath !== "./package.json",
    )) {
      const exportEntry = packageJson.exports[subpath];
      expect(exportEntry).toHaveProperty("import");
      expect(exportEntry).toHaveProperty("require");
      expect(exportEntry.import).toHaveProperty("types");
      expect(exportEntry.import).toHaveProperty("default");
      expect(exportEntry.require).toHaveProperty("types");
      expect(exportEntry.require).toHaveProperty("default");
      expect(exportEntry.import.types).toMatch(/\.d\.mts$/);
      expect(exportEntry.import.default).toMatch(/\.mjs$/);
      expect(exportEntry.require.types).toMatch(/\.d\.cts$/);
      expect(exportEntry.require.default).toMatch(/\.cjs$/);
    }
  });

  it("does not expose paths outside dist", () => {
    for (const subpath of EXPECTED_SUBPATHS.filter(
      (subpath) => subpath !== "./package.json",
    )) {
      const { import: imp, require: req } = packageJson.exports[subpath];
      for (const path of [imp.types, imp.default, req.types, req.default]) {
        expect(path).toMatch(/^\.\/dist\//);
      }
    }
  });
});

describe("npm scripts", () => {
  it("includes build in the check script", () => {
    expect(packageJson.scripts.check).toMatch(/npm run build/);
  });

  it("exposes a pack:check script", () => {
    expect(packageJson.scripts).toHaveProperty("pack:check");
    expect(packageJson.scripts["pack:check"]).toMatch(/npm pack/);
  });
});
