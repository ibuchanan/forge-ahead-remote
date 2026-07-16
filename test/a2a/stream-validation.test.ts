import { describe, expect, it } from "vitest";
import { isValidStreamResponse } from "../../src/a2a";

function makeTaskVariant() {
  return {
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
  };
}

describe("isValidStreamResponse", () => {
  it("accepts a stream response carrying only a task", () => {
    expect(isValidStreamResponse(makeTaskVariant())).toBe(true);
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
        ...makeTaskVariant(),
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
