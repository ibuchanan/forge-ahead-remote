import { describe, expect, it } from "vitest";
import { mapRemoteAgentSignal, type RemoteAgentSignal } from "../../src/a2a";

describe("mapRemoteAgentSignal", () => {
  it("maps runtime-started to a non-final working task-state-update", () => {
    const event = mapRemoteAgentSignal({ category: "runtime-started" });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "working",
      final: false,
    });
  });

  it("maps runtime-started summary to the working task-state-update message", () => {
    const event = mapRemoteAgentSignal({
      category: "runtime-started",
      summary: "Starting work on this task.",
    });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "working",
      final: false,
      message: "Starting work on this task.",
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

  it("maps resumed summary to the working task-state-update message", () => {
    const event = mapRemoteAgentSignal({
      category: "resumed",
      summary: "Resuming work after approval.",
    });

    expect(event).toEqual({
      kind: "task-state-update",
      state: "working",
      final: false,
      message: "Resuming work after approval.",
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
