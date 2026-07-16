# @forge-ahead/remote

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

A Forge Remote Helper Library for externally hosted services that receive
requests through Atlassian Forge Remote. The first implementation slice is
Remote Authentication: parsing and verifying Forge Invocation Tokens,
resolving Atlassian signing keys, and turning request-boundary authentication
failures into structured results.

This package is currently private (`"private": true` in `package.json`), so
use it from this repository or a configured private workspace rather than
installing it from the public npm registry.

The package is published as ESM and targets Node 22 or newer.

## Status

The `jwt`, `context`, and root verification APIs are shipped and locked as
the public API. See [`CONTEXT.md`](CONTEXT.md) for the domain glossary and
[`docs/adr/`](docs/adr/) for the design decisions behind this package's
shape.

## Usage

Authenticate a Forge Remote request into framework-neutral values:

```ts
import {
  toHttpAuthFailureResponse,
  validateForgeRemoteRequest,
} from "@forge-ahead/remote";

const result = await validateForgeRemoteRequest({
  headers: {
    authorization: request.headers.authorization,
    appSystemToken: request.headers["x-forge-oauth-system"],
    appUserToken: request.headers["x-forge-oauth-user"],
  },
});

if (result.isErr()) {
  const { status, body } = toHttpAuthFailureResponse(result.error);
  return sendResponse(status, body); // framework-specific, not part of this package
}

const context = result.value; // ForgeRemoteContext: verified FIT + forwarded tokens
```

`@forge-ahead/remote/jwt` exposes pure JWT parsing and inspection
(`parseJwt`, `getKeyIdFromToken`, `isJwtExpired`) with no `jose` or network
dependency; malformed tokens throw `JwtParseError`.
`@forge-ahead/remote/context` exposes the pure `ForgeRemoteContext` builder
(`buildForgeRemoteContext`) for modeling verified request context without
verifying anything yourself. The root package adds the `jose`-backed
verification shell on top of both: `ATLASSIAN_FORGE_JWKS_URL` and
`createJwksKeyStore` for JWKS resolution, `verifyJwt`/`verifyAndParseJwt` for
low-level FIT verification, `validateAuthHeader` when you only need the
verified payload (no forwarded tokens), `validateForgeRemoteRequest` for the
full `ForgeRemoteContext` shown above, and `toHttpAuthFailureResponse` for
mapping failures to an HTTP status and body.

`@forge-ahead/remote/invocation` exposes Remote Invocation Contracts: a
`defineRemoteInvocationContract(...)` builder, named presets for the
evidenced Forge Remote request categories (`customUiInvocation`,
`backendFunctionInvocation`, `asyncEventInvocation`,
`scheduledTriggerInvocation`, `externalRemoteInvocation`), and
`validateRemoteInvocationContract(context, contract)` for checking a
`ForgeRemoteContext`'s forwarded-token guarantees as a second, explicit step
after request authentication:

```ts
import {
  customUiInvocation,
  validateRemoteInvocationContract,
} from "@forge-ahead/remote/invocation";

const authResult = await validateForgeRemoteRequest({ headers });
if (authResult.isErr()) {
  const { status, body } = toHttpAuthFailureResponse(authResult.error);
  return sendResponse(status, body);
}

const contractResult = validateRemoteInvocationContract(
  authResult.value,
  customUiInvocation,
);
if (contractResult.isErr()) {
  return sendResponse(contractResult.error.status, contractResult.error);
}

const { forwardedTokens } = contractResult.value; // required tokens are guaranteed present
// ...route-specific handling
```

Contract validation only checks incoming authentication and forwarded-token
guarantees; a preset's `acknowledgement` metadata (such as the `202` async
event invocations expect) and the `externalRemoteInvocation` preset's
`installationIdRequired`/`systemTokenRehydration` metadata describe expected
route behavior but are never built or enforced by this package.

`@forge-ahead/remote/a2a` exposes the Agent2Agent task, message, artifact,
stream-response, and task-state lifecycle vocabulary (`TaskState`, `Task`,
`Message`, `Artifact`, `StreamResponse`, and related event types) plus pure
`isActiveState`, `isTerminalState`, `isValidTransition`, and
`getAllowedTransitions` helpers. It has no dependency on Forge Remote
Context, `jose`, storage, or framework request/response types, so it is
usable anywhere A2A task-state rules need checking, independent of Forge
Remote authentication.

`isValidStreamResponse(response)` is a `zod`-backed protocol boundary check,
scoped to this subpath only: it confirms a stream payload carries exactly
one of `task`, `statusUpdate`, `message`, or `artifactUpdate`, and that an
`artifactUpdate`'s artifact has a `parts` array with correctly typed
`append`/`lastChunk` flags. It does not validate provider-specific artifact
metadata or enforce route-level business rules; treat it as a shape check
before route code interprets the payload, not a full content validator.

`mapRemoteAgentSignal(signal)` converts a provider-neutral `RemoteAgentSignal`
(lifecycle, completion, failure, rejection, cancellation, approval-needed,
input-needed, content, tool, and artifact-produced categories) into a
`MappedEvent` describing A2A-visible task-state, content, or artifact
changes. It never requires or produces a task ID, context ID, timestamp, or
wire encoding — runtime/session code supplies those when it turns a
`MappedEvent` into a `StreamResponse` for transport:

```ts
import { mapRemoteAgentSignal } from "@forge-ahead/remote/a2a";

const event = mapRemoteAgentSignal({ category: "completed", summary: "Done." });
// event: { kind: "task-state-update", state: "completed", final: true, message: "Done." }

// Runtime/session code adds identifiers, a timestamp, and encodes for transport:
const streamResponse = {
  statusUpdate: {
    taskId,
    contextId,
    status: { state: event.state, timestamp: new Date().toISOString() },
    message: event.message,
    kind: "status-update",
    final: event.final,
  },
};
```

`createA2aResponseEnvelope(id, result)` and `createA2aErrorEnvelope(id, code, message, data?)`
build JSON-RPC 2.0 envelopes scoped to A2A response payloads — not a
general-purpose JSON-RPC utility surface — and `isJsonRpcResponse(value)` is
a malformed-envelope check (valid `jsonrpc`/`id`, exactly one of
`result`/`error`). `encodeA2aStreamEnvelope(response)` is a pure encoder
that produces the `data: ...\n\n` chunk value a transport layer can write;
it does not set headers, flush, write to a response, close a connection, or
expose an SSE writer abstraction — that stays in caller-owned transport
code.

`@forge-ahead/remote/rovo` depends on the A2A Subpath and narrows A2A-over-
JSON-RPC request handling to Atlassian's Rovo/Jira remote-agent connector
methods: `message/send`, `tasks/get`, `tasks/cancel`, and
`tasks/resubscribe`. `isRovoAgentConnectorRequest(value)` validates a
request's method name and matching params shape — critically, Jira sends
the standard A2A `id` parameter for task lookup, cancellation, and
resubscription, not `taskId`; a request using `taskId` is rejected. Rovo
helpers have no dependency on Forge Remote Context, storage, route
handlers, framework response types, or a simulator runtime, and the A2A
Subpath has no dependency on this one.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for local setup, package scripts, and
project layout. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for repository contribution guidance.

## License

Apache-2.0. See [LICENSE](LICENSE).
