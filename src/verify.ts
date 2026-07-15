import {
  ok,
  type ProblemDetails,
  type Result,
  StandardError,
} from "@forge-ahead/errors";
import * as jose from "jose";
import type { ForgeInvocationTokenPayload } from "./context";
import { JwtParseError, type JwtPayload, parseJwt } from "./jwt";

export const ATLASSIAN_FORGE_JWKS_URL =
  "https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json";

export interface CreateJwksKeyStoreOptions {
  jwksUrl?: string | URL;
}

export function createJwksKeyStore(
  options: CreateJwksKeyStoreOptions = {},
): jose.JWTVerifyGetKey {
  return jose.createRemoteJWKSet(
    new URL(options.jwksUrl ?? ATLASSIAN_FORGE_JWKS_URL),
  );
}

export interface VerifyJwtOptions {
  token: string;
  audience: string;
  jwks?: jose.JWTVerifyGetKey;
  jwksUrl?: string | URL;
  issuer?: string;
}

function resolveKeyStore(options: VerifyJwtOptions): jose.JWTVerifyGetKey {
  return options.jwks ?? createJwksKeyStore({ jwksUrl: options.jwksUrl });
}

export async function verifyJwt(
  options: VerifyJwtOptions,
): Promise<jose.JWTVerifyResult> {
  const keyStore = resolveKeyStore(options);
  return jose.jwtVerify(options.token, keyStore, {
    audience: options.audience,
    issuer: options.issuer,
  });
}

export async function verifyAndParseJwt(
  options: VerifyJwtOptions,
): Promise<JwtPayload> {
  const { payload } = await verifyJwt(options);
  return payload;
}

const DEFAULT_FORGE_ISSUER = "forge/invocation-token";

export interface ValidateAuthHeaderOptions {
  jwks?: jose.JWTVerifyGetKey;
  jwksUrl?: string | URL;
  audience?: string;
  issuer?: string;
  /**
   * Selects verification parameters only. `payload` is decoded but
   * unverified, so it must never be used to authorize the request or
   * establish trusted app, tenant, user, or cloud identity.
   */
  deriveAudience?: (payload: ForgeInvocationTokenPayload) => string | undefined;
}

export interface ValidateAuthHeaderInput extends ValidateAuthHeaderOptions {
  authorization?: string;
}

function resolveAppId(
  payload: ForgeInvocationTokenPayload,
): string | undefined {
  const app = payload.app;
  if (typeof app !== "object" || app === null) {
    return undefined;
  }
  const id = (app as Record<string, unknown>).id;
  return typeof id === "string" ? id : undefined;
}

function resolveAudience(
  input: ValidateAuthHeaderInput,
  unverifiedPayload: ForgeInvocationTokenPayload,
): string | undefined {
  if (input.audience !== undefined) {
    return input.audience;
  }
  const derived = input.deriveAudience?.(unverifiedPayload);
  if (derived !== undefined) {
    return derived;
  }
  return resolveAppId(unverifiedPayload);
}

const AUTH_REJECTION_ERROR_TYPES: readonly (new (...args: never[]) => Error)[] =
  [
    jose.errors.JWTClaimValidationFailed,
    jose.errors.JWSSignatureVerificationFailed,
    jose.errors.JWTInvalid,
    jose.errors.JWSInvalid,
    jose.errors.JWKInvalid,
    jose.errors.JWKSNoMatchingKey,
    JwtParseError,
  ];

function isAuthRejection(error: unknown): boolean {
  return AUTH_REJECTION_ERROR_TYPES.some(
    (ErrorType) => error instanceof ErrorType,
  );
}

function extractBearerToken(
  authorization: string | undefined,
): string | undefined {
  if (authorization === undefined) {
    return undefined;
  }
  const match = /^Bearer (.+)$/.exec(authorization);
  return match?.[1];
}

export async function validateAuthHeader(
  input: ValidateAuthHeaderInput,
): Promise<Result<ForgeInvocationTokenPayload, ProblemDetails>> {
  const token = extractBearerToken(input.authorization);
  if (token === undefined) {
    return StandardError.getOrDefault(401).error(
      "Missing or malformed Authorization header",
    );
  }

  let unverifiedPayload: ForgeInvocationTokenPayload;
  try {
    unverifiedPayload = parseJwt(token).payload as ForgeInvocationTokenPayload;
  } catch {
    return StandardError.getOrDefault(401).error(
      "Forge Invocation Token is not a well-formed JWT",
    );
  }

  const audience = resolveAudience(input, unverifiedPayload);
  if (audience === undefined) {
    return StandardError.getOrDefault(401).error(
      "Unable to determine the expected audience",
    );
  }

  try {
    const payload = await verifyAndParseJwt({
      token,
      audience,
      issuer: input.issuer ?? DEFAULT_FORGE_ISSUER,
      jwks: input.jwks,
      jwksUrl: input.jwksUrl,
    });
    return ok(payload as ForgeInvocationTokenPayload);
  } catch (error) {
    if (isAuthRejection(error)) {
      return StandardError.getOrDefault(401).error(
        "Forge Invocation Token verification failed",
      );
    }
    return StandardError.getOrDefault(502).error(
      "Forge Invocation Token verification could not complete",
    );
  }
}
