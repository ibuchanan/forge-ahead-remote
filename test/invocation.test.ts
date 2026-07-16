import { describe, expect, it } from "vitest";
import { buildForgeRemoteContext } from "../src/context";
import {
  defineRemoteInvocationContract,
  validateRemoteInvocationContract,
} from "../src/invocation";

describe("defineRemoteInvocationContract", () => {
  it("builds a FIT-present contract with no required forwarded tokens", () => {
    const contract = defineRemoteInvocationContract({
      name: "custom-ui-invocation",
      authentication: "forge-invocation-token",
    });

    expect(contract).toEqual({
      name: "custom-ui-invocation",
      authentication: "forge-invocation-token",
      requiredForwardedTokens: {},
    });
  });

  it("preserves required forwarded system and user token flags", () => {
    const contract = defineRemoteInvocationContract({
      name: "backend-function-invocation",
      authentication: "forge-invocation-token",
      requiredForwardedTokens: { system: true, user: true },
    });

    expect(contract.requiredForwardedTokens).toEqual({
      system: true,
      user: true,
    });
  });

  it("builds a caller-owned (FIT-absent) contract", () => {
    const contract = defineRemoteInvocationContract({
      name: "external-remote-invocation",
      authentication: "caller-owned",
    });

    expect(contract.authentication).toBe("caller-owned");
  });
});

describe("validateRemoteInvocationContract", () => {
  it("matches any context when the contract requires no forwarded tokens", () => {
    const contract = defineRemoteInvocationContract({
      name: "custom-ui-invocation",
      authentication: "forge-invocation-token",
    });
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
    });

    const result = validateRemoteInvocationContract(context, contract);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().context).toBe(context);
  });

  it("rejects a context missing a required forwarded system token", () => {
    const contract = defineRemoteInvocationContract({
      name: "backend-function-invocation",
      authentication: "forge-invocation-token",
      requiredForwardedTokens: { system: true },
    });
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
    });

    const result = validateRemoteInvocationContract(context, contract);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual(
      expect.objectContaining({
        status: 400,
        detail: "Remote Invocation Contract requires a forwarded system token",
      }),
    );
  });

  it("narrows a matched required forwarded system token onto the match value", () => {
    const contract = defineRemoteInvocationContract({
      name: "backend-function-invocation",
      authentication: "forge-invocation-token",
      requiredForwardedTokens: { system: true },
    });
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
      forwardedSystemToken: "system-token-value",
    });

    const result = validateRemoteInvocationContract(context, contract);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().forwardedTokens.system).toEqual({
      kind: "system",
      token: "system-token-value",
    });
  });

  it("rejects a context missing a required forwarded user token", () => {
    const contract = defineRemoteInvocationContract({
      name: "custom-ui-invocation",
      authentication: "forge-invocation-token",
      requiredForwardedTokens: { user: true },
    });
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
    });

    const result = validateRemoteInvocationContract(context, contract);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual(
      expect.objectContaining({
        status: 400,
        detail: "Remote Invocation Contract requires a forwarded user token",
      }),
    );
  });

  it("narrows a matched required forwarded user token onto the match value", () => {
    const contract = defineRemoteInvocationContract({
      name: "custom-ui-invocation",
      authentication: "forge-invocation-token",
      requiredForwardedTokens: { system: true, user: true },
    });
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
      forwardedSystemToken: "system-token-value",
      forwardedUserToken: "user-token-value",
    });

    const result = validateRemoteInvocationContract(context, contract);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().forwardedTokens).toEqual({
      system: { kind: "system", token: "system-token-value" },
      user: { kind: "user", token: "user-token-value" },
    });
  });
});
