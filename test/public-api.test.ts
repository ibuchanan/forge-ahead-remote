import { describe, expect, it } from "vitest";
import * as rootExports from "../src/index";
import { buildForgeRemoteContext, parseJwt } from "../src/index";

describe("root entrypoint re-exports the pure jwt API", () => {
  it("exposes parseJwt", () => {
    const token = parseJwt("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.sig");

    expect(token.payload).toEqual({ sub: "user-1" });
  });
});

describe("root entrypoint re-exports the pure context API", () => {
  it("exposes buildForgeRemoteContext", () => {
    const context = buildForgeRemoteContext({
      fit: { sub: "user-1" },
      verification: { audience: "app-1" },
    });

    expect(context.fit).toEqual({ sub: "user-1" });
  });
});

describe("public API surface", () => {
  it("exposes exactly the locked set of jwt, context, and verification exports", () => {
    expect(Object.keys(rootExports).sort()).toEqual(
      [
        "ATLASSIAN_FORGE_JWKS_URL",
        "JwtParseError",
        "buildForgeRemoteContext",
        "createJwksKeyStore",
        "getKeyIdFromToken",
        "isJwtExpired",
        "parseJwt",
        "toHttpAuthFailureResponse",
        "validateAuthHeader",
        "validateForgeRemoteRequest",
        "verifyAndParseJwt",
        "verifyJwt",
      ].sort(),
    );
  });
});
