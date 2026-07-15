import { describe, expect, it } from "vitest";
import { validateAuthHeader } from "../src/index";
import {
  generateTestKeyPair,
  signTestJwt,
  tamperSignature,
} from "./jwt-test-helpers";

describe("validateAuthHeader", () => {
  it("returns a 401 Problem Details result when the header is missing", async () => {
    const result = await validateAuthHeader({});

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(401);
  });

  it("returns a 401 Problem Details result when the header is not a Bearer token", async () => {
    const result = await validateAuthHeader({ authorization: "Basic abc123" });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(401);
  });

  it("returns a 401 Problem Details result when the Bearer token is empty", async () => {
    const result = await validateAuthHeader({ authorization: "Bearer " });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(401);
  });

  it("returns a 401 Problem Details result when the Bearer token is not a well-formed JWT", async () => {
    const result = await validateAuthHeader({
      authorization: "Bearer not-a-jwt",
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(401);
  });

  it("returns a 401 Problem Details result before verification when no audience can be determined", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(keyPair, { sub: "user-1" });

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(401);
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

  it("returns a 401 Problem Details result for an expired token", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", expiresIn: "-1h" },
    );

    const result = await validateAuthHeader({
      authorization: `Bearer ${token}`,
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(401);
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

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(401);
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

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(401);
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

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(401);
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

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().status).toBe(502);
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
});
