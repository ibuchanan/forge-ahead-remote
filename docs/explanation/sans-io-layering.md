# Sans-IO Layering

`@forge-ahead/remote` is organized around a small value-oriented core rather
than a framework adapter. The package receives security-sensitive values from a
request boundary, classifies them, and returns typed data or Problem Details.
The caller remains responsible for HTTP routing, response sending, logging,
storage, and application policy.

The reason for this shape is that Forge Remote backends are not all built on the
same server framework. A helper that owns Express, Fastify, Hono, Forge storage,
or logging would make the first integration feel convenient while making the
next integration inherit accidental choices. Keeping those dependencies outside
the core lets the same authentication and contract rules work in more than one
runtime.

The root entrypoint is deliberately focused on Forge Remote authentication. It
verifies a Forge Invocation Token, chooses expected claims, records verification
metadata, and preserves forwarded Forge OAuth tokens as opaque values. It does
not decode forwarded tokens or turn a verified request into authorization
policy. Those decisions belong to the route and the application.

The `context` and `jwt` subpaths are even smaller. They are dependency-light
building blocks for code that needs to model an already verified request or
inspect JWT structure without importing `jose`. This keeps pure modeling code
available to tests, package consumers, and later extensions without pulling in
network-capable verification machinery.

Remote Invocation Contracts form a second explicit check after authentication.
Authentication answers whether the incoming request is a valid Forge Remote
request. Contract validation answers whether that verified request satisfies the
route's expected forwarded-token guarantees. Keeping those checks separate
prevents a route category mismatch from being mistaken for a failed Forge
Invocation Token.

The A2A and Rovo layers are separated for the same reason. A2A task states,
stream responses, artifact updates, and provider-neutral runtime signals are
useful without Jira's Rovo connector method names. Rovo then adds the
Atlassian-specific JSON-RPC methods and formatting expectations on top of the
A2A values. This direction of dependency keeps generic protocol values from
learning about connector quirks.

This design has a cost. Consumers assemble their own route handlers and
transport writes instead of importing a complete middleware stack. The tradeoff
is intentional: route code stays explicit at the boundary where teams already
need to make product, tenant, authorization, and operational decisions. The
package supplies stable contracts for the parts that should be shared, and it
leaves application ownership visible for the parts that vary.

Several ADRs record the design pressure behind this structure, including
[`0010`](../adr/0010-keep-core-sans-io-and-framework-neutral.md),
[`0036`](../adr/0036-remote-invocation-contract-validation-is-incoming-only.md),
[`0040`](../adr/0040-isolate-zod-to-the-a2a-subpath.md),
[`0041`](../adr/0041-separate-rovo-agent-connector-layer-from-a2a.md), and
[`0051`](../adr/0051-use-separate-a2a-and-rovo-subpaths.md).
