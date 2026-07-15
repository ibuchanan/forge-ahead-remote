import { StandardError } from "@forge-ahead/errors";
import { describe, expect, it } from "vitest";
import {
  toHttpAuthFailureResponse,
  validateForgeRemoteRequest,
} from "../src/index";
import { generateTestKeyPair, signTestJwt } from "./jwt-test-helpers";

function expectProblem(
  result: Awaited<ReturnType<typeof validateForgeRemoteRequest>>,
  expected: { status: number; detail: string },
): void {
  expect(result.isErr()).toBe(true);
  expect(result._unsafeUnwrapErr()).toEqual(expect.objectContaining(expected));
}

describe("toHttpAuthFailureResponse", () => {
  it("returns the problem's status and the problem itself as the body", () => {
    const problem = StandardError.getOrDefault(401)
      .error("Missing Authorization header")
      ._unsafeUnwrapErr();

    const response = toHttpAuthFailureResponse(problem);

    expect(response).toEqual({ status: 401, body: problem });
  });
});

describe("validateForgeRemoteRequest", () => {
  it("returns a ForgeRemoteContext for a valid request with no forwarded tokens", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "forge/invocation-token" },
    );

    const result = await validateForgeRemoteRequest({
      headers: { authorization: `Bearer ${token}` },
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expect(result.isOk()).toBe(true);
    const context = result._unsafeUnwrap();
    expect(context.fit.sub).toBe("user-1");
    expect(context.verification).toEqual({
      audience: "app-1",
      issuer: "forge/invocation-token",
    });
    expect(context.forwardedTokens).toBeUndefined();
  });

  it("maps forwarded system and user token headers to normalized token objects", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", issuer: "forge/invocation-token" },
    );

    const result = await validateForgeRemoteRequest({
      headers: {
        authorization: `Bearer ${token}`,
        appSystemToken: "system-token-value",
        appUserToken: "user-token-value",
      },
      audience: "app-1",
      jwks: keyPair.jwks,
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().forwardedTokens).toEqual({
      system: { kind: "system", token: "system-token-value" },
      user: { kind: "user", token: "user-token-value" },
    });
  });

  it("returns a 401 Problem Details result through the same path as validateAuthHeader", async () => {
    const result = await validateForgeRemoteRequest({
      headers: {},
      audience: "app-1",
    });

    expectProblem(result, {
      status: 401,
      detail: "Missing or malformed Authorization header",
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

    const result = await validateForgeRemoteRequest({
      headers: { authorization: `Bearer ${token}` },
      audience: "app-1",
      jwks: unreachableJwks,
    });

    expectProblem(result, {
      status: 502,
      detail: "Forge Invocation Token verification could not complete",
    });
  });
});
