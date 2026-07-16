import { describe, expect, it } from "vitest";
import {
  getAllowedTransitions,
  isActiveState,
  isTerminalState,
  isValidStreamResponse,
  isValidTransition,
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
