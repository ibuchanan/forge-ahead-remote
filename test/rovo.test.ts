import { describe, expect, it } from "vitest";
import { isRovoAgentConnectorRequest } from "../src/rovo";

describe("isRovoAgentConnectorRequest", () => {
  it("accepts a valid message/send request", () => {
    expect(
      isRovoAgentConnectorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "message/send",
        params: {
          message: {
            role: "user",
            parts: [{ kind: "text", text: "hello" }],
            messageId: "message-1",
            kind: "message",
          },
        },
      }),
    ).toBe(true);
  });

  it("accepts a valid tasks/get request using the standard A2A id parameter", () => {
    expect(
      isRovoAgentConnectorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/get",
        params: { id: "task-xyz", historyLength: 0 },
      }),
    ).toBe(true);
  });

  it("rejects a tasks/get request using taskId instead of the standard id parameter", () => {
    expect(
      isRovoAgentConnectorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/get",
        params: { taskId: "task-xyz" },
      }),
    ).toBe(false);
  });

  it("accepts a valid tasks/cancel request using the standard A2A id parameter", () => {
    expect(
      isRovoAgentConnectorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/cancel",
        params: { id: "task-xyz" },
      }),
    ).toBe(true);
  });

  it("rejects a tasks/cancel request using taskId instead of the standard id parameter", () => {
    expect(
      isRovoAgentConnectorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/cancel",
        params: { taskId: "task-xyz" },
      }),
    ).toBe(false);
  });

  it("accepts a valid tasks/resubscribe request using the standard A2A id parameter", () => {
    expect(
      isRovoAgentConnectorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/resubscribe",
        params: { id: "task-xyz" },
      }),
    ).toBe(true);
  });

  it("rejects a tasks/resubscribe request using taskId instead of the standard id parameter", () => {
    expect(
      isRovoAgentConnectorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/resubscribe",
        params: { taskId: "task-xyz" },
      }),
    ).toBe(false);
  });

  it("rejects a request with an unrecognized method", () => {
    expect(
      isRovoAgentConnectorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/list",
        params: {},
      }),
    ).toBe(false);
  });
});
