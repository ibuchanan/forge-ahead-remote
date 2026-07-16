import { describe, expect, it } from "vitest";
import type { Task } from "../src/a2a";
import {
  formatRovoAgentConnectorResponse,
  formatRovoAgentConnectorTaskResponse,
  isRovoAgentConnectorRequest,
} from "../src/rovo";

function makeTask(
  state: Task["status"]["state"] = "submitted",
  messageId = "msg-1",
): Task {
  return {
    id: "task-123",
    contextId: "ctx-456",
    status: {
      state,
      message: {
        role: "agent",
        parts: [{ kind: "text", text: "Working on it" }],
        messageId,
        kind: "message",
      },
      timestamp: "2026-01-01T00:00:00.000Z",
    },
    kind: "task",
  };
}

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

describe("formatRovoAgentConnectorTaskResponse", () => {
  it("preserves the task id and uses the provided contextId, not the task's own", () => {
    const task = makeTask();

    const formatted = formatRovoAgentConnectorTaskResponse(
      task,
      "ctx-override",
    );

    expect(formatted.id).toBe("task-123");
    expect(formatted.contextId).toBe("ctx-override");
  });

  it("preserves the task status state and timestamp", () => {
    const task = makeTask("working");

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status.state).toBe("working");
    expect(formatted.status.timestamp).toBe("2026-01-01T00:00:00.000Z");
  });

  it("sets the formatted message role to agent regardless of the stored role", () => {
    const task = makeTask();
    task.status.message.role = "user";

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status.message.role).toBe("agent");
  });

  it("uses the message's messageId when present", () => {
    const task = makeTask("submitted", "my-message-id");

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status.message.messageId).toBe("my-message-id");
  });

  it("falls back to the task id when messageId is empty", () => {
    const task = makeTask("submitted", "");

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status.message.messageId).toBe("task-123");
  });

  it("propagates message parts unchanged", () => {
    const task = makeTask();

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status.message.parts).toEqual([
      { kind: "text", text: "Working on it" },
    ]);
  });

  it("embeds taskId and contextId in the formatted message", () => {
    const task = makeTask();

    const formatted = formatRovoAgentConnectorTaskResponse(
      task,
      "ctx-override",
    );

    expect(formatted.status.message.taskId).toBe("task-123");
    expect(formatted.status.message.contextId).toBe("ctx-override");
  });

  it("sets required A2A kind fields on the task and message", () => {
    const task = makeTask();

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.kind).toBe("task");
    expect(formatted.status.message.kind).toBe("message");
  });
});

describe("formatRovoAgentConnectorResponse", () => {
  it("composes a formatted task into a connector-ready JSON-RPC response envelope", () => {
    const task = makeTask();

    const response = formatRovoAgentConnectorResponse(
      "request-1",
      task,
      "ctx-override",
    );

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: "request-1",
      result: formatRovoAgentConnectorTaskResponse(task, "ctx-override"),
    });
  });
});
