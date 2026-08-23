# Sans-I/O Layering

“Sans I/O” means that the core library works with values
rather than performing input/output itself.
It receives already-read request data
and returns typed values or Problem Details,
a structured error format that an HTTP layer can turn into a response.
It does not read HTTP requests,
send HTTP responses,
write logs,
call storage,
or make application authorization decisions.

That boundary is deliberate.
Forge Remote backends can use
Express,
Fastify,
Hono,
serverless handlers,
or another HTTP runtime.
A package that owned one of those frameworks
would make every other integration inherit that choice.
By keeping framework and operational I/O outside the core,
the same Forge verification and contract rules can work in each runtime.

## What the package owns

The package owns repeatable protocol and validation work:

- verifying a Forge Invocation Token (FIT),
  including its signature and expected claims;
- returning a verified Forge Remote Context or safe Problem Details;
- carrying forwarded Forge OAuth tokens as opaque values; and
- validating a Remote Invocation Contract
  and Agent2Agent (A2A) or Rovo protocol values.

“Opaque” means the package carries a forwarded OAuth token
without decoding or interpreting it.
The token is available to the application that needs it,
but the package does not treat it as a source of identity or authorization.

## What the application owns

The application sits at the I/O boundary.
It reads framework-specific request objects,
calls this package with the relevant values,
sends HTTP responses,
and decides what the verified context means for its route.

That includes application authorization.
A verified FIT establishes
that Forge sent a valid invocation for the expected application.
It does **not** answer
whether a particular user may perform a particular business action.
It also does not decide
how the application
logs,
stores data,
handles retries,
or calls external services.

## Authentication and route requirements answer different questions

Authentication asks:
**is this a valid Forge Remote request?**
The answer comes from FIT signature and claim verification.

A Remote Invocation Contract asks:
**does this verified request include the forwarded tokens this route requires?**
A route can therefore have a valid FIT
but still fail its contract.
For example,
when it requires a user token that was not forwarded.
Keeping these checks separate makes that failure
a route configuration problem
rather than a misleading FIT-validation failure.

## A2A comes before Rovo

The A2A layer models general agent protocol concepts:
task states, stream responses, artifacts, and provider-neutral runtime signals.
Those concepts do not depend on Jira or Rovo.

The Rovo layer adds Atlassian-specific JSON-RPC method names
and message formatting
on top of A2A.
The dependency direction is intentional:
generic A2A code does not need to know about connector-specific details,
while Rovo code can reuse the A2A model.

## The tradeoff

Consumers write a small amount of boundary code
instead of importing a complete middleware stack.
In exchange, the boundary remains visible where it matters:
teams can choose their HTTP framework, logging, authorization, tenant handling,
and operations without bypassing or adapting hidden package behavior.

The package centralizes the rules that should stay consistent across remotes;
applications retain ownership of the decisions that vary between remotes.

The architectural decisions behind this split are recorded in
[`0010`](../adr/0010-keep-core-sans-io-and-framework-neutral.md),
[`0036`](../adr/0036-remote-invocation-contract-validation-is-incoming-only.md),
[`0040`](../adr/0040-isolate-zod-to-the-a2a-subpath.md),
[`0041`](../adr/0041-separate-rovo-agent-connector-layer-from-a2a.md), and
[`0051`](../adr/0051-use-separate-a2a-and-rovo-subpaths.md).
