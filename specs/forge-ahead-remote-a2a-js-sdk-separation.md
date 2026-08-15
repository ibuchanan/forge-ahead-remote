# Upstream Guidance: `@forge-ahead/remote` and `@a2a-js/sdk` Separation of Concerns

## Overview

The `@forge-ahead/remote` library was created before the official A2A JavaScript
SDK (`@a2a-js/sdk`) existed. As a result, it contains surfaces that overlap with
the generic A2A server framework: A2A type definitions, state-transition
helpers, JSON-RPC envelope helpers, and response formatting. Now that
`@a2a-js/sdk` is the canonical implementation of the A2A protocol for
JavaScript, `@forge-ahead/remote` should narrow its scope to
**Atlassian/Forge-specific concerns** and provide **adapters** to
`@a2a-js/sdk` rather than competing with it.

This document is written for maintainers of `@forge-ahead/remote`. It assumes no
knowledge of any particular consumer repository.

## Description

The A2A protocol is provider-neutral. A generic server should be able to expose
tasks, streaming status updates, artifacts, and JSON-RPC endpoints without
knowing anything about Atlassian Forge, Jira, or Rovo. `@a2a-js/sdk` owns that
generic layer.

Atlassian Forge adds a specific authentication and invocation contract on top
of A2A:

- **Forge Invocation Tokens (FITs)** prove that a request came from the Forge
  platform.
- **Forwarded tokens** (`X-Forge-OAuth-System`, `X-Forge-OAuth-User`) allow the
  remote to call back into Atlassian APIs.
- **Remote Invocation Contracts** define which forwarded tokens a route requires.
- **Rovo/Jira remote-agent connectors** send A2A requests using specific method
  names and parameter shapes.

These concerns are Atlassian-specific. They belong in `@forge-ahead/remote`.

## Key Requirements

### 1. Remove or deprecate A2A server-framework surfaces

`@forge-ahead/remote` should not define:

- Task stores (`TaskStore`, `InMemoryTaskStore`, or equivalents).
- Agent executors (`AgentExecutor` or equivalents).
- Request handlers (`DefaultRequestHandler` or equivalents).
- Transport adapters (SSE writers, JSON-RPC framing, Express routers).
- Server lifecycle management.

These are owned by `@a2a-js/sdk`. If any such surfaces currently exist in
`@forge-ahead/remote`, they should be deprecated and removed in a future major
version.

### 2. Align A2A types with `@a2a-js/sdk`

`@forge-ahead/remote` currently exports its own `Task`, `Message`, `TaskState`,
`Artifact`, `StreamResponse`, and JSON-RPC types. These are useful as pure
helpers, but they risk diverging from `@a2a-js/sdk`.

- Prefer to re-export or depend on `@a2a-js/sdk` types where the library
  surfaces A2A-shaped values.
- If independent types are kept, ensure they are structurally compatible with
  `@a2a-js/sdk` and provide explicit conversion helpers.
- Avoid a second `TaskState` representation. For example, do not use a string
  union (`"working" | "completed"`) if `@a2a-js/sdk` uses a protobuf enum
  (`TaskState.TASK_STATE_WORKING`). Provide a mapping function instead.

### 3. Provide FIT-to-A2A adapters

The most important integration surface is turning a validated Forge request into
an A2A request context. `@forge-ahead/remote` should ship ready-to-use adapters
for `@a2a-js/sdk`:

- **Express middleware** that validates the FIT and attaches a
  `ForgeRemoteContext` to the request. It should reject invalid requests with
  the correct HTTP status (401 for auth failures, 502 for TLS/JWKS
  infrastructure failures).
- **A `UserBuilder`** for `@a2a-js/sdk/server/express` that reads the attached
  `ForgeRemoteContext` and returns an A2A `User`.
- **A `ServerCallContextBuilder` helper** that extracts the tenant (Jira
  `cloudId`) from the `ForgeRemoteContext` and sets it as `tenant` in the A2A
  call context.

These adapters should make it possible to write a Forge-authenticated A2A server
without any custom FIT parsing code.

### 4. Keep Remote Invocation Contracts

Continue to own:

- `RemoteInvocationContract` definition.
- `defineRemoteInvocationContract` and `validateRemoteInvocationContract`.
- Presets such as `customUiInvocation`, `backendFunctionInvocation`,
  `asyncEventInvocation`, and `externalRemoteInvocation`.

These contracts are Atlassian-specific and complement `@a2a-js/sdk`. The
validation result should be easy to use inside the FIT middleware or
`UserBuilder` to reject requests that do not satisfy the contract.

### 5. Focus Rovo/Jira helpers on formatting and validation

Keep the Rovo/Jira remote-agent helpers, but align them with `@a2a-js/sdk`:

- `isRovoAgentConnectorRequest` should validate that an incoming JSON-RPC
  request uses the method names and parameter shapes that Jira/Rovo sends.
- Formatting helpers should produce `@a2a-js/sdk`-compatible `Task` objects,
  not alternative wire formats.
- If Jira expects a specific task response shape, provide a function that
  transforms an `@a2a-js/sdk` `Task` into that shape rather than
  reimplementing the whole response.

### 6. Keep JWT helpers Forge-scoped but reusable

Keep low-level JWT utilities (`parseJwt`, `getKeyIdFromToken`, `isJwtExpired`,
`createJwksKeyStore`, etc.) as pure helpers. They should remain usable from any
middleware pattern, including `@a2a-js/sdk`'s `UserBuilder`.

### 7. Add Atlassian ARI parsing

`@forge-ahead/remote` should export an `extractCloudId` helper that parses the
Jira site ARI (`ari:cloud:jira::site/{cloudId}`). This is a common
Atlassian-specific need for any Forge Remote backend. Consumers should not have
to copy this regex into their own code.

### 8. Document the boundary

The README and examples should clearly state:

- Use `@a2a-js/sdk` to build the A2A server (agent card, JSON-RPC, task store,
  executor, streaming).
- Use `@forge-ahead/remote` for Forge FIT validation, Forge Remote context,
  Remote Invocation Contracts, and Rovo/Jira connector helpers.
- Provide an end-to-end example that wires both libraries together.

## Success Criteria

- [ ] `@forge-ahead/remote` no longer defines A2A server abstractions
  (`TaskStore`, `AgentExecutor`, transport handlers, etc.).
- [ ] A consumer can build a Forge-authenticated A2A server using only
  `@a2a-js/sdk` + `@forge-ahead/remote` adapters.
- [ ] A2A types exported by `@forge-ahead/remote` are compatible with
  `@a2a-js/sdk` types, or `@a2a-js/sdk` types are re-exported.
- [ ] `@forge-ahead/remote` provides an Express middleware and `UserBuilder` for
  FIT-to-A2A integration.
- [ ] `@forge-ahead/remote` exports an `extractCloudId` helper for Atlassian
  ARIs.
- [ ] Rovo/Jira helpers produce `@a2a-js/sdk`-compatible values.
- [ ] Examples and documentation show the correct boundary between the two
  libraries.

## Migration Steps

1. Audit `@forge-ahead/remote` exports for overlap with `@a2a-js/sdk`.
2. Mark overlapping A2A server-framework exports as deprecated.
3. Add `@a2a-js/sdk` as a peer or optional dependency.
4. Implement the FIT-to-A2A middleware and `UserBuilder`.
5. Add `extractCloudId` and any other missing Atlassian-specific helpers.
6. Update Rovo/Jira helpers to consume and produce `@a2a-js/sdk` types.
7. Remove deprecated surfaces in the next major version.
8. Update documentation and examples.

## Security Considerations

- FIT validation must still happen before the request reaches `@a2a-js/sdk`
  handlers.
- Forwarded-token requirements must be enforced before the A2A request is
  accepted.
- Tenant (`cloudId`) and user identity derived from the FIT must be passed into
  the A2A context so that task storage can be scoped correctly.
- Do not expose raw FIT claims as A2A user identity without verifying the token
  first.

## References

- [`@a2a-js/sdk` README](https://github.com/a2aproject/a2a-js)
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [Forge Remote documentation](https://developer.atlassian.com/platform/forge/remote/)
- [Forge Invocation Token (FIT) documentation](https://developer.atlassian.com/platform/forge/remote/invocation-token/)
- [`@forge-ahead/remote` README](https://github.com/ibuchanan/forge-ahead-remote)
