import {
  type ProblemDetails,
  type Result,
  StandardError,
} from "@forge-ahead/errors";
import * as jose from "jose";
import { JwtParseError } from "./jwt";

type RemoteAuthenticationFailureReason =
  | "missing-or-malformed-authorization"
  | "malformed-forge-invocation-token"
  | "missing-expected-audience"
  | "forge-invocation-token-rejected"
  | "verification-infrastructure-failure";

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

function toProblemStatus(reason: RemoteAuthenticationFailureReason): 401 | 502 {
  return reason === "verification-infrastructure-failure" ? 502 : 401;
}

function toProblemMessage(reason: RemoteAuthenticationFailureReason): string {
  switch (reason) {
    case "missing-or-malformed-authorization":
      return "Missing or malformed Authorization header";
    case "malformed-forge-invocation-token":
      return "Forge Invocation Token is not a well-formed JWT";
    case "missing-expected-audience":
      return "Unable to determine the expected audience";
    case "forge-invocation-token-rejected":
      return "Forge Invocation Token verification failed";
    case "verification-infrastructure-failure":
      return "Forge Invocation Token verification could not complete";
  }
}

function remoteAuthenticationFailure(
  reason: RemoteAuthenticationFailureReason,
): Result<never, ProblemDetails> {
  return StandardError.getOrDefault(toProblemStatus(reason)).error(
    toProblemMessage(reason),
  );
}

export function missingOrMalformedAuthorization(): Result<
  never,
  ProblemDetails
> {
  return remoteAuthenticationFailure("missing-or-malformed-authorization");
}

export function malformedForgeInvocationToken(): Result<never, ProblemDetails> {
  return remoteAuthenticationFailure("malformed-forge-invocation-token");
}

export function missingExpectedAudience(): Result<never, ProblemDetails> {
  return remoteAuthenticationFailure("missing-expected-audience");
}

export function verificationFailureFromError(
  error: unknown,
): Result<never, ProblemDetails> {
  return remoteAuthenticationFailure(
    isAuthRejection(error)
      ? "forge-invocation-token-rejected"
      : "verification-infrastructure-failure",
  );
}
