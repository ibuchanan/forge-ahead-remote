# Public API Reference

<!-- markdownlint-disable MD013 -->

## Package

| Field | Value |
| --- | --- |
| Package name | `@forge-ahead/remote` |
| Module format | ESM + CommonJS |
| Node version | `>=22` |
| Runtime dependencies | `@forge-ahead/errors`, `@a2a-js/sdk`, `jose`, `zod` |
| Optional peer dependencies | `express` (used by `@forge-ahead/remote/express`) |
| Build output | `dist/*.mjs`, `dist/*.cjs`, `dist/*.d.mts`, `dist/*.d.cts` |

## Entrypoints

| Entrypoint | Source | Description |
| --- | --- | --- |
| `@forge-ahead/remote` | `src/index.ts` | Root verification, JWT, and context exports. |
| `@forge-ahead/remote/jwt` | `src/jwt.ts` | Pure JWT parsing and inspection helpers. |
| `@forge-ahead/remote/context` | `src/context.ts` | Pure Forge Remote context types and builder. |
| `@forge-ahead/remote/invocation` | `src/invocation.ts` | Remote Invocation Contract types, presets, and validation. |
| `@forge-ahead/remote/a2a` | `src/a2a/index.ts` | Re-exports `@a2a-js/sdk` A2A types plus legacy task-state helpers and JSON-RPC envelope helpers. |
| `@forge-ahead/remote/logging` | `src/logging.ts` | Pure, whitelist-only Forge Remote log-record builders; it does not write to a log sink. |
| `@forge-ahead/remote/rovo` | `src/rovo.ts` | Rovo/Jira remote-agent connector request validation and formatting using `@a2a-js/sdk` task types. |
| `@forge-ahead/remote/express` | `src/express.ts` | FIT validation middleware, A2A `UserBuilder`, and `ServerCallContextBuilder` for Express. |

## Root Exports

| Export | Kind | Description |
| --- | --- | --- |
| `ATLASSIAN_FORGE_JWKS_URL` | constant | Default Atlassian Forge JWKS URL. |
| `createJwksKeyStore(options?)` | function | Creates a `jose` remote JWK set resolver. |
| `verifyJwt(options)` | function | Verifies an `RS256` JWT with `jose.jwtVerify`. |
| `verifyAndParseJwt(options)` | function | Verifies an `RS256` JWT and returns its payload. |
| `validateAuthHeader(input)` | function | Validates a Bearer Forge Invocation Token and returns the verified payload. |
| `validateForgeRemoteRequest(input)` | function | Validates the Authorization header and returns a `ForgeRemoteContext`. |
| `toHttpAuthFailureResponse(problem)` | function | Maps a Problem Details auth failure to `{ status, body }`. |
| `buildForgeRemoteContext(input)` | function | Builds a `ForgeRemoteContext` from already verified values. |
| `parseJwt(jwt)` | function | Parses a three-part JWT without verifying it. |
| `getKeyIdFromToken(jwt)` | function | Returns the JWT header `kid` when it is a string. |
| `extractCloudId(ari)` | function | Extracts a Jira `cloudId` from an Atlassian site ARI. |
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

## JWT Verification Policy

| Subject | Specification |
| --- | --- |
| Accepted JWS algorithm | `RS256` only. |
| `RS256` meaning | RSASSA-PKCS1-v1_5 using SHA-256. |
| Request-boundary protected-header fields | `validateAuthHeader` and `validateForgeRemoteRequest` require `alg: "RS256"` and a non-empty `kid`. |
| JWKS selection | The injected or remote `jose` JWK set resolves a public RSA verification key using the protected header, including `alg` and `kid`. |
| Signature verification | `jose.jwtVerify` verifies the signature before it returns a payload. |
| Claim verification | `audience`, optional `issuer`, and expiry are verified by `jose.jwtVerify`. Request-boundary validators default issuer to `forge/invocation-token`. |
| Unverified data | `deriveAudience` receives decoded, unverified FIT payload data only to select verification parameters. It is not trusted context. |
| Isolated Cloud JWKS routing | Forge documents that an `icLabel` can select an isolated-cloud JWKS URL. Validate it before URL interpolation; inject the resulting `jwks` or `jwksUrl` rather than changing the RS256 policy. |

## Forge Remote Sources

| Source | Relevant subject |
| --- | --- |
| [Forge Remote invocation contract](https://developer.atlassian.com/platform/forge/forge-remote-invocation-contract/) | FIT Bearer Authorization header, remote request contract, and `401` for JWT validation failure. |
| [Forge Remote essentials: verifying remote requests](https://developer.atlassian.com/platform/forge/remote/essentials/) | Forge JWKS, Application ID audience, `forge/invocation-token` issuer example, and remote verification responsibility. |
| [Calling Atlassian app APIs from a remote](https://developer.atlassian.com/platform/forge/remote/calling-product-apis/) | Verified FIT context, `app.apiBaseUrl`, and forwarded OAuth-token use. |
| [Bridge `requestRemote`](https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/requestRemote/) | FIT caching and automatic refresh behavior for `requestRemote` callers. |

## JWT and JWS Standards

| Source | Relevant subject |
| --- | --- |
| [RFC 7515: JSON Web Signature](https://www.rfc-editor.org/rfc/rfc7515) | JWS protected headers, including `alg` and `kid`, and signature verification. |
| [RFC 7518 §3.3: JSON Web Algorithms](https://www.rfc-editor.org/rfc/rfc7518#section-3.3) | `RS256` as RSA PKCS#1 v1.5 using SHA-256. |
| [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519) | JWT compact serialization and registered claims such as `aud`, `iss`, and `exp`. |
| [RFC 8725 §3.1: JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725#section-3.1) | Explicit algorithm verification and algorithm-confusion prevention. |
| [`jose` `jwtVerify`](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md) | The verifier used by this package. |
| [`jose` remote JWKS](https://github.com/panva/jose/blob/main/docs/jwks/remote/functions/createRemoteJWKSet.md) | Remote JWKS key resolution. |

## Authentication Failures

| Condition | Status |
| --- | --- |
| Missing or malformed Authorization header | `401` |
| Malformed Forge Invocation Token | `401` |
| Unsupported FIT signing algorithm | `401` |
| Missing FIT key ID | `401` |
| Unknown FIT signing key | `401` |
| Invalid FIT signature | `401` |
| Expired FIT | `401` |
| Forbidden FIT claims | `401` |
| Missing expected audience | `401` |
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

## Logging Exports

`@forge-ahead/remote/logging` creates structured values only. It never selects or writes to a logging sink.

| Export | Kind | Description |
| --- | --- | --- |
| `summarizeRemoteContext(context)` | function | Creates a whitelist-only context summary with verification, safe FIT identity fields, and token-presence booleans. |
| `summarizeProblem(problem)` | function | Keeps only standard Problem Details fields. |
| `createRemoteAuthAcceptedRecord(input)` | function | Creates a `remote.auth.accepted` record. |
| `createRemoteAuthRejectedRecord(input)` | function | Creates a `remote.auth.rejected` record with a safe problem summary. |
| `createRemoteInvocationMatchedRecord(input)` | function | Creates a `remote.invocation.matched` record. |
| `createRemoteInvocationMismatchedRecord(input)` | function | Creates a `remote.invocation.mismatched` record with a safe problem summary. |
| `RemoteAuthAcceptedRecordInput`, `RemoteAuthAcceptedRecord`, `RemoteAuthRejectedRecordInput`, `RemoteAuthRejectedRecord`, `RemoteInvocationMatchedRecordInput`, `RemoteInvocationMatchedRecord`, `RemoteInvocationMismatchedRecordInput`, `RemoteInvocationMismatchedRecord`, `ProblemLogSummary` | types | Inputs, structured record shapes, and the whitelist-only Problem Details summary. |
| `RemoteLogRecord` | type | Union of every safe structured record emitted by this subpath. |
| `RemoteLogRecordLogger` | type | Application-owned logger interface with a method for each log level. |
| `emitRemoteLogRecord(logger, record)` | function | Sends a safe structured record to its matching application-owned logger level. |

## A2A Exports

`@forge-ahead/remote/a2a` re-exports the A2A types from `@a2a-js/sdk` so
consumers can use one import for the Forge-specific adapters. Where the local
helpers still exist, they are deprecated and kept only for migration.

| Export | Kind | Description |
| --- | --- | --- |
| `TaskState` | enum | `@a2a-js/sdk` protobuf task-state enum. |
| `Task`, `Message`, `Part`, `Artifact` | types | Re-exported `@a2a-js/sdk` task, message, part, and artifact values. |
| `TaskStatus`, `TaskStatusUpdateEvent`, `TaskArtifactUpdateEvent` | types | Re-exported `@a2a-js/sdk` status and event values. |
| `StreamResponse` | type | Re-exported `@a2a-js/sdk` stream response container. |
| `Role` | enum | Re-exported `@a2a-js/sdk` role enum. |
| `MessagePart` | type | Deprecated alias for `@a2a-js/sdk` `Part`. |
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

## Express Exports

| Export | Kind | Description |
| --- | --- | --- |
| `ForgeRemoteRequest` | type | Express `Request` extended with `forgeRemoteContext?`. |
| `ForgeRemoteAuthMiddlewareOptions` | type | FIT validation options plus forwarded-token header names. |
| `forgeRemoteAuthMiddleware(options)` | function | Express middleware that validates the FIT and attaches the context. |
| `forgeRemoteUserBuilder(req)` | function | A2A `UserBuilder` that reads the attached context. |
| `forgeRemoteServerCallContextBuilder()` | function | Returns an A2A `ServerCallContextBuilder` that sets tenant from the Jira cloudId. |

## Rovo Exports

| Export | Kind | Description |
| --- | --- | --- |
| `SendMessageParams` | type | Params for `message/send`. |
| `GetTaskParams` | type | Params for `tasks/get`; contains `id` and optional `historyLength`. |
| `CancelTaskParams` | type | Params for `tasks/cancel`; contains `id`. |
| `ResubscribeTaskParams` | type | Params for `tasks/resubscribe`; contains `id`. |
| `RovoAgentConnectorMethod` | type | `"message/send"`, `"tasks/get"`, `"tasks/cancel"`, or `"tasks/resubscribe"`. |
| `RovoAgentConnectorRequest` | type | JSON-RPC request shape for supported Rovo/Jira remote-agent methods. |
| `RovoAgentConnectorResponse` | type | A2A v1 `SendMessageResponse` JSON-RPC shape with the task at `result.task`. |
| `isRovoAgentConnectorRequest(request)` | function | Method and params shape predicate. |
| `formatRovoAgentConnectorTaskResponse(task, contextId)` | function | Formats an A2A task for connector responses. |
| `formatRovoAgentConnectorResponse(id, task, contextId)` | function | Formats the task and returns it at `result.task`, retaining the request ID. |

## Non-Exported Surfaces

| Surface | Status |
| --- | --- |
| `@forge-ahead/remote/verify` | Not exposed in `package.json` exports. |
| Framework adapters | Only the Forge FIT Express adapter is exposed via `@forge-ahead/remote/express`. |
| Logging integration | The pure record builders are available only through `@forge-ahead/remote/logging`; concrete logger integration is not included. |
| Storage integration | Not included in this package. |
| SSE transport writer | Not included in this package. |

<!-- markdownlint-enable MD013 -->
