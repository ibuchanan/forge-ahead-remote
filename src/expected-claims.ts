import { ok, type ProblemDetails, type Result } from "@forge-ahead/errors";
import { missingExpectedAudience } from "./auth-failure";
import type { ForgeInvocationTokenPayload } from "./context";

const DEFAULT_FORGE_ISSUER = "forge/invocation-token";

export interface ExpectedForgeInvocationClaims {
  audience: string;
  issuer: string;
}

export interface SelectExpectedForgeInvocationClaimsInput {
  audience?: string;
  issuer?: string;
  deriveAudience?: (payload: ForgeInvocationTokenPayload) => string | undefined;
  unverifiedPayload: ForgeInvocationTokenPayload;
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

function selectAudience(
  input: SelectExpectedForgeInvocationClaimsInput,
): string | undefined {
  if (input.audience !== undefined) {
    return input.audience;
  }
  const derived = input.deriveAudience?.(input.unverifiedPayload);
  if (derived !== undefined) {
    return derived;
  }
  return resolveAppId(input.unverifiedPayload);
}

export function selectExpectedForgeInvocationClaims(
  input: SelectExpectedForgeInvocationClaimsInput,
): Result<ExpectedForgeInvocationClaims, ProblemDetails> {
  const audience = selectAudience(input);
  if (audience === undefined) {
    return missingExpectedAudience();
  }
  return ok({
    audience,
    issuer: input.issuer ?? DEFAULT_FORGE_ISSUER,
  });
}
