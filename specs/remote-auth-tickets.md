# Remote Authentication Tickets

These tickets cover the auth-first extraction of `@forge-ahead/remote`.
They use the glossary in `CONTEXT.md` and the decisions in `docs/adr/`.
Ticket numbers continue in `remote-future-work-tickets.md`.

## 01 - Convert the repository into the standalone Remote Authentication package

**What to build:** A clean standalone package baseline for `@forge-ahead/remote`, replacing the copied logging-package identity with the remote helper package identity and a working local check loop.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] Package metadata identifies `@forge-ahead/remote` as a private ESM package for Node 22 or newer.
- [ ] Build, test, format, and check scripts are wired for the package that will be implemented here.
- [ ] Copied `@forge-ahead/logging` package identity, source assumptions, and README language are removed or replaced with Remote Authentication language.
- [ ] Runtime dependency declarations include only the dependencies needed for the auth-first package.
- [ ] A package check command runs successfully against the clean baseline.

## 02 - Ship the pure JWT core

**What to build:** Callers can import the generic JWT subpath to parse a JWT, read its key id, and check expiry deterministically without loading verification or Forge Remote domain code.

**Blocked by:** 01 - Convert the repository into the standalone Remote Authentication package.

**Status:** ready-for-agent

- [ ] `@forge-ahead/remote/jwt` exposes `JwtHeader`, `JwtPayload`, `JwtToken`, `parseJwt`, `getKeyIdFromToken`, and `isJwtExpired`.
- [ ] Valid three-part JWTs parse into header, payload, and signature values.
- [ ] Invalid structures and malformed JSON fail with clear errors.
- [ ] Expiry checks accept an injected epoch time for deterministic tests.
- [ ] Import-boundary tests prove the JWT subpath does not load `jose`, `@forge-ahead/errors`, or Forge Remote context types.

## 03 - Ship the pure Forge Remote Context core

**What to build:** Callers can model a verified Forge Remote request as normalized values, including forwarded token placeholders and verification metadata, without importing verification code or framework types.

**Blocked by:** 01 - Convert the repository into the standalone Remote Authentication package; 02 - Ship the pure JWT core.

**Status:** ready-for-agent

- [ ] `@forge-ahead/remote/context` exposes the permissive `ForgeInvocationTokenPayload` shape.
- [ ] The context builder creates `ForgeRemoteContext` from an already verified FIT payload, effective verification metadata, and optional forwarded token strings.
- [ ] Forwarded system and user tokens are wrapped as objects that include `kind` and `token`.
- [ ] Forwarded token values remain opaque; the builder does not decode, inspect, refresh, store, or log them.
- [ ] The context does not retain raw request headers or framework request objects.
- [ ] Import-boundary tests prove the context subpath does not load `jose`, `@forge-ahead/errors`, framework packages, Forge packages, storage packages, or logging packages.

## 04 - Ship the root verification shell

**What to build:** Callers can verify a Forge Invocation Token with `jose` through options-object APIs and injected JWKS dependencies, while keeping low-level verification failures as thrown verification errors.

**Blocked by:** 01 - Convert the repository into the standalone Remote Authentication package; 02 - Ship the pure JWT core.

**Status:** ready-for-agent

- [ ] The root package exposes `ATLASSIAN_FORGE_JWKS_URL`, `createJwksKeyStore`, `verifyJwt`, and `verifyAndParseJwt`.
- [ ] `createJwksKeyStore` returns a reusable `jose` key store from the default or injected JWKS URL.
- [ ] `verifyJwt` and `verifyAndParseJwt` accept named options objects rather than positional arguments.
- [ ] Verification uses injected `jwks`, injected static `jwksUrl`, then the default Atlassian JWKS URL in that order.
- [ ] Low-level verification rejects wrong audience, wrong key, and bad signature cases rather than returning `Result`.
- [ ] Issuer verification is applied only when the caller supplies an issuer option.
- [ ] No public one-shot JWKS fetch helper is exported.

## 05 - Ship the Auth Header Validator

**What to build:** Request-boundary callers can validate an `Authorization` header into a verified permissive FIT payload with structured `Result` failures and no framework dependency.

**Blocked by:** 03 - Ship the pure Forge Remote Context core; 04 - Ship the root verification shell.

**Status:** ready-for-agent

- [ ] `validateAuthHeader` accepts a single named input object.
- [ ] Only `Authorization: Bearer <token>` is accepted.
- [ ] Audience is selected from explicit input, then custom audience derivation, then decoded FIT app id.
- [ ] Audience derivation receives an unverified permissive FIT payload and is documented as verification-parameter selection only.
- [ ] Missing audience data returns a 401 Problem Details result before signature verification.
- [ ] Request-boundary validation defaults issuer to `forge/invocation-token`.
- [ ] Missing, malformed, empty, expired, wrong-issuer, wrong-audience, and bad-signature cases return 401 Problem Details.
- [ ] JWKS fetch, TLS, or network failures that prevent verification return 502 Problem Details.

## 06 - Ship Forge Remote request validation and HTTP failure mapping

**What to build:** New callers can validate a framework-neutral Forge Remote request into `ForgeRemoteContext`, preserve forwarded Forge token headers as opaque context values, and map auth failures into a data-only HTTP response shape.

**Blocked by:** 03 - Ship the pure Forge Remote Context core; 05 - Ship the Auth Header Validator.

**Status:** ready-for-agent

- [ ] `validateForgeRemoteRequest` accepts a single named input object containing framework-neutral request headers and verification options.
- [ ] The request validator delegates FIT verification to the same path as the Auth Header Validator.
- [ ] A valid request returns `ForgeRemoteContext` with verified FIT payload, effective audience, effective issuer, and any supplied forwarded tokens.
- [ ] Forwarded system and user token headers map to the corresponding normalized token objects.
- [ ] The request validator does not require or expose Express, Fastify, Hono, or another framework request type.
- [ ] `toHttpAuthFailureResponse` returns status and body data without sending a response or importing a framework.

## 07 - Lock the public API and dependency boundaries

**What to build:** The package export map and test suite make the selected standalone API hard to accidentally widen, regress, or bind to deferred dependencies.

**Blocked by:** 02 - Ship the pure JWT core; 03 - Ship the pure Forge Remote Context core; 04 - Ship the root verification shell; 05 - Ship the Auth Header Validator; 06 - Ship Forge Remote request validation and HTTP failure mapping.

**Status:** ready-for-agent

- [ ] The root entrypoint re-exports the pure JWT and context APIs plus root-only verification helpers.
- [ ] `@forge-ahead/remote/verify` is not a public package export.
- [ ] Positional legacy calls are not part of the standalone public API.
- [ ] Package checks prove there are no runtime dependencies on web frameworks, `@forge/api`, Forge KVS, generated Atlassian API types, or `@forge-ahead/logging`.
- [ ] Package checks prove no logging helpers, context summary helpers, or logging subpath are exported in the auth-first package.
- [ ] The full package check command passes.

## 08 - Prove the extraction against known consumers and docs

**What to build:** The auth-first package is documented and exercised through the known Forge Remote usage path, proving the new standalone API can replace the legacy helper contract intentionally.

**Blocked by:** 07 - Lock the public API and dependency boundaries.

**Status:** ready-for-agent

- [ ] The known vendored consumer can be migrated to the selected `@forge-ahead/remote` API, or an explicit temporary bridge decision is documented.
- [ ] The duplicate legacy Remote Authentication implementations in `forge-ahead` are removed or deliberately bridged.
- [ ] Consumer migration does not require preserving legacy positional call shapes.
- [ ] README usage shows authenticating a Forge Remote request into framework-neutral values.
- [ ] README or migration notes explain the pure `jwt`, pure `context`, and root verification surfaces.
- [ ] The relevant package checks pass after the consumer proof or bridge is complete.
