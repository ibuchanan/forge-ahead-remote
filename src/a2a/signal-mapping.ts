import type { Artifact, TaskState } from "./task-state";

export type RemoteAgentSignal =
  | { category: "runtime-started"; summary?: string }
  | { category: "completed"; summary?: string }
  | { category: "failed"; reason: string }
  | { category: "rejected"; reason: string }
  | { category: "canceled"; reason?: string }
  | { category: "approval-needed"; detail: string }
  | { category: "input-needed"; detail: string }
  | { category: "resumed"; summary?: string }
  | { category: "thinking-process"; summary: string }
  | { category: "internal-thinking"; text: string }
  | { category: "model-request-progress"; detail: string }
  | { category: "tool-use"; detail: string }
  | { category: "tool-result"; detail: string }
  | {
      category: "artifact-produced";
      artifact: Artifact;
      append?: boolean;
      lastChunk?: boolean;
    };

export type MappedEvent =
  | {
      kind: "task-state-update";
      state: TaskState;
      final: boolean;
      message?: string;
    }
  | { kind: "content-update"; message: string }
  | {
      kind: "artifact-update";
      artifact: Artifact;
      append?: boolean;
      lastChunk?: boolean;
    };

export function mapRemoteAgentSignal(signal: RemoteAgentSignal): MappedEvent {
  switch (signal.category) {
    case "runtime-started":
      return signal.summary === undefined
        ? { kind: "task-state-update", state: "working", final: false }
        : {
            kind: "task-state-update",
            state: "working",
            final: false,
            message: signal.summary,
          };
    case "completed":
      return {
        kind: "task-state-update",
        state: "completed",
        final: true,
        message: signal.summary,
      };
    case "failed":
      return {
        kind: "task-state-update",
        state: "failed",
        final: true,
        message: signal.reason,
      };
    case "rejected":
      return {
        kind: "task-state-update",
        state: "rejected",
        final: true,
        message: signal.reason,
      };
    case "canceled":
      return {
        kind: "task-state-update",
        state: "canceled",
        final: true,
        message: signal.reason,
      };
    case "approval-needed":
      return {
        kind: "task-state-update",
        state: "auth-required",
        final: false,
        message: signal.detail,
      };
    case "input-needed":
      return {
        kind: "task-state-update",
        state: "input-required",
        final: false,
        message: signal.detail,
      };
    case "resumed":
      return signal.summary === undefined
        ? { kind: "task-state-update", state: "working", final: false }
        : {
            kind: "task-state-update",
            state: "working",
            final: false,
            message: signal.summary,
          };
    case "thinking-process":
      return { kind: "content-update", message: signal.summary };
    case "internal-thinking":
      return { kind: "content-update", message: signal.text };
    case "model-request-progress":
      return { kind: "content-update", message: signal.detail };
    case "tool-use":
      return { kind: "content-update", message: signal.detail };
    case "tool-result":
      return { kind: "content-update", message: signal.detail };
    case "artifact-produced":
      return {
        kind: "artifact-update",
        artifact: signal.artifact,
        append: signal.append,
        lastChunk: signal.lastChunk,
      };
    default:
      // Exceptional fallback for a signal category this mapper does not
      // recognize. Normal, defined categories never reach this branch.
      return { kind: "task-state-update", state: "unknown", final: false };
  }
}
