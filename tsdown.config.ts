import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    jwt: "./src/jwt.ts",
    context: "./src/context.ts",
    invocation: "./src/invocation.ts",
    a2a: "./src/a2a/index.ts",
    rovo: "./src/rovo.ts",
    express: "./src/express.ts",
  },
  format: ["esm", "cjs"],
  sourcemap: true,
  target: "node22",
});
