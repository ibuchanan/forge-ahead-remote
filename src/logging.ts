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

interface A2aRecordCorrelation {
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

interface A2aRecordIdentifiers extends A2aRecordCorrelation {
  taskId?: string;
  contextId?: string;
}

export interface RemoteA2aSignalMappedRecordInput extends A2aRecordIdentifiers {
  signalCategory: string;
  mappedKind: string;
  state?: string;
  final?: boolean;
}

export interface RemoteA2aSignalMappedRecord {
  event: "remote.a2a.signal.mapped";
  level: "debug";
  message: "Remote Agent signal mapped to A2A event";
  requestId?: string;
  traceId?: string;
  spanId?: string;
  a2a: {
    signalCategory: string;
    mappedKind: string;
    state?: string;
    final?: boolean;
    taskId?: string;
    contextId?: string;
  };
}

export function createRemoteA2aSignalMappedRecord(
  input: RemoteA2aSignalMappedRecordInput,
): RemoteA2aSignalMappedRecord {
  return {
    event: "remote.a2a.signal.mapped",
    level: "debug",
    message: "Remote Agent signal mapped to A2A event",
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.traceId === undefined ? {} : { traceId: input.traceId }),
    ...(input.spanId === undefined ? {} : { spanId: input.spanId }),
    a2a: {
      signalCategory: input.signalCategory,
      mappedKind: input.mappedKind,
      ...(input.state === undefined ? {} : { state: input.state }),
      ...(input.final === undefined ? {} : { final: input.final }),
      ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
      ...(input.contextId === undefined ? {} : { contextId: input.contextId }),
    },
  };
}

export interface RemoteA2aStreamEncodedRecordInput
  extends A2aRecordIdentifiers {
  streamResponseKind: string;
}

export interface RemoteA2aStreamEncodedRecord {
  event: "remote.a2a.stream.encoded";
  level: "debug";
  message: "A2A stream envelope encoded";
  requestId?: string;
  traceId?: string;
  spanId?: string;
  a2a: {
    streamResponseKind: string;
    taskId?: string;
    contextId?: string;
  };
}

export function createRemoteA2aStreamEncodedRecord(
  input: RemoteA2aStreamEncodedRecordInput,
): RemoteA2aStreamEncodedRecord {
  return {
    event: "remote.a2a.stream.encoded",
    level: "debug",
    message: "A2A stream envelope encoded",
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.traceId === undefined ? {} : { traceId: input.traceId }),
    ...(input.spanId === undefined ? {} : { spanId: input.spanId }),
    a2a: {
      streamResponseKind: input.streamResponseKind,
      ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
      ...(input.contextId === undefined ? {} : { contextId: input.contextId }),
    },
  };
}

export interface RemoteA2aCompletedRecordInput extends A2aRecordIdentifiers {
  state: string;
}

export interface RemoteA2aCompletedRecord {
  event: "remote.a2a.completed";
  level: "info";
  message: "A2A task reached terminal state";
  requestId?: string;
  traceId?: string;
  spanId?: string;
  a2a: {
    state: string;
    final: true;
    taskId?: string;
    contextId?: string;
  };
}

export function createRemoteA2aCompletedRecord(
  input: RemoteA2aCompletedRecordInput,
): RemoteA2aCompletedRecord {
  return {
    event: "remote.a2a.completed",
    level: "info",
    message: "A2A task reached terminal state",
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.traceId === undefined ? {} : { traceId: input.traceId }),
    ...(input.spanId === undefined ? {} : { spanId: input.spanId }),
    a2a: {
      state: input.state,
      final: true,
      ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
      ...(input.contextId === undefined ? {} : { contextId: input.contextId }),
    },
  };
}

export type RemoteLogRecord =
  | RemoteAuthAcceptedRecord
  | RemoteAuthRejectedRecord
  | RemoteInvocationMatchedRecord
  | RemoteInvocationMismatchedRecord
  | RemoteA2aSignalMappedRecord
  | RemoteA2aStreamEncodedRecord
  | RemoteA2aCompletedRecord;

export interface RemoteLogRecordLogger {
  debug(record: RemoteLogRecord): void;
  info(record: RemoteLogRecord): void;
  warn(record: RemoteLogRecord): void;
  error(record: RemoteLogRecord): void;
}

export function emitRemoteLogRecord(
  logger: RemoteLogRecordLogger,
  record: RemoteLogRecord,
): void {
  logger[record.level](record);
}
