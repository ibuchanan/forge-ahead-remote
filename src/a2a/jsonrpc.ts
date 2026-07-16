import { z } from "zod";

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

export interface JsonRpcResponse<TResult = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  result?: TResult;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export function createA2aResponseEnvelope<TResult>(
  id: string | number,
  result: TResult,
): JsonRpcResponse<TResult> {
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

export const JsonRpcEnvelopeFields = {
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
};

const JsonRpcResponseSchema = z.union([
  z.object({ ...JsonRpcEnvelopeFields, result: z.unknown() }).strict(),
  z
    .object({
      ...JsonRpcEnvelopeFields,
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
