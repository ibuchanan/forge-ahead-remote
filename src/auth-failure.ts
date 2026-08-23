import {
  type ProblemDetails,
  type Result,
  StandardError,
} from "@forge-ahead/errors";
import * as jose from "jose";
import { JwtParseError } from "./jwt";

type RemoteAuthenticationFailureReason =
  | "unsupported-forge-invocation-token-algorithm"
  | "missing-forge-invocation-token-key-id"
  | "unknown-forge-invocation-token-key"
  | "expired-forge-invocation-token"
  | "forbidden-forge-invocation-token-claims"
  | "invalid-forge-invocation-token-signature"
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
    // An attacker-controlled token can present an unsupported or
    // disallowed "alg" (e.g. the classic unsigned "alg: none" token);
    // that is a property of the token, not an infrastructure failure.
    jose.errors.JOSENotSupported,
    jose.errors.JOSEAlgNotAllowed,
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
    case "unsupported-forge-invocation-token-algorithm":
      return "Forge Invocation Token uses an unsupported signing algorithm";
    case "missing-forge-invocation-token-key-id":
      return "Forge Invocation Token is missing a key ID";
    case "unknown-forge-invocation-token-key":
      return "Forge Invocation Token signing key is unknown";
    case "expired-forge-invocation-token":
      return "Forge Invocation Token has expired";
    case "forbidden-forge-invocation-token-claims":
      return "Forge Invocation Token claims are not permitted";
    case "invalid-forge-invocation-token-signature":
      return "Forge Invocation Token signature is invalid";
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

export function unsupportedForgeInvocationTokenAlgorithm(): Result<
  never,
  ProblemDetails
> {
  return remoteAuthenticationFailure(
    "unsupported-forge-invocation-token-algorithm",
  );
}

export function missingForgeInvocationTokenKeyId(): Result<
  never,
  ProblemDetails
> {
  return remoteAuthenticationFailure("missing-forge-invocation-token-key-id");
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
  if (
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ERR_JWT_EXPIRED") ||
    (typeof error === "object" &&
      error !== null &&
      "claim" in error &&
      error.claim === "exp") ||
    error instanceof jose.errors.JWTExpired
  ) {
    return remoteAuthenticationFailure("expired-forge-invocation-token");
  }
  if (error instanceof jose.errors.JWTClaimValidationFailed) {
    return remoteAuthenticationFailure(
      "forbidden-forge-invocation-token-claims",
    );
  }
  if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
    return remoteAuthenticationFailure(
      "invalid-forge-invocation-token-signature",
    );
  }
  if (error instanceof jose.errors.JWKSNoMatchingKey) {
    return remoteAuthenticationFailure("unknown-forge-invocation-token-key");
  }
  return remoteAuthenticationFailure(
    isAuthRejection(error)
      ? "forge-invocation-token-rejected"
      : "verification-infrastructure-failure",
  );
}
