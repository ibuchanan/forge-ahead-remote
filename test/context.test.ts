import { describe, expect, it } from "vitest";
import { buildForgeRemoteContext } from "../src/context";

describe("buildForgeRemoteContext", () => {
  it("builds a context from a verified FIT payload and verification metadata", () => {
    const fit = { app: { id: "ari:cloud:ecosystem::app/123" } };
    const verification = { audience: "ari:cloud:ecosystem::app/123" };

    const context = buildForgeRemoteContext({
      fit,
      verification,
    });

    expect(context.fit).toBe(fit);
    expect(context.verification).toBe(verification);
    expect(context.verification).toEqual({
      audience: "ari:cloud:ecosystem::app/123",
    });
    expect(context.forwardedTokens).toBeUndefined();
  });

  it("wraps forwarded system and user token strings with their kind", () => {
    const context = buildForgeRemoteContext({
      fit: {},
      verification: { audience: "aud" },
      forwardedSystemToken: "system-token-value",
      forwardedUserToken: "user-token-value",
    });

    expect(context.forwardedTokens).toEqual({
      system: { kind: "system", token: "system-token-value" },
      user: { kind: "user", token: "user-token-value" },
    });
  });

  it("wraps a forwarded system token without requiring a user token", () => {
    const context = buildForgeRemoteContext({
      fit: {},
      verification: { audience: "aud" },
      forwardedSystemToken: "system-token-value",
    });

    expect(context.forwardedTokens).toEqual({
      system: { kind: "system", token: "system-token-value" },
    });
  });

  it("wraps a forwarded user token without requiring a system token", () => {
    const context = buildForgeRemoteContext({
      fit: {},
      verification: { audience: "aud" },
      forwardedUserToken: "user-token-value",
    });

    expect(context.forwardedTokens).toEqual({
      user: { kind: "user", token: "user-token-value" },
    });
  });

  it("keeps a forwarded token opaque even when it is not a well-formed JWT", () => {
    const context = buildForgeRemoteContext({
      fit: {},
      verification: { audience: "aud" },
      forwardedUserToken: "not-a-jwt-at-all",
    });

    expect(context.forwardedTokens?.user).toEqual({
      kind: "user",
      token: "not-a-jwt-at-all",
    });
  });

  it("preserves empty forwarded token strings as opaque values", () => {
    const context = buildForgeRemoteContext({
      fit: {},
      verification: { audience: "aud" },
      forwardedSystemToken: "",
      forwardedUserToken: "",
    });

    expect(context.forwardedTokens).toEqual({
      system: { kind: "system", token: "" },
      user: { kind: "user", token: "" },
    });
  });

  it("omits forwardedTokens only when both forwarded token inputs are undefined", () => {
    const context = buildForgeRemoteContext({
      fit: {},
      verification: { audience: "aud" },
      forwardedSystemToken: "",
    });

    expect(context.forwardedTokens).toEqual({
      system: { kind: "system", token: "" },
    });
  });

  it("preserves issuer metadata when supplied", () => {
    const verification = {
      audience: "aud",
      issuer: "forge/invocation-token",
    };

    const context = buildForgeRemoteContext({
      fit: {},
      verification,
    });

    expect(context.verification).toBe(verification);
    expect(context.verification).toEqual({
      audience: "aud",
      issuer: "forge/invocation-token",
    });
  });
});
