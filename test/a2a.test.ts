import { describe, expect, it } from "vitest";
import {
  createA2aErrorEnvelope,
  createA2aResponseEnvelope,
  encodeA2aStreamEnvelope,
  getAllowedTransitions,
  isActiveState,
  isJsonRpcResponse,
  isTerminalState,
  isValidStreamResponse,
  isValidTransition,
  mapRemoteAgentSignal,
  type RemoteAgentSignal,
} from "../src/a2a";

describe("isActiveState", () => {
  it("returns true for submitted, working, auth-required, and unknown", () => {
    expect(isActiveState("submitted")).toBe(true);
    expect(isActiveState("working")).toBe(true);
    expect(isActiveState("auth-required")).toBe(true);
    expect(isActiveState("unknown")).toBe(true);
  });

  it("returns false for input-required and every terminal state", () => {
    expect(isActiveState("input-required")).toBe(false);
    expect(isActiveState("completed")).toBe(false);
    expect(isActiveState("rejected")).toBe(false);
    expect(isActiveState("canceled")).toBe(false);
    expect(isActiveState("failed")).toBe(false);
  });
});

describe("isTerminalState", () => {
  it("returns true for completed, rejected, canceled, and failed", () => {
    expect(isTerminalState("completed")).toBe(true);
    expect(isTerminalState("rejected")).toBe(true);
    expect(isTerminalState("canceled")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
  });

  it("returns false for every active state and input-required", () => {
    expect(isTerminalState("submitted")).toBe(false);
    expect(isTerminalState("working")).toBe(false);
    expect(isTerminalState("input-required")).toBe(false);
    expect(isTerminalState("auth-required")).toBe(false);
    expect(isTerminalState("unknown")).toBe(false);
  });
});

describe("isValidTransition", () => {
  it("allows submitted to transition to working", () => {
    expect(isValidTransition("submitted", "working")).toBe(true);
  });

  it("rejects submitted transitioning directly to input-required", () => {
    expect(isValidTransition("submitted", "input-required")).toBe(false);
  });

  it("rejects every transition out of a terminal state", () => {
    expect(isValidTransition("completed", "working")).toBe(false);
    expect(isValidTransition("rejected", "working")).toBe(false);
    expect(isValidTransition("canceled", "working")).toBe(false);
    expect(isValidTransition("failed", "working")).toBe(false);
  });
});

describe("getAllowedTransitions", () => {
  it("returns the allowed transitions for an active state", () => {
    expect(getAllowedTransitions("working")).toEqual([
      "input-required",
      "auth-required",
      "completed",
      "failed",
      "canceled",
    ]);
  });

  it("returns no allowed transitions for a terminal state", () => {
    expect(getAllowedTransitions("completed")).toEqual([]);
  });
});

describe("isValidStreamResponse", () => {
  it("accepts a stream response carrying only a task", () => {
    expect(
      isValidStreamResponse({
        task: {
          id: "task-1",
          contextId: "context-1",
          status: {
            state: "submitted",
            message: {
              role: "agent",
              parts: [],
              messageId: "message-1",
              kind: "message",
            },
            timestamp: "2026-07-16T00:00:00.000Z",
          },
          kind: "task",
        },
      }),
    ).toBe(true);
  });

  it("rejects a stream response carrying no variant", () => {
    expect(isValidStreamResponse({})).toBe(false);
  });

  it("accepts a stream response carrying only a status update", () => {
    expect(
      isValidStreamResponse({
        statusUpdate: {
          taskId: "task-1",
          contextId: "context-1",
          status: { state: "working" },
          kind: "status-update",
          final: false,
        },
      }),
    ).toBe(true);
  });

  it("accepts a stream response carrying only a message", () => {
    expect(
      isValidStreamResponse({
        message: {
          role: "agent",
          parts: [{ kind: "text", text: "hello" }],
          messageId: "message-1",
          kind: "message",
        },
      }),
    ).toBe(true);
  });

  it("accepts a stream response carrying a well-formed artifact update", () => {
    expect(
      isValidStreamResponse({
        artifactUpdate: {
          taskId: "task-1",
          contextId: "context-1",
          artifact: {
            artifactId: "artifact-1",
            parts: [{ kind: "text", text: "partial output" }],
          },
          append: true,
          lastChunk: false,
          kind: "artifact-update",
        },
      }),
    ).toBe(true);
  });

  it("rejects a stream response carrying more than one variant", () => {
    expect(
      isValidStreamResponse({
        task: {
          id: "task-1",
          contextId: "context-1",
          status: {
            state: "submitted",
            message: {
              role: "agent",
              parts: [],
              messageId: "message-1",
              kind: "message",
            },
            timestamp: "2026-07-16T00:00:00.000Z",
          },
          kind: "task",
        },
        statusUpdate: {
          taskId: "task-1",
          contextId: "context-1",
          status: { state: "working" },
          kind: "status-update",
          final: false,
        },
      }),
    ).toBe(false);
  });

  it("rejects an artifact update whose artifact is missing parts", () => {
    expect(
      isValidStreamResponse({
        artifactUpdate: {
          taskId: "task-1",
          contextId: "context-1",
          artifact: { artifactId: "artifact-1" },
          kind: "artifact-update",
        },
      }),
    ).toBe(false);
  });

  it("rejects an artifact update whose append flag is not a boolean", () => {
    expect(
      isValidStreamResponse({
        artifactUpdate: {
          taskId: "task-1",
          contextId: "context-1",
          artifact: { artifactId: "artifact-1", parts: [] },
          append: "yes",
          kind: "artifact-update",
        },
      }),
    ).toBe(false);
  });

  it("accepts an artifact update carrying provider-specific metadata unchecked", () => {
    expect(
      isValidStreamResponse({
        artifactUpdate: {
          taskId: "task-1",
          contextId: "context-1",
          artifact: {
            artifactId: "artifact-1",
            parts: [],
            metadata: { anyProviderShapeAtAll: { nested: true } },
          },
          kind: "artifact-update",
        },
      }),
    ).toBe(true);
  });
});

describe("mapRemoteAgentSignal", () => {
  it("maps runtime-started to a non-final working task-state-update", () => {
    const event = mapRemoteAgentSignal({ category: "runtime-started" });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "working",
      final: false,
    });
  });

  it("maps completed to a final completed task-state-update carrying the summary", () => {
    const event = mapRemoteAgentSignal({
      category: "completed",
      summary: "Implementation finished.",
    });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "completed",
      final: true,
      message: "Implementation finished.",
    });
  });

  it("maps failed to a final failed task-state-update carrying the reason", () => {
    const event = mapRemoteAgentSignal({
      category: "failed",
      reason: "Could not apply the patch.",
    });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "failed",
      final: true,
      message: "Could not apply the patch.",
    });
  });

  it("maps rejected to a final rejected task-state-update carrying the reason", () => {
    const event = mapRemoteAgentSignal({
      category: "rejected",
      reason: "Unsupported work item type.",
    });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "rejected",
      final: true,
      message: "Unsupported work item type.",
    });
  });

  it("maps canceled to a final canceled task-state-update carrying the reason", () => {
    const event = mapRemoteAgentSignal({
      category: "canceled",
      reason: "Canceled by user.",
    });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "canceled",
      final: true,
      message: "Canceled by user.",
    });
  });

  it("maps approval-needed to a non-final auth-required task-state-update carrying the detail", () => {
    const event = mapRemoteAgentSignal({
      category: "approval-needed",
      detail: "Approval required: push to main branch.",
    });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "auth-required",
      final: false,
      message: "Approval required: push to main branch.",
    });
  });

  it("maps input-needed to a non-final input-required task-state-update carrying the detail", () => {
    const event = mapRemoteAgentSignal({
      category: "input-needed",
      detail: "Input required: which branch should this target?",
    });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "input-required",
      final: false,
      message: "Input required: which branch should this target?",
    });
  });

  it("maps resumed to a non-final working task-state-update", () => {
    const event = mapRemoteAgentSignal({ category: "resumed" });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "working",
      final: false,
    });
  });

  it("maps thinking-process to a content-update, not a task-state-update", () => {
    const event = mapRemoteAgentSignal({
      category: "thinking-process",
      summary: "Inspecting the repository.",
    });

    expect(event).toEqual({
      kind: "content-update",
      message: "Inspecting the repository.",
    });
  });

  it("maps internal-thinking to a content-update", () => {
    const event = mapRemoteAgentSignal({
      category: "internal-thinking",
      text: "Considering whether to patch the parser or the caller.",
    });

    expect(event).toEqual({
      kind: "content-update",
      message: "Considering whether to patch the parser or the caller.",
    });
  });

  it("maps model-request-progress to a content-update", () => {
    const event = mapRemoteAgentSignal({
      category: "model-request-progress",
      detail: "Model call started to plan the edit.",
    });

    expect(event).toEqual({
      kind: "content-update",
      message: "Model call started to plan the edit.",
    });
  });

  it("maps tool-use to a content-update describing the invocation", () => {
    const event = mapRemoteAgentSignal({
      category: "tool-use",
      detail: "Searching the repository for related modules.",
    });

    expect(event).toEqual({
      kind: "content-update",
      message: "Searching the repository for related modules.",
    });
  });

  it("maps tool-result to a content-update", () => {
    const event = mapRemoteAgentSignal({
      category: "tool-result",
      detail: "Found the relevant module.",
    });

    expect(event).toEqual({
      kind: "content-update",
      message: "Found the relevant module.",
    });
  });

  it("maps artifact-produced to an artifact-update carrying the artifact", () => {
    const artifact = {
      artifactId: "artifact-1",
      parts: [{ kind: "text" as const, text: "Summary of changes" }],
    };

    const event = mapRemoteAgentSignal({
      category: "artifact-produced",
      artifact,
    });

    expect(event).toEqual({ kind: "artifact-update", artifact });
  });

  it("preserves append and lastChunk intent when present on artifact-produced", () => {
    const artifact = {
      artifactId: "artifact-1",
      parts: [{ kind: "text" as const, text: "partial output" }],
    };

    const event = mapRemoteAgentSignal({
      category: "artifact-produced",
      artifact,
      append: true,
      lastChunk: false,
    });

    expect(event).toEqual({
      kind: "artifact-update",
      artifact,
      append: true,
      lastChunk: false,
    });
  });

  const ALL_NORMAL_SIGNALS: RemoteAgentSignal[] = [
    { category: "runtime-started" },
    { category: "completed", summary: "Done." },
    { category: "failed", reason: "Unrecoverable error." },
    { category: "rejected", reason: "Unsupported work." },
    { category: "canceled", reason: "Canceled by user." },
    { category: "approval-needed", detail: "Approval required: push." },
    { category: "input-needed", detail: "Input required: branch?" },
    { category: "resumed" },
    { category: "thinking-process", summary: "Looking around." },
    { category: "internal-thinking", text: "Weighing approaches." },
    { category: "model-request-progress", detail: "Model call started." },
    { category: "tool-use", detail: "Reading a file." },
    { category: "tool-result", detail: "File read." },
    {
      category: "artifact-produced",
      artifact: { artifactId: "artifact-1", parts: [] },
    },
  ];

  it("never maps a normal, defined signal category to the unknown state", () => {
    for (const signal of ALL_NORMAL_SIGNALS) {
      const event = mapRemoteAgentSignal(signal);
      if (event.kind === "task-state-update") {
        expect(event.state).not.toBe("unknown");
      }
    }
  });

  it("falls back to a non-final unknown task-state-update for an unrecognized signal category", () => {
    const malformedSignal = {
      category: "some-provider-specific-event-name",
    } as unknown as RemoteAgentSignal;

    const event = mapRemoteAgentSignal(malformedSignal);

    expect(event).toEqual({
      kind: "task-state-update",
      state: "unknown",
      final: false,
    });
  });
});

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
