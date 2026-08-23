import { describe, expect, it } from "vitest";
import {
  createRemoteA2aCompletedRecord,
  createRemoteA2aSignalMappedRecord,
  createRemoteA2aStreamEncodedRecord,
} from "../src/logging";

describe("A2A lifecycle logging", () => {
  it("creates a correlated whitelist-only signal mapping record", () => {
    const message = "message-sentinel";
    const artifact = "artifact-sentinel";

    const record = createRemoteA2aSignalMappedRecord({
      signalCategory: "artifact-produced",
      mappedKind: "artifact-update",
      taskId: "task-1",
      contextId: "context-1",
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
      message,
      artifact,
    } as never);

    expect(record).toEqual({
      event: "remote.a2a.signal.mapped",
      level: "debug",
      message: "Remote Agent signal mapped to A2A event",
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
      a2a: {
        signalCategory: "artifact-produced",
        mappedKind: "artifact-update",
        taskId: "task-1",
        contextId: "context-1",
      },
    });
    expect(JSON.stringify(record)).not.toContain(message);
    expect(JSON.stringify(record)).not.toContain(artifact);
  });

  it("creates a whitelist-only stream encoding record", () => {
    const responseBody = "response-body-sentinel";

    const record = createRemoteA2aStreamEncodedRecord({
      streamResponseKind: "task-status-update",
      taskId: "task-1",
      contextId: "context-1",
      requestId: "request-1",
      responseBody,
    } as never);

    expect(record).toEqual({
      event: "remote.a2a.stream.encoded",
      level: "debug",
      message: "A2A stream envelope encoded",
      requestId: "request-1",
      a2a: {
        streamResponseKind: "task-status-update",
        taskId: "task-1",
        contextId: "context-1",
      },
    });
    expect(JSON.stringify(record)).not.toContain(responseBody);
  });

  it("creates a correlated terminal outcome record without task content", () => {
    const message = "message-sentinel";
    const artifact = "artifact-sentinel";

    const record = createRemoteA2aCompletedRecord({
      state: "completed",
      taskId: "task-1",
      contextId: "context-1",
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
      message,
      artifact,
    } as never);

    expect(record).toEqual({
      event: "remote.a2a.completed",
      level: "info",
      message: "A2A task reached terminal state",
      requestId: "request-1",
      traceId: "trace-1",
      spanId: "span-1",
      a2a: {
        state: "completed",
        final: true,
        taskId: "task-1",
        contextId: "context-1",
      },
    });
    expect(JSON.stringify(record)).not.toContain(message);
    expect(JSON.stringify(record)).not.toContain(artifact);
  });
});
