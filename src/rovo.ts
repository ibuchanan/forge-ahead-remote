import { z } from "zod";
import {
  createA2aResponseEnvelope,
  JsonRpcEnvelopeFields,
  type JsonRpcResponse,
  type Message,
  Role,
  type Task,
  TaskState,
} from "./a2a";

export interface SendMessageParams {
  message: Message;
}

/**
 * Jira sends the standard A2A `TaskQueryParams` shape (`id`, optional
 * `historyLength`) for tasks/get, not `taskId`.
 */
export interface GetTaskParams {
  id: string;
  historyLength?: number;
}

/**
 * Jira sends the standard A2A `TaskIdParams` shape (`id`) for tasks/cancel,
 * not `taskId`.
 */
export interface CancelTaskParams {
  id: string;
}

/**
 * Jira sends the standard A2A `TaskIdParams` shape (`id`) for
 * tasks/resubscribe, not `taskId`.
 */
export interface ResubscribeTaskParams {
  id: string;
}

export type RovoAgentConnectorMethod =
  | "message/send"
  | "tasks/get"
  | "tasks/cancel"
  | "tasks/resubscribe";

export interface RovoAgentConnectorRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: RovoAgentConnectorMethod;
  params:
    | SendMessageParams
    | GetTaskParams
    | CancelTaskParams
    | ResubscribeTaskParams;
}

export type RovoAgentConnectorResponse = JsonRpcResponse<Task>;

const RovoAgentConnectorRequestSchema = z.union([
  z
    .object({
      ...JsonRpcEnvelopeFields,
      method: z.literal("message/send"),
      params: z.object({ message: z.unknown() }).strict(),
    })
    .strict(),
  z
    .object({
      ...JsonRpcEnvelopeFields,
      method: z.literal("tasks/get"),
      params: z
        .object({
          id: z.string(),
          historyLength: z.number().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...JsonRpcEnvelopeFields,
      method: z.literal("tasks/cancel"),
      params: z.object({ id: z.string() }).strict(),
    })
    .strict(),
  z
    .object({
      ...JsonRpcEnvelopeFields,
      method: z.literal("tasks/resubscribe"),
      params: z.object({ id: z.string() }).strict(),
    })
    .strict(),
]);

export function isRovoAgentConnectorRequest(
  request: unknown,
): request is RovoAgentConnectorRequest {
  return RovoAgentConnectorRequestSchema.safeParse(request).success;
}

function resolveMessageId(task: Task): string {
  const message = task.status?.message;
  if (message === undefined) {
    return task.id;
  }
  const candidate = message.messageId;
  if (candidate === undefined || candidate === "") {
    return task.id;
  }
  return candidate;
}

/**
 * Formats an `@a2a-js/sdk` `Task` into the Jira/Rovo remote-agent connector
 * response shape.
 *
 * The result is still an `@a2a-js/sdk`-compatible `Task`, but the message is
 * rewritten to use the agent role and to embed the task/context identifiers
 * that Jira expects.
 */
export function formatRovoAgentConnectorTaskResponse(
  task: Task,
  contextId: string,
): Task {
  const messageId = resolveMessageId(task);
  const baseMessage = task.status?.message;

  return {
    ...task,
    contextId,
    status: {
      state: task.status?.state ?? TaskState.TASK_STATE_UNSPECIFIED,
      message: {
        messageId,
        taskId: task.id,
        contextId,
        role: Role.ROLE_AGENT,
        parts: baseMessage?.parts ?? [],
        metadata: baseMessage?.metadata,
        extensions: baseMessage?.extensions ?? [],
        referenceTaskIds: baseMessage?.referenceTaskIds ?? [],
      },
      timestamp: task.status?.timestamp,
    },
  };
}

export function formatRovoAgentConnectorResponse(
  id: string | number,
  task: Task,
  contextId: string,
): RovoAgentConnectorResponse {
  return createA2aResponseEnvelope(
    id,
    formatRovoAgentConnectorTaskResponse(task, contextId),
  );
}
