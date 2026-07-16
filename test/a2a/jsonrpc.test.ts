import { describe, expect, it } from "vitest";
import {
  createA2aErrorEnvelope,
  createA2aResponseEnvelope,
  encodeA2aStreamEnvelope,
  isJsonRpcResponse,
} from "../../src/a2a";

describe("createA2aResponseEnvelope", () => {
  it("builds a success envelope carrying the request id and result", () => {
    const envelope = createA2aResponseEnvelope("request-1", {
      task: { id: "task-1" },
    });

    expect(envelope).toEqual({
      jsonrpc: "2.0",
      id: "request-1",
      result: { task: { id: "task-1" } },
    });
  });
});

describe("createA2aErrorEnvelope", () => {
  it("builds an error envelope carrying the request id, code, and message", () => {
    const envelope = createA2aErrorEnvelope(
      "request-1",
      -32602,
      "Invalid params",
    );

    expect(envelope).toEqual({
      jsonrpc: "2.0",
      id: "request-1",
      error: { code: -32602, message: "Invalid params", data: undefined },
    });
  });
});

describe("isJsonRpcResponse", () => {
  it("accepts a valid success envelope", () => {
    expect(
      isJsonRpcResponse(createA2aResponseEnvelope("request-1", { ok: true })),
    ).toBe(true);
  });

  it("accepts a valid error envelope", () => {
    expect(
      isJsonRpcResponse(
        createA2aErrorEnvelope("request-1", -32602, "Invalid params"),
      ),
    ).toBe(true);
  });

  it("rejects an envelope carrying both result and error", () => {
    expect(
      isJsonRpcResponse({
        jsonrpc: "2.0",
        id: "request-1",
        result: { ok: true },
        error: { code: -32602, message: "Invalid params" },
      }),
    ).toBe(false);
  });

  it("rejects an envelope carrying neither result nor error", () => {
    expect(isJsonRpcResponse({ jsonrpc: "2.0", id: "request-1" })).toBe(false);
  });

  it("rejects an envelope with the wrong jsonrpc version", () => {
    expect(
      isJsonRpcResponse({
        jsonrpc: "1.0",
        id: "request-1",
        result: { ok: true },
      }),
    ).toBe(false);
  });
});

describe("encodeA2aStreamEnvelope", () => {
  it("encodes a response envelope as an SSE-shaped data chunk string", () => {
    const envelope = createA2aResponseEnvelope("request-1", { ok: true });

    const chunk = encodeA2aStreamEnvelope(envelope);

    expect(chunk).toBe(`data: ${JSON.stringify(envelope)}\n\n`);
    expect(typeof chunk).toBe("string");
  });

  it("has no transport side effects: repeated calls return an equal string with no thrown side channel", () => {
    const envelope = createA2aErrorEnvelope(
      "request-1",
      -32602,
      "Invalid params",
    );

    const first = encodeA2aStreamEnvelope(envelope);
    const second = encodeA2aStreamEnvelope(envelope);

    expect(first).toBe(second);
  });
});
