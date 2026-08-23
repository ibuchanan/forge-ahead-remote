import { describe, expect, it } from "vitest";
import {
  createRemoteAuthAcceptedRecord,
  createRemoteAuthRejectedRecord,
  createRemoteInvocationMatchedRecord,
  createRemoteInvocationMismatchedRecord,
} from "../src/logging";

describe("createRemoteAuthAcceptedRecord", () => {
  it("creates a correlated whitelist-only authentication acceptance record", () => {
    const authorization = "authorization-sentinel";
    const fit = "fit-sentinel";
    const forwardedToken = "forwarded-token-sentinel";
    const keyMaterial = "jwks-key-sentinel";
    const arbitraryClaim = "arbitrary-claim-sentinel";

    const record = createRemoteAuthAcceptedRecord({
      context: {
        fit: {
          app: { id: "ari:cloud:ecosystem::app/example" },
          sub: "ari:cloud:jira::site/example-user",
          authorization,
          fit,
          arbitraryClaim,
          keyMaterial,
          request: { body: "request-body-sentinel" },
          cause: new Error("cause-sentinel"),
        },
        verification: {
          audience: "ari:cloud:ecosystem::app/example",
          issuer: "forge/invocation-token",
        },
        forwardedTokens: {
          system: { kind: "system", token: forwardedToken },
          user: { kind: "user", token: forwardedToken },
        },
      },
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
    });

    expect(record).toEqual({
      event: "remote.auth.accepted",
      level: "info",
      message: "Forge Remote request authenticated",
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
      remoteContext: {
        verification: {
          audience: "ari:cloud:ecosystem::app/example",
          issuer: "forge/invocation-token",
        },
        fit: {
          appId: "ari:cloud:ecosystem::app/example",
          principalSubject: "ari:cloud:jira::site/example-user",
        },
        forwardedTokens: {
          hasSystemToken: true,
          hasUserToken: true,
        },
      },
    });

    expect(JSON.stringify(record)).not.toContain(authorization);
    expect(JSON.stringify(record)).not.toContain(fit);
    expect(JSON.stringify(record)).not.toContain(forwardedToken);
    expect(JSON.stringify(record)).not.toContain(keyMaterial);
    expect(JSON.stringify(record)).not.toContain(arbitraryClaim);
    expect(JSON.stringify(record)).not.toContain("request-body-sentinel");
    expect(JSON.stringify(record)).not.toContain("cause-sentinel");
  });
});

describe("createRemoteAuthRejectedRecord", () => {
  it("creates a correlated Problem Details-only authentication rejection record", () => {
    const token = "token-sentinel";
    const cause = "cause-sentinel";
    const stack = "stack-sentinel";

    const record = createRemoteAuthRejectedRecord({
      problem: {
        type: "https://example.test/problems/authentication",
        title: "Unauthorized",
        status: 401,
        detail: "Forge Invocation Token verification failed",
        instance: "urn:request:request-1",
        token,
        cause,
        stack,
      },
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
    });

    expect(record).toEqual({
      event: "remote.auth.rejected",
      level: "warn",
      message: "Forge Remote request authentication rejected",
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
      problem: {
        type: "https://example.test/problems/authentication",
        title: "Unauthorized",
        status: 401,
        detail: "Forge Invocation Token verification failed",
        instance: "urn:request:request-1",
      },
    });

    expect(JSON.stringify(record)).not.toContain(token);
    expect(JSON.stringify(record)).not.toContain(cause);
    expect(JSON.stringify(record)).not.toContain(stack);
  });
});

describe("createRemoteInvocationMatchedRecord", () => {
  it("creates a correlated whitelist-only contract-match record", () => {
    const forwardedToken = "forwarded-token-sentinel";
    const context = "remote-context-sentinel";

    const record = createRemoteInvocationMatchedRecord({
      contract: {
        name: "custom-ui-invocation",
        requiredForwardedTokens: { system: true, user: true },
      },
      forwardedTokens: {
        system: { kind: "system", token: forwardedToken },
        user: { kind: "user", token: forwardedToken },
      },
      context,
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
    });

    expect(record).toEqual({
      event: "remote.invocation.matched",
      level: "info",
      message: "Forge Remote request matched invocation contract",
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
      invocation: {
        contract: "custom-ui-invocation",
        requiredForwardedTokens: { system: true, user: true },
        forwardedTokens: { hasSystemToken: true, hasUserToken: true },
      },
    });

    expect(JSON.stringify(record)).not.toContain(forwardedToken);
    expect(JSON.stringify(record)).not.toContain(context);
  });
});

describe("createRemoteInvocationMismatchedRecord", () => {
  it("creates a correlated whitelist-only contract-mismatch record", () => {
    const forwardedToken = "forwarded-token-sentinel";
    const context = "remote-context-sentinel";
    const arbitraryProblemField = "arbitrary-problem-sentinel";

    const record = createRemoteInvocationMismatchedRecord({
      contract: {
        name: "custom-ui-invocation",
        requiredForwardedTokens: { system: true, user: true },
      },
      forwardedTokens: { system: { kind: "system", token: forwardedToken } },
      context,
      problem: {
        type: "https://example.test/problems/invalid-invocation",
        title: "Bad Request",
        status: 400,
        detail: "Remote Invocation Contract requires a forwarded user token",
        instance: "urn:request:request-1",
        arbitraryProblemField,
      },
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
    });

    expect(record).toEqual({
      event: "remote.invocation.mismatched",
      level: "warn",
      message: "Forge Remote request did not match invocation contract",
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
      invocation: {
        contract: "custom-ui-invocation",
        requiredForwardedTokens: { system: true, user: true },
        forwardedTokens: { hasSystemToken: true, hasUserToken: false },
      },
      problem: {
        type: "https://example.test/problems/invalid-invocation",
        title: "Bad Request",
        status: 400,
        detail: "Remote Invocation Contract requires a forwarded user token",
        instance: "urn:request:request-1",
      },
    });

    expect(JSON.stringify(record)).not.toContain(forwardedToken);
    expect(JSON.stringify(record)).not.toContain(context);
    expect(JSON.stringify(record)).not.toContain(arbitraryProblemField);
  });
});
