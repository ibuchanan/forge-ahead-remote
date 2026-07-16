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

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for local setup, package scripts, and
project layout. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for repository contribution guidance.

## License

Apache-2.0. See [LICENSE](LICENSE).
