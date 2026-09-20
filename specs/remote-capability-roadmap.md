# Remaining Forge Remote Capability Roadmap

## Purpose

This document records the capability areas that are not yet part of
`@forge-ahead/remote`. Completed authentication, invocation-contract, A2A/Rovo,
logging, and cloud-ID capabilities are documented under `docs/` and are not
roadmap items.

The ticket-sized work is tracked in
[`remote-future-work-tickets.md`](./remote-future-work-tickets.md). This roadmap
captures the architectural direction that should guide any new ticket.

## Capability themes

### 1. Product API access with forwarded tokens

Applications need a small, injected-I/O boundary for calling Atlassian product
APIs with the system or user token already normalized in a verified
`ForgeRemoteContext`. It should preserve opaque token handling in the auth core,
allow callers to choose the token kind, and return structured failures without
binding the package to a framework or HTTP client.

This refines ticket 11.

### 2. Storage and token lifecycle

System-token refresh state and Forge-hosted storage/secrets access are distinct
concerns, but both need explicit injected dependencies for storage, clock, and
HTTP behavior. They must remain outside the authentication core and be
deterministic under test.

This spans tickets 12 and 13. A generic cache or storage abstraction should be
introduced only if both capabilities demonstrate a shared concrete need.

### 3. Regional and isolated-cloud endpoint resolution

A policy layer may resolve app-specific JWKS or later Forge Storage endpoints
from validated isolated-cloud labels. It must validate labels before template
substitution, keep routing policy injectable, and distinguish policy failures
from token-verification failures.

This broadens ticket 14 beyond JWKS alone. Forge manifest `baseUrl` and
`inScopeEUD` configuration remain out of scope.

## Boundaries that remain out of scope

- framework route registration, storage, transport, or lifecycle ownership in
the authentication core;
- a concrete logger, logging retention policy, or request-body logging;
- an SSE transport writer or a generic A2A server framework;
- classic Forge function, webtrigger, or event helpers; and
- user-facing A2A task orchestration.

## Next work

Prioritize a concrete product-API helper only when a consumer requires it.
Then use that evidence to determine whether system-token lifecycle and storage
helpers need a shared abstraction. Regional endpoint policy is independent but
should be designed to serve both JWKS and future outbound platform APIs.
