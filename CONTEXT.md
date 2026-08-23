# Forge Remote Helper Library

This repository defines helper packages for building Atlassian Forge Remote
backends. The first implementation slice is authentication, but the domain is
broader than token verification.

## Language

**Forge Remote Helper Library**:
A set of reusable helper packages for externally hosted services that receive
requests through Forge Remote. Authentication is the first concern, not the
long-term product boundary.
_Avoid_: auth package, FIT library, copied logging package

**Remote Authentication**:
The first implementation slice of the Forge Remote Helper Library: parsing and
verifying Forge Invocation Tokens, resolving Atlassian signing keys, and turning
request-boundary authentication failures into structured results.
_Avoid_: whole remote framework, generic JWT framework

**Remote Authentication Failure**:
A request-boundary failure to authenticate a Forge Remote request, covering
missing or malformed authentication input, malformed Forge Invocation Tokens,
tokens rejected by verification, missing verification parameters, and
verification infrastructure failures before they are mapped into caller-facing
Problem Details.
_Avoid_: generic error, HTTP response, jose error

**Forge Invocation Token**:
The signed JWT attached by Forge to Forge Remote requests. The library verifies
it as a token from Forge while treating its Forge-specific claim shape as
permissive because different remote invocation paths expose different fields.
_Avoid_: context token, generic JWT, OAuth token

**Forwarded Forge Token Context**:
The request context formed from a verified Forge Invocation Token plus optional
Forge-forwarded OAuth token headers. Later helpers should be able to consume this
context without re-parsing raw headers or inventing another request model.
_Avoid_: raw header bag, middleware-only context, OAuth helper

**Forwarded Forge Token**:
An OAuth access token forwarded by Forge to a remote backend, represented as a
self-describing value object even before the library manages token metadata or
lifecycle.
_Avoid_: raw token string, bearer token, stored system token

**Opaque Forwarded Token**:
A Forwarded Forge Token treated as an uninterpreted access-token value by the
auth-first slice. The core records the token and kind but does not decode,
inspect, or trust its claims.
_Avoid_: decoded OAuth claims, inferred expiry, token introspection

**Forge Remote Context**:
The framework-neutral value returned after a Forge Remote request is
authenticated. It contains the verified permissive Forge Invocation Token payload
and, when present, the Forwarded Forge Token Context needed by later helper
capabilities.
_Avoid_: Express request, JWT payload, auth result

**Remote Invocation Contract**:
The declared Forge Remote request category for an inbound remote route. It
defines whether the request is authenticated by a Forge Invocation Token or by
another mechanism, which forwarded tokens Forge guarantees for that route, and
what acknowledgement or response shape the caller expects.
_Avoid_: invocation shape, trigger type, framework route, A2A protocol,
JSON-RPC contract

**Remote Invocation Contract Validation**:
The pure check that a Forge Remote Context satisfies a Remote Invocation
Contract's incoming authentication and forwarded-token requirements before
route-specific handling continues. Outgoing acknowledgement and response shape
are part of the contract description, but not enforced by this validation.
_Avoid_: middleware validation, route handling, protocol validation,
framework adapter

**Remote Invocation Contract Mismatch**:
A Problem Details failure returned when a verified Forge Remote Context does not
satisfy the declared Remote Invocation Contract, such as a required forwarded
token being absent.
_Avoid_: authentication failure, invalid FIT, thrown contract error, boolean
validation failure

**Remote Invocation Contract Match**:
The narrowed success value returned after Remote Invocation Contract Validation,
containing the Forge Remote Context plus typed guarantees promised by the matched
contract.
_Avoid_: original context, boolean success, unchecked route context

**Remote Invocation Contract Preset**:
A named, library-provided Remote Invocation Contract for a Forge Remote request
category evidenced by reference implementations, such as Custom UI invocation,
backend-function invocation, async event invocation, scheduled-trigger
invocation, or External Remote Invocation.
_Avoid_: hardcoded route, exhaustive Forge trigger list, framework preset

**Invocation Subpath**:
The future `@forge-ahead/remote/invocation` entrypoint for Remote Invocation
Contract types, presets, builders, and validation.
_Avoid_: context subpath, root auth API, framework adapter package

**External Remote Invocation**:
A Remote Invocation Contract for a public route reached from outside Forge that
does not carry a Forge Invocation Token. Its authentication mechanism and any
system-token rehydration are owned by the caller's application code or later
helper capabilities, not by Remote Authentication.
_Avoid_: unauthenticated Forge request, Basic auth helper, public trigger,
stored system token flow

**A2A Contract Layer**:
The remote-agent helper layer that models Agent2Agent task, message, artifact,
stream-event, and task-state lifecycle rules without binding them to Rovo method
names, JSON-RPC transport, framework routes, Forge Remote Context, or storage.
_Avoid_: generic JSON-RPC helper, Rovo connector, route handler, auth context,
task store

**A2A Contract Validation**:
The shallow runtime checks that protect A2A route and adapter boundaries, such
as stream-response variant exclusivity and legal task-state transitions, without
deeply validating provider-specific payload content.
_Avoid_: full schema validation, provider validation, business-rule validation,
transport validation

**A2A Subpath**:
The future dependency-isolated `@forge-ahead/remote/a2a` entrypoint for A2A
Contract Layer types, helpers, and validation. It may carry protocol-specific
dependencies that should not be treated as part of the root Remote Authentication
surface.
_Avoid_: root remote API, auth dependency, generic protocol package

**Rovo Agent Connector Layer**:
The remote-agent helper layer that adapts the A2A Contract Layer to Atlassian's
Rovo/Jira remote-agent JSON-RPC methods, parameter quirks, and response
formatting expectations.
_Avoid_: A2A core, generic JSON-RPC, route handler, simulator

**Rovo Subpath**:
The future `@forge-ahead/remote/rovo` entrypoint for Rovo Agent Connector Layer
types, method narrowing, validation, and pure formatting.
_Avoid_: A2A subpath, root auth API, route adapter, simulator

**Rovo Agent Connector Formatting**:
Pure value-to-value formatting that adapts A2A tasks or stream payloads to
Rovo/Jira remote-agent JSON-RPC response expectations.
_Avoid_: HTTP response writer, SSE writer, task storage, route adapter

**Remote Agent Signal Mapping**:
The provider-neutral translation from application or agent-runtime progress
signals into A2A-visible state, content, and artifact events. It is pure and
does not know task identifiers, context identifiers, timestamps, storage, or wire
encoding.
_Avoid_: runtime event bus, SSE adapter, provider event schema, task session

**A2A Stream Envelope**:
A pure encoded A2A JSON-RPC stream payload value ready for a transport layer to
write. It does not set headers, flush, manage connections, handle disconnects,
or own Server-Sent Events lifecycle behavior.
_Avoid_: SSE writer, HTTP response, stream adapter, connection manager

**Normalized Remote Context**:
Forge Remote Context that contains explicit trusted or intentionally preserved
values, not the raw request headers or HTTP request object it was built from.
_Avoid_: header bag, request snapshot, raw transport context

**Verification Metadata**:
The non-secret facts about how a Forge Remote request was verified, such as the
expected audience and issuer. It records verification context without adding raw
headers, logs, or framework behavior.
_Avoid_: debug log data, unverified claims, request metadata bag

**Forge Remote Context Builder**:
A pure function that creates Forge Remote Context from an already verified Forge
Invocation Token payload and optional forwarded token values. It performs no
verification, network access, framework integration, logging, or storage.
_Avoid_: auth middleware, verifier, request handler

**Context Subpath**:
The dependency-light `@forge-ahead/remote/context` entrypoint for Forge Remote
Context types, permissive Forge Invocation Token payloads, and pure builders. It
lets callers model verified remote request context without importing `jose` or
verification helpers.
_Avoid_: root-only context API, middleware entrypoint, request adapter

**JWKS Resolution**:
The process of choosing the public signing-key source used to verify a Forge
Invocation Token. In the first slice, callers may inject a key store or concrete
JWKS URL, but the library does not own deployment-specific app or isolated-cloud
routing policy.
_Avoid_: isolated-cloud framework, app registry, tenant routing

**Verification Infrastructure Failure**:
A failure to complete FIT verification because signing keys or network
dependencies could not be reached or loaded. It is distinct from a verified
decision that the token itself is invalid.
_Avoid_: invalid token, auth rejection, caller unauthorized

**HTTP Auth Failure Mapping**:
A framework-neutral conversion from Remote Authentication Problem Details to an
HTTP status and response body. It is data-only and does not install route
middleware or mutate framework request objects.
_Avoid_: Express middleware, framework adapter, response sender

**Sans-IO Remote Core**:
The value-oriented center of the Forge Remote Helper Library. It parses,
classifies, and models Forge Remote data without binding to HTTP frameworks,
runtime globals, storage systems, logging systems, or app infrastructure.
_Avoid_: middleware core, framework wrapper, service runtime

**Remote Extension Package**:
An optional package built on top of the Forge Remote Helper Library for a
specific framework, runtime, or integration style. Extensions may perform I/O or
bind to middleware APIs, but the core library does not.
_Avoid_: core feature, built-in adapter, required dependency

**Remote Logging Subpath**:
A pure `@forge-ahead/remote/logging` subpath that creates whitelist-only Forge
Remote log records without selecting or writing to a logger. It is separate
from the root API but ships in this package.
_Avoid_: built-in logger, raw context logging, root logging export

**Safe Remote Context Summary**:
A whitelist-based log value derived from Forge Remote Context that exposes only
known-safe verification, principal subject, and forwarded-token presence facts.
It does not recursively log arbitrary Forge Invocation Token claims or profile
data.
_Avoid_: redacted context, raw FIT log, claim dump

**Remote Logging Demonstration**:
A reference implementation use of app-local logs to make Remote Authentication,
Remote Invocation Contract Validation, and A2A-visible behavior understandable
without making those logs required production behavior.
_Avoid_: hidden event channel, production logging policy, core behavior

**Standalone Package Repository**:
A repository whose root package is the published helper package. Integration with
`forge-ahead` happens by migrating known consumers directly or adding a deliberate
temporary bridge, not by nesting this package under a monorepo `packages/`
directory.
_Avoid_: extracted monorepo package, workspace package, packages/remote

**Breaking Extraction**:
A migration stance where the extracted package may change old `forge-ahead`
remote helper contracts when that improves the long-term API. Existing consumers
are reference inputs, not compatibility constraints.
_Avoid_: source-compatible extraction, re-export bridge, legacy lock-in

**Verification Options**:
The named input object passed to FIT verification helpers. It carries the token,
expected claims, and injected JWKS dependencies without relying on positional
argument ordering.
_Avoid_: positional verify arguments, overload ladder, hidden defaults

**Expected Claims Selection**:
The request-boundary process for choosing the expected Forge Invocation Token
claims used for verification, including audience and issuer expectations, before
the token is trusted.
_Avoid_: token verification, claim validation, authorization policy

**Forge Issuer Default**:
The default `forge/invocation-token` issuer expected by Forge request-boundary
validators. Lower-level verification only enforces issuer when the caller passes
one explicitly.
_Avoid_: global JWT issuer default, hidden low-level verification policy

**Audience Derivation**:
The request-boundary process for choosing the expected JWT audience when callers
do not provide one explicitly. The default derives it from the decoded FIT
`app.id`, with an override hook for caller policy.
_Avoid_: hardcoded app registry, hidden app allowlist, required explicit audience

**Unverified FIT Payload**:
A decoded Forge Invocation Token payload read before signature verification. It
may be used to select verification parameters, but never to authorize a request
or trust tenant, app, user, or cloud identity.
_Avoid_: verified payload, trusted claims, auth context

**Auth Header Validation Input**:
The named input object passed to auth-header validation. It carries the raw
Authorization header plus verification options in one value instead of splitting
request data and dependencies across positional arguments.
_Avoid_: authHeader plus options, mixed call style, overloaded validator

**Auth Header Validator**:
The public lower-level request-boundary helper that verifies an Authorization
header and returns only the verified permissive Forge Invocation Token payload.
Use it when callers do not need a full Forge Remote Context.
_Avoid_: private helper, context builder, middleware

**Root Verification Shell**:
The root `@forge-ahead/remote` entrypoint that adds `jose`, JWKS, and
Problem Details-producing request-boundary validation on top of the pure `jwt`
and `context` subpaths.
_Avoid_: verify subpath, pure core, framework adapter

**JWKS Key Store Factory**:
The public verification helper that creates a reusable `jose` remote key store
from the default or injected JWKS URL. It is preferred over exposing one-shot raw
JWKS fetch helpers.
_Avoid_: public JWKS fetcher, raw key set API, per-request fetch, transport abstraction

**Request-Boundary Validator**:
A helper that turns request authentication failures into structured
`Result<..., ProblemDetails>` values. It owns auth failure classification for
callers that are handling inbound Forge Remote requests.
_Avoid_: low-level verifier, jose wrapper, thrown auth error

**Forge Remote Request Validation Input**:
The named input object passed to Forge Remote request validation. It carries
framework-neutral request headers plus verification options in one value instead
of mixing positional request data with separate dependency options.
_Avoid_: headers plus options, framework request object, mixed validator style

**Capability Sequence**:
The order in which Forge Remote helper capabilities are extracted and hardened.
It starts with Remote Authentication while leaving room for later helper areas
seen in reference implementations.
_Avoid_: permanent scope, one-package boundary

**Reference Implementation**:
A runnable Forge Remote app used as evidence for expected architecture,
integration pressure, and future helper opportunities. It may show patterns
that are intentionally deferred from the first implementation slice.
_Avoid_: direct source template, normative production framework
