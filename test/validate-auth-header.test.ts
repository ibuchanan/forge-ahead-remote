import * as jose from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateAuthHeader } from "../src/index";
import {
  createUnsignedJwt,
  generateTestKeyPair,
  signTestJwt,
  tamperSignature,
} from "./jwt-test-helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

function expectProblem(
  result: Awaited<ReturnType<typeof validateAuthHeader>>,
  expected: { status: number; detail: string },
): void {
  expect(result.isErr()).toBe(true);
  expect(result._unsafeUnwrapErr()).toEqual(expect.objectContaining(expected));
}

describe("validateAuthHeader", () => {
  it("returns a 401 Problem Details result when the header is missing", async () => {
    const result = await validateAuthHeader({});

    expectProblem(result, {
      status: 401,
      detail: "Missing or malformed Authorization header",
    });
  });

  it("returns a 401 Problem Details result when the header is not a Bearer token", async () => {
    const result = await validateAuthHeader({ authorization: "Basic abc123" });

    expectProblem(result, {
      status: 401,
      detail: "Missing or malformed Authorization header",
    });
  });

  it("returns a 401 Problem Details result when the Bearer token is empty", async () => {
    const result = await validateAuthHeader({ authorization: "Bearer " });

    expectProblem(result, {
      status: 401,
      detail: "Missing or malformed Authorization header",
    });
  });

  it("returns a 401 Problem Details result when the Bearer token is not a well-formed JWT", async () => {
    const result = await validateAuthHeader({
      authorization: "Bearer not-a-jwt",
    });

    expectProblem(result, {
      status: 401,
      detail: "Forge Invocation Token is not a well-formed JWT",
    });
  });

  it("returns a 401 Problem Details result before verification when no audience can be determined", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(keyPair, { sub: "user-1" });

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
    });

    expectProblem(result, {
      status: 401,
      detail: "Unable to determine the expected audience",
    });
  });

  it("returns ok(payload) for a valid Forge Invocation Token with an injected key store", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "forge/invocation-token" },
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().sub).toBe("user-1");
  });

  it("verifies using an injected static jwksUrl when no jwks store is supplied", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "forge/invocation-token" },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ keys: [keyPair.publicJwk] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwksUrl: "https://example.test/.well-known/jwks.json",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().sub).toBe("user-1");
  });

  it("returns a 401 Problem Details result for an expired token", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await new jose.SignJWT({ sub: "user-1" })
      .setProtectedHeader({ alg: "RS256", kid: keyPair.kid })
      .setAudience("app-1")
      .setIssuer("forge/invocation-token")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime("-1h")
      .sign(keyPair.privateKey);

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expectProblem(result, {
      status: 401,
      detail: "Forge Invocation Token has expired",
    });
  });

  it("returns a 401 Problem Details result for a mismatched audience", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-2",
      jwks: keyPair.jwks,
    });

    expectProblem(result, {
      status: 401,
      detail: "Forge Invocation Token claims are not permitted",
    });
  });

  it("returns a 401 Problem Details result for a mismatched issuer using the default", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "unexpected-issuer" },
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expectProblem(result, {
      status: 401,
      detail: "Forge Invocation Token claims are not permitted",
    });
  });

  it("returns a 401 Problem Details result for a bad signature", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );
    const tamperedToken = tamperSignature(token);

    const result = await validateAuthHeader({
      authorization: `Bearer ${tamperedToken}`,
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expectProblem(result, {
      status: 401,
      detail: "Forge Invocation Token signature is invalid",
    });
  });

  it("returns a 401 Problem Details result for an unsigned token", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const unsignedToken = createUnsignedJwt({ sub: "user-1", aud: "app-1" });

    const result = await validateAuthHeader({
      authorization: `Bearer ${unsignedToken}`,
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expectProblem(result, {
      status: 401,
      detail: "Forge Invocation Token uses an unsupported signing algorithm",
    });
  });

  it("returns a 502 Problem Details result when verification cannot complete", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );
    const unreachableJwks = async () => {
      throw new Error("network unreachable");
    };

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks: unreachableJwks,
    });

    expectProblem(result, {
      status: 502,
      detail: "Forge Invocation Token verification could not complete",
    });
  });

  it("derives the audience from the decoded FIT app.id when nothing else is supplied", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1", app: { id: "app-from-payload" } },
      { audience: "app-from-payload", issuer: "forge/invocation-token" },
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      jwks: keyPair.jwks,
    });

    expect(result.isOk()).toBe(true);
  });

  it("prefers a caller-supplied deriveAudience over the decoded FIT app.id", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1", app: { id: "app-from-payload" } },
      { audience: "app-from-derive", issuer: "forge/invocation-token" },
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      jwks: keyPair.jwks,
      deriveAudience: () => "app-from-derive",
    });

    expect(result.isOk()).toBe(true);
  });

  it("prefers an explicit audience over deriveAudience and app.id", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1", app: { id: "app-from-payload" } },
      { audience: "app-explicit", issuer: "forge/invocation-token" },
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      jwks: keyPair.jwks,
      audience: "app-explicit",
      deriveAudience: () => "app-from-derive",
    });

    expect(result.isOk()).toBe(true);
  });

  it("passes the unverified decoded payload to deriveAudience", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1", app: { id: "app-1" } },
      { audience: "app-1" },
    );
    let receivedPayload: unknown;

    await validateAuthHeader({
      authorization: `Bearer ${token}`,
      jwks: keyPair.jwks,
      deriveAudience: (payload) => {
        receivedPayload = payload;
        return "app-1";
      },
    });

    expect(receivedPayload).toEqual(
      expect.objectContaining({ sub: "user-1", app: { id: "app-1" } }),
    );
  });

  it("verifies against an explicit issuer instead of the default", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "custom-issuer" },
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks: keyPair.jwks,
      issuer: "custom-issuer",
    });

    expect(result.isOk()).toBe(true);
  });

  it("rejects an ES256 token without selecting a matching EC JWKS key", async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair("ES256");
    const publicJwk = await jose.exportJWK(publicKey);
    publicJwk.kid = "ec-key";
    publicJwk.alg = "ES256";
    const token = await new jose.SignJWT({ sub: "user-1" })
      .setProtectedHeader({ alg: "ES256", kid: "ec-key" })
      .setAudience("app-1")
      .setIssuer("forge/invocation-token")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
    let jwksSelected = false;
    const jwks = async () => {
      jwksSelected = true;
      return jose.importJWK(publicJwk, "ES256");
    };

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks,
    });

    expectProblem(result, {
      status: 401,
      detail: "Forge Invocation Token uses an unsupported signing algorithm",
    });
    expect(jwksSelected).toBe(false);
  });

  it("distinguishes an unknown JWKS key from an invalid signature", async () => {
    const trustedKeyPair = await generateTestKeyPair("trusted-kid");
    const unknownKeyPair = await generateTestKeyPair("unknown-kid");
    const token = await signTestJwt(
      unknownKeyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "forge/invocation-token" },
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks: trustedKeyPair.jwks,
    });

    expectProblem(result, {
      status: 401,
      detail: "Forge Invocation Token signing key is unknown",
    });
  });

  it("rejects an RS256 FIT without a key ID before selecting a JWKS key", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await new jose.SignJWT({ sub: "user-1" })
      .setProtectedHeader({ alg: "RS256" })
      .setAudience("app-1")
      .setIssuer("forge/invocation-token")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(keyPair.privateKey);
    let jwksSelected = false;
    const jwks = async () => {
      jwksSelected = true;
      return jose.importJWK(keyPair.publicJwk, "RS256");
    };

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks,
    });

    expectProblem(result, {
      status: 401,
      detail: "Forge Invocation Token is missing a key ID",
    });
    expect(jwksSelected).toBe(false);
  });

  it("selects the matching RSA key from a multi-key JWKS", async () => {
    const matchingKeyPair = await generateTestKeyPair("matching-kid");
    const otherKeyPair = await generateTestKeyPair("other-kid");
    const token = await signTestJwt(
      matchingKeyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "forge/invocation-token" },
    );
    const jwks = jose.createLocalJWKSet({
      keys: [otherKeyPair.publicJwk, matchingKeyPair.publicJwk],
    });

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks,
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().sub).toBe("user-1");
  });
});
