import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    jwt: "./src/jwt.ts",
    context: "./src/context.ts",
  },
  format: ["esm"],
  sourcemap: true,
  target: "node22",
});
