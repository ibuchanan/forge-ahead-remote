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
