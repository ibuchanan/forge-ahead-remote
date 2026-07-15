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

The extracted module should make the newer shape authoritative, preserve the
existing public API during migration, and keep pure JWT helpers importable
without pulling in `jose`, network code, or Forge runtime dependencies.

## Proposed Package

- Package directory: `packages/remote`
- Package name: `@forge-ahead/remote`
- Runtime: ESM, Node 22 or newer
- Build tool: `tsdown`
- Test runner: `vitest`
- Publishing state: private initially, matching the other extracted Forge Ahead
  packages in this repository

`@forge-ahead/remote` is a small Forge Remote authentication package for
backends that receive Forge Invocation Tokens. It is not a general JWT library
and should not depend on `@forge/api`.

## Goals

- Provide a standalone package for Forge Remote FIT parsing and verification.
- Preserve the existing `forge-ahead/remote` and `forge-ahead/remote/jwt` import
  surfaces through compatibility re-exports.
- Keep `@forge-ahead/remote/jwt` pure and dependency-light so non-verifying
  callers do not pay for `jose` or network-capable code.
- Use `@forge-ahead/errors` for structured validation failures returned from
  request-boundary helpers.
- Make verification testable without real network calls by accepting injected
  JWKS key stores and fetch implementations.
- Remove duplicate implementations inside `forge-ahead` after compatibility
  re-exports are in place.

## Non-Goals

- Do not build a generic JWT framework.
- Do not provide Express, Fastify, Hono, or framework-specific middleware in the
  first extraction.
- Do not include Rovo remote-agent JSON-RPC helpers. Those remain in the Rovo
  module unless a separate extraction is specified.
- Do not require `@forge/api`, Forge KVS, app manifests, or generated Atlassian
  REST API types.
- Do not perform any network call at module import time.

## Public API

### `@forge-ahead/remote/jwt`

This subpath is the pure core. It should have no runtime dependency on `jose`,
`@forge-ahead/errors`, `@forge/api`, `fetch`, or network state.
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

### `@forge-ahead/remote`

The root entrypoint re-exports `@forge-ahead/remote/jwt` and adds the
networked, cryptographic shell.

Exports:

```ts
export const ATLASSIAN_FORGE_JWKS_URL: string;

export interface FetchAtlassianJwksOptions {
  fetch?: typeof globalThis.fetch;
  jwksUrl?: string | URL;
}

export interface CreateJwksKeyStoreOptions {
  jwksUrl?: string | URL;
}

export interface ValidateAuthHeaderOptions {
  jwks?: jose.JWTVerifyGetKey;
  audience?: string;
  issuer?: string;
  deriveAudience?: (payload: JwtPayload) => string | undefined;
}

export async function fetchAtlassianJwks(
  options?: FetchAtlassianJwksOptions,
): Promise<jose.JSONWebKeySet>;

export function createJwksKeyStore(
  options?: CreateJwksKeyStoreOptions,
): jose.JWTVerifyGetKey;

export async function verifyJwt(
  token: string,
  audience: string,
  jwks?: jose.JWTVerifyGetKey,
): Promise<jose.JWTVerifyResult>;

export async function verifyAndParseJwt(
  token: string,
  audience: string,
  jwks?: jose.JWTVerifyGetKey,
): Promise<JwtPayload>;

export async function validateAuthHeader(
  authHeader: string | undefined,
  options?: ValidateAuthHeaderOptions,
): Promise<Result<JwtPayload, ProblemDetails>>;
```

Keep the existing positional `verifyJwt(token, audience, jwks?)` and
`verifyAndParseJwt(token, audience, jwks?)` shapes for source compatibility.
Options-object overloads can be added later, but the first extraction should
avoid forcing a call-site migration.

`validateAuthHeader()` should continue to return a `Result` instead of throwing
for request-boundary failures. It should:

- Accept only `Authorization: Bearer <token>`.
- Decode enough of the token to determine the expected audience when
  `options.audience` is not supplied.
- Verify the token signature and issuer with `jose`.
- Return `StandardError.getOrDefault(401).error(...)` for missing headers,
  malformed Bearer values, missing audience data, and verification failures.
- Use an injected `jwks` store when provided, avoiding network calls in tests
  and hot paths.

## Package Layout

```text
packages/remote/
  package.json
  tsconfig.json
  tsdown.config.ts
  vitest.config.ts
  biome.json
  README.md
  src/
    index.ts
    jwt.ts
    verify.ts
  test/
    jwt.test.ts
    verify.test.ts
    jwt-test-helpers.ts
```

`src/index.ts` should be a small barrel. `src/jwt.ts` owns pure parsing and
inspection. `src/verify.ts` owns all `jose`, JWKS, fetch, and Result-producing
helpers.

## Package Metadata

`packages/remote/package.json` should follow the extracted package conventions:

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
  networking APIs, or any Forge package.
- `src/verify.ts` may import `jose` and `@forge-ahead/errors`, but must not
  import `@forge/api` or `forge-ahead`.
- The package must not depend on `@forge-ahead/atlassian-api-types` or
  `@forge-ahead/logging`.
- `fetchAtlassianJwks()` may use `globalThis.fetch` by default, but must accept
  an injected fetch implementation for tests and non-standard runtimes.
- `createJwksKeyStore()` must create a reusable remote JWK set and return it
  synchronously, matching the newer `src/forge/remote/verify.ts` behavior.

## Migration Plan

1. Create `packages/remote` with the package metadata and the extracted source
   from `packages/forge-ahead/src/forge/remote/{jwt,verify,index}.ts`.
2. Port `packages/forge-ahead/test/forge/remote.test.ts` and
   `jwt-test-helpers.ts` into the new package, splitting tests around the
   `jwt` and verification entrypoints.
3. Add boundary tests that prove `@forge-ahead/remote/jwt` can be imported
   without loading `jose`.
4. Add `@forge-ahead/remote` as a dependency of `forge-ahead`.
5. Replace `packages/forge-ahead/src/forge/remote.ts` with a compatibility
   re-export from `@forge-ahead/remote`.
6. Replace `packages/forge-ahead/src/forge/remote/{jwt,verify,index}.ts` with
   compatibility re-exports, or remove those source files after updating
   `tsdown.config.ts` to point directly at compatibility wrappers.
7. Keep `forge-ahead/remote`, `forge-ahead/remote/jwt`, and root `forge-ahead`
   re-exports working for one release window.
8. Update examples and README content to prefer `@forge-ahead/remote`.
9. Add a follow-up repo-init dependency constant only for templates that create
   Forge Remote backends. Do not add `@forge-ahead/remote` to every generated
   Forge app by default.

## Tests

The new package should cover:

- `parseJwt()` parses valid three-part tokens.
- `parseJwt()` throws on invalid structure or malformed JSON.
- `getKeyIdFromToken()` returns `kid` when present and `undefined` otherwise.
- `isJwtExpired()` uses an injected epoch time deterministically.
- `fetchAtlassianJwks()` uses injected fetch, returns JSON on success, and
  throws on non-OK responses.
- `createJwksKeyStore()` returns a callable `jose.JWTVerifyGetKey`.
- `verifyJwt()` verifies a locally signed token with an injected key store.
- `verifyJwt()` rejects wrong audience and wrong key cases.
- `verifyAndParseJwt()` returns only the verified payload.
- `validateAuthHeader()` returns 401 Problem Details for missing, malformed,
  empty, unsigned, wrong-audience, and wrong-issuer tokens.
- `validateAuthHeader()` returns `ok(payload)` for a valid Forge Invocation
  Token with an injected key store.
- Compatibility imports from `forge-ahead/remote` and `forge-ahead/remote/jwt`
  compile after `forge-ahead` is rewired.

## Acceptance Criteria

- `npm run check --workspace packages/remote` passes.
- `npm run check --workspace packages/forge-ahead` passes after compatibility
  re-exports are installed.
- `@forge-ahead/remote` exposes the same stable functions currently available
  from `forge-ahead/remote`.
- `@forge-ahead/remote/jwt` exposes pure helpers and does not import `jose` or
  `@forge-ahead/errors`.
- `forge-ahead` no longer contains two independent remote implementations.
- Existing consumers can migrate by changing imports from `forge-ahead/remote`
  to `@forge-ahead/remote` without changing function calls.

## Open Decisions

- Whether `ForgeInvocationTokenPayload` should remain permissive around optional
  nested fields or model the exact FIT contract strictly. The extraction should
  start permissive to avoid breaking existing callers, then tighten only with
  tests and release notes.
- Whether to add framework-specific request adapters after the package is
  extracted. Keep them out of the initial package unless a downstream app needs
  one.
- Whether `fetchAtlassianJwks()` is valuable as public API long term. Keep it in
  the first extraction because it is already exported by `forge-ahead/remote`.
