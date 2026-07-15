import { describe, expect, it } from "vitest";
import * as rootExports from "../src/index";
import {
  ATLASSIAN_FORGE_JWKS_URL,
  createJwksKeyStore,
  verifyAndParseJwt,
  verifyJwt,
} from "../src/index";
import {
  generateTestKeyPair,
  signTestJwt,
  tamperSignature,
} from "./jwt-test-helpers";

describe("ATLASSIAN_FORGE_JWKS_URL", () => {
  it("is exposed from the root entrypoint", () => {
    expect(ATLASSIAN_FORGE_JWKS_URL).toBe(
      "https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json",
    );
  });
});

describe("createJwksKeyStore", () => {
  it("returns a callable key getter using the default Atlassian JWKS URL", () => {
    const jwks = createJwksKeyStore();

    expect(typeof jwks).toBe("function");
  });

  it("accepts an injected jwksUrl and still returns a callable key getter", () => {
    const jwks = createJwksKeyStore({
      jwksUrl: "https://example.test/.well-known/jwks.json",
    });

    expect(typeof jwks).toBe("function");
  });
});

describe("verifyJwt", () => {
  it("verifies a locally signed token with an injected key store", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );

    const result = await verifyJwt({
      token,
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expect(result.payload.sub).toBe("user-1");
  });

  it("rejects a token signed for a different audience", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );

    await expect(
      verifyJwt({ token, audience: "app-2", jwks: keyPair.jwks }),
    ).rejects.toThrow();
  });

  it("rejects a token signed by a key not in the key store", async () => {
    const signingKeyPair = await generateTestKeyPair("signing-kid");
    const untrustedStoreKeyPair = await generateTestKeyPair("signing-kid");
    const token = await signTestJwt(
      signingKeyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );

    await expect(
      verifyJwt({
        token,
        audience: "app-1",
        jwks: untrustedStoreKeyPair.jwks,
      }),
    ).rejects.toThrow();
  });

  it("does not enforce issuer when no issuer option is supplied", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "unexpected-issuer" },
    );

    const result = await verifyJwt({
      token,
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expect(result.payload.sub).toBe("user-1");
  });

  it("rejects a mismatched issuer when an issuer option is supplied", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "unexpected-issuer" },
    );

    await expect(
      verifyJwt({
        token,
        audience: "app-1",
        jwks: keyPair.jwks,
        issuer: "forge/invocation-token",
      }),
    ).rejects.toThrow();
  });

  it("rejects a token with a tampered signature", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );
    const tamperedToken = tamperSignature(token);

    await expect(
      verifyJwt({
        token: tamperedToken,
        audience: "app-1",
        jwks: keyPair.jwks,
      }),
    ).rejects.toThrow();
  });

  it("prefers an injected jwks store over jwksUrl when both are supplied", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );

    const result = await verifyJwt({
      token,
      audience: "app-1",
      jwks: keyPair.jwks,
      jwksUrl: "https://example.test/unused-jwks.json",
    });

    expect(result.payload.sub).toBe("user-1");
  });
});

describe("verifyAndParseJwt", () => {
  it("returns only the verified payload", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );

    const payload = await verifyAndParseJwt({
      token,
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expect(payload).toEqual(
      expect.objectContaining({ sub: "user-1", aud: "app-1" }),
    );
  });

  it("rejects when verifyJwt rejects", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );

    await expect(
      verifyAndParseJwt({ token, audience: "app-2", jwks: keyPair.jwks }),
    ).rejects.toThrow();
  });
});

describe("public API surface", () => {
  it("does not export a one-shot JWKS fetch helper", () => {
    expect(Object.keys(rootExports).sort()).toEqual(
      [
        "ATLASSIAN_FORGE_JWKS_URL",
        "createJwksKeyStore",
        "validateAuthHeader",
        "verifyAndParseJwt",
        "verifyJwt",
      ].sort(),
    );
  });
});
