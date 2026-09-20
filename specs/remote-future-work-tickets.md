# Remaining Remote Work Tickets

These tickets capture the work that remains outside the shipped authentication,
invocation-contract, A2A/Rovo, logging, and cloud-ID APIs.

## 10 - Finish the framework middleware slice

**Status:** active working-tree implementation.

The Fastify adapter has source, tests, package exports, README coverage, and
reference coverage in the current working tree. Keep its dedicated
[`forge-remote-fastify-adapter.md`](./forge-remote-fastify-adapter.md)
specification until that work is committed. A later framework adapter must:

- delegate authentication to the core request validator;
- use data-only auth-failure mapping;
- avoid framework types in the authentication core; and
- show a complete protected route.

## 11 - Add Product API access with forwarded tokens

**What to build:** Helpers that consume normalized forwarded system or user
tokens to call Atlassian product APIs through injected I/O dependencies.

- [ ] Callers can choose a forwarded system or user token.
- [ ] Helpers use injected HTTP behavior rather than a specific client or framework.
- [ ] Forwarded tokens remain opaque to authentication.
- [ ] Missing-token and product-API failures return structured, testable results.
- [ ] Tests run without real Atlassian network calls.

## 12 - Add system-token lifecycle helpers

**What to build:** Persist, refresh, and expire system tokens using injected
storage, time, and HTTP dependencies.

**Blocked by:** ticket 11.

- [ ] Model lifecycle state separately from opaque forwarded tokens.
- [ ] Inject storage, clock, and token-refresh I/O.
- [ ] Make refresh and expiry decisions deterministic under test.
- [ ] Distinguish missing state, refreshable expiry, refresh failure, and unusable state.
- [ ] Keep the authentication context shape unchanged.

## 13 - Add Forge storage and secrets helpers

**What to build:** Access Forge-hosted storage or secrets from a remote backend
through authenticated context and injected product-platform access.

**Blocked by:** ticket 11.

- [ ] Use verified application, cloud, principal, and API-base-url claims when available.
- [ ] Keep I/O boundaries explicit and independent of Forge runtime APIs.
- [ ] Test success, missing context data, authorization failure, and infrastructure failure.
- [ ] Document when these helpers are preferable to direct Forge runtime storage.

## 14 - Add regional and isolated-cloud endpoint resolution

**What to build:** Resolve per-app regional or isolated-cloud endpoints through
an injected policy. Start with JWKS sources, but make validated template
substitution reusable for a later Forge Storage base URL.

- [ ] Support app allowlists, isolated-cloud labels, or app-to-endpoint routing policy.
- [ ] Produce the existing core verification inputs.
- [ ] Distinguish policy decisions from signature failures.
- [ ] Validate labels before template substitution.
- [ ] Test default, injected, and policy-selected JWKS behavior.
- [ ] Keep deployment routing out of the authentication core.

## 16 - Add Forge Remote backend template support

**What to build:** Add `@forge-ahead/remote` only to templates that create Forge
Remote backends, with an auth-first starting point.

- [ ] Remote templates include the package; non-remote templates do not.
- [ ] Generated examples authenticate requests into framework-neutral values.
- [ ] Generated examples do not log forwarded tokens or depend on core middleware.
- [ ] Template checks compile and exercise validation.
