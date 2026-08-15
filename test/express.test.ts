import { describe, expect, it } from "vitest";
import { buildForgeRemoteContext } from "../src/context";
import {
  forgeRemoteAuthMiddleware,
  forgeRemoteServerCallContextBuilder,
  forgeRemoteUserBuilder,
  type ForgeRemoteRequest,
} from "../src/express";
import { generateTestKeyPair, signTestJwt } from "./jwt-test-helpers";

function makeRequest(
  overrides: Partial<ForgeRemoteRequest> = {},
): ForgeRemoteRequest {
  return {
    headers: {},
    ...overrides,
  } as ForgeRemoteRequest;
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string | number | string[]>;
  body: unknown;
  status(code: number): MockResponse;
  setHeader(name: string, value: string | number | string[]): MockResponse;
  json(value: unknown): MockResponse;
  send(value: unknown): MockResponse;
}

function makeResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    setHeader(name: string, value: string | number | string[]) {
      res.headers[name] = value;
      return res;
    },
    json(value: unknown) {
      res.body = value;
      return res;
    },
    send(value: unknown) {
      res.body = value;
      return res;
    },
  };
  return res;
}

function makeNext() {
  let called = false;
  const next = () => {
    called = true;
  };
  return { next, wasCalled: () => called };
}

describe("forgeRemoteAuthMiddleware", () => {
  it("attaches a ForgeRemoteContext when the FIT is valid", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1", app: { id: "ari:cloud:ecosystem::app/123" } },
      {
        audience: "ari:cloud:ecosystem::app/123",
        issuer: "forge/invocation-token",
      },
    );
    const req = makeRequest({
      headers: {
        authorization: `Bearer ${token}`,
        "x-forge-oauth-system": "system-token",
        "x-forge-oauth-user": "user-token",
      },
    });
    const res = makeResponse();
    const { next, wasCalled } = makeNext();
    const middleware = forgeRemoteAuthMiddleware({
      jwks: keyPair.jwks,
    });

    await middleware(req, res as never, next);

    expect(wasCalled()).toBe(true);
    expect(req.forgeRemoteContext).toBeTruthy();
    expect(req.forgeRemoteContext?.fit.sub).toBe("user-1");
    expect(req.forgeRemoteContext?.forwardedTokens).toEqual({
      system: { kind: "system", token: "system-token" },
      user: { kind: "user", token: "user-token" },
    });
  });

  it("rejects a missing authorization header with 401", async () => {
    const req = makeRequest({ headers: {} });
    const res = makeResponse();
    const { next, wasCalled } = makeNext();
    const middleware = forgeRemoteAuthMiddleware({
      jwks: async () => {
        throw new Error("should not be called");
      },
    });

    await middleware(req, res as never, next);

    expect(wasCalled()).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 401,
        detail: "Missing or malformed Authorization header",
      }),
    );
  });

  it("rejects a tampered FIT with 401", async () => {
    const keyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );
    const tampered = `${token.slice(0, -1)}x`;
    const req = makeRequest({
      headers: { authorization: `Bearer ${tampered}` },
    });
    const res = makeResponse();
    const { next, wasCalled } = makeNext();
    const middleware = forgeRemoteAuthMiddleware({ jwks: keyPair.jwks });

    await middleware(req, res as never, next);

    expect(wasCalled()).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it("rejects a request with a JWT signed by an untrusted key with 401", async () => {
    const trustedKeyPair = await generateTestKeyPair("test-kid");
    const signingKeyPair = await generateTestKeyPair("test-kid");
    const token = await signTestJwt(
      signingKeyPair,
      { sub: "user-1" },
      { audience: "app-1" },
    );
    const req = makeRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = makeResponse();
    const { next, wasCalled } = makeNext();
    const middleware = forgeRemoteAuthMiddleware({ jwks: trustedKeyPair.jwks });

    await middleware(req, res as never, next);

    expect(wasCalled()).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

describe("forgeRemoteUserBuilder", () => {
  it("returns an authenticated user with the FIT subject as userName", async () => {
    const req = makeRequest({
      forgeRemoteContext: buildForgeRemoteContext({
        fit: { sub: "user-1" },
        verification: { audience: "app-1" },
      }),
    });

    const user = await forgeRemoteUserBuilder(req);

    expect(user.isAuthenticated).toBe(true);
    expect(user.userName).toBe("user-1");
  });

  it("returns an unauthenticated user when no context is attached", async () => {
    const req = makeRequest();

    const user = await forgeRemoteUserBuilder(req);

    expect(user.isAuthenticated).toBe(false);
    expect(user.userName).toBe("");
  });
});

describe("forgeRemoteServerCallContextBuilder", () => {
  it("is exported as a ServerCallContextBuilder", async () => {
    const { forgeRemoteServerCallContextBuilder } = await import(
      "../src/express"
    );
    expect(typeof forgeRemoteServerCallContextBuilder).toBe("function");
  });

  it("sets tenant from the Jira cloudId in the FIT context", async () => {
    const { ServerCallContext } = await import("@a2a-js/sdk/server");
    const req = makeRequest({
      forgeRemoteContext: buildForgeRemoteContext({
        fit: {
          sub: "user-1",
          context: {
            cloudId: "ari:cloud:jira::site/tenant-123",
          },
        },
        verification: { audience: "app-1" },
      }),
    });
    const user = await forgeRemoteUserBuilder(req);
    const builder = forgeRemoteServerCallContextBuilder();

    const context = builder({
      user,
      headers: {},
      extensions: undefined,
    });

    expect(context).toBeInstanceOf(ServerCallContext);
    expect(context.tenant).toBe("tenant-123");
  });
});
