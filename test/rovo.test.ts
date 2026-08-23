import { Role, TaskState, type Task, type Message } from "@a2a-js/sdk";
import { describe, expect, it } from "vitest";
import {
  formatRovoAgentConnectorResponse,
  formatRovoAgentConnectorTaskResponse,
  isRovoAgentConnectorRequest,
} from "../src/rovo";

function makeTextPart(text: string) {
  return {
    content: { $case: "text" as const, value: text },
    metadata: {},
    filename: "",
    mediaType: "text/plain",
  };
}

function makeMessage(messageId: string, parts: Message["parts"] = []): Message {
  return {
    messageId,
    contextId: "",
    taskId: "",
    role: Role.ROLE_AGENT,
    parts,
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  };
}

function makeTask(
  state: TaskState = TaskState.TASK_STATE_SUBMITTED,
  messageId = "msg-1",
  parts: Message["parts"] = [makeTextPart("Working on it")],
): Task {
  return {
    id: "task-123",
    contextId: "ctx-456",
    status: {
      state,
      message: makeMessage(messageId, parts),
      timestamp: "2026-01-01T00:00:00.000Z",
    },
    artifacts: [],
    history: [],
    metadata: {},
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
    const task = makeTask(TaskState.TASK_STATE_WORKING);

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status?.state).toBe(TaskState.TASK_STATE_WORKING);
    expect(formatted.status?.timestamp).toBe("2026-01-01T00:00:00.000Z");
  });

  it("sets the formatted message role to agent", () => {
    const task = makeTask();
    if (task.status?.message) {
      task.status.message.role = Role.ROLE_USER;
    }

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status?.message?.role).toBe(Role.ROLE_AGENT);
  });

  it("uses the message's messageId when present", () => {
    const task = makeTask(TaskState.TASK_STATE_SUBMITTED, "my-message-id");

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status?.message?.messageId).toBe("my-message-id");
  });

  it("falls back to the task id when messageId is empty", () => {
    const task = makeTask(TaskState.TASK_STATE_SUBMITTED, "");

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status?.message?.messageId).toBe("task-123");
  });

  it("propagates message parts unchanged", () => {
    const task = makeTask();

    const formatted = formatRovoAgentConnectorTaskResponse(task, "ctx-1");

    expect(formatted.status?.message?.parts).toEqual([
      makeTextPart("Working on it"),
    ]);
  });

  it("embeds taskId and contextId in the formatted message", () => {
    const task = makeTask();

    const formatted = formatRovoAgentConnectorTaskResponse(
      task,
      "ctx-override",
    );

    expect(formatted.status?.message?.taskId).toBe("task-123");
    expect(formatted.status?.message?.contextId).toBe("ctx-override");
  });
});

describe("formatRovoAgentConnectorResponse", () => {
  it("wraps a completed SendMessage task with its matching agent message", () => {
    const task = makeTask(TaskState.TASK_STATE_COMPLETED, "agent-message-123", [
      makeTextPart("Minimal connector is working."),
    ]);

    const response = formatRovoAgentConnectorResponse(
      "request-1",
      task,
      "ctx-override",
    );

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: "request-1",
      result: {
        task: {
          id: "task-123",
          contextId: "ctx-override",
          status: {
            state: TaskState.TASK_STATE_COMPLETED,
            message: {
              role: Role.ROLE_AGENT,
              messageId: "agent-message-123",
              taskId: "task-123",
              contextId: "ctx-override",
              parts: [makeTextPart("Minimal connector is working.")],
            },
          },
        },
      },
    });
  });
});
