import { type Artifact, TaskState } from "@a2a-js/sdk";

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

function workingTaskStateUpdate(message?: string): MappedEvent {
  return message === undefined
    ? {
        kind: "task-state-update",
        state: TaskState.TASK_STATE_WORKING,
        final: false,
      }
    : {
        kind: "task-state-update",
        state: TaskState.TASK_STATE_WORKING,
        final: false,
        message,
      };
}

export function mapRemoteAgentSignal(signal: RemoteAgentSignal): MappedEvent {
  switch (signal.category) {
    case "runtime-started":
      return workingTaskStateUpdate(signal.summary);
    case "completed":
      return {
        kind: "task-state-update",
        state: TaskState.TASK_STATE_COMPLETED,
        final: true,
        message: signal.summary,
      };
    case "failed":
      return {
        kind: "task-state-update",
        state: TaskState.TASK_STATE_FAILED,
        final: true,
        message: signal.reason,
      };
    case "rejected":
      return {
        kind: "task-state-update",
        state: TaskState.TASK_STATE_REJECTED,
        final: true,
        message: signal.reason,
      };
    case "canceled":
      return {
        kind: "task-state-update",
        state: TaskState.TASK_STATE_CANCELED,
        final: true,
        message: signal.reason,
      };
    case "approval-needed":
      return {
        kind: "task-state-update",
        state: TaskState.TASK_STATE_AUTH_REQUIRED,
        final: false,
        message: signal.detail,
      };
    case "input-needed":
      return {
        kind: "task-state-update",
        state: TaskState.TASK_STATE_INPUT_REQUIRED,
        final: false,
        message: signal.detail,
      };
    case "resumed":
      return workingTaskStateUpdate(signal.summary);
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
      return {
        kind: "task-state-update",
        state: TaskState.TASK_STATE_UNSPECIFIED,
        final: false,
      };
  }
}
