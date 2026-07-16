import { z } from "zod";

export type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "auth-required"
  | "completed"
  | "rejected"
  | "canceled"
  | "failed"
  | "unknown";

export interface MessagePart {
  kind: "text" | "data";
  text?: string;
  data?: unknown;
}

export interface Message {
  role: "user" | "agent";
  parts: MessagePart[];
  messageId: string;
  taskId?: string;
  contextId?: string;
  kind: "message";
}

export interface Task {
  id: string;
  contextId: string;
  status: {
    state: TaskState;
    message: Message;
    timestamp: string;
  };
  kind: "task";
}

export interface TaskStatusUpdateEvent {
  taskId: string;
  contextId: string;
  status: {
    state: TaskState;
    timestamp?: string;
  };
  message?: Message;
  kind: "status-update";
  final: boolean;
}

export interface Artifact {
  artifactId: string;
  name?: string;
  description?: string;
  parts: MessagePart[];
  metadata?: Record<string, unknown>;
}

export interface TaskArtifactUpdateEvent {
  taskId: string;
  contextId: string;
  artifact: Artifact;
  append?: boolean;
  lastChunk?: boolean;
  kind: "artifact-update";
}

export interface StreamResponse {
  task?: Task;
  statusUpdate?: TaskStatusUpdateEvent;
  message?: Message;
  artifactUpdate?: TaskArtifactUpdateEvent;
}

export const ACTIVE_TASK_STATES: readonly TaskState[] = [
  "submitted",
  "working",
  "auth-required",
  "unknown",
] as const;

export const TERMINAL_TASK_STATES: readonly TaskState[] = [
  "completed",
  "rejected",
  "canceled",
  "failed",
] as const;

export function isActiveState(state: TaskState): boolean {
  return ACTIVE_TASK_STATES.includes(state);
}

export function isTerminalState(state: TaskState): boolean {
  return TERMINAL_TASK_STATES.includes(state);
}

export const TASK_STATE_TRANSITIONS: Readonly<
  Record<TaskState, readonly TaskState[]>
> = {
  submitted: ["working", "rejected", "completed", "failed"],
  working: [
    "input-required",
    "auth-required",
    "completed",
    "failed",
    "canceled",
  ],
  "input-required": ["working", "completed", "failed", "canceled"],
  "auth-required": ["working", "completed", "failed", "canceled"],
  completed: [],
  rejected: [],
  canceled: [],
  failed: [],
  unknown: ["working", "completed", "failed"],
} as const;

export function isValidTransition(
  fromState: TaskState,
  toState: TaskState,
): boolean {
  return TASK_STATE_TRANSITIONS[fromState].includes(toState);
}

export function getAllowedTransitions(state: TaskState): readonly TaskState[] {
  return TASK_STATE_TRANSITIONS[state];
}

const ArtifactUpdateEventShape = z
  .object({
    artifact: z.object({ parts: z.array(z.unknown()) }).loose(),
    append: z.boolean().optional(),
    lastChunk: z.boolean().optional(),
  })
  .loose();

const StreamResponseSchema = z.union([
  z.object({ task: z.unknown() }).strict(),
  z.object({ statusUpdate: z.unknown() }).strict(),
  z.object({ message: z.unknown() }).strict(),
  z.object({ artifactUpdate: ArtifactUpdateEventShape }).strict(),
]);

export function isValidStreamResponse(
  response: unknown,
): response is StreamResponse {
  return StreamResponseSchema.safeParse(response).success;
}

export type RemoteAgentSignal =
  | { category: "runtime-started" }
  | { category: "completed"; summary?: string }
  | { category: "failed"; reason: string }
  | { category: "rejected"; reason: string }
  | { category: "canceled"; reason?: string }
  | { category: "approval-needed"; detail: string }
  | { category: "input-needed"; detail: string }
  | { category: "resumed" }
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
      return { kind: "task-state-update", state: "working", final: false };
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
      return { kind: "task-state-update", state: "working", final: false };
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

/**
 * JSON-RPC 2.0 envelope types scoped to A2A remote-agent flows, not a
 * general-purpose JSON-RPC utility surface.
 */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export function createA2aResponseEnvelope(
  id: string | number,
  result: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function createA2aErrorEnvelope(
  id: string | number,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

const JsonRpcResponseSchema = z.union([
  z
    .object({
      jsonrpc: z.literal("2.0"),
      id: z.union([z.string(), z.number()]),
      result: z.unknown(),
    })
    .strict(),
  z
    .object({
      jsonrpc: z.literal("2.0"),
      id: z.union([z.string(), z.number()]),
      error: z.object({
        code: z.number(),
        message: z.string(),
        data: z.unknown().optional(),
      }),
    })
    .strict(),
]);

export function isJsonRpcResponse(
  response: unknown,
): response is JsonRpcResponse {
  return JsonRpcResponseSchema.safeParse(response).success;
}

/**
 * Pure A2A Stream Envelope encoder: produces the SSE `data:` chunk value a
 * transport layer can write. It does not set headers, flush, write to a
 * response, close a connection, or otherwise own transport behavior.
 */
export function encodeA2aStreamEnvelope(response: JsonRpcResponse): string {
  return `data: ${JSON.stringify(response)}\n\n`;
}
