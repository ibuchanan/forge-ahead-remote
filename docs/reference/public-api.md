# Public API Reference

<!-- markdownlint-disable MD013 -->

## Package

| Field | Value |
| --- | --- |
| Package name | `@forge-ahead/remote` |
| Module format | ESM |
| Node version | `>=22` |
| Runtime dependencies | `@forge-ahead/errors`, `jose`, `zod` |
| Build output | `dist/*.mjs`, `dist/*.d.mts` |

## Entrypoints

| Entrypoint | Source | Description |
| --- | --- | --- |
| `@forge-ahead/remote` | `src/index.ts` | Root verification, JWT, and context exports. |
| `@forge-ahead/remote/jwt` | `src/jwt.ts` | Pure JWT parsing and inspection helpers. |
| `@forge-ahead/remote/context` | `src/context.ts` | Pure Forge Remote context types and builder. |
| `@forge-ahead/remote/invocation` | `src/invocation.ts` | Remote Invocation Contract types, presets, and validation. |
| `@forge-ahead/remote/a2a` | `src/a2a/index.ts` | A2A task, stream, signal, transition, and JSON-RPC helpers. |
| `@forge-ahead/remote/rovo` | `src/rovo.ts` | Rovo/Jira remote-agent connector request validation and formatting. |

## Root Exports

| Export | Kind | Description |
| --- | --- | --- |
| `ATLASSIAN_FORGE_JWKS_URL` | constant | Default Atlassian Forge JWKS URL. |
| `createJwksKeyStore(options?)` | function | Creates a `jose` remote JWK set resolver. |
| `verifyJwt(options)` | function | Verifies a JWT with `jose.jwtVerify`. |
| `verifyAndParseJwt(options)` | function | Verifies a JWT and returns its payload. |
| `validateAuthHeader(input)` | function | Validates a Bearer Forge Invocation Token and returns the verified payload. |
| `validateForgeRemoteRequest(input)` | function | Validates the Authorization header and returns a `ForgeRemoteContext`. |
| `toHttpAuthFailureResponse(problem)` | function | Maps a Problem Details auth failure to `{ status, body }`. |
| `buildForgeRemoteContext(input)` | function | Builds a `ForgeRemoteContext` from already verified values. |
| `parseJwt(jwt)` | function | Parses a three-part JWT without verifying it. |
| `getKeyIdFromToken(jwt)` | function | Returns the JWT header `kid` when it is a string. |
| `isJwtExpired(jwt, nowEpochSeconds)` | function | Returns `true` when the JWT `exp` claim is numeric and expired. |
| `JwtParseError` | class | Error thrown by malformed JWT parsing. |

## Root Types

| Type | Description |
| --- | --- |
| `CreateJwksKeyStoreOptions` | Optional `jwksUrl` input for `createJwksKeyStore`. |
| `VerifyJwtOptions` | Token, audience, optional issuer, and optional JWKS inputs. |
| `ValidateAuthHeaderOptions` | Verification options for Authorization header validation. |
| `ValidateAuthHeaderInput` | Authorization header plus validation options. |
| `ForgeRemoteRequestHeaders` | Normalized request header names accepted by request validation. |
| `ValidateForgeRemoteRequestInput` | Headers plus validation options. |
| `HttpAuthFailureResponse` | HTTP status and Problem Details body pair. |
| `ForgeInvocationTokenPayload` | Permissive Forge Invocation Token payload. |
| `ForgeRemoteContext` | Verified FIT payload, verification metadata, and forwarded tokens. |
| `ForgeRemoteContextVerification` | Audience and optional issuer used for verification. |
| `ForgeRemoteContextForwardedTokens` | Optional system and user forwarded token values. |
| `ForwardedForgeToken` | Forwarded token object with `kind` and `token`. |
| `ForwardedForgeTokenKind` | `"system"` or `"user"`. |
| `BuildForgeRemoteContextInput` | Input for `buildForgeRemoteContext`. |
| `JwtHeader` | Permissive JWT header object. |
| `JwtPayload` | Permissive JWT payload object. |
| `JwtToken` | Parsed JWT header, payload, and signature. |

## Verification Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `token` | `string` | Required | JWT string to verify. |
| `audience` | `string` | Required for low-level verification | Expected JWT audience. |
| `issuer` | `string` | `forge/invocation-token` for request-boundary validators | Expected JWT issuer. |
| `jwks` | `jose.JWTVerifyGetKey` | `undefined` | Injected key resolver. |
| `jwksUrl` | `string \| URL` | `ATLASSIAN_FORGE_JWKS_URL` | JWKS URL used when `jwks` is absent. |
| `deriveAudience` | `(payload) => string \| undefined` | FIT `app.id` fallback | Request-boundary audience selection hook. |

## Authentication Failures

| Condition | Status |
| --- | --- |
| Missing or malformed Authorization header | `401` |
| Malformed Forge Invocation Token | `401` |
| Missing expected audience | `401` |
| Rejected Forge Invocation Token | `401` |
| Verification infrastructure failure | `502` |

## Invocation Exports

| Export | Kind | Description |
| --- | --- | --- |
| `RemoteInvocationAuthentication` | type | `"forge-invocation-token"` or `"caller-owned"`. |
| `RemoteInvocationContractForwardedTokenRequirements` | type | Optional system and user forwarded-token requirements. |
| `RemoteInvocationContractAcknowledgement` | type | Expected acknowledgement status and description metadata. |
| `DefineRemoteInvocationContractInput` | type | Input shape for contract creation. |
| `RemoteInvocationContract` | type | Named authentication, forwarded-token, acknowledgement, and external-invocation metadata. |
| `RemoteInvocationContractMatch` | type | Successful contract validation result with context, contract, and forwarded tokens. |
| `defineRemoteInvocationContract(input)` | function | Creates a `RemoteInvocationContract`. |
| `validateRemoteInvocationContract(context, contract)` | function | Checks forwarded-token requirements and returns a contract match or Problem Details. |
| `customUiInvocation` | preset | Requires Forge Invocation Token authentication plus system and user forwarded tokens. |
| `backendFunctionInvocation` | preset | Requires Forge Invocation Token authentication plus a system forwarded token. |
| `asyncEventInvocation` | preset | Requires Forge Invocation Token authentication plus a system forwarded token and carries `202` acknowledgement metadata. |
| `scheduledTriggerInvocation` | preset | Requires Forge Invocation Token authentication plus a system forwarded token. |
| `externalRemoteInvocation` | preset | Uses caller-owned authentication and marks installation ID plus system-token rehydration metadata. |

## A2A Exports

| Export | Kind | Description |
| --- | --- | --- |
| `TaskState` | type | A2A task state union. |
| `Task`, `Message`, `MessagePart`, `Artifact` | types | A2A task, message, part, and artifact values. |
| `TaskStatusUpdateEvent` | type | A2A task status update event. |
| `TaskArtifactUpdateEvent` | type | A2A artifact update event. |
| `StreamResponse` | type | Union-shaped A2A stream response container. |
| `MappedEvent` | type | Provider-neutral signal mapping output. |
| `RemoteAgentSignal` | type | Provider-neutral runtime signal input. |
| `JsonRpcRequest` | type | JSON-RPC request envelope shape. |
| `JsonRpcResponse` | type | JSON-RPC response envelope shape. |
| `ACTIVE_TASK_STATES` | constant | Active state list. |
| `TERMINAL_TASK_STATES` | constant | Terminal state list. |
| `TASK_STATE_TRANSITIONS` | constant | Allowed task-state transition map. |
| `JsonRpcEnvelopeFields` | constant | Shared `jsonrpc` and `id` schema fields. |
| `isActiveState(state)` | function | Active-state predicate. |
| `isTerminalState(state)` | function | Terminal-state predicate. |
| `isValidTransition(fromState, toState)` | function | Transition predicate. |
| `getAllowedTransitions(state)` | function | Allowed transition lookup. |
| `isValidStreamResponse(response)` | function | Shallow stream response shape predicate. |
| `mapRemoteAgentSignal(signal)` | function | Maps provider-neutral runtime signals to A2A-visible events. |
| `createA2aResponseEnvelope(id, result)` | function | Creates a JSON-RPC response envelope with `result`. |
| `createA2aErrorEnvelope(id, code, message, data?)` | function | Creates a JSON-RPC response envelope with `error`. |
| `isJsonRpcResponse(response)` | function | JSON-RPC response envelope predicate. |
| `encodeA2aStreamEnvelope(response)` | function | Encodes a JSON-RPC response as an SSE `data:` chunk string. |

## Rovo Exports

| Export | Kind | Description |
| --- | --- | --- |
| `SendMessageParams` | type | Params for `message/send`. |
| `GetTaskParams` | type | Params for `tasks/get`; contains `id` and optional `historyLength`. |
| `CancelTaskParams` | type | Params for `tasks/cancel`; contains `id`. |
| `ResubscribeTaskParams` | type | Params for `tasks/resubscribe`; contains `id`. |
| `RovoAgentConnectorMethod` | type | `"message/send"`, `"tasks/get"`, `"tasks/cancel"`, or `"tasks/resubscribe"`. |
| `RovoAgentConnectorRequest` | type | JSON-RPC request shape for supported Rovo/Jira remote-agent methods. |
| `RovoAgentConnectorResponse` | type | JSON-RPC task response shape. |
| `isRovoAgentConnectorRequest(request)` | function | Method and params shape predicate. |
| `formatRovoAgentConnectorTaskResponse(task, contextId)` | function | Formats an A2A task for connector responses. |
| `formatRovoAgentConnectorResponse(id, task, contextId)` | function | Wraps the formatted task in a JSON-RPC response envelope. |

## Non-Exported Surfaces

| Surface | Status |
| --- | --- |
| `@forge-ahead/remote/verify` | Not exposed in `package.json` exports. |
| Framework adapters | Not included in this package. |
| Logging integration | Not included in this package. |
| Storage integration | Not included in this package. |
| SSE transport writer | Not included in this package. |

<!-- markdownlint-enable MD013 -->
