import { describe, expect, it } from "vitest";
import { validateForgeRemoteRequest } from "../src/index";
import { isRovoAgentConnectorRequest } from "../src/rovo";
import { generateTestKeyPair, signTestJwt } from "./jwt-test-helpers";

describe("RS256-authenticated message/send contract", () => {
  it("accepts a valid FIT and an A2A 1.0 message/send request", async () => {
    const keyPair = await generateTestKeyPair("forge-rs256-key");
    const token = await signTestJwt(
      keyPair,
      { sub: "user-1" },
      {
        audience: "ari:cloud:ecosystem::app/app-1",
        issuer: "forge/invocation-token",
      },
    );

    const authentication = await validateForgeRemoteRequest({
      headers: { authorization: `Bearer ${token}` },
      audience: "ari:cloud:ecosystem::app/app-1",
      jwks: keyPair.jwks,
    });

    expect(authentication.isOk()).toBe(true);
    expect(
      isRovoAgentConnectorRequest({
        jsonrpc: "2.0",
        id: "request-1",
        method: "message/send",
        params: { message: { messageId: "message-1", parts: [] } },
      }),
    ).toBe(true);
  });
});
