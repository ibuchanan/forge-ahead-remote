# Remote Future Work Tickets

These tickets capture future Forge Remote Helper Library work identified by the
auth extraction spec. They are intentionally deferred until the auth-first slice
is complete. Numbering continues from the completed auth-first ticket set
(01-08).

## Status

Reviewed against `remote-invocation-a2a-tickets.md` (tickets 17-24, done):

- **15 is superseded** by tickets 19-24 - see its entry below.
- **14 is broadened** per `remote-capability-roadmap.md` theme 6, from
  "JWKS policy" to "regional/isolated-cloud endpoint resolution" - see its
  entry below.
- **09, 11, 12, 13, 16 are untouched and still open**; none of their
  acceptance criteria overlap with what 17-24 shipped.
- **10** (framework middleware) is still open and unaffected in scope, but
  now that `/invocation` exists, consider having its example route also
  demonstrate composing Remote Invocation Contract Validation as the
  documented second explicit step after authentication - not a blocker,
  just worth deciding when 10 is picked up.

## 09 - Add a Remote Logging Extension slice

**What to build:** A deferred logging extension that demonstrates safe Forge Remote Context summaries and demo-oriented request logging without making the auth core depend on logging.

**Blocked by:** 08 - Prove the extraction against known consumers and docs.

**Status:** deferred; ready-for-agent once blockers are complete.

- [ ] Package ownership, export shape, and concrete API are decided at the start of this slice.
- [ ] The extension depends on the auth core context shape rather than re-parsing raw request headers.
- [ ] Logged summaries avoid raw tokens and avoid treating every FIT claim as safe to emit.
- [ ] Demo narrative logging illustrates Forge Remote request flow without becoming required production behavior.
- [ ] The auth core remains logging-neutral after the extension is added.

## 10 - Add a framework middleware extension slice

**What to build:** A first framework adapter that turns a framework request into the core validation input, attaches or returns `ForgeRemoteContext` in a framework-idiomatic way, and maps auth failures to responses.

**Blocked by:** 08 - Prove the extraction against known consumers and docs.

**Status:** deferred; ready-for-agent once blockers are complete.

- [ ] One framework is selected as the first adapter target for the slice.
- [ ] The adapter delegates authentication to the core request validator.
- [ ] The adapter uses the data-only HTTP auth failure mapping rather than duplicating failure classification.
- [ ] The adapter does not push framework types or middleware behavior into the auth core.
- [ ] Example usage shows a complete protected Forge Remote route.

## 11 - Add Product API access with forwarded tokens

**What to build:** Helpers that consume normalized forwarded system or user tokens to call Atlassian product APIs through injected I/O dependencies.

**Blocked by:** 08 - Prove the extraction against known consumers and docs.

**Status:** deferred; ready-for-agent once blockers are complete.

- [ ] Callers can choose whether to use the forwarded system token or forwarded user token.
- [ ] Helpers use injected HTTP behavior rather than binding the core to a specific fetch wrapper or framework.
- [ ] Forwarded tokens remain opaque to authentication; this slice may consume them but does not redefine core token verification.
- [ ] Missing-token and product-API failure cases return structured, testable results.
- [ ] Tests prove product API helpers can run without real Atlassian network calls.

## 12 - Add system-token lifecycle helpers

**What to build:** A follow-up capability for persisting, refreshing, and expiring system tokens using injected storage, time, and HTTP dependencies.

**Blocked by:** 11 - Add Product API access with forwarded tokens.

**Status:** deferred; ready-for-agent once blockers are complete.

- [ ] Token lifecycle state is modeled separately from the auth core's opaque forwarded token values.
- [ ] Storage, clock, and token-refresh I/O are injected.
- [ ] Refresh and expiry decisions are deterministic under test.
- [ ] Failure modes distinguish missing token state, expired-but-refreshable state, refresh failure, and unusable token state.
- [ ] The auth core context shape does not need to change to support lifecycle metadata.

## 13 - Add Forge storage and secrets helpers

**What to build:** Helpers for accessing Forge-hosted storage or secrets from a remote backend using authenticated remote context and injected product-platform access.

**Blocked by:** 11 - Add Product API access with forwarded tokens.

**Status:** deferred; ready-for-agent once blockers are complete.

- [ ] Helpers use verified app, cloud, principal, and API-base-url claims when present.
- [ ] Access to Forge storage or secrets is implemented through explicit injected I/O boundaries.
- [ ] The helpers do not introduce a dependency on Forge runtime APIs into the auth core.
- [ ] Tests cover successful lookup, missing context data, authorization failure, and infrastructure failure.
- [ ] Documentation explains when these helpers should be used instead of direct Forge runtime storage.

## 14 - Add regional and isolated-cloud endpoint resolution

**Broadened from "JWKS policy":** `remote-capability-roadmap.md` theme 6
shows the same per-app regional/isolated-cloud URL-templating problem
recurring for both JWKS sources and Forge Storage base URLs (see
`forge-remote-nodejs/src/util/urls.js`'s `getJwksUrlForAppId` and
`getForgeStorageBaseUrlForAppId`), each substituting a validated `icLabel`
into a template with an anti-spoofing regex check
(`^[a-z0-9_-]{1,50}$`) before use. This ticket is broadened so the first
slice's endpoint-resolution mechanism is reusable by later outbound helpers
(ticket 13's Forge storage access, theme 4's product API access) instead
of each one reinventing template-plus-label validation. The Forge
platform-level regional `baseUrl`/`inScopeEUD` manifest mechanism stays
explicitly out of scope - that's app-manifest configuration, not something
this library resolves.

**What to build:** A policy layer that resolves per-app regional or
isolated-cloud endpoints - starting with JWKS sources, but factored
generically enough that a later non-JWKS base URL can reuse the same
template-substitution and label-validation mechanism - without hardcoding
that policy into the auth core.

**Blocked by:** 08 - Prove the extraction against known consumers and docs.

**Status:** deferred; ready-for-agent once blockers are complete.

- [ ] Callers can configure app allowlists, isolated-cloud labels, or app-to-endpoint routing policy.
- [ ] The policy produces the same core verification inputs already supported by Remote Authentication.
- [ ] Invalid app or region policy decisions are distinguishable from token signature failures.
- [ ] Isolated-cloud labels are validated against an anti-spoofing pattern before being substituted into any URL template.
- [ ] The template-substitution and label-validation mechanism is factored so a future non-JWKS base URL (e.g. a Forge Storage base URL) can reuse it without reimplementing validation.
- [ ] Tests cover default Atlassian JWKS, injected JWKS URL, and policy-selected JWKS behavior.
- [ ] The auth core remains policy-injectable rather than owning deployment-specific routing templates.

## 15 - Add Remote-agent and A2A helper slices

**What to build:** Helpers for remote-agent or A2A protocols that can use `ForgeRemoteContext` for trust context while keeping JSON-RPC, streaming, and task-state concerns out of Remote Authentication.

**Blocked by:** 08 - Prove the extraction against known consumers and docs.

**Status:** superseded. `remote-capability-roadmap.md` theme 2 refined this
ticket into layered sub-slices, shipped as tickets 19-24 in
`remote-invocation-a2a-tickets.md`: the A2A Contract Layer and task-state
machine (19), zod-backed A2A Contract Validation (20), Remote Agent Signal
Mapping (21), A2A JSON-RPC envelope helpers (22), the Rovo Subpath and
method narrowing (23), and Rovo Agent Connector Formatting (24).

One criterion below shipped differently than written, by deliberate
design: per ADR 0045, A2A and Rovo helpers require **no**
`ForgeRemoteContext` at all, rather than accepting one. Route code composes
request authentication, Remote Invocation Contract Validation, and
protocol handling as three separate explicit steps, which keeps the
protocol helpers usable independent of Forge Remote authentication
entirely. This is a refinement of the original intent, not a gap.

- [x] The first protocol helper scope is selected from JSON-RPC envelopes, SSE streaming, task state mapping, or Rovo remote-agent conventions. (Task state mapping, JSON-RPC envelopes, and Rovo remote-agent conventions were selected; SSE streaming was deliberately deferred - see ADR 0044.)
- [~] Protocol helpers accept an already authenticated `ForgeRemoteContext`. (Shipped differently: they accept no `ForgeRemoteContext` at all - see the note above.)
- [x] Protocol parsing and task state are tested without requiring framework request objects.
- [x] Authentication failures remain owned by the auth core, not the protocol helper.
- [x] Reference implementation usage is documented without treating the reference app as a direct source template.

## 16 - Add Forge Remote backend template support

**What to build:** Repo-init or template support that adds `@forge-ahead/remote` only for templates that create Forge Remote backends, giving new projects a correct auth-first starting point.

**Blocked by:** 08 - Prove the extraction against known consumers and docs.

**Status:** deferred; ready-for-agent once blockers are complete.

- [ ] Forge Remote backend templates include `@forge-ahead/remote` as a dependency.
- [ ] Non-remote Forge app templates do not receive the remote helper dependency by default.
- [ ] Generated examples authenticate a Forge Remote request into framework-neutral values.
- [ ] Generated examples avoid logging forwarded tokens or depending on framework middleware from the auth core.
- [ ] Template checks prove the generated remote backend compiles and exercises the intended validation path.
