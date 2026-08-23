import { TaskState } from "@a2a-js/sdk";

export type { Part as MessagePart } from "@a2a-js/sdk";
export { TaskState };

/**
 * Maps the legacy string representation of a task state to the
 * {@link TaskState} protobuf enum used by `@a2a-js/sdk`.
 *
 * Unrecognized strings map to {@link TaskState.TASK_STATE_UNSPECIFIED}.
 */
export function taskStateFromString(state: string | undefined): TaskState {
  switch (state) {
    case "submitted":
      return TaskState.TASK_STATE_SUBMITTED;
    case "working":
      return TaskState.TASK_STATE_WORKING;
    case "input-required":
      return TaskState.TASK_STATE_INPUT_REQUIRED;
    case "auth-required":
      return TaskState.TASK_STATE_AUTH_REQUIRED;
    case "completed":
      return TaskState.TASK_STATE_COMPLETED;
    case "rejected":
      return TaskState.TASK_STATE_REJECTED;
    case "canceled":
      return TaskState.TASK_STATE_CANCELED;
    case "failed":
      return TaskState.TASK_STATE_FAILED;
    default:
      return TaskState.TASK_STATE_UNSPECIFIED;
  }
}

/**
 * Maps the {@link TaskState} protobuf enum to the legacy string
 * representation.
 *
 * {@link TaskState.UNRECOGNIZED} maps to `"unknown"`.
 */
export function taskStateToString(state: TaskState): string {
  switch (state) {
    case TaskState.TASK_STATE_SUBMITTED:
      return "submitted";
    case TaskState.TASK_STATE_WORKING:
      return "working";
    case TaskState.TASK_STATE_INPUT_REQUIRED:
      return "input-required";
    case TaskState.TASK_STATE_AUTH_REQUIRED:
      return "auth-required";
    case TaskState.TASK_STATE_COMPLETED:
      return "completed";
    case TaskState.TASK_STATE_REJECTED:
      return "rejected";
    case TaskState.TASK_STATE_CANCELED:
      return "canceled";
    case TaskState.TASK_STATE_FAILED:
      return "failed";
    default:
      return "unknown";
  }
}

export const ACTIVE_TASK_STATES: readonly TaskState[] = [
  TaskState.TASK_STATE_SUBMITTED,
  TaskState.TASK_STATE_WORKING,
  TaskState.TASK_STATE_AUTH_REQUIRED,
  TaskState.TASK_STATE_UNSPECIFIED,
];

export const TERMINAL_TASK_STATES: readonly TaskState[] = [
  TaskState.TASK_STATE_COMPLETED,
  TaskState.TASK_STATE_REJECTED,
  TaskState.TASK_STATE_CANCELED,
  TaskState.TASK_STATE_FAILED,
];

export function isActiveState(state: TaskState): boolean {
  return ACTIVE_TASK_STATES.includes(state);
}

export function isTerminalState(state: TaskState): boolean {
  return TERMINAL_TASK_STATES.includes(state);
}

export const TASK_STATE_TRANSITIONS: Readonly<
  Record<TaskState, readonly TaskState[]>
> = {
  [TaskState.TASK_STATE_SUBMITTED]: [
    TaskState.TASK_STATE_WORKING,
    TaskState.TASK_STATE_REJECTED,
    TaskState.TASK_STATE_COMPLETED,
    TaskState.TASK_STATE_FAILED,
  ],
  [TaskState.TASK_STATE_WORKING]: [
    TaskState.TASK_STATE_INPUT_REQUIRED,
    TaskState.TASK_STATE_AUTH_REQUIRED,
    TaskState.TASK_STATE_COMPLETED,
    TaskState.TASK_STATE_FAILED,
    TaskState.TASK_STATE_CANCELED,
  ],
  [TaskState.TASK_STATE_INPUT_REQUIRED]: [
    TaskState.TASK_STATE_WORKING,
    TaskState.TASK_STATE_COMPLETED,
    TaskState.TASK_STATE_FAILED,
    TaskState.TASK_STATE_CANCELED,
  ],
  [TaskState.TASK_STATE_AUTH_REQUIRED]: [
    TaskState.TASK_STATE_WORKING,
    TaskState.TASK_STATE_COMPLETED,
    TaskState.TASK_STATE_FAILED,
    TaskState.TASK_STATE_CANCELED,
  ],
  [TaskState.TASK_STATE_COMPLETED]: [],
  [TaskState.TASK_STATE_REJECTED]: [],
  [TaskState.TASK_STATE_CANCELED]: [],
  [TaskState.TASK_STATE_FAILED]: [],
  [TaskState.TASK_STATE_UNSPECIFIED]: [
    TaskState.TASK_STATE_WORKING,
    TaskState.TASK_STATE_COMPLETED,
    TaskState.TASK_STATE_FAILED,
  ],
  [TaskState.UNRECOGNIZED]: [],
};

export function isValidTransition(
  fromState: TaskState,
  toState: TaskState,
): boolean {
  return TASK_STATE_TRANSITIONS[fromState].includes(toState);
}

export function getAllowedTransitions(state: TaskState): readonly TaskState[] {
  return TASK_STATE_TRANSITIONS[state];
}
