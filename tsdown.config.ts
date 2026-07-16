import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    jwt: "./src/jwt.ts",
    context: "./src/context.ts",
    invocation: "./src/invocation.ts",
    a2a: "./src/a2a.ts",
    rovo: "./src/rovo.ts",
  },
  format: ["esm"],
  sourcemap: true,
  target: "node22",
});
