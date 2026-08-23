# Remote Logging Extension Design

## Status

The initial authentication and invocation record builders are implemented in
`src/logging.ts` and exported as `@forge-ahead/remote/logging`. This document
still defines the safety rules and future A2A record slices; it does not add a
concrete logger or modify the reference app.

The concrete proof case is the `specs/explore-jira-agent-assignment` app, but
that app is not modified here. The handoff for that implementation lives in
[`LOGGING.md`](./LOGGING.md).

## Boundary

The first pure record-builder slices ship through the dedicated
`@forge-ahead/remote/logging` subpath. They remain separate from the root API
and must preserve these boundaries:

- `src/logging.ts` exports data-only, sink-neutral helpers.
- `@forge-ahead/remote` does not re-export logging helpers from its root.
- The package has no runtime dependency on a concrete logger.
- Helpers never recursively log a `ForgeRemoteContext` or arbitrary Forge
  Invocation Token claims.

The subpath may build on public values from `@forge-ahead/remote`,
`@forge-ahead/remote/invocation`, `@forge-ahead/remote/a2a`, and
`@forge-ahead/remote/rovo`. It must not re-parse raw request headers.

## Safe Remote Context Summary

Forge Invocation Token payloads are intentionally permissive in the core
package, so context logging must be whitelist-based. The extension design uses a
Safe Remote Context Summary rather than a generic redacted context dump.

Proposed value shape:

```ts
interface SafeRemoteContextSummary {
  verification: {
    audience: string;
    issuer?: string;
  };
  fit: {
    appId?: string;
    principalSubject?: string;
  };
  forwardedTokens: {
    hasSystemToken: boolean;
    hasUserToken: boolean;
  };
}
```

Mapping rules:

- `verification.audience` and `verification.issuer` come from
  `ForgeRemoteContext.verification`.
- `fit.appId` is included only when `context.fit.app.id` is a string.
- `fit.principalSubject` is included only when `context.fit.sub` is a string.
- `forwardedTokens.hasSystemToken` and `forwardedTokens.hasUserToken` are
  booleans based on token presence only.
- Forwarded token values are never logged.
- Unknown FIT claims are never logged, even after recursive redaction.
- Names, emails, profile objects, raw headers, raw Authorization values, and raw
  request objects are not part of the summary.

Generic recursive redaction remains useful for app-local demonstration payloads,
but it is not the safety boundary for `ForgeRemoteContext`.

## Structured Record Shape

The extension design defines structured records and event names without choosing
bunyan, pino, console, or any other sink.

Common fields:

```ts
interface RemoteLogRecord {
  event: RemoteLogEventName;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  timestamp?: string;
  remoteContext?: SafeRemoteContextSummary;
  invocation?: RemoteInvocationLogSummary;
  a2a?: A2aLogSummary;
  problem?: ProblemLogSummary;
}
```

Event-specific summary shapes:

```ts
interface RemoteInvocationLogSummary {
  contractName?: string;
  authentication?: "forge-invocation-token" | "caller-owned";
  requiredForwardedTokens?: {
    system?: boolean;
    user?: boolean;
  };
  acknowledgementStatus?: number;
  matched?: boolean;
}

interface A2aLogSummary {
  method?: string;
  signalCategory?: string;
  mappedKind?: string;
  state?: string;
  final?: boolean;
  taskId?: string;
  contextId?: string;
  streamResponseKind?: string;
  artifactId?: string;
  artifactName?: string;
}

interface ProblemLogSummary {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}
```

Only `event`, `level`, and `message` are required. Applications may derive
`requestId` from the JSON-RPC id when handling Rovo/A2A requests, generate it at
the HTTP boundary, or omit it when unavailable. `traceId` and `spanId` should
come from B3 headers when the app receives them.

Problem summaries should include normal Problem Details fields such as `type`,
`title`, `status`, `detail`, and `instance` when present. They should omit
causes, stacks, raw thrown errors, tokens, and request bodies.

## Event Names

The first event catalog is intentionally small:

| Event | Level | When to emit | Key payload |
| --- | --- | --- | --- |
| `remote.auth.accepted` | `info` | `validateForgeRemoteRequest(...)` succeeds | `remoteContext` |
| `remote.auth.rejected` | `warn` or `error` | Remote Authentication returns Problem Details | `problem` |
| `remote.invocation.matched` | `info` | `validateRemoteInvocationContract(...)` succeeds | `remoteContext`, `invocation` |
| `remote.invocation.mismatched` | `warn` | Contract validation returns Problem Details | `invocation`, `problem` |
| `remote.a2a.signal.mapped` | `debug` or `info` | A `RemoteAgentSignal` maps to a `MappedEvent` | `a2a` |
| `remote.a2a.stream.encoded` | `debug` | A JSON-RPC stream envelope is encoded | `a2a` |
| `remote.a2a.completed` | `info` | A task reaches a terminal A2A outcome | `a2a` |

The event names narrate the package layers:

1. Remote Authentication accepts or rejects the request.
2. Remote Invocation Contract Validation matches or mismatches the route.
3. A2A/Rovo helpers map provider-neutral behavior to A2A-visible events.

The logs are a demonstration narrative, not a hidden event channel.

## Current and Future API Shape

The implemented subpath starts with pure value builders. Remaining slices may
add the following operations without adding a sink dependency:

```ts
summarizeRemoteContext(context): SafeRemoteContextSummary;
summarizeInvocationMatch(match): RemoteInvocationLogSummary;
summarizeInvocationContract(contract): RemoteInvocationLogSummary;
summarizeProblem(problem): ProblemLogSummary;
summarizeA2aMapping(signal, event): A2aLogSummary;
createRemoteLogRecord(input): RemoteLogRecord;
```

If the runtime extension later integrates with `@forge-ahead/logging`, that
adapter should consume these records rather than changing the core summary
rules. This keeps the summarizers testable without I/O and keeps the auth core
logging-neutral.

## Non-Goals

- Production logging policy, retention, sampling, and redaction review.
- HTTP middleware, route wrapping, or framework request mutation.
- SSE transport writing or connection lifecycle logging.
- Product API, storage, or system-token lifecycle logging.
- Deep validation of A2A message, artifact, or provider payload content.
- A concrete logger adapter or a root `@forge-ahead/remote` logging export.
