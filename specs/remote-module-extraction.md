# Extract `@forge-ahead/remote`

## Status

Draft.

## Context

> [Forge Remote](https://developer.atlassian.com/platform/forge/remote/)
> allows you to integrate a Forge app with services hosted on other platforms that you control.
> It offers additional functionality, compared to the standard REST API `fetch()` approach,
> that is useful to services that interoperate with Forge apps. These include:
> * Ability to configure your app to send auth tokens to the remote endpoint that allow the remote endpoint to make authenticated calls back to the Atlassian platform to access Atlassian app APIs and Forge Storage using Atlassian account credentials.
> * Optional ability to define a module that links your remote directly to an extension point, so that you have less code to maintain.
> * Ability to validate that incoming requests to your remote originated from the Atlassian Forge platform.
Automatically sending key information about the source of the invocation to your remote in a Forge Remote request, so that you don't have to manually copy the site's Base URL, license status, and other commonly-required information into your request.
> * Ability to meet Atlassian data residency eligibility requirements if your app satisfies certain criteria.
>
> Specific tasks you can perform using Forge Remote include:
> * Call a remote backend from a Forge frontend (Custom UI or UI Kit)
> * Call a remote backend from a Forge function
> * Send Atlassian app and lifecycle events (to a remote)
> * Configure scheduled triggers to invoke a remote backend

`forge-ahead` currently exposes Forge Remote helpers through
`forge-ahead/remote` and root re-exports. Those helpers cover two different
layers:

- Pure JWT inspection: parse a token, inspect its header and payload, read
  `kid`, and check `exp`.
- Forge Invocation Token verification: fetch Atlassian JWKS, create a reusable
  `jose` key store, verify FIT signatures, validate `Authorization` headers,
  and return `@forge-ahead/errors`-style `Result` values.

The source is also split two ways today:

- `src/forge/remote.ts` is the older single-file implementation and is still
  used by `test/forge/remote.test.ts`.
- `src/forge/remote/{jwt,verify,index}.ts` is the newer package-exported shape
  used by `forge-ahead/remote` and `forge-ahead/remote/jwt`.

The extracted module should make the newer split authoritative, improve the
long-term standalone API where useful, and keep pure JWT and context helpers
importable without pulling in `jose`, network code, or Forge runtime
dependencies.

## Proposed Package

- Package directory: repository root
- Package name: `@forge-ahead/remote`
- Runtime: ESM, Node 22 or newer
- Build tool: `tsdown`
- Test runner: `vitest`
- Publishing state: private initially, matching related extracted Forge Ahead
  packages

`@forge-ahead/remote` is the auth-first root package for a broader Forge Remote
helper library. Its first release serves backends that receive Forge Invocation
Tokens, while leaving room for later helpers around forwarded tokens, storage,
regionality, and remote-agent protocols. It is not a general JWT library and
should not depend on `@forge/api`.

## Goals

- Provide a standalone package for Forge Remote FIT parsing and verification.
- Prefer a coherent standalone `@forge-ahead/remote` API over preserving legacy
  `forge-ahead/remote` source compatibility.
- Keep `@forge-ahead/remote/jwt` pure and dependency-light so non-verifying
  callers do not pay for `jose` or network-capable code.
- Use `@forge-ahead/errors` for structured validation failures returned from
  request-boundary helpers.
- Make verification testable without real network calls by accepting injected
  JWKS key stores and fetch implementations.
- Model verified request context in a way that can later carry Forge-forwarded
  OAuth token headers without re-parsing raw request data.
- Keep the library core sans-io and framework-neutral: value inputs, value
  outputs, injected I/O dependencies, and no web-framework request mutation.
- Remove duplicate implementations inside `forge-ahead` after the known consumer
  migration path is decided.

## Non-Goals

- Do not build a generic JWT framework.
- Do not provide Express, Fastify, Hono, or framework-specific middleware in the
  first extraction.
- Do not send HTTP responses, mutate framework request objects, or install route
  middleware in the first extraction.
- Do not bind the root package to a web framework. Framework middleware may be
  designed later as separate extension packages built on top of this core.
- Do not include Rovo remote-agent JSON-RPC helpers. Those remain in the Rovo
  module unless a separate extraction is specified.
- Do not store, refresh, exchange, or use Forge-forwarded OAuth tokens in the
  first extraction.
- Do not summarize or log Forge Remote Context in the auth-first package.
  Logging belongs in a later extension built on top of the core context shape.
- Do not require `@forge/api`, Forge KVS, app manifests, or generated Atlassian
  REST API types.
- Do not perform any network call at module import time.

## Public API

### `@forge-ahead/remote/jwt`

This subpath is the generic pure JWT core. It should have no runtime dependency
on `jose`, `@forge-ahead/errors`, `@forge/api`, `fetch`, or network state, and
should not define Forge Remote domain types.
Time-sensitive helpers should accept injected time so callers can use a
deterministic path in tests.

Exports:

```ts
export interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

export interface JwtPayload {
  iss: string;
  sub?: string;
  aud: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

export interface JwtToken {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
}

export function parseJwt(token: string): JwtToken;
export function getKeyIdFromToken(token: string): string | undefined;
export function isJwtExpired(
  payload: Pick<JwtPayload, "exp">,
  nowEpochSeconds?: number,
): boolean;
```

`isJwtExpired()` should accept an optional `nowEpochSeconds` so tests and
callers with an injected clock can stay deterministic. Omitting it may preserve
today's convenience behavior by using the current wall clock.

### `@forge-ahead/remote/context`

This subpath is the pure Forge Remote Context core. It should have no runtime
dependency on `jose`, `@forge-ahead/errors`, `@forge/api`, `fetch`, network
state, clocks, logging, storage, or HTTP framework types.

Exports:

```ts
import type { JwtPayload } from "@forge-ahead/remote/jwt";

export interface ForgeInvocationTokenPayload extends JwtPayload {
  app: {
    id: string;
    version?: string;
    appVersion?: string;
    installationId?: string;
    apiBaseUrl?: string;
    environment?: {
      type: string;
      id: string;
    };
    module?: {
      type: string;
      key: string;
    };
    installation?: {
      id: string;
      contexts: Array<{
        name: string;
        apiBaseUrl: string;
      }>;
    };
  };
  context?: {
    cloudId?: string;
    moduleKey?: string;
    userAccess?: {
      enabled: boolean;
      hasAccess: boolean;
    };
  };
  principal?: string;
}

export type ForwardedForgeTokenKind = "system" | "user";

export interface ForwardedForgeToken {
  kind: ForwardedForgeTokenKind;
  token: string;
}

export interface ForwardedForgeTokens {
  system?: ForwardedForgeToken;
  user?: ForwardedForgeToken;
}

export interface ForgeRemoteVerification {
  audience: string;
  issuer: string;
}

export interface ForgeRemoteContext {
  fit: ForgeInvocationTokenPayload;
  forwardedTokens: ForwardedForgeTokens;
  verification: ForgeRemoteVerification;
}

export interface BuildForgeRemoteContextInput {
  fit: ForgeInvocationTokenPayload;
  verification: ForgeRemoteVerification;
  appSystemToken?: string;
  appUserToken?: string;
}

export function buildForgeRemoteContext(
  input: BuildForgeRemoteContextInput,
): ForgeRemoteContext;
```

`buildForgeRemoteContext()` is the pure context-construction API. It should
accept an already verified permissive FIT payload, effective verification
metadata, and optional forwarded token strings, return a `ForgeRemoteContext`,
wrap forwarded tokens as named token objects, and perform no verification, JWKS
lookup, fetch, logging, storage, clock reads, or HTTP framework integration.
It should not decode, inspect, or infer claims or expiry from forwarded OAuth
tokens.

### `@forge-ahead/remote`

The root entrypoint re-exports `@forge-ahead/remote/jwt` and
`@forge-ahead/remote/context`, then adds the networked, cryptographic shell.
The first extraction should not expose a separate `@forge-ahead/remote/verify`
subpath because it would have the same runtime dependency profile as the root.

Exports:

```ts
export type {
  BuildForgeRemoteContextInput,
  ForgeInvocationTokenPayload,
  ForgeRemoteContext,
  ForgeRemoteVerification,
  ForwardedForgeTokenKind,
  ForwardedForgeToken,
  ForwardedForgeTokens,
} from "@forge-ahead/remote/context";
export { buildForgeRemoteContext } from "@forge-ahead/remote/context";

export const ATLASSIAN_FORGE_JWKS_URL: string;

export interface CreateJwksKeyStoreOptions {
  jwksUrl?: string | URL;
}

export interface VerifyJwtOptions {
  token: string;
  audience: string;
  jwks?: jose.JWTVerifyGetKey;
  jwksUrl?: string | URL;
  issuer?: string;
}

export interface ValidateAuthHeaderOptions {
  jwks?: jose.JWTVerifyGetKey;
  jwksUrl?: string | URL;
  audience?: string;
  issuer?: string;
  deriveAudience?: (payload: ForgeInvocationTokenPayload) => string | undefined;
}

export interface ValidateAuthHeaderInput extends ValidateAuthHeaderOptions {
  authorization?: string;
}

export interface ForgeRemoteRequestHeaders {
  authorization?: string;
  appSystemToken?: string;
  appUserToken?: string;
}

export interface ValidateForgeRemoteRequestInput
  extends ValidateAuthHeaderOptions {
  headers: ForgeRemoteRequestHeaders;
}

export interface HttpAuthFailureResponse {
  status: number;
  body: ProblemDetails;
}

export function createJwksKeyStore(
  options?: CreateJwksKeyStoreOptions,
): jose.JWTVerifyGetKey;

export async function verifyJwt(
  options: VerifyJwtOptions,
): Promise<jose.JWTVerifyResult>;

export async function verifyAndParseJwt(
  options: VerifyJwtOptions,
): Promise<JwtPayload>;

export async function validateAuthHeader(
  input: ValidateAuthHeaderInput,
): Promise<Result<ForgeInvocationTokenPayload, ProblemDetails>>;

export async function validateForgeRemoteRequest(
  input: ValidateForgeRemoteRequestInput,
): Promise<Result<ForgeRemoteContext, ProblemDetails>>;

export function toHttpAuthFailureResponse(
  problem: ProblemDetails,
): HttpAuthFailureResponse;
```

`verifyJwt()` and `verifyAndParseJwt()` should use `VerifyJwtOptions` rather
than positional arguments. The options object should choose verification keys in
the same order as the request-boundary helpers: injected `jwks`, injected static
`jwksUrl`, default Atlassian JWKS URL. These low-level helpers should reject on
verification failures rather than returning `Result`. They should only pass an
issuer expectation to `jose` when `options.issuer` is supplied.

`validateAuthHeader()` should return a `Result` instead of throwing for
request-boundary failures. It is a public lower-level helper for callers that
only need a verified permissive FIT payload and do not need a full
`ForgeRemoteContext`. It should:

- Accept only `Authorization: Bearer <token>`.
- Decode enough of the token to determine the expected audience when
  `input.audience` is not supplied. Audience should be chosen in this order:
  explicit `input.audience`, `input.deriveAudience(decodedPayload)`, decoded
  FIT `app.id`.
- Treat the decoded payload passed to `deriveAudience()` as unverified. It may
  select verification parameters only, not authorize the request or establish
  trusted app, tenant, user, or cloud identity.
- Return a 401 Problem Details result before signature verification when no
  audience can be supplied or derived.
- Verify the token signature and issuer with `jose`.
- Default `input.issuer` to `"forge/invocation-token"` when not supplied.
- Return `StandardError.getOrDefault(401).error(...)` for missing headers,
  malformed Bearer values, missing audience data, expired tokens, wrong issuer,
  wrong audience, and bad signatures.
- Return `StandardError.getOrDefault(502).error(...)` when verification cannot
  complete because JWKS fetching, TLS, or network access failed.
- Use an injected `jwks` store when provided, avoiding network calls in tests
  and hot paths.
- Use an injected static `jwksUrl` when provided and no `jwks` store is supplied.
- Avoid payload-driven app allowlists, isolated-cloud label validation, or
  app-to-JWKS routing templates in the first extraction.

`validateForgeRemoteRequest()` is the context-returning API for new callers. It
should delegate FIT validation to the same verification path as
`validateAuthHeader()`, preserve optional Forge-forwarded OAuth token headers
from `input.headers` in `forwardedTokens`, include the effective verification
`audience` and `issuer` in `verification`, and avoid framework-specific request
types. It should map `input.headers.appSystemToken` to
`forwardedTokens.system.token` and `input.headers.appUserToken` to
`forwardedTokens.user.token` by delegating to `buildForgeRemoteContext()`. The
first extraction should not validate, refresh, store, or use those forwarded
OAuth tokens.

`ForgeRemoteContext` should contain only normalized values. It should not retain
raw request headers, the original `ForgeRemoteRequestHeaders`, or framework
request objects.

`toHttpAuthFailureResponse()` is a data-only adapter for callers that need an HTTP
response shape. It should return `{ status: problem.status, body: problem }`
without importing or referencing Express, Fastify, Hono, or another HTTP
framework, and without sending the response itself.

## Package Layout

```text
package.json
tsconfig.json
tsdown.config.ts
vitest.config.ts
biome.json
README.md
src/
  index.ts
  context.ts
  jwt.ts
  verify.ts
test/
  context.test.ts
  jwt.test.ts
  verify.test.ts
  jwt-test-helpers.ts
```

`src/index.ts` should be a small barrel. `src/jwt.ts` owns pure parsing and
inspection. `src/context.ts` owns pure Forge Remote Context modeling.
`src/verify.ts` owns all `jose`, JWKS, fetch, and Result-producing helpers.

## Package Metadata

The root `package.json` should follow the extracted package conventions:

```json
{
  "name": "@forge-ahead/remote",
  "version": "0.1.0",
  "private": true,
  "license": "Apache-2.0",
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.mts"
    },
    "./jwt": {
      "import": "./dist/jwt.mjs",
      "types": "./dist/jwt.d.mts"
    },
    "./context": {
      "import": "./dist/context.mjs",
      "types": "./dist/context.d.mts"
    },
    "./package.json": "./package.json"
  },
  "main": "dist/index.mjs",
  "types": "dist/index.d.mts",
  "files": ["dist"],
  "engines": {
    "node": ">=22"
  }
}
```

Runtime dependencies:

- `@forge-ahead/errors`
- `jose`

Development dependencies:

- `@biomejs/biome`
- `@types/node`
- `@vitest/coverage-v8`
- `tsdown`
- `typescript` constrained to `^5.x`
- `vitest`

## Dependency Boundaries

- `src/jwt.ts` must not import from `jose`, `@forge-ahead/errors`, Node
  networking APIs, any Forge package, or `src/context.ts`.
- `src/context.ts` must not import from `jose`, `@forge-ahead/errors`, Node
  networking APIs, framework packages, logging packages, storage packages, or
  any Forge package.
- `src/verify.ts` may import `jose` and `@forge-ahead/errors`, but must not
  import `@forge/api` or `forge-ahead`.
- `src/verify.ts` may import from `src/context.ts` to build
  `ForgeRemoteContext`, but `src/context.ts` must not import from `src/verify.ts`.
- Verification functions are exported from the root entrypoint only; do not add
  a public `./verify` package export in the first extraction.
- The package must not depend on `@forge-ahead/atlassian-api-types` or
  `@forge-ahead/logging`.
- `createJwksKeyStore()` must create a reusable remote JWK set and return it
  synchronously, matching the newer `src/forge/remote/verify.ts` behavior. It
  accepts an optional `jwksUrl`, but does not expose public `fetch` injection.
  Tests should inject `jwks` key stores into verification and validation inputs
  instead of mocking factory transport.
- `verifyJwt()`, `verifyAndParseJwt()`, `validateAuthHeader()`, and
  `validateForgeRemoteRequest()` should use JWKS options in this order: injected
  `jwks`, injected static `jwksUrl`, default Atlassian JWKS URL.

## Future Capability Seams

These areas are visible in the reference implementations and should shape the
first auth slice, but they are not acceptance criteria for the first extraction.
The root package should keep the seams open without absorbing their I/O or
framework dependencies.

- **Framework middleware extensions**: Express, Fastify, Hono, and similar
  adapters can be built later as separate extension packages. The root package
  should expose framework-neutral values such as `ForgeRemoteContext` and
  `HttpAuthFailureResponse`, not mutate framework request or response objects.
- **Product API access with forwarded tokens**: Later helpers may consume
  `forwardedTokens.system` or `forwardedTokens.user` to call Atlassian APIs.
  The auth slice should preserve those tokens in context without validating,
  exchanging, logging, refreshing, or using them.
- **Remote logging extension**: A later extension for `@forge-ahead/logging`
  may provide safe `ForgeRemoteContext` summaries and demo-oriented request
  logging. The auth slice should expose enough normalized context for that
  extension without depending on logging or deciding which fields are safe to
  emit for every caller. The extension's package ownership, export shape, and
  concrete API are intentionally out of scope until that slice starts.
- **Forge storage and secrets**: Later helpers may retrieve Forge-hosted storage
  or secrets through remote endpoints. The auth slice should expose verified app,
  cloud, principal, and API-base-url claims when present, but must not depend on
  Forge KVS or `@forge/api`.
- **System-token lifecycle**: Later helpers may persist, refresh, or expire
  system tokens. The auth slice should wrap forwarded tokens as objects so
  expiry, claims, and provenance can be added without breaking the context shape.
- **Regional and isolated-cloud JWKS policy**: Later helpers may own app allowlists,
  isolated-cloud label validation, and app-to-JWKS routing. The auth slice should
  keep that policy injectable through `jwks` and `jwksUrl`.
- **Remote-agent and A2A helpers**: Later helpers may cover JSON-RPC envelopes,
  SSE streaming, task state mapping, or Rovo remote-agent conventions. The auth
  slice should not include protocol helpers, but its context should be usable by
  those helpers without re-parsing request headers.

## Migration Plan

1. Replace the copied logging package metadata and source at the repository root
   with source that implements the selected standalone API. Historical
   `forge-ahead` remote source may be consulted outside this repository, but the
   ranch-forge megarepo should not remain vendored here.
2. Port or recreate the historical `forge-ahead` remote tests and
   `jwt-test-helpers.ts` in this repository, splitting tests around the `jwt`,
   `context`, and verification entrypoints.
3. Add boundary tests that prove `@forge-ahead/remote/jwt` can be imported
   without loading `jose`.
4. Add boundary tests that prove `@forge-ahead/remote/context` can be imported
   without loading `jose` or `@forge-ahead/errors`.
5. Update the vendored known consumer to use `@forge-ahead/remote` directly, or
   document why `forge-ahead` should retain a temporary bridge.
6. Remove the duplicate remote implementations from `forge-ahead` after the
   direct-consumer migration or bridge decision is made.
7. Update examples and README content to prefer `@forge-ahead/remote`.
8. Add a follow-up repo-init dependency constant only for templates that create
   Forge Remote backends. Do not add `@forge-ahead/remote` to every generated
   Forge app by default.

## Tests

The new package should cover:

- `parseJwt()` parses valid three-part tokens.
- `parseJwt()` throws on invalid structure or malformed JSON.
- `getKeyIdFromToken()` returns `kid` when present and `undefined` otherwise.
- `isJwtExpired()` uses an injected epoch time deterministically.
- `@forge-ahead/remote/jwt` stays generic and does not export
  `ForgeInvocationTokenPayload`.
- `createJwksKeyStore()` returns a callable `jose.JWTVerifyGetKey` and accepts
  only optional `jwksUrl` configuration.
- `verifyJwt()` verifies a locally signed token with an injected key store via
  `VerifyJwtOptions`.
- `verifyJwt()` rejects wrong audience and wrong key cases rather than returning
  `Result`.
- `verifyJwt()` only enforces issuer when `VerifyJwtOptions.issuer` is supplied.
- `verifyAndParseJwt()` returns only the verified payload from
  `VerifyJwtOptions`.
- `verifyAndParseJwt()` rejects when `verifyJwt()` rejects.
- Positional calls such as `verifyJwt(token, audience, jwks)` are not part of
  the standalone public API.
- `validateAuthHeader()` returns 401 Problem Details for missing, malformed,
  empty, unsigned, wrong-audience, and wrong-issuer tokens.
- `validateAuthHeader()` and `validateForgeRemoteRequest()` derive audience from
  explicit `audience`, custom `deriveAudience(decodedPayload)`, then decoded FIT
  `app.id`.
- `deriveAudience()` receives an unverified permissive
  `ForgeInvocationTokenPayload`, not a generic `JwtPayload`, and tests document
  that it must only select verification parameters.
- `validateAuthHeader()` and `validateForgeRemoteRequest()` return 401 before
  signature verification when no audience can be supplied or derived.
- `validateAuthHeader()` and `validateForgeRemoteRequest()` default issuer to
  `"forge/invocation-token"` when the input does not supply one.
- `validateAuthHeader()` accepts a single `ValidateAuthHeaderInput` object and
  does not expose the legacy `validateAuthHeader(authHeader, options)` call
  shape.
- `validateAuthHeader()` remains public as the lower-level helper for callers
  that only need a verified permissive FIT payload.
- `validateAuthHeader()` and `validateForgeRemoteRequest()` return 502 Problem
  Details for JWKS fetch, TLS, or network failures that prevent verification.
- `validateAuthHeader()` returns `ok(payload)` for a valid Forge Invocation
  Token with an injected key store, where `payload` is a permissive
  `ForgeInvocationTokenPayload`.
- `validateAuthHeader()` and `validateForgeRemoteRequest()` can verify with an
  injected static `jwksUrl` without implementing app-specific JWKS routing.
- `validateForgeRemoteRequest()` returns a `ForgeRemoteContext` containing the
  verified permissive FIT payload and any supplied forwarded Forge OAuth tokens
  wrapped as named token objects.
- Forwarded token objects include `kind: "system"` or `kind: "user"` even though
  they also live under `forwardedTokens.system` or `forwardedTokens.user`.
- Forwarded token objects expose only `kind` and `token`; the context builder
  does not decode or inspect forwarded OAuth token claims.
- `validateForgeRemoteRequest()` includes effective verification `audience` and
  `issuer` in `ForgeRemoteContext.verification`.
- `ForgeRemoteContext` does not include raw request headers or framework request
  objects.
- `validateForgeRemoteRequest()` accepts a single
  `ValidateForgeRemoteRequestInput` object and does not expose a
  `validateForgeRemoteRequest(headers, options)` call shape.
- `buildForgeRemoteContext()` builds the same `ForgeRemoteContext` from plain
  values, including `verification`, without importing `jose`, using JWKS,
  reading clocks, or touching HTTP framework types.
- `@forge-ahead/remote/context` imports without loading `jose` or
  `@forge-ahead/errors`.
- `@forge-ahead/remote/context` exports `ForgeInvocationTokenPayload`.
- `@forge-ahead/remote` does not expose a public `./verify` subpath.
- `@forge-ahead/remote` does not export logging helpers, context summary
  helpers, or a `./logging` subpath in the first extraction.
- `validateForgeRemoteRequest()` does not require Express, Fastify, Hono, or
  another HTTP framework type.
- `toHttpAuthFailureResponse()` maps 401 and 502 Problem Details into a data-only
  HTTP status/body response without importing a framework.
- Package dependency and import checks prove the root package does not depend on
  Express, Fastify, Hono, `@forge/api`, Forge KVS, or `@forge-ahead/logging`.
- The vendored known consumer can be updated to the new `@forge-ahead/remote`
  API without preserving legacy `forge-ahead/remote` call shapes.

## Acceptance Criteria

- `npm run check` passes in this repository.
- The known `forge-ahead` consumer passes its package checks outside this
  repository after its remote usage is migrated or explicitly bridged.
- `@forge-ahead/remote` exposes the selected standalone API; it does not need to
  mirror every legacy `forge-ahead/remote` call shape.
- `@forge-ahead/remote/jwt` exposes pure helpers and does not import `jose` or
  `@forge-ahead/errors`, and does not export Forge Remote domain types.
- `@forge-ahead/remote/context` exposes pure context helpers and does not import
  `jose` or `@forge-ahead/errors`.
- `@forge-ahead/remote` exposes verification helpers from the root entrypoint,
  with no separate `@forge-ahead/remote/verify` export.
- `forge-ahead` no longer contains two independent remote implementations.
- Known consumers can migrate by changing imports and call shapes where the new
  API is clearer.
- New consumers can authenticate a Forge Remote request into a framework-neutral
  `ForgeRemoteContext` without re-parsing raw headers.
- Consumers can construct a `ForgeRemoteContext` from already verified plain
  values using a pure builder.
- `ForgeRemoteContext.fit` exposes Forge-specific claims through a permissive
  `ForgeInvocationTokenPayload` without requiring exact nested fields to be
  present for every invocation path.
- The root package remains framework-neutral: no framework middleware, no request
  mutation, and no framework packages in runtime dependencies.
- The root package remains logging-neutral: no `@forge-ahead/logging`
  dependency, no context summary helper, and no logging subpath in the
  auth-first extraction.

## Open Decisions

None for the auth-first extraction. Remote Extension Package selection,
packaging, and API design are deferred until later slices.
