import { z } from "zod";
import type { Message, Task } from "./a2a";

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

export interface RovoAgentConnectorResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: Task;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

const RovoAgentConnectorRequestSchema = z.union([
  z
    .object({
      jsonrpc: z.literal("2.0"),
      id: z.union([z.string(), z.number()]),
      method: z.literal("message/send"),
      params: z.object({ message: z.unknown() }).strict(),
    })
    .strict(),
  z
    .object({
      jsonrpc: z.literal("2.0"),
      id: z.union([z.string(), z.number()]),
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
      jsonrpc: z.literal("2.0"),
      id: z.union([z.string(), z.number()]),
      method: z.literal("tasks/cancel"),
      params: z.object({ id: z.string() }).strict(),
    })
    .strict(),
  z
    .object({
      jsonrpc: z.literal("2.0"),
      id: z.union([z.string(), z.number()]),
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
