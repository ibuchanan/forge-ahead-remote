# Migrating from `forge-ahead` Remote Authentication

`@forge-ahead/remote` replaces the Remote Authentication helpers copied into
`forge-ahead` (`src/forge/remote.ts`). This is a **breaking extraction**: the
new package intentionally does not preserve the old positional call shapes.
See [`docs/adr/0013-allow-breaking-remote-extraction.md`](docs/adr/0013-allow-breaking-remote-extraction.md)
and [`docs/adr/0032-defer-forge-ahead-consumer-migration.md`](docs/adr/0032-defer-forge-ahead-consumer-migration.md)
for why: this repository only has a vendored, read-only reference snapshot of
one legacy consumer for API-shape evidence, not a live `forge-ahead` checkout
it can safely edit. Removing the duplicate implementation and switching the
real `forge-ahead` package to depend on `@forge-ahead/remote` is a follow-up
change in that repository; this document is the mapping that change should
use.

## Pure JWT helpers (`@forge-ahead/remote/jwt`)

| `forge-ahead` (`src/forge/remote.ts`) | `@forge-ahead/remote/jwt` |
| --- | --- |
| `parseJwt(token)` | `parseJwt(jwt)` — same shape, but `header`/`payload` are permissive `{ [claim: string]: unknown }` records instead of a fixed `JwtHeader`/`JwtPayload` shape. |
| `isJwtExpired(payload)` — takes an already-decoded payload | `isJwtExpired(jwt, nowEpochSeconds)` — takes the raw token and an injected epoch time, so callers no longer need to decode first and tests no longer depend on the real clock. |
| `getKeyIdFromToken(token)` — returns `string`, throws if `kid` is missing | `getKeyIdFromToken(jwt)` — returns `string \| undefined` instead of throwing. |

## Verification helpers (root `@forge-ahead/remote`)

| `forge-ahead` (`src/forge/remote.ts`) | `@forge-ahead/remote` |
| --- | --- |
| `fetchAtlassianJwks()` — one-shot raw JWKS fetch | Removed. Use `createJwksKeyStore()`, which builds a reusable `jose` key store instead of a one-shot fetch (see [ADR 0022](docs/adr/0022-do-not-expose-public-jwks-fetch.md)). |
| `createJwksKeyStore()` — `async`, no arguments, always the default Atlassian URL | `createJwksKeyStore(options?)` — synchronous, and accepts an optional `jwksUrl` to point at a non-default JWKS endpoint. |
| `verifyJwt(token, audience, jwks?)` — positional | `verifyJwt({ token, audience, jwks?, jwksUrl?, issuer? })` — named options; `issuer` is enforced only when supplied. |
| `verifyAndParseJwt(token, audience, jwks?)` — positional | `verifyAndParseJwt({ token, audience, jwks?, jwksUrl?, issuer? })` — named options. |
| `validateAuthHeader(authHeader, options?)` — positional header plus an options object | `validateAuthHeader({ authorization, jwks?, jwksUrl?, audience?, issuer?, deriveAudience? })` — one named input object. Audience defaults to the decoded FIT `app.id`, and issuer defaults to `forge/invocation-token`, so most callers can drop the audience/issuer arguments entirely. |

## New capabilities with no legacy equivalent

- `validateForgeRemoteRequest({ headers, ... })` validates a framework-neutral
  request (`{ authorization?, appSystemToken?, appUserToken? }`) into a
  `ForgeRemoteContext`, preserving forwarded Forge OAuth token headers as
  opaque `{ kind, token }` values instead of requiring callers to parse them.
- `buildForgeRemoteContext(...)` builds that same `ForgeRemoteContext` from
  already-verified values, with no `jose`, JWKS, or network dependency — useful
  for tests and for composing verification differently.
- `toHttpAuthFailureResponse(problem)` maps a `ProblemDetails` failure to
  `{ status, body }` without sending a response or depending on a framework.

## Example: authenticating a Forge Remote request

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
