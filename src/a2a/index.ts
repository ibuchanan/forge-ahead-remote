export {
  Artifact,
  Message,
  Part,
  Role,
  StreamResponse,
  Task,
  TaskArtifactUpdateEvent,
  TaskState,
  TaskStatus,
  TaskStatusUpdateEvent,
  taskStateFromJSON,
  taskStateToJSON,
} from "@a2a-js/sdk";
export type { JsonRpcRequest, JsonRpcResponse } from "./jsonrpc";
export {
  createA2aErrorEnvelope,
  createA2aResponseEnvelope,
  encodeA2aStreamEnvelope,
  isJsonRpcResponse,
  JsonRpcEnvelopeFields,
} from "./jsonrpc";

export type { MappedEvent, RemoteAgentSignal } from "./signal-mapping";
export { mapRemoteAgentSignal } from "./signal-mapping";
export { isValidStreamResponse } from "./stream-validation";
/** @deprecated Use {@link Part} from `@a2a-js/sdk` instead. */
export type { MessagePart } from "./task-state";
// Legacy helpers that predate @a2a-js/sdk alignment.
export {
  ACTIVE_TASK_STATES,
  getAllowedTransitions,
  isActiveState,
  isTerminalState,
  isValidTransition,
  TASK_STATE_TRANSITIONS,
  TERMINAL_TASK_STATES,
} from "./task-state";
