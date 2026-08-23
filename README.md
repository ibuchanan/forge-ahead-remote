# @forge-ahead/remote

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

A helper library for externally hosted services that receive requests through
[Atlassian Forge](https://go.atlassian.com/forge)
[Remote](https://developer.atlassian.com/platform/forge/remote/). It provides
framework-neutral request authentication, remote invocation contract checks, and
A2A/Rovo helper values without owning route handlers, logging, storage, or
transport writes.

This package is currently private (`"private": true` in `package.json`), so use
it from this repository or a configured private workspace rather than installing
it from the public npm registry. The package is published as ESM and targets
Node 22 or newer.

## Quick Start

Install dependencies and build the package from this repository:

```sh
npm install
npm run build
```

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
  return sendResponse(status, body);
}

const context = result.value;
```

Wire a Forge-authenticated A2A server with `@a2a-js/sdk` and the Express
subpath:

```ts
import express from "express";
import { jsonRpcHandler } from "@a2a-js/sdk/server/express";
import {
  forgeRemoteAuthMiddleware,
  forgeRemoteUserBuilder,
  forgeRemoteServerCallContextBuilder,
} from "@forge-ahead/remote/express";

const app = express();

app.post(
  "/a2a",
  forgeRemoteAuthMiddleware({
    issuer: "forge/invocation-token",
  }),
  jsonRpcHandler({
    requestHandler: a2aRequestHandler,
    userBuilder: forgeRemoteUserBuilder,
    contextBuilder: forgeRemoteServerCallContextBuilder(),
  }),
);
```

## Capabilities

- Forge Remote authentication: `@forge-ahead/remote` verifies Forge
  Invocation Tokens, builds `ForgeRemoteContext`, and maps auth failures to
  HTTP-shaped data.
- JWT inspection: `@forge-ahead/remote/jwt` parses and inspects JWT structure
  without `jose` or network access.
- Verified context modeling: `@forge-ahead/remote/context` builds pure
  `ForgeRemoteContext` values from already verified inputs.
- Remote Invocation Contracts: `@forge-ahead/remote/invocation` checks
  route-level forwarded-token guarantees after request authentication.
- A2A protocol values: `@forge-ahead/remote/a2a` models task states, stream
  responses, signal mapping, and A2A-scoped JSON-RPC envelopes.
- Rovo connector helpers: `@forge-ahead/remote/rovo` validates Jira/Rovo
  remote-agent connector methods and formats connector-ready task responses.
- Express integration: `@forge-ahead/remote/express` provides FIT validation
  middleware, an A2A `UserBuilder`, and a `ServerCallContextBuilder` so an
  `@a2a-js/sdk` server can be authenticated by Forge.

`@forge-ahead/remote` does not own the A2A server framework (task store,
agent executor, request handler, transport writer, or server lifecycle). Those
are owned by `@a2a-js/sdk`. This package only provides Forge-specific
authentication and Atlassian formatting adapters.

The package does not include storage helpers, logging integration, product API
clients, or an SSE transport writer.

## Documentation

Platform references:

- [Forge](https://go.atlassian.com/forge)
- [Forge Remote overview](https://developer.atlassian.com/platform/forge/remote/)
- [Forge Remote essentials](https://developer.atlassian.com/platform/forge/remote/essentials/)
- [Call a remote from a Forge frontend](https://developer.atlassian.com/platform/forge/remote/calling-from-frontend/)
- [Call a remote from a Forge function](https://developer.atlassian.com/platform/forge/remote/calling-from-function/)
- [Call Atlassian app APIs from a remote](https://developer.atlassian.com/platform/forge/remote/calling-product-apis/)
- [Integrate remote agents with Jira](https://developer.atlassian.com/platform/forge/remote-agents-in-jira/)

| Need | Start here |
| --- | --- |
| Learn the contract layer | [Validate a Custom UI Remote Context](docs/tutorials/validate-a-custom-ui-remote-context.md) |
| Learn the Rovo/A2A path | [Handle a Rovo A2A Message Send](docs/tutorials/handle-a-rovo-a2a-message-send.md) |
| Apply route contracts | [Apply Remote Invocation Contracts](docs/how-to-guides/apply-remote-invocation-contracts.md) |
| Debug a rejected FIT | [Debug Forge Invocation Token validation](docs/how-to-guides/debug-forge-invocation-token-validation.md) |
| Look up exports and FIT policy | [Public API Reference](docs/reference/public-api.md) |
| Understand FIT verification | [Forge Invocation Token JWT Verification](docs/explanation/fit-jwt-verification.md) |
| Understand A2A and Forge Remote boundaries | [A2A SDK and Forge Remote Separation of Concerns](docs/explanation/a2a-sdk-separation-of-concerns.md) |
| Understand the architecture | [Sans-IO Layering](docs/explanation/sans-io-layering.md) |
| Match domain language | [CONTEXT.md](CONTEXT.md) |
| Review design decisions | [docs/adr/](docs/adr/) |

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for local setup, package scripts, project
layout, public boundary rules, and documentation maintenance notes.

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for repository contribution guidance.

## License

Apache-2.0. See [LICENSE](LICENSE).
