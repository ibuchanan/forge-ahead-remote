import { describe, expect, it } from "vitest";
import { buildForgeRemoteContext } from "../src/context";
import {
  asyncEventInvocation,
  backendFunctionInvocation,
  customUiInvocation,
  defineRemoteInvocationContract,
  externalRemoteInvocation,
  scheduledTriggerInvocation,
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

  it("preserves descriptive acknowledgement metadata", () => {
    const contract = defineRemoteInvocationContract({
      name: "async-event-invocation",
      authentication: "forge-invocation-token",
      requiredForwardedTokens: { system: true },
      acknowledgement: { status: 202, description: "Accepted" },
    });

    expect(contract.acknowledgement).toEqual({
      status: 202,
      description: "Accepted",
    });
  });

  it("preserves installation-identifier and system-token rehydration metadata for caller-owned contracts", () => {
    const contract = defineRemoteInvocationContract({
      name: "external-remote-invocation",
      authentication: "caller-owned",
      installationIdRequired: true,
      systemTokenRehydration: "possible",
    });

    expect(contract.installationIdRequired).toBe(true);
    expect(contract.systemTokenRehydration).toBe("possible");
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

  it("ignores acknowledgement metadata when checking forwarded-token requirements", () => {
    const contract = defineRemoteInvocationContract({
      name: "async-event-invocation",
      authentication: "forge-invocation-token",
      requiredForwardedTokens: { system: true },
      acknowledgement: { status: 202, description: "Accepted" },
    });
    const contextMissingSystemToken = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
    });

    const result = validateRemoteInvocationContract(
      contextMissingSystemToken,
      contract,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual(
      expect.objectContaining({
        status: 400,
        detail: "Remote Invocation Contract requires a forwarded system token",
      }),
    );
  });
});

describe("customUiInvocation preset", () => {
  it("requires both forwarded system and user tokens", () => {
    expect(customUiInvocation.authentication).toBe("forge-invocation-token");
    expect(customUiInvocation.requiredForwardedTokens).toEqual({
      system: true,
      user: true,
    });
  });

  it("rejects a context missing the forwarded user token", () => {
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
      forwardedSystemToken: "system-token-value",
    });

    const result = validateRemoteInvocationContract(
      context,
      customUiInvocation,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual(
      expect.objectContaining({
        detail: "Remote Invocation Contract requires a forwarded user token",
      }),
    );
  });

  it("matches a context carrying both forwarded tokens", () => {
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
      forwardedSystemToken: "system-token-value",
      forwardedUserToken: "user-token-value",
    });

    const result = validateRemoteInvocationContract(
      context,
      customUiInvocation,
    );

    expect(result.isOk()).toBe(true);
  });
});

describe("backendFunctionInvocation preset", () => {
  it("requires only the forwarded system token", () => {
    expect(backendFunctionInvocation.authentication).toBe(
      "forge-invocation-token",
    );
    expect(backendFunctionInvocation.requiredForwardedTokens).toEqual({
      system: true,
    });
  });

  it("matches a context with a system token but no user token", () => {
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
      forwardedSystemToken: "system-token-value",
    });

    const result = validateRemoteInvocationContract(
      context,
      backendFunctionInvocation,
    );

    expect(result.isOk()).toBe(true);
  });

  it("rejects a context missing the forwarded system token", () => {
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
    });

    const result = validateRemoteInvocationContract(
      context,
      backendFunctionInvocation,
    );

    expect(result.isErr()).toBe(true);
  });
});

describe("asyncEventInvocation preset", () => {
  it("requires only the forwarded system token and documents a 202 acknowledgement", () => {
    expect(asyncEventInvocation.requiredForwardedTokens).toEqual({
      system: true,
    });
    expect(asyncEventInvocation.acknowledgement).toEqual({
      status: 202,
      description: "Accepted for asynchronous processing",
    });
  });

  it("rejects a context missing the forwarded system token", () => {
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
    });

    const result = validateRemoteInvocationContract(
      context,
      asyncEventInvocation,
    );

    expect(result.isErr()).toBe(true);
  });
});

describe("scheduledTriggerInvocation preset", () => {
  it("requires only the forwarded system token", () => {
    expect(scheduledTriggerInvocation.requiredForwardedTokens).toEqual({
      system: true,
    });
  });

  it("matches a context carrying the forwarded system token", () => {
    const context = buildForgeRemoteContext({
      fit: { app: { id: "app-1" } },
      verification: { audience: "app-1" },
      forwardedSystemToken: "system-token-value",
    });

    const result = validateRemoteInvocationContract(
      context,
      scheduledTriggerInvocation,
    );

    expect(result.isOk()).toBe(true);
  });
});

describe("externalRemoteInvocation preset", () => {
  it("records FIT absence, caller-owned authentication, and installation-identifier expectation", () => {
    expect(externalRemoteInvocation.authentication).toBe("caller-owned");
    expect(externalRemoteInvocation.requiredForwardedTokens).toEqual({});
    expect(externalRemoteInvocation.installationIdRequired).toBe(true);
    expect(externalRemoteInvocation.systemTokenRehydration).toBe("possible");
  });
});
