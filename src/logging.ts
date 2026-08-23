export interface RemoteAuthAcceptedRecordInput {
  context: {
    fit: Record<string, unknown>;
    verification: { audience: string; issuer?: string };
    forwardedTokens?: { system?: unknown; user?: unknown };
  };
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

export interface RemoteAuthAcceptedRecord {
  event: "remote.auth.accepted";
  level: "info";
  message: "Forge Remote request authenticated";
  requestId?: string;
  traceId?: string;
  spanId?: string;
  remoteContext: {
    verification: { audience: string; issuer?: string };
    fit: { appId?: string; principalSubject?: string };
    forwardedTokens: { hasSystemToken: boolean; hasUserToken: boolean };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function summarizeRemoteContext(
  context: RemoteAuthAcceptedRecordInput["context"],
) {
  const app = context.fit.app;
  const appId =
    isRecord(app) && typeof app.id === "string" ? app.id : undefined;
  const principalSubject =
    typeof context.fit.sub === "string" ? context.fit.sub : undefined;

  return {
    verification: {
      audience: context.verification.audience,
      ...(context.verification.issuer === undefined
        ? {}
        : { issuer: context.verification.issuer }),
    },
    fit: {
      ...(appId === undefined ? {} : { appId }),
      ...(principalSubject === undefined ? {} : { principalSubject }),
    },
    forwardedTokens: {
      hasSystemToken: context.forwardedTokens?.system !== undefined,
      hasUserToken: context.forwardedTokens?.user !== undefined,
    },
  };
}

export function createRemoteAuthAcceptedRecord(
  input: RemoteAuthAcceptedRecordInput,
): RemoteAuthAcceptedRecord {
  return {
    event: "remote.auth.accepted",
    level: "info",
    message: "Forge Remote request authenticated",
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.traceId === undefined ? {} : { traceId: input.traceId }),
    ...(input.spanId === undefined ? {} : { spanId: input.spanId }),
    remoteContext: summarizeRemoteContext(input.context),
  };
}

export interface RemoteInvocationMatchedRecordInput {
  contract: {
    name: string;
    requiredForwardedTokens: { system?: boolean; user?: boolean };
  };
  forwardedTokens?: { system?: unknown; user?: unknown };
  context?: unknown;
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

export interface RemoteInvocationMatchedRecord {
  event: "remote.invocation.matched";
  level: "info";
  message: "Forge Remote request matched invocation contract";
  requestId?: string;
  traceId?: string;
  spanId?: string;
  invocation: {
    contract: string;
    requiredForwardedTokens: { system?: boolean; user?: boolean };
    forwardedTokens: { hasSystemToken: boolean; hasUserToken: boolean };
  };
}

export function createRemoteInvocationMatchedRecord(
  input: RemoteInvocationMatchedRecordInput,
): RemoteInvocationMatchedRecord {
  return {
    event: "remote.invocation.matched",
    level: "info",
    message: "Forge Remote request matched invocation contract",
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.traceId === undefined ? {} : { traceId: input.traceId }),
    ...(input.spanId === undefined ? {} : { spanId: input.spanId }),
    invocation: {
      contract: input.contract.name,
      requiredForwardedTokens: input.contract.requiredForwardedTokens,
      forwardedTokens: {
        hasSystemToken: input.forwardedTokens?.system !== undefined,
        hasUserToken: input.forwardedTokens?.user !== undefined,
      },
    },
  };
}

export interface RemoteInvocationMismatchedRecordInput
  extends RemoteInvocationMatchedRecordInput {
  problem: Record<string, unknown>;
}

export interface RemoteInvocationMismatchedRecord {
  event: "remote.invocation.mismatched";
  level: "warn";
  message: "Forge Remote request did not match invocation contract";
  requestId?: string;
  traceId?: string;
  spanId?: string;
  invocation: RemoteInvocationMatchedRecord["invocation"];
  problem: ProblemLogSummary;
}

export function createRemoteInvocationMismatchedRecord(
  input: RemoteInvocationMismatchedRecordInput,
): RemoteInvocationMismatchedRecord {
  return {
    event: "remote.invocation.mismatched",
    level: "warn",
    message: "Forge Remote request did not match invocation contract",
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.traceId === undefined ? {} : { traceId: input.traceId }),
    ...(input.spanId === undefined ? {} : { spanId: input.spanId }),
    invocation: {
      contract: input.contract.name,
      requiredForwardedTokens: input.contract.requiredForwardedTokens,
      forwardedTokens: {
        hasSystemToken: input.forwardedTokens?.system !== undefined,
        hasUserToken: input.forwardedTokens?.user !== undefined,
      },
    },
    problem: summarizeProblem(input.problem),
  };
}

export interface ProblemLogSummary {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

export interface RemoteAuthRejectedRecordInput {
  problem: Record<string, unknown>;
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

export interface RemoteAuthRejectedRecord {
  event: "remote.auth.rejected";
  level: "warn";
  message: "Forge Remote request authentication rejected";
  requestId?: string;
  traceId?: string;
  spanId?: string;
  problem: ProblemLogSummary;
}

export function summarizeProblem(
  problem: RemoteAuthRejectedRecordInput["problem"],
): ProblemLogSummary {
  return {
    ...(typeof problem.type === "string" ? { type: problem.type } : {}),
    ...(typeof problem.title === "string" ? { title: problem.title } : {}),
    ...(typeof problem.status === "number" ? { status: problem.status } : {}),
    ...(typeof problem.detail === "string" ? { detail: problem.detail } : {}),
    ...(typeof problem.instance === "string"
      ? { instance: problem.instance }
      : {}),
  };
}

export function createRemoteAuthRejectedRecord(
  input: RemoteAuthRejectedRecordInput,
): RemoteAuthRejectedRecord {
  return {
    event: "remote.auth.rejected",
    level: "warn",
    message: "Forge Remote request authentication rejected",
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.traceId === undefined ? {} : { traceId: input.traceId }),
    ...(input.spanId === undefined ? {} : { spanId: input.spanId }),
    problem: summarizeProblem(input.problem),
  };
}
