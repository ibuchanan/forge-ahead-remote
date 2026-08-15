import { describe, expect, it } from "vitest";
import { isValidStreamResponse } from "../../src/a2a";

function makeTaskPayload() {
  return {
    payload: {
      $case: "task",
      value: {
        id: "task-1",
        contextId: "context-1",
        status: {
          state: 2,
          message: {
            role: 2,
            parts: [],
            messageId: "message-1",
          },
          timestamp: "2026-07-16T00:00:00.000Z",
        },
        artifacts: [],
        history: [],
        metadata: {},
      },
    },
  };
}

describe("isValidStreamResponse", () => {
  it("accepts a stream response carrying only a task payload", () => {
    expect(isValidStreamResponse(makeTaskPayload())).toBe(true);
  });

  it("rejects a stream response carrying no payload", () => {
    expect(isValidStreamResponse({})).toBe(false);
  });

  it("accepts a stream response carrying only a status update payload", () => {
    expect(
      isValidStreamResponse({
        payload: {
          $case: "statusUpdate",
          value: {
            taskId: "task-1",
            contextId: "context-1",
            status: { state: 2 },
            final: false,
          },
        },
      }),
    ).toBe(true);
  });

  it("accepts a stream response carrying only a message payload", () => {
    expect(
      isValidStreamResponse({
        payload: {
          $case: "message",
          value: {
            role: 2,
            parts: [],
            messageId: "message-1",
          },
        },
      }),
    ).toBe(true);
  });

  it("accepts a stream response carrying only an artifact update payload", () => {
    expect(
      isValidStreamResponse({
        payload: {
          $case: "artifactUpdate",
          value: {
            taskId: "task-1",
            contextId: "context-1",
            artifact: {
              artifactId: "artifact-1",
              parts: [],
            },
          },
        },
      }),
    ).toBe(true);
  });

  it("rejects a stream response with an unrecognized payload case", () => {
    expect(
      isValidStreamResponse({
        payload: { $case: "unknown", value: {} },
      }),
    ).toBe(false);
  });

  it("rejects a stream response without a payload case discriminator", () => {
    expect(
      isValidStreamResponse({
        payload: { value: {} },
      }),
    ).toBe(false);
  });
});
