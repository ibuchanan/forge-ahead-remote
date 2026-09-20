import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { forgeRemoteAuthHook } from "../src/fastify";
import {
  generateTestKeyPair,
  signTestJwt,
  tamperSignature,
} from "./jwt-test-helpers";

async function createSignedToken() {
  const keyPair = await generateTestKeyPair("test-kid");
  const token = await signTestJwt(
    keyPair,
    { sub: "user-1", app: { id: "ari:cloud:ecosystem::app/123" } },
    {
      audience: "ari:cloud:ecosystem::app/123",
      issuer: "forge/invocation-token",
    },
  );
  return { keyPair, token };
}

describe("forgeRemoteAuthHook", () => {
  it("attaches a verified ForgeRemoteContext to a protected route", async () => {
    const { keyPair, token } = await createSignedToken();
    const app = fastify();
    app.addHook("onRequest", forgeRemoteAuthHook({ jwks: keyPair.jwks }));
    app.get("/protected", (request) => request.forgeRemoteContext);

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: {
        authorization: `Bearer ${token}`,
        "x-forge-oauth-system": "system-token",
        "x-forge-oauth-user": "user-token",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      fit: { sub: "user-1" },
      forwardedTokens: {
        system: { kind: "system", token: "system-token" },
        user: { kind: "user", token: "user-token" },
      },
    });
    await app.close();
  });

  it("returns the core authentication failure before invoking a protected route", async () => {
    const app = fastify();
    let routeWasCalled = false;
    app.addHook("onRequest", forgeRemoteAuthHook());
    app.get("/protected", () => {
      routeWasCalled = true;
      return { ok: true };
    });

    const response = await app.inject({ method: "GET", url: "/protected" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      status: 401,
      detail: "Missing or malformed Authorization header",
    });
    expect(routeWasCalled).toBe(false);
    await app.close();
  });

  it("rejects an invalid or expired FIT", async () => {
    const { keyPair, token } = await createSignedToken();
    const expired = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      { audience: "app-1", expiresIn: "-1h" },
    );
    const app = fastify();
    app.addHook("onRequest", forgeRemoteAuthHook({ jwks: keyPair.jwks }));
    app.get("/protected", () => ({ ok: true }));

    const [invalidResponse, expiredResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: `Bearer ${tamperSignature(token)}` },
      }),
      app.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: `Bearer ${expired}` },
      }),
    ]);

    expect(invalidResponse.statusCode).toBe(401);
    expect(expiredResponse.statusCode).toBe(401);
    await app.close();
  });

  it("maps a JWKS infrastructure failure to the core failure response", async () => {
    const { token } = await createSignedToken();
    const app = fastify();
    app.addHook(
      "onRequest",
      forgeRemoteAuthHook({
        jwks: async () => {
          throw new Error("JWKS unavailable");
        },
      }),
    );
    app.get("/protected", () => ({ ok: true }));

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({ status: 502 });
    await app.close();
  });

  it("uses configured forwarded-token headers", async () => {
    const { keyPair, token } = await createSignedToken();
    const app = fastify();
    app.addHook(
      "onRequest",
      forgeRemoteAuthHook({
        jwks: keyPair.jwks,
        systemTokenHeader: "x-system",
        userTokenHeader: "x-user",
      }),
    );
    app.get("/protected", (request) => request.forgeRemoteContext);

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: {
        authorization: `Bearer ${token}`,
        "x-system": "system-token",
        "x-user": "user-token",
      },
    });

    expect(response.json()).toMatchObject({
      forwardedTokens: {
        system: { kind: "system", token: "system-token" },
        user: { kind: "user", token: "user-token" },
      },
    });
    await app.close();
  });

  it("uses the first value of array header values", async () => {
    const { keyPair, token } = await createSignedToken();
    const request = {
      headers: {
        authorization: [`Bearer ${token}`, "Bearer ignored"],
        "x-forge-oauth-system": ["system-token", "ignored"],
      },
    };
    const reply = { code: () => reply, send: async () => undefined };

    await forgeRemoteAuthHook({ jwks: keyPair.jwks }).call(
      {} as never,
      request as never,
      reply as never,
    );

    expect(request).toMatchObject({
      forgeRemoteContext: {
        forwardedTokens: { system: { kind: "system", token: "system-token" } },
      },
    });
  });
});
