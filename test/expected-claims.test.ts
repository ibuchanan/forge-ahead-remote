import { describe, expect, it } from "vitest";
import { selectExpectedForgeInvocationClaims } from "../src/expected-claims";

function expectSelectedClaims(
  input: Parameters<typeof selectExpectedForgeInvocationClaims>[0],
  expected: { audience: string; issuer: string },
): void {
  const result = selectExpectedForgeInvocationClaims(input);

  expect(result.isOk()).toBe(true);
  expect(result._unsafeUnwrap()).toEqual(expected);
}

describe("selectExpectedForgeInvocationClaims", () => {
  it("prefers an explicit audience over derived audience and decoded FIT app.id", () => {
    expectSelectedClaims(
      {
        audience: "explicit-audience",
        deriveAudience: () => "derived-audience",
        unverifiedPayload: { app: { id: "app-id-audience" } },
      },
      {
        audience: "explicit-audience",
        issuer: "forge/invocation-token",
      },
    );
  });

  it("prefers a derived audience over decoded FIT app.id", () => {
    expectSelectedClaims(
      {
        deriveAudience: () => "derived-audience",
        unverifiedPayload: { app: { id: "app-id-audience" } },
      },
      {
        audience: "derived-audience",
        issuer: "forge/invocation-token",
      },
    );
  });

  it("falls back to decoded FIT app.id when the derive hook returns undefined", () => {
    expectSelectedClaims(
      {
        deriveAudience: () => undefined,
        unverifiedPayload: { app: { id: "app-id-audience" } },
      },
      {
        audience: "app-id-audience",
        issuer: "forge/invocation-token",
      },
    );
  });

  it("passes the unverified FIT payload to the derive hook", () => {
    const unverifiedPayload = { app: { id: "app-id-audience" }, sub: "user-1" };
    let receivedPayload: unknown;

    expectSelectedClaims(
      {
        deriveAudience: (payload) => {
          receivedPayload = payload;
          return "derived-audience";
        },
        unverifiedPayload,
      },
      {
        audience: "derived-audience",
        issuer: "forge/invocation-token",
      },
    );

    expect(receivedPayload).toBe(unverifiedPayload);
  });

  it("uses an explicit issuer instead of the Forge issuer default", () => {
    expectSelectedClaims(
      {
        audience: "explicit-audience",
        issuer: "custom-issuer",
        unverifiedPayload: {},
      },
      {
        audience: "explicit-audience",
        issuer: "custom-issuer",
      },
    );
  });

  it.each([
    {},
    { app: null },
    { app: "app-id-audience" },
    { app: {} },
    { app: { id: 123 } },
  ])("returns a missing-audience problem for payload %o", (unverifiedPayload) => {
    const result = selectExpectedForgeInvocationClaims({ unverifiedPayload });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual(
      expect.objectContaining({
        status: 401,
        detail: "Unable to determine the expected audience",
      }),
    );
  });
});
