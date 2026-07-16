# Remote Invocation and A2A Tickets

These tickets turn the first two capability areas from
`remote-capability-roadmap.md` into tracer-bullet implementation slices.
Numbering continues from `remote-future-work-tickets.md`, which currently ends
at 16.

## Status: done

All eight tickets below (17-24) are implemented, tested, and merged to
`main`. `@forge-ahead/remote` now ships `/invocation`, `/a2a`, and `/rovo`
subpaths covering both capability areas this file was scoped to. See
`remote-capability-roadmap.md` for the remaining, not-yet-ticketed capability
themes (safe logging, product API access, storage abstraction, regional
endpoint resolution, cloud identifier helpers) to pick up next.

## 17 - Add the Invocation Subpath and contract builder

**What to build:** A new Invocation Subpath where callers can define a Remote
Invocation Contract, describe its incoming authentication and forwarded-token
requirements, and validate a Forge Remote Context against those requirements as
a second explicit step after request authentication.

**Blocked by:** 08 - Prove the extraction against known consumers and docs.

**Status:** done.

- [x] `@forge-ahead/remote/invocation` exposes Remote Invocation Contract types,
      a `defineRemoteInvocationContract(...)` builder, and contract metadata for
      FIT-present and FIT-absent request categories.
- [x] Contract validation is framework-neutral, performs no request
      authentication, and is not folded into `validateForgeRemoteRequest()`.
- [x] Successful validation returns a Remote Invocation Contract Match that
      carries the original Forge Remote Context plus narrowed typed guarantees.
- [x] Failed validation returns `Result<..., ProblemDetails>` with a distinct
      Remote Invocation Contract Mismatch problem, not a FIT verification
      failure.
- [x] Tests prove caller-defined contracts can require forwarded system and/or
      user tokens, narrow successful matches, and reject missing required tokens.

## 18 - Add Remote Invocation Contract presets

**What to build:** Named contract presets for the evidenced Forge Remote route
categories, so route code can pick a domain-level contract rather than
redeclaring common token and acknowledgement expectations by hand.

**Blocked by:** 17 - Add the Invocation Subpath and contract builder.

**Status:** done.

- [x] Presets exist for Custom UI invocation, backend-function invocation,
      async event invocation, scheduled-trigger invocation, and External Remote
      Invocation.
- [x] FIT-backed presets validate only incoming authentication and forwarded-token
      guarantees, returning narrowed matches for required system and user token
      combinations.
- [x] The External Remote Invocation preset records FIT absence, caller-owned
      authentication, installation identifier expectation, and possible later
      system-token rehydration without implementing Basic auth, storage, or
      token rehydration.
- [x] Preset response and acknowledgement shapes are exposed as descriptive
      metadata only; no validator builds or enforces HTTP responses.
- [x] Documentation shows route-level composition:
      authenticate the request, validate the Remote Invocation Contract, then
      run route-specific handling.

## 19 - Add the A2A Subpath and contract layer

**What to build:** A dependency-isolated A2A Subpath that exposes the core
Agent2Agent task, message, artifact, stream-response, and task-state lifecycle
vocabulary without depending on Forge Remote Context, Rovo, storage, or
framework routes.

**Blocked by:** 08 - Prove the extraction against known consumers and docs.

**Status:** done.

- [x] `@forge-ahead/remote/a2a` exposes A2A task, message, artifact,
      stream-response, and task-state types.
- [x] The A2A Contract Layer includes active and terminal state sets, allowed
      transition data, and pure helpers for checking state category and
      transition validity.
- [x] A2A helpers do not require or import Forge Remote Context, Rovo connector
      concepts, storage, framework request/response types, or route handlers.
- [x] Tests cover active states, terminal states, allowed transitions, rejected
      transitions, and the terminal-state invariant.
- [x] Package-boundary tests prove root Remote Authentication and the Context
      Subpath do not import the A2A Subpath.

## 20 - Add zod-backed A2A Contract Validation

**What to build:** Shallow runtime validation for A2A boundary values, using
`zod` to express protocol rules readably while keeping the dependency isolated to
the A2A Subpath.

**Blocked by:** 19 - Add the A2A Subpath and contract layer.

**Status:** done.

- [x] `zod` is added only for A2A Contract Validation and is not required by
      root Remote Authentication or the Context Subpath.
- [x] A2A validation catches stream-response variant errors, including missing
      variants and payloads that contain more than one of task, status update,
      message, or artifact update.
- [x] Artifact update validation is shallow and protocol-focused, checking the
      fields needed to reject malformed stream updates without validating
      provider-specific metadata.
- [x] Public validation helpers are documented as protocol boundary checks, not
      route-level business-rule validators.
- [x] Tests cover valid stream responses, invalid variant combinations, malformed
      artifact updates, and package-boundary isolation of `zod`.

## 21 - Add Remote Agent Signal Mapping

**What to build:** A provider-neutral signal vocabulary and mapper that turns
application or agent-runtime progress signals into A2A-visible state, content,
and artifact events without knowing transport or task-instance details.

**Blocked by:** 19 - Add the A2A Subpath and contract layer.

**Status:** done.

- [x] The A2A Subpath exposes Remote Agent Signal and mapped event types for
      lifecycle, completion, failure, rejection, cancellation, approval-needed,
      input-needed, content, tool, and artifact events.
- [x] The mapper converts signals into A2A-visible state, content, and artifact
      events without requiring task identifiers, context identifiers, timestamps,
      storage, route objects, or wire encoding.
- [x] Artifact mapping preserves append and final-chunk intent when present.
- [x] Tests cover every signal category and prove the mapper is exhaustive for
      known categories.
- [x] Documentation shows that runtime/session code supplies task identifiers,
      timestamps, and transport encoding after mapping.

## 22 - Add A2A JSON-RPC envelope helpers

**What to build:** Pure helpers that wrap A2A values in JSON-RPC 2.0 success or
error envelopes and encode stream envelope strings, stopping before SSE
transport behavior.

**Blocked by:** 20 - Add zod-backed A2A Contract Validation.

**Status:** done.

- [x] The A2A Subpath exposes JSON-RPC request/response envelope types and
      builders only in support of A2A remote-agent flows.
- [x] Helpers can create success and error envelopes for A2A response payloads
      without branding the package as a generic JSON-RPC utility library.
- [x] A pure A2A Stream Envelope encoder produces the chunk value a transport
      layer can write.
- [x] The helpers do not set headers, flush, write to responses, close
      connections, handle disconnects, or expose SSE writer abstractions.
- [x] Tests cover success envelopes, error envelopes, malformed envelope checks,
      stream envelope encoding, and the absence of transport side effects.

## 23 - Add the Rovo Subpath and method narrowing

**What to build:** A Rovo Subpath that narrows A2A-over-JSON-RPC request handling
to Atlassian's Rovo/Jira remote-agent connector methods and documented parameter
quirks.

**Blocked by:** 22 - Add A2A JSON-RPC envelope helpers.

**Status:** done.

- [x] `@forge-ahead/remote/rovo` depends on the A2A Subpath and exposes Rovo
      Agent Connector method names, request types, response types, and method
      validation helpers.
- [x] Method narrowing covers `message/send`, `tasks/get`, `tasks/cancel`, and
      `tasks/resubscribe`.
- [x] The Rovo layer models Jira's `id` parameter shape for task lookup,
      cancellation, and resubscription rather than assuming `taskId`.
- [x] Rovo helpers do not require Forge Remote Context, storage, route handlers,
      framework response types, or a simulator runtime.
- [x] Tests cover valid and invalid connector requests, Jira parameter quirks,
      and the boundary that A2A does not depend on Rovo.

## 24 - Add Rovo Agent Connector Formatting

**What to build:** Pure value-to-value formatting helpers that turn A2A task and
stream values into Rovo/Jira remote-agent JSON-RPC response shapes without
owning transport, persistence, or route behavior.

**Blocked by:** 23 - Add the Rovo Subpath and method narrowing.

**Status:** done.

- [x] The Rovo Subpath exposes pure formatting helpers for task responses and
      connector-ready JSON-RPC response values.
- [x] Formatting preserves task identifiers, context identifiers, task status,
      agent message role, message identifiers, message parts, timestamps, and
      required A2A `kind` fields.
- [x] Formatting helpers accept A2A values and return plain values ready for a
      route or adapter to send; they do not write HTTP responses or SSE chunks.
- [x] Tests cover task formatting, missing-message-id fallback behavior,
      response-envelope composition, and preservation of A2A-visible fields.
- [x] Documentation shows Rovo route composition as pure formatting plus
      caller-owned transport writes, not as a framework adapter.
