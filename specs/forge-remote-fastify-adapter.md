# Fastify authentication adapter for `@forge-ahead/remote`

## Status

**Proposal** — ready for implementation in the repository that publishes
`@forge-ahead/remote`.

## Summary

Add a first-class Fastify integration at `@forge-ahead/remote/fastify`.
The integration must validate Forge Invocation Tokens (FITs), attach the
verified `ForgeRemoteContext` to the Fastify request, and turn authentication
failures into the same HTTP responses already produced by the framework-neutral
core and the Express integration.

The package currently provides framework-neutral FIT validation plus an Express
adapter. Consumers using Fastify otherwise have to reimplement the same
framework glue: read Fastify headers, normalize them to the core input shape,
call `validateForgeRemoteRequest`, convert failures with
`toHttpAuthFailureResponse`, and decorate a request with the successful
context. This adapter makes that behavior consistent, documented, and tested
without moving application route logic into the package.

## Problem

A Forge Remote hosted with Fastify needs an authentication hook before it can
trust a request. The required mechanics are small but security-sensitive:

1. Read the `Authorization` header containing the FIT.
2. Read Forge's optional forwarded OAuth headers:
   - `x-forge-oauth-system`
   - `x-forge-oauth-user`
3. Supply those values in the canonical `ForgeRemoteRequestHeaders` shape.
4. Validate the request with `validateForgeRemoteRequest`.
5. On failure, return the status and problem body from
   `toHttpAuthFailureResponse` and stop request processing.
6. On success, make the resulting `ForgeRemoteContext` available to later
   hooks and route handlers.

Each consumer should not need to reproduce or independently test this adapter
logic. Slight differences in header lookup, error handling, or TypeScript
request decoration make integration more error-prone and reduce consistency
between supported HTTP frameworks.

## Goals

- Provide a Fastify `onRequest` hook that authenticates Forge Remote requests.
- Attach the verified `ForgeRemoteContext` as `request.forgeRemoteContext`.
- Use the existing framework-neutral validation and failure mapping functions;
  do not duplicate FIT verification logic.
- Match the existing Express adapter's configuration vocabulary and default
  forwarded-token header names.
- Preserve Fastify's hook behavior: an authentication failure sends a response
  and prevents the request from reaching the route handler.
- Provide complete TypeScript types, runnable examples, and integration tests.
- Keep Fastify optional for consumers not using it.

## Non-goals

- Do not add a web-server abstraction, route registration layer, storage,
  logging, product-API client, or application lifecycle manager.
- Do not own domain endpoint schemas, OpenAPI documents, request validation,
  route handlers, or response serialization beyond authentication failures.
- Do not add frontend (`@forge/bridge`) utilities; this is a server-side
  adapter.
- Do not replace the existing Express adapter or alter the framework-neutral
  validation API.
- Do not automatically enforce route-level invocation contracts in the first
  release. That is described under [Future work](#future-work).

## Public interface

Publish an ESM/CJS export at `@forge-ahead/remote/fastify`.

```ts
import fastify from "fastify";
import {
  forgeRemoteAuthHook,
  type ForgeRemoteAuthHookOptions,
} from "@forge-ahead/remote/fastify";

const app = fastify();
app.addHook("onRequest", forgeRemoteAuthHook());

app.post("/work", async (request) => {
  const context = request.forgeRemoteContext;
  // `context` is defined after the authentication hook succeeds.
  return { appId: context?.fit.app?.id };
});
```

### Exports

```ts
export interface ForgeRemoteAuthHookOptions
  extends ValidateAuthHeaderOptions {
  /** Header name for the forwarded Forge system OAuth token. */
  systemTokenHeader?: string;

  /** Header name for the forwarded Forge user OAuth token. */
  userTokenHeader?: string;
}

export function forgeRemoteAuthHook(
  options?: ForgeRemoteAuthHookOptions,
): onRequestAsyncHookHandler;
```

The entry point must also augment Fastify's request interface so consumers who
import this module receive the property type without writing their own module
augmentation:

```ts
declare module "fastify" {
  interface FastifyRequest {
    forgeRemoteContext?: ForgeRemoteContext;
  }
}
```

`forgeRemoteContext` remains optional because a Fastify request can be observed
outside the protected route path or before the hook has run. Route handlers that
require a context may assert its presence after registering the hook.

### Configuration behavior

| Option | Required | Default | Meaning |
| --- | --- | --- | --- |
| `issuer`, `audience`, `jwks`, and other `ValidateAuthHeaderOptions` | No | Core-library defaults | Passed to `validateForgeRemoteRequest`. These options support standard production configuration and deterministic tests. |
| `systemTokenHeader` | No | `x-forge-oauth-system` | Name of the incoming header that carries a forwarded Forge system token. |
| `userTokenHeader` | No | `x-forge-oauth-user` | Name of the incoming header that carries a forwarded Forge user token. |

Header lookup is case-insensitive. The adapter must normalize Fastify's header
representation to the canonical inputs expected by the core:

```ts
{
  authorization?: string;
  appSystemToken?: string;
  appUserToken?: string;
}
```

When Fastify exposes a header as a string array, use the first value, matching
the established adapter behavior. An absent header must remain absent rather
than becoming an empty string.

## Required behavior

`forgeRemoteAuthHook(options)` must return an async Fastify `onRequest` hook.
For each request it must:

1. Read `authorization`, the configured system-token header, and the configured
   user-token header from `request.headers`.
2. Call `validateForgeRemoteRequest` with those normalized headers and the
   supplied validation options.
3. If validation succeeds, set `request.forgeRemoteContext` to the returned
   context and allow Fastify to continue.
4. If validation fails, call `toHttpAuthFailureResponse` with the validation
   error, send its `status` and `body` via the Fastify reply, and return without
   calling downstream handlers.

The adapter must not:

- call downstream route handlers itself;
- mutate validation results;
- silently ignore a validation error;
- log tokens or decoded token claims; or
- add an HTTP dependency to the core package entry point.

## Packaging and dependency rules

- Add a `./fastify` export condition pair for ESM and CommonJS, matching the
  package's existing subpath-export convention.
- Make `fastify` an **optional peer dependency**, with a supported range
  matching the Fastify version used in adapter tests. It must not become a
  dependency of the package's root entry point.
- Put Fastify-specific implementation and types behind the new subpath so
  consumers of the core package do not load Fastify.
- Retain the package's current Node engine policy and module format.
- Do not add `fastify-plugin` unless required by a concrete Fastify lifecycle
  limitation; a hook factory is sufficient for this scope.

## Implementation outline

1. Create a Fastify-specific source module.
2. Define the request-interface augmentation and public option type.
3. Implement a private header reader that accepts Fastify header values and
   returns a single string or `undefined`.
4. Implement `forgeRemoteAuthHook` solely as an adapter around
   `validateForgeRemoteRequest` and `toHttpAuthFailureResponse`.
5. Add the `./fastify` package export and optional peer metadata.
6. Add documentation and tests described below.

The adapter should stay thin. FIT/JWKS verification, context construction, and
failure classification remain implementation details of the core library.

## Acceptance criteria

### Runtime behavior

- A request with a valid FIT reaches the protected Fastify route and the route
  can read a verified `request.forgeRemoteContext`.
- A request without a FIT receives the core library's authentication failure
  status and body; the protected route is not invoked.
- A malformed or invalid FIT behaves identically to the equivalent
  framework-neutral validation call.
- A JWKS or verification-infrastructure failure is translated using
  `toHttpAuthFailureResponse` rather than leaking a raw exception.
- Configured alternate forwarded-token header names are honored.
- Default forwarded-token headers populate the context's forwarded system and
  user token values when valid values are supplied.
- Fastify string-array header values use the first element; missing values are
  omitted.

### Type and package behavior

- A TypeScript consumer importing `@forge-ahead/remote/fastify` can access
  `request.forgeRemoteContext` without defining its own Fastify module
  augmentation.
- The root package can still be installed and imported without Fastify.
- ESM and CommonJS import paths resolve according to the package's existing
  export policy.
- A package dry-run includes the generated Fastify entry point and its type
  declarations.

### Documentation behavior

- The package README or a linked guide contains the Quick Start shown above.
- The guide identifies the default Forge forwarded-token header names and
  explains how to override them.
- The guide states that routes must only trust the context after the hook is
  registered and has completed successfully.

## Test plan

Use Fastify's in-process `inject` facility; no network listener is required.
Tests should generate a signed FIT and supply a test JWKS resolver through
`ForgeRemoteAuthHookOptions`.

Cover at least:

1. Valid FIT attaches the expected context and allows a route response.
2. Missing `Authorization` header returns an authentication failure and skips
   the route.
3. Invalid signature and expired token are rejected.
4. A configured JWKS failure becomes the core-defined infrastructure failure.
5. Default and overridden system/user forwarded-token headers are normalized
   correctly.
6. Typechecking validates the Fastify request augmentation.
7. Package/export checks verify the `./fastify` artifact is published.

The package may use local signing helpers in its own tests. A public test-helper
API is not required for this feature.

## Future work

### Public testing helpers

If multiple consumers repeat signed-FIT setup, add a separate,
explicitly-test-only `@forge-ahead/remote/testing` entry point. A future helper
could return a signed authorization header plus compatible validation options
and permit claim/key overrides. Keep this out of the initial Fastify adapter so
the production adapter remains small and its public contract does not grow
prematurely.

### Optional invocation-contract guard

The package already models route-level invocation contracts such as Custom UI,
backend-function, and scheduled-trigger invocations. A later Fastify utility
could validate a declared contract after authentication and translate contract
failures into problem responses. This should be designed separately because its
HTTP status/body policy and route-level composition are distinct from FIT
validation.

## Alternatives considered

### Keep adapter code in every Fastify service

This preserves the smallest package surface but duplicates authentication glue
at every service. The behavior is security-sensitive and already has a
framework-specific precedent for Express, so duplication is not desirable.

### Make Fastify a dependency of the root package

This would simplify exports but forces an unrelated server dependency on all
users of the framework-neutral core. A subpath export plus optional peer keeps
the core portable.

### Add a generic server abstraction

A server abstraction would own more lifecycle and transport behavior than is
needed for authentication. It would reduce rather than improve the package's
current framework-neutral depth. Small, focused adapters are the appropriate
seam.

### Add OpenAPI or route-handler support

Endpoint schemas and business handlers are application-specific. Owning them
would make the package responsible for concerns that belong to the consuming
Remote service.
