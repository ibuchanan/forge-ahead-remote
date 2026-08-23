# A2A SDK and Forge Remote Separation of Concerns

A2A is a provider-neutral protocol. An A2A server needs to model agents,
tasks, messages, artifacts, JSON-RPC requests, streaming updates, and the
lifecycle that connects them. None of those concerns require knowledge of
Atlassian Forge, Jira, or Rovo.

`@a2a-js/sdk` is the canonical JavaScript implementation of that general
protocol layer. `@forge-ahead/remote` therefore does not try to be a second
A2A server framework. Its role is to make an A2A server usable as a Forge
Remote backend without making the A2A server itself Forge-aware.

The distinction is about ownership, rather than whether the two packages are
used together. A Forge-authenticated agent commonly uses both packages in the
same request path. The SDK owns the generic agent server; this package owns the
Atlassian-specific context that reaches it.

## The generic A2A server belongs to `@a2a-js/sdk`

An A2A server has concerns that should be the same whether its caller is a
Forge app, another product, or a standalone client. These include the agent
card, task storage, task execution, request dispatch, JSON-RPC handling,
streaming transport, and server lifecycle.

Those are framework concerns. If `@forge-ahead/remote` supplied competing task
stores, executors, request handlers, or transport adapters, consumers would
need to choose between two owners of the same protocol machinery. The result
would be duplicated abstractions and a risk that types and wire behavior drift
from the canonical SDK.

For the same reason, A2A-shaped values in `@forge-ahead/remote/a2a` are SDK
values. The subpath re-exports types such as `Task`, `Message`, `Artifact`, and
`TaskState` from `@a2a-js/sdk`. A legacy helper can still describe a useful
protocol property, but it must not create a competing representation of an A2A
task or state.

This lets a value produced by the SDK move through Forge- and Rovo-specific
helpers without conversion merely because it crossed a package boundary.

## The Forge Remote boundary belongs to `@forge-ahead/remote`

Forge adds facts that a general A2A server cannot infer or safely assume:

- a Forge Invocation Token (FIT) establishes that Forge invoked the remote;
- forwarded system and user OAuth tokens can authorize calls back to Atlassian;
- a Remote Invocation Contract states which forwarded tokens a route requires;
- Forge claims carry tenant and application context; and
- Atlassian resource identifiers, such as a Jira site ARI, have
  Atlassian-specific structure.

These are not A2A concepts. They remain the responsibility of
`@forge-ahead/remote`, whose verification APIs build a verified
`ForgeRemoteContext` only after validating the FIT. The context carries
verification metadata and forwarded tokens as distinct, opaque values.

The package also parses Forge-specific data such as a Jira `cloudId` from a
site ARI. That small helper belongs here because it captures a recurring
Atlassian convention without teaching a generic A2A SDK about Atlassian
identifiers.

## Authentication is composed before A2A handling

A Forge-authenticated A2A route has two adjacent boundaries. The
HTTP-facing boundary verifies the FIT and obtains a trusted Forge context. The
A2A-facing boundary then passes the request to the SDK with the identity and
tenant information the application chooses to derive from that trusted context.

Authentication occurs first. Until FIT verification succeeds, claims are
untrusted data and must not become an A2A user identity, a tenant key, or an
authorization decision. A failed verification is an HTTP authentication or
infrastructure failure, not an A2A task failure.

A Remote Invocation Contract answers a separate question: after the request is
trusted as a Forge invocation, does it contain the forwarded token required by
this route? A valid FIT does not guarantee that a user token or system token
was forwarded. Separating these checks preserves an accurate failure boundary:
token verification proves the caller; the contract checks the route's
capabilities.

The Express integration illustrates the composition without making Express the
core architecture. FIT validation middleware attaches a
`ForgeRemoteContext` to the framework request. SDK integration can then derive
an A2A user and call context, including a tenant derived from the verified
Forge context. Other frameworks can compose the same pure verification and
context-building operations at their own request boundary.

## Rovo is an Atlassian dialect layered on A2A

Rovo and Jira communicate with an agent through A2A-shaped JSON-RPC messages,
but they also establish connector-specific expectations: accepted method names,
parameter shapes, and response formatting. For example, Jira uses `id` for
some task operations and expects agent messages to carry task and context
identifiers in a particular form.

`@forge-ahead/remote/rovo` owns that narrow dialect. It validates whether an
incoming request matches the Jira/Rovo connector surface and formats an SDK
`Task` for the connector. It does not replace task execution, state storage, or
streaming with a Rovo-specific server.

The dependency direction matters:

```text
@a2a-js/sdk
    ↑
@forge-ahead/remote/a2a
    ↑
@forge-ahead/remote/rovo

@forge-ahead/remote (FIT, context, contracts, ARIs)
    └── composed with the route and SDK server
```

Rovo code may depend on A2A concepts because it specializes them. Generic A2A
code must not depend on Rovo, and neither A2A nor Rovo formatting needs a
Forge Remote context. Route code composes authentication, invocation-contract
validation, and protocol handling according to its security requirements.

## Why the boundary is useful

This separation keeps the protocol and platform concerns independently
changeable. The A2A SDK can follow the protocol without inheriting Forge
security rules. Forge integrations can evolve FIT verification, forwarded-token
contracts, or ARIs without creating an Atlassian fork of the A2A server model.
Rovo-specific compatibility remains a small adapter layer rather than a
requirement imposed on every A2A consumer.

It also makes security ownership visible. The SDK receives an authenticated
identity and tenant context only after the application has established trust.
The application retains responsibility for its own authorization, storage
partitioning, logging, retries, and operational policies. Neither a valid FIT
nor a valid A2A request answers those application-specific questions on its
own.

The result is a deliberate composition: use `@a2a-js/sdk` for the generic A2A
server, and use `@forge-ahead/remote` where a Forge Remote backend needs
verified Forge context, invocation contracts, Atlassian identifiers, or
Rovo/Jira connector adaptation.

For a worked integration, see [Handle a Rovo A2A `message/send` request](../tutorials/handle-a-rovo-a2a-message-send.md). For the public APIs, see the [Public API Reference](../reference/public-api.md). The decisions behind the internal layering are recorded in [`0040`](../adr/0040-isolate-zod-to-the-a2a-subpath.md), [`0041`](../adr/0041-separate-rovo-agent-connector-layer-from-a2a.md), [`0044`](../adr/0044-a2a-work-stops-before-sse-transport.md), [`0045`](../adr/0045-a2a-and-rovo-helpers-do-not-require-forge-remote-context.md), and [`0051`](../adr/0051-use-separate-a2a-and-rovo-subpaths.md).
