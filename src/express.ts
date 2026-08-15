import type { Request, RequestHandler } from "express";
import {
  ServerCallContext,
  type ServerCallContextBuilder,
  type User,
} from "@a2a-js/sdk/server";
import type { ForgeRemoteContext } from "./context";
import { extractCloudId } from "./cloud-id";
import {
  type ForgeRemoteRequestHeaders,
  toHttpAuthFailureResponse,
  type ValidateAuthHeaderOptions,
  validateForgeRemoteRequest,
} from "./verify";

/**
 * Express request type that carries the verified Forge Remote Context.
 */
export interface ForgeRemoteRequest extends Request {
  forgeRemoteContext?: ForgeRemoteContext;
}

export interface ForgeRemoteAuthMiddlewareOptions
  extends ValidateAuthHeaderOptions {
  /** Header name for the forwarded Forge system token. */
  systemTokenHeader?: string;
  /** Header name for the forwarded Forge user token. */
  userTokenHeader?: string;
}

const DEFAULT_SYSTEM_TOKEN_HEADER = "x-forge-oauth-system";
const DEFAULT_USER_TOKEN_HEADER = "x-forge-oauth-user";

function pickForwardedTokenHeader(
  configured: string | undefined,
  fallback: string,
): string {
  return configured ?? fallback;
}

function readForwardedToken(
  headers: Record<string, string | string[] | undefined>,
  headerName: string,
): string | undefined {
  const value = headers[headerName.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

class ForgeRemoteUser implements User {
  constructor(
    private readonly context: ForgeRemoteContext,
    private readonly name: string,
  ) {}

  get isAuthenticated(): boolean {
    return true;
  }

  get userName(): string {
    return this.name;
  }

  get forgeRemoteContext(): ForgeRemoteContext {
    return this.context;
  }
}

/**
 * Express middleware that validates a Forge Invocation Token and attaches the
 * resulting {@link ForgeRemoteContext} to the request as `forgeRemoteContext`.
 *
 * Authentication failures are returned with 401; JWKS/network infrastructure
 * failures are returned with 502.
 */
export function forgeRemoteAuthMiddleware(
  options: ForgeRemoteAuthMiddlewareOptions = {},
): RequestHandler {
  const systemTokenHeader = pickForwardedTokenHeader(
    options.systemTokenHeader,
    DEFAULT_SYSTEM_TOKEN_HEADER,
  );
  const userTokenHeader = pickForwardedTokenHeader(
    options.userTokenHeader,
    DEFAULT_USER_TOKEN_HEADER,
  );

  return async (req, res, next) => {
    const forgeReq = req as ForgeRemoteRequest;
    const headers: ForgeRemoteRequestHeaders = {
      authorization: forgeReq.headers.authorization,
      appSystemToken: readForwardedToken(forgeReq.headers, systemTokenHeader),
      appUserToken: readForwardedToken(forgeReq.headers, userTokenHeader),
    };

    const result = await validateForgeRemoteRequest({
      ...options,
      headers,
    });

    if (result.isErr()) {
      const { status, body } = toHttpAuthFailureResponse(result.error);
      res.status(status).json(body);
      return;
    }

    forgeReq.forgeRemoteContext = result.value;
    next();
  };
}

/**
 * A2A {@link UserBuilder} that reads the attached
 * {@link ForgeRemoteContext} and returns an authenticated user whose
 * `userName` is the FIT `sub` claim.
 */
export async function forgeRemoteUserBuilder(
  req: ForgeRemoteRequest,
): Promise<User> {
  const { UnauthenticatedUser } = await import("@a2a-js/sdk/server");
  const context = req.forgeRemoteContext;
  if (context === undefined) {
    return new UnauthenticatedUser();
  }
  const userName = context.fit.sub === undefined ? "" : String(context.fit.sub);
  return new ForgeRemoteUser(context, userName);
}

/**
 * A2A {@link ServerCallContextBuilder} that sets the A2A tenant to the
 * Jira `cloudId` extracted from the FIT context carried by the authenticated
 * user.
 */
export function forgeRemoteServerCallContextBuilder(): ServerCallContextBuilder {
  return (options) => {
    const user = options.user;
    let tenant: string | undefined;
    if (user instanceof ForgeRemoteUser) {
      const fitContext = user.forgeRemoteContext.fit.context as
        | { cloudId?: unknown }
        | undefined;
      const cloudIdOrAri = fitContext?.cloudId;
      tenant = extractCloudId(
        typeof cloudIdOrAri === "string" ? cloudIdOrAri : undefined,
      );
    }
    return new ServerCallContext({ ...options, tenant });
  };
}

/**
 * @deprecated Use the interface-specific {@link ForgeRemoteRequest} instead.
 */
export type { Request } from "express";

/**
 * @deprecated Use the explicit middleware return type instead.
 */
export type { RequestHandler } from "express";
