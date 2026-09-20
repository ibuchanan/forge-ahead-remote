import type { onRequestAsyncHookHandler } from "fastify";
import type { ForgeRemoteContext } from "./context";
import {
  type ForgeRemoteRequestHeaders,
  toHttpAuthFailureResponse,
  type ValidateAuthHeaderOptions,
  validateForgeRemoteRequest,
} from "./verify";

declare module "fastify" {
  interface FastifyRequest {
    forgeRemoteContext?: ForgeRemoteContext;
  }
}

export interface ForgeRemoteAuthHookOptions extends ValidateAuthHeaderOptions {
  /** Header name for the forwarded Forge system OAuth token. */
  systemTokenHeader?: string;
  /** Header name for the forwarded Forge user OAuth token. */
  userTokenHeader?: string;
}

const DEFAULT_SYSTEM_TOKEN_HEADER = "x-forge-oauth-system";
const DEFAULT_USER_TOKEN_HEADER = "x-forge-oauth-user";

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Fastify `onRequest` hook that validates a Forge Invocation Token and attaches
 * the resulting Forge Remote Context to the request.
 */
export function forgeRemoteAuthHook(
  options: ForgeRemoteAuthHookOptions = {},
): onRequestAsyncHookHandler {
  const systemTokenHeader =
    options.systemTokenHeader ?? DEFAULT_SYSTEM_TOKEN_HEADER;
  const userTokenHeader = options.userTokenHeader ?? DEFAULT_USER_TOKEN_HEADER;

  return async (request, reply) => {
    const headers: ForgeRemoteRequestHeaders = {
      authorization: readHeader(request.headers, "authorization"),
      appSystemToken: readHeader(request.headers, systemTokenHeader),
      appUserToken: readHeader(request.headers, userTokenHeader),
    };
    const result = await validateForgeRemoteRequest({ ...options, headers });

    if (result.isErr()) {
      const { status, body } = toHttpAuthFailureResponse(result.error);
      await reply.code(status).send(body);
      return;
    }

    request.forgeRemoteContext = result.value;
  };
}
