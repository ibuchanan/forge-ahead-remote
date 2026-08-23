import { describe, expect, it, vi } from "vitest";
import {
  emitRemoteLogRecord,
  type RemoteLogRecord,
  type RemoteLogRecordLogger,
} from "../src/logging";

describe("emitRemoteLogRecord", () => {
  it("forwards a supplied structured record to its matching application logger level", () => {
    const record = {
      event: "remote.a2a.completed",
      level: "info",
      message: "A2A task reached terminal state",
      requestId: "request-1",
      a2a: { state: "completed", final: true, taskId: "task-1" },
    } satisfies RemoteLogRecord;
    const logger: RemoteLogRecordLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    emitRemoteLogRecord(logger, record);

    expect(logger.info).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith(record);
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("accepts only an extension record, not raw context or request objects", () => {
    const logger: RemoteLogRecordLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const assertAdapterInputType = () => {
      emitRemoteLogRecord(logger, {
        // @ts-expect-error The adapter has no raw-context input.
        context: { authorization: "token-sentinel" },
      });
      // @ts-expect-error The adapter has no raw-request input.
      emitRemoteLogRecord(logger, { request: { body: "body-sentinel" } });
    };

    expect(assertAdapterInputType).toBeTypeOf("function");
  });
});
