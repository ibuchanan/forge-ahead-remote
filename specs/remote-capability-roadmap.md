# Forge Remote Helper Library Capability Roadmap

## Status

Draft.

## Purpose

`remote-auth-tickets.md` shipped the auth-first slice. `remote-future-work-tickets.md`
already sketches eight deferred capability areas (09-16), written before the
auth slice existed. This document steps back to the *capability* level: what
are the major things a Forge Remote Helper Library could grow into over time,
what evidence from the vendored reference implementations supports each one,
and where do the existing future-work tickets need to be refined, split, or
bounded now that we've seen concrete reference code.

This is not a ticket list. It is the input future ticket-writing should draw
from, the way `remote-module-extraction.md` was the input for
`remote-auth-tickets.md`.

## Sources reviewed

- `specs/remote-future-work-tickets.md` - the existing 09-16 ticket sketches.
- `specs/forge-remote-nodejs/` - a runnable Node.js Forge Remote backend:
  Express app, auth/logging/system-token middleware, Redis-backed KVS
  storage, a Confluence product-API client, isolated-cloud/regional URL
  templating, and seven distinct invocation-handler route shapes.
- `specs/explore-jira-agent-assignment/packages/forge-ahead/` - a TypeScript
  helper library with Rovo remote-agent (A2A/JSON-RPC) protocol helpers,
  safe-logging utilities, classic Forge function/webtrigger/manifest
  tooling, and its own export-organization choices.
- `specs/forge-remote-app/manifest.yml` and `src/index.js` - the Forge-side
  manifest wiring (`remotes`, `endpoint.auth`, regional `baseUrl` maps,
  `storage.inScopeEUD`) and the `invokeRemote()` call path, i.e. the caller
  side of what this library validates.

Each theme below cites the specific files evidence came from.

## Major capability themes

### 1. Invocation-shape / trigger-type helpers (new)

**What it is:** `validateForgeRemoteRequest()` currently assumes one shape: a
synchronous request carrying a verifiable `Authorization` header. The
reference app shows at least five materially different Forge Remote
invocation shapes, each with a different auth/response contract:

| Shape | Evidence | Auth present | Response contract |
| --- | --- | --- | --- |
| Sync product/Custom UI invocation | `forge-remote-nodejs/src/remoteInvocationHandler.js`, `/frc` route | system + user tokens | immediate JSON body |
| Sync backend-function invocation | `remoteBackendInvocationHandler.js`, `/frc-backend` | system token; user token optional | immediate JSON body |
| Async/event invocation | `remoteAsyncInvocationHandler.js`, `/frc-event`, `manifest.yml` `endpoint.auth.appSystemToken` only | system token only | `202`, work enqueued, no result in response |
| Scheduled-trigger invocation | `remoteScheduledTriggerInvocation.js`, `/frc-scheduled-trigger` | system token only | immediate ack, no meaningful body |
| External/public invocation | `remoteExternalInvocationHandler.js`, `/frc-external` | **no FIT at all** - HTTP Basic auth against a shared secret, `installationId` as a query param, system token rehydrated from storage | immediate JSON body |

The auth-first package has no vocabulary for "this request has no FIT and
authenticates a different way" or "this trigger type never carries a user
token." A future helper could model invocation shape as a first-class,
narrow addition: a way to declare which forwarded tokens a shape guarantees,
without changing how FIT verification itself works.

**Relationship to existing tickets:** not covered by 09-16. Closest is
ticket 10 (framework middleware), but that ticket is about adapting one
HTTP framework, not about the different trigger/response contracts Forge
Remote itself defines. Recommend a new ticket area rather than folding this
into 10.

### 2. Remote-agent / A2A protocol layering (refines ticket 15)

**What it is:** ticket 15 currently reads as one undifferentiated slice.
The reference package shows this decomposes cleanly into four layers, each
independently testable and increasingly protocol-specific:

1. Generic JSON-RPC 2.0 envelope helpers - `util/jsonrpc.ts`: request/response
   types, `isJsonRpcError`, `validateJsonRpcRequest`, response builders. Fully
   generic, not Rovo-specific.
2. A2A protocol contract and task-state machine - `rovo/a2aContract.ts`:
   `Task`/`Message`/`Artifact` types plus `TASK_STATE_TRANSITIONS`, a real
   adjacency map enforcing legal lifecycle transitions
   (`working` -> `input-required|auth-required|completed|failed|canceled`,
   `completed` -> nothing). Explicitly sans-IO: "protocol-shaped data and
   task-state lifecycle rules" only.
3. Rovo-specific method narrowing - `rovo/agentConnectorMethods.ts`: narrows
   JSON-RPC to `message/send`/`tasks/get`/`tasks/cancel`/`tasks/resubscribe`,
   including a documented real-world quirk (Jira sends `id`, not `taskId`).
4. Response formatting and runtime validation -
   `rovo/agentConnectorFormatting.ts` (reshapes a `Task` into wire format) and
   `rovo/agentConnectorValidation.ts` (zod discriminated-union validation of
   "exactly one of task/statusUpdate/message/artifactUpdate").
5. Provider-neutral signal mapping - `rovo/signalMapper.ts`: a pure,
   exhaustive switch converting vendor-agnostic signal categories into A2A
   events, documented as "transport-independent: it does not know about
   taskId, contextId, timestamps, or wire encoding."

**Design note:** layers 1-2 and 5 are pure/sans-IO today in the reference
package and are strong candidates to extract close to as-is. Layer 3 pulls
in a new dependency (`zod`) not needed anywhere else in this library -
worth deciding whether to adopt it or re-derive equivalent narrow checks by
hand to avoid the dependency.

**Relationship to existing tickets:** refines ticket 15. Recommend
splitting it into sequenced sub-slices (generic JSON-RPC -> A2A
contract/state machine -> Rovo method narrowing -> formatting/validation)
rather than one slice, since each layer has a different blast radius and a
different "how Rovo-specific is this" answer.

### 3. Safe logging and log-context helpers (refines ticket 09)

**What it is:** `forge-ahead/forge/logging.ts` gives a concrete shape for
"safe Forge Remote Context summaries" that ticket 09 currently states as an
open question:

- `truncateEvents(obj)` walks any `JSONValue` recursively, replaces `headers`
  entirely with a redaction marker, and truncates `contextToken` to
  `first3...last3` characters while preserving the rest of the object shape
  - a concrete, generic (not FIT-specific) redaction strategy that could be
    pointed at a `ForgeRemoteContext` or an unverified FIT payload.
- `logResult<T>(result, label?)` logs success at `info` and the full
  `ProblemDetails` at `error` via `.match()`.
- `logContext(context, label?)` truncates then logs a context object.

`forge-remote-nodejs/src/logger.js` and `middleware/loggerMiddleware.js`
add a second, complementary piece: a `bunyan`-based logger factory that
attaches a request-scoped child logger seeded from B3 trace headers
(`x-b3-traceid`/`x-b3-spanid`), so every log line in a request carries trace
context. This is the first middleware in the chain, ahead of auth.

**Relationship to existing tickets:** refines ticket 09 with concrete
technique (generic-value truncation + trace-context propagation) rather
than changing its scope.

### 4. Product API access with forwarded tokens (refines ticket 11)

**What it is:** `forge-remote-nodejs/src/requestConfluence.js` is a good
worked example: a client that must be told which security context to use
(`asApp()`/`asUser()`, both fluent, both throwing `AppError` if the matching
forwarded token is absent) before sending a request, with a private
`#sendRequest` that merges caller headers without letting them clobber
`Authorization`. It also has a `createFromInstallationId` static factory for
calling product APIs *outside* a live request (see theme 1's external
invocation shape), by rehydrating a persisted system token.

`src/fetchClient.js` is a trivial `fetch` pass-through kept only as an
injection seam for future interceptors/retries/mocking - a convention worth
carrying forward as an injectable `fetchImpl` on any HTTP-calling helper,
consistent with this library's existing injected-`jwks`/injected-`jwksUrl`
pattern.

**Relationship to existing tickets:** refines ticket 11; the
`asApp()`/`asUser()` fluent context-selection API and the "factory that
rehydrates from storage instead of a live request" pattern are concrete
enough to seed ticket 11's design directly.

### 5. Generic pluggable cache/storage abstraction (new, shared infra)

**What it is:** `forge-remote-nodejs/src/kvsStorage.js` is a namespaced,
TTL-aware key-value store (`saveWithExpiry`/`getValueByKey`, keys built as
`namespace_key`) backed by Redis, with an explicit connect-at-startup /
close-on-`SIGTERM` lifecycle separate from construction. Two consumers sit
on top of it: `systemToken.js` (ticket 12's system-token lifecycle) and, via
`forgeStorageHelpers.js`, calls into actual Forge Storage over HTTP (ticket
13). The storage abstraction itself is generic - nothing about it is
Forge-specific.

**Relationship to existing tickets:** neither ticket 12 nor 13 currently
names a shared storage dependency. Recommend explicitly deciding whether
tickets 12/13 each own their own storage injection point, or whether a
small shared "namespaced KV cache" interface should be factored out first
so both build on the same seam (mirroring how `createJwksKeyStore` is
shared infra for `verifyJwt`/`validateAuthHeader`/`validateForgeRemoteRequest`
today).

### 6. Regional and isolated-cloud endpoint resolution (broadens ticket 14)

**What it is:** ticket 14 is titled around JWKS policy specifically, but the
reference evidence shows the same policy problem recurring for more than
JWKS:

- `forge-remote-nodejs/src/util/urls.js`: `getJwksUrlForAppId` **and**
  `getForgeStorageBaseUrlForAppId` both resolve a per-app default vs.
  isolated-cloud URL by substituting a validated `icLabel` into a template,
  with an explicit anti-spoofing regex check
  (`^[a-z0-9_-]{1,50}$`) before the label is used in any URL.
- `forge-remote-app/manifest.yml`: `remotes[].baseUrl` can itself be a
  `default`/`US`/`AU` map, and `remotes[].storage.inScopeEUD` marks whether
  the remote stores data itself for data-residency purposes - a
  Forge-platform-level regional mechanism, distinct from and upstream of
  anything the remote backend's own helper code decides.

**Relationship to existing tickets:** broaden ticket 14 from "JWKS policy"
to "per-app regional/isolated-cloud endpoint resolution," since JWKS and
Forge Storage base URLs already need the identical templating-plus-label-
validation treatment, and any future outbound helper (theme 4) will need
the same resolution for its own base URLs. Keep the manifest-level regional
`baseUrl`/`inScopeEUD` mechanism explicitly out of scope - that's Forge
platform/app-manifest configuration, not something this library resolves.

### 7. Cloud/tenant identifier helpers (new, small, cross-cutting)

**What it is:** `forge-ahead/cloud/site.ts`'s `extractCloudId(context)` is a
small, pure, Result-returning ARI parser
(`ari:cloud:jira::site/${cloudId}` -> `cloudId`). It has no network
dependency and no relation to auth verification itself, but it is exactly
the kind of small utility that themes 4 and 6 both end up needing (cloud
ID, isolated-cloud label, app ID) to select the right endpoint or tenant
context.

**Relationship to existing tickets:** not named in 09-16. Recommend calling
it out explicitly - either as a small shared utility module, or as a
documented prerequisite inside whichever of tickets 11/13/14 lands first -
rather than letting each capability reinvent ARI parsing.

## Cross-cutting design principles

These aren't capabilities themselves, but patterns the survey surfaced that
should constrain how *any* of the above get built.

**Response envelope reconciliation.** Two different ad hoc error envelopes
already exist in the wild: `forge-remote-nodejs/src/util/error.js`'s
`AppError`/`respondWithError` (`{success:false, error:{errorMessage,
errorType, stack}}`, notably leaking `stack` in the response body) and
`forge-ahead/forge/triggers/webtrigger.ts`'s `buildErrorResponse` (converts
`ProblemDetails` into a Forge classic-webtrigger response shape). As
framework middleware (ticket 10) and templates (ticket 16) get built, they
should converge on the `ProblemDetails`/`HttpAuthFailureResponse` shape this
library already ships rather than adding a third envelope.

**Extension package export conventions.** `forge-ahead/src/index.ts` chose
one flat barrel over granular subpaths, and preserved dual-named exports
(e.g. `CancelTaskParams` also as `AgentConnectorCancelTaskParams`) when it
later split internal modules - a real compatibility cost of not planning
subpaths up front. This library already uses root + `/jwt` + `/context`
subpaths (see `docs/adr/0012-add-pure-context-subpath.md`); future
extension packages implementing themes above should decide their subpath
shape *before* the first release, not after a module split forces a
compatibility shim.

**Injection consistency.** Every capability above repeats the same shape
this library already established: injected `jwks`/`jwksUrl` in `verify.ts`,
an injectable `fetchImpl` seam (theme 4), an injected storage client (theme
5), and even `forge-ahead/forge/auth.ts`'s injected-with-a-default
`api: ForgeAuth` parameter for testability. Keep using this convention
rather than importing concrete I/O clients directly inside new helpers.

## Explicitly out of scope

The `explore-jira-agent-assignment` package mixes in several capability
areas that are real and useful, but belong to a *different* product
surface than "helpers for externally hosted services that receive requests
through Forge Remote" (this library's stated scope):

- **Classic Forge function/webtrigger helpers** (`forge/auth.ts`'s
  `asUser`/`asApp` strategy selection via `@forge/api`, `forge/triggers/*`,
  `forge/function.ts`, `forge/types.ts`) - these run *inside* the Forge
  platform's own function runtime and require `@forge/api` directly, which
  this library's ADRs already exclude (`docs/adr/0010`,
  non-goals in `remote-module-extraction.md`).
- **Manifest parsing and Rovo Action codegen** (`forge/manifest.ts`,
  `rovo/action.ts`) - build-time CLI tooling with real filesystem I/O and
  its own path-traversal hardening, unrelated to verifying or modeling an
  inbound Forge Remote request at runtime.
- **CLI entrypoint conventions** (`actiontypes.ts`, `StandardError`'s
  `toExitCode`/`ShellExitCodes`) - a `Result`-to-`process.exit` bridge for
  build tooling, not a Forge Remote runtime concern.

If any of these become worth building, they belong in a different helper
package (or `forge-ahead` itself), not as a `@forge-ahead/remote` subpath.

## Suggested sequencing

Rough dependency shape, not a commitment:

1. Theme 3 (safe logging) and theme 7 (cloud identifier helpers) are small,
   low-risk, and unblock nothing else - good early slices.
2. Theme 5 (generic cache abstraction) should land before or alongside
   ticket 12 (system-token lifecycle) and ticket 13 (Forge storage), since
   both want the same seam.
3. Theme 6 (regional/isolated-cloud resolution) should land before theme 4
   (product API access) gets a "call the right regional endpoint" story,
   and before ticket 13 needs an isolated-cloud storage base URL.
4. Theme 1 (invocation-shape helpers) is independent of the others and
   could start anytime after ticket 08; it mostly needs decisions, not new
   infrastructure.
5. Theme 2 (remote-agent/A2A) is the largest and most self-contained; its
   internal layering (JSON-RPC -> A2A contract -> Rovo narrowing ->
   formatting/validation) means it can be sequenced independently of
   everything else in this document.

## Next step

Use this document to revise `remote-future-work-tickets.md`: broaden ticket
14's title and criteria, split ticket 15 into layered sub-tickets, add a
new ticket area for theme 1 (invocation-shape helpers), and note themes 5
and 7 as shared-infra prerequisites inside whichever tickets consume them.
